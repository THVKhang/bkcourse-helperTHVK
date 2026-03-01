from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Text, Integer, Boolean, String, ForeignKey
from app.db.base import Base

class ProgramCourse(Base):
    __tablename__ = "program_courses"
    program_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("programs.program_id", ondelete="CASCADE"), primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(10), ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    course_type: Mapped[str] = mapped_column(Text)
    elective_group: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_semester: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_summer_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
