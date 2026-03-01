from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, ForeignKey, Text, DateTime, func
from app.db.base import Base

class TimetableItem(Base):
    __tablename__ = "timetable_items"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.student_id", ondelete="CASCADE"), index=True)
    term_code: Mapped[str] = mapped_column(Text, index=True)
    section_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sections.section_id", ondelete="CASCADE"), index=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
