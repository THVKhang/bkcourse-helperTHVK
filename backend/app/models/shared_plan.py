from __future__ import annotations
import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, JSON, DateTime, func, ForeignKey
from app.db.base import Base

class SharedPlan(Base):
    __tablename__ = "shared_plans"
    
    share_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    term_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    plan_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
