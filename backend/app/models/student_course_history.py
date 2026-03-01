from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Text, String, Numeric, DateTime, func, ForeignKey
from app.db.base import Base

class StudentCourseHistory(Base):
    __tablename__ = "student_course_history"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.student_id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[str] = mapped_column(String(10), ForeignKey("subjects.subject_id", ondelete="CASCADE"), index=True)
    term_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text)
    grade: Mapped[float | None] = mapped_column(Numeric(4,2), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
