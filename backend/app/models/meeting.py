from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, String, Text, Boolean, ForeignKey, JSON
from app.db.base import Base

class SectionMeeting(Base):
    __tablename__ = "section_meetings"
    meeting_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    section_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sections.section_id", ondelete="CASCADE"), index=True)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_period: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    room: Mapped[str | None] = mapped_column(String(50), nullable=True)
    campus_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_lab: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    warnings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
