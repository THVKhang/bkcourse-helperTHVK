from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List

class ScheduleGenerateRequest(BaseModel):
    section_ids: List[int] = Field(..., description="Candidate section IDs")
    max_options: int = 3

class ScheduleOption(BaseModel):
    option_name: str
    section_ids: List[int]
    registered_credits: int
    workload_score: float
    conflicts_count: int

class ScheduleGenerateResponse(BaseModel):
    options: List[ScheduleOption]
