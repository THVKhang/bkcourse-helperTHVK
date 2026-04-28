from __future__ import annotations
import secrets
import datetime
import bcrypt
import jwt
import resend
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.student import Student
from app.settings import settings
from app.api.deps import get_current_user_id
from app.services.student_service import get_or_create_student

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = settings.SUPABASE_JWT_SECRET or "fallback-secret-key-change-me"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72


# ---- Schemas ----

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None

class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AuthResponse(BaseModel):
    token: str
    username: str
    email: str | None = None
    student_code: str | None = None

class UserInfoResponse(BaseModel):
    username: str
    email: str | None = None
    student_code: str | None = None


# ---- Helpers ----

def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def _verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def _create_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def _get_or_link_student(db: Session, username: str) -> Student:
    """Get or create a student profile linked to the username."""
    return get_or_create_student(db, username)


# ---- Routes ----

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.username) < 3:
        raise HTTPException(400, "Tên tài khoản phải có ít nhất 3 ký tự")
    if len(req.password) < 4:
        raise HTTPException(400, "Mật khẩu phải có ít nhất 4 ký tự")

    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(409, "Tên tài khoản đã tồn tại")

    if req.email:
        email_exists = db.query(User).filter(User.email == req.email).first()
        if email_exists:
            raise HTTPException(409, "Email đã được sử dụng")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=_hash_password(req.password),
    )
    db.add(user)
    db.flush()

    student = _get_or_link_student(db, req.username)
    db.commit()

    token = _create_token(user.id, user.username)
    return AuthResponse(
        token=token,
        username=user.username,
        email=user.email,
        student_code=student.student_code,
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not _verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Tên tài khoản hoặc mật khẩu không đúng")

    student = _get_or_link_student(db, user.username)
    db.commit()

    token = _create_token(user.id, user.username)
    return AuthResponse(
        token=token,
        username=user.username,
        email=user.email,
        student_code=student.student_code,
    )


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email via Resend."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=30)
    db.commit()

    reset_link = f"http://localhost:3000/reset-password?token={token}"

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": "BKCourse Helper <onboarding@resend.dev>",
            "to": [req.email],
            "subject": "Đặt lại mật khẩu — BKCourse Helper",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #1a365d;">🎓 BKCourse Helper</h2>
                <p>Xin chào <strong>{user.username}</strong>,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Click nút bên dưới:</p>
                <a href="{reset_link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                    Đặt lại mật khẩu
                </a>
                <p style="color:#666;font-size:13px;">Link này sẽ hết hạn sau 30 phút.</p>
                <p style="color:#999;font-size:12px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            </div>
            """,
        })
    except Exception as e:
        print(f"[Resend Error] {e}")

    return {"message": "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user:
        raise HTTPException(400, "Token không hợp lệ")

    if user.reset_token_expires and user.reset_token_expires < datetime.datetime.now(datetime.timezone.utc):
        raise HTTPException(400, "Token đã hết hạn")

    if len(req.new_password) < 4:
        raise HTTPException(400, "Mật khẩu phải có ít nhất 4 ký tự")

    user.hashed_password = _hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Đổi mật khẩu thành công! Hãy đăng nhập lại."}


@router.get("/me", response_model=UserInfoResponse)
def get_me(db: Session = Depends(get_db), user_id: str | None = Depends(get_current_user_id)):
    if not user_id:
        raise HTTPException(401, "Chưa đăng nhập")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(404, "User not found")

    student = db.query(Student).filter(Student.student_code == user.username).first()

    return UserInfoResponse(
        username=user.username,
        email=user.email,
        student_code=student.student_code if student else user.username,
    )


@router.post("/guest", response_model=AuthResponse)
def guest_login(db: Session = Depends(get_db)):
    """Create a temporary guest account."""
    guest_name = f"guest_{secrets.token_hex(4)}"
    user = User(
        username=guest_name,
        hashed_password=_hash_password(secrets.token_hex(16)),
    )
    db.add(user)
    db.flush()

    student = _get_or_link_student(db, guest_name)
    db.commit()

    token = _create_token(user.id, user.username)
    return AuthResponse(
        token=token,
        username=user.username,
        student_code=student.student_code,
    )
