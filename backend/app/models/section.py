from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Text, Integer, String, DateTime, func, ForeignKey
from app.db.base import Base

class Section(Base):
    __tablename__ = "sections"
    section_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    import_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("term_imports.import_id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[str] = mapped_column(String(10), ForeignKey("subjects.subject_id", ondelete="CASCADE"), index=True)
    section_code: Mapped[str] = mapped_column(String(30))
    enrolled: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructor_lt: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructor_btn: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
