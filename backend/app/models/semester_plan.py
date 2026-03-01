from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, Boolean, String, ForeignKey
from app.db.base import Base

class SemesterPlan(Base):
    __tablename__ = "semester_plan"
    program_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("programs.program_id", ondelete="CASCADE"), primary_key=True)
    semester_no: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(10), ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
