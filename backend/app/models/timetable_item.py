from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, ForeignKey, Text, DateTime, func
from app.db.base import Base

class TimetableItem(Base):
    __tablename__ = "timetable_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), index=True)
    term_code: Mapped[str] = mapped_column(Text, index=True)
    section_id: Mapped[int] = mapped_column(Integer, ForeignKey("sections.section_id", ondelete="CASCADE"), index=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
