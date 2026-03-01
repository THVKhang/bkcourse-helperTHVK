from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Numeric, Boolean, Text
from app.db.base import Base

class Subject(Base):
    __tablename__ = "subjects"
    subject_id: Mapped[str] = mapped_column(String(10), primary_key=True)   # GE1013, CO3061...
    subject_name: Mapped[str] = mapped_column(String(150))
    credits: Mapped[int] = mapped_column(Integer)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    workload_score: Mapped[float] = mapped_column(Numeric(4,2), default=5.00)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
