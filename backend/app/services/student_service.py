from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Student

def get_or_create_student(db: Session, student_code: str) -> Student:
    s = db.execute(select(Student).where(Student.student_code == student_code)).scalar_one_or_none()
    if s:
        return s
    s = Student(student_code=student_code, full_name=None)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s
