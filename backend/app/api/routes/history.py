from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.history import PostHistoryRequest, HistoryResponse, StudentSummaryResponse
from app.services.history_service import get_history, upsert_history, compute_summary
from app.services.timetable_service import get_timetable

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/{student_code}/history", response_model=HistoryResponse)
def read_history(student_code: str, db: Session = Depends(get_db)):
    items = get_history(db, student_code)
    return HistoryResponse(student_code=student_code, items=items)

@router.post("/history", response_model=HistoryResponse)
def post_history(req: PostHistoryRequest, db: Session = Depends(get_db)):
    items = upsert_history(db, req.student_code, req.items)
    return HistoryResponse(student_code=req.student_code, items=items)

@router.get("/{student_code}/summary", response_model=StudentSummaryResponse)
def summary(student_code: str, program_id: int, term_code: str, db: Session = Depends(get_db)):
    _, tt_summary = get_timetable(db, student_code, term_code)
    s = compute_summary(db, student_code, program_id, registered_credits=tt_summary.registered_credits)
    return StudentSummaryResponse(student_code=student_code, **s)
