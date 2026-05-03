from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict

SchedulePreference = Literal["COMPACT_DAYS", "MORNING_ONLY", "AFTERNOON_ONLY", "BALANCED", "SAME_CAMPUS", "CUSTOM_DAYS"]

class ScheduleGenerateRequest(BaseModel):
    student_code: str
    term_code: str
    subject_ids: List[str] = Field(..., description="Subject IDs to schedule")
    preferences: List[SchedulePreference] = ["BALANCED", "MORNING_ONLY", "COMPACT_DAYS"]
    campus_pref: Literal["ALL", "CS1", "CS2"] = "ALL"
    custom_days: List[int] = Field(default_factory=list, description="Specific days to attend, e.g. [2,3,6] = T2,T3,T6")
    allow_heavy_days: bool = Field(default=True, description="If False, heavily penalize days with >8 periods")
    program_type: Literal["STANDARD", "HIGH_QUALITY", "TALENT", "PFIEV"] = "STANDARD"

class ScheduleMeeting(BaseModel):
    day_of_week: int
    start_period: int
    duration: int
    room: Optional[str] = None
    campus_code: Optional[str] = None
    study_weeks: List[int] = []

class CampusConflict(BaseModel):
    day: int
    day_name: str
    from_campus: str
    to_campus: str
    gap_periods: int
    is_critical: bool

class ScheduleItem(BaseModel):
    section_id: int
    subject_id: str
    section_code: str
    subject_name: Optional[str] = None
    credits: int = 0
    instructor_lt: Optional[str] = None
    instructor_btn: Optional[str] = None
    meetings: List[ScheduleMeeting] = []

class ScheduleOption(BaseModel):
    option_name: str
    label: str = ""
    section_ids: List[int] = []
    items: List[ScheduleItem] = []
    registered_credits: int = 0
    workload_score: float = 0.0
    conflicts_count: int = 0
    days_used: List[int] = []
    score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    campus_conflicts: List[CampusConflict] = []
    warnings: List[str] = Field(default_factory=list)
    pref_match_pct: float = Field(default=100.0, description="Percentage of meetings matching the preference")

class ScheduleGenerateResponse(BaseModel):
    options: List[ScheduleOption]
    alternative_sections: Dict[str, List[ScheduleItem]] = Field(
        default_factory=dict,
        description="Maps subject_id to all its available sections for drag-and-drop replacement"
    )
    global_warnings: List[str] = []
