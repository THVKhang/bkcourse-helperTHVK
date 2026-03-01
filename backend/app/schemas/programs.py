from __future__ import annotations
from pydantic import BaseModel
from typing import List

class ProgramOut(BaseModel):
    program_id: int
    name: str
    cohort_year: int
    total_credits: int | None = None

class SemesterPlanItem(BaseModel):
    semester_no: int
    subject_id: str
    subject_name: str | None = None
    credits: int | None = None
    workload_score: float | None = None
    course_type: str | None = None
    priority: int | None = None
    is_required: bool | None = None

class ProgramPlanResponse(BaseModel):
    program: ProgramOut
    items: List[SemesterPlanItem]
