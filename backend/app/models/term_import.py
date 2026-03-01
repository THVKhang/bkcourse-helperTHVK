from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Text, DateTime, func, ForeignKey, LargeBinary, JSON
from app.db.base import Base

class TermImport(Base):
    __tablename__ = "term_imports"
    import_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    student_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("students.student_id", ondelete="CASCADE"), index=True)
    term_code: Mapped[str] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(Text)  # paste/csv/pdf
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class RawImportItem(Base):
    __tablename__ = "raw_import_items"
    raw_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    import_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("term_imports.import_id", ondelete="CASCADE"), index=True)
    raw_text: Mapped[str] = mapped_column(Text)
    raw_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="parsed")
    errors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
