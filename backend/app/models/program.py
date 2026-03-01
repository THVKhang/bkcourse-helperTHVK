from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Text, Integer, DateTime, func
from app.db.base import Base

class Program(Base):
    __tablename__ = "programs"
    program_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    cohort_year: Mapped[int] = mapped_column(Integer)
    total_credits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
