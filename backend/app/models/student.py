from __future__ import annotations
import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.base import Base

class Student(Base):
    __tablename__ = "students"
    student_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True, unique=True, index=True)
    student_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    program_type: Mapped[str] = mapped_column(String(20), default="STANDARD") # STANDARD, HIGH_QUALITY, TALENT, PFIEV
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
