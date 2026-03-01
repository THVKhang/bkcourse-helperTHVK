from __future__ import annotations
from pydantic import BaseModel
from typing import List

class TimetableAddRequest(BaseModel):
    student_code: str
    term_code: str
    section_id: int

class TimetableRemoveRequest(BaseModel):
    student_code: str
    term_code: str
    item_id: int

class TimetableMeeting(BaseModel):
    day_of_week: int | None = None
    start_period: int | None = None
    duration: int | None = None
    room: str | None = None

class TimetableItemOut(BaseModel):
    id: int
    section_id: int
    subject_id: str
    section_code: str
    subject_name: str | None = None
    credits: int | None = None
    meetings: List[TimetableMeeting]
    has_conflict: bool = False

class TimetableSummary(BaseModel):
    registered_credits: int
    workload_score: float
    conflicts_count: int
