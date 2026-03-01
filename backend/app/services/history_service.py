from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func

from app.models import StudentCourseHistory, Subject, Program
from app.schemas.history import HistoryItem
from app.services.student_service import get_or_create_student

def get_history(db: Session, student_code: str) -> list[HistoryItem]:
    student = get_or_create_student(db, student_code)
    rows = db.execute(select(StudentCourseHistory).where(StudentCourseHistory.student_id == student.student_id)).scalars().all()
    return [HistoryItem(subject_id=r.subject_id, term_code=r.term_code, status=r.status, grade=float(r.grade) if r.grade is not None else None) for r in rows]

def upsert_history(db: Session, student_code: str, items: list[HistoryItem]) -> list[HistoryItem]:
    student = get_or_create_student(db, student_code)
    db.execute(delete(StudentCourseHistory).where(StudentCourseHistory.student_id == student.student_id))
    for it in items:
        db.add(StudentCourseHistory(
            student_id=student.student_id,
            subject_id=it.subject_id,
            term_code=it.term_code,
            status=it.status,
            grade=it.grade,
        ))
    db.commit()
    return get_history(db, student_code)

def compute_summary(db: Session, student_code: str, program_id: int, registered_credits: int) -> dict:
    student = get_or_create_student(db, student_code)
    passed_ids = [r[0] for r in db.execute(
        select(StudentCourseHistory.subject_id).where(
            StudentCourseHistory.student_id == student.student_id,
            StudentCourseHistory.status == "PASSED"
        )
    ).all()]
    earned = 0
    if passed_ids:
        earned = int(db.execute(select(func.coalesce(func.sum(Subject.credits), 0)).where(Subject.subject_id.in_(passed_ids))).scalar_one())

    program = db.get(Program, program_id)
    total = int(program.total_credits if program and program.total_credits is not None else 128)
    remaining = max(total - earned, 0)
    return {"earned_credits": earned, "registered_credits": registered_credits, "remaining_credits": remaining, "total_credits": total}
