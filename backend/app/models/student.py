from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, BigInteger, Text, DateTime, func
from app.db.base import Base

class Student(Base):
    __tablename__ = "students"
    student_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    student_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
