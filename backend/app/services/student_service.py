from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models import Student

def get_or_create_student(db: Session, student_code: str) -> Student:
    s = db.execute(select(Student).where(Student.student_code == student_code)).scalar_one_or_none()
    if s:
        return s
    try:
        s = Student(student_code=student_code, full_name=None)
        db.add(s)
        db.flush()
        return s
    except IntegrityError:
        db.rollback()
        s = db.execute(select(Student).where(Student.student_code == student_code)).scalar_one_or_none()
        if s:
            return s
        raise
