from __future__ import annotations
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from typing import Optional

from app.db.session import get_db
from app.settings import settings

def db_dep() -> Session:
    return Depends(get_db)

security = HTTPBearer(auto_error=False)

JWT_SECRET = settings.SUPABASE_JWT_SECRET or "fallback-secret-key-change-me"
JWT_ALGORITHM = "HS256"

def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    """Decode our own JWT. Returns user id (string) or None."""
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
