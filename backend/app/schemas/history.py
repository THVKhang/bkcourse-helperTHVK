from __future__ import annotations
from pydantic import BaseModel
from typing import List, Literal

Status = Literal["PASSED", "FAILED", "IN_PROGRESS", "DROPPED"]

class HistoryItem(BaseModel):
    subject_id: str
    term_code: str | None = None
    status: Status = "PASSED"
    grade: float | None = None

class PostHistoryRequest(BaseModel):
    student_code: str
    items: List[HistoryItem]

class HistoryResponse(BaseModel):
    student_code: str
    items: List[HistoryItem]

class StudentSummaryResponse(BaseModel):
    student_code: str
    earned_credits: int
    registered_credits: int
    remaining_credits: int
    total_credits: int
