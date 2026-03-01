from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String
from app.db.base import Base

class Prerequisite(Base):
    __tablename__ = "prerequisites"
    subject_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    prereq_subject_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    relation_type: Mapped[str] = mapped_column(String(12), primary_key=True, default="PREREQ")  # PREREQ/COREQ/RECOMMENDED
