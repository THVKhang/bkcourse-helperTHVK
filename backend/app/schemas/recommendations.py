from __future__ import annotations
from pydantic import BaseModel
from typing import List, Literal

TermProfile = Literal["NORMAL", "SUMMER"]

class RecommendationRequest(BaseModel):
    student_code: str
    program_id: int
    semester_no: int
    term_profile: TermProfile = "NORMAL"
    target_credits: int = 18

class RecommendationReason(BaseModel):
    code: str
    text: str

class RecommendedCourse(BaseModel):
    subject_id: str
    subject_name: str | None = None
    credits: int
    workload_score: float
    course_type: str | None = None
    reasons: List[RecommendationReason] = []

class RecommendationResponse(BaseModel):
    student_code: str
    program_id: int
    semester_no: int
    term_profile: TermProfile
    target_credits: int
    total_credits: int
    total_workload: float
    courses: List[RecommendedCourse]
    warnings: List[str] = []
