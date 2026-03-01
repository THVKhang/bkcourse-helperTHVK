from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.timetable import TimetableAddRequest, TimetableRemoveRequest
from app.services.timetable_service import add_item, remove_item, get_timetable

router = APIRouter(prefix="/timetable", tags=["timetable"])

@router.post("/items")
def add(req: TimetableAddRequest, db: Session = Depends(get_db)):
    item_id = add_item(db, req.student_code, req.term_code, req.section_id)
    return {"item_id": item_id}

@router.delete("/items")
def remove(req: TimetableRemoveRequest, db: Session = Depends(get_db)):
    remove_item(db, req.student_code, req.term_code, req.item_id)
    return {"ok": True}

@router.get("")
def get(student_code: str, term_code: str, db: Session = Depends(get_db)):
    items, summary = get_timetable(db, student_code, term_code)
    return {"items": [i.model_dump() for i in items], "summary": summary.model_dump()}
