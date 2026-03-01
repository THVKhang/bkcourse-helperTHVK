from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional

class PasteImportRequest(BaseModel):
    student_code: str = Field(..., examples=["2212345"])
    term_code: str = Field(..., examples=["242"])
    raw_text: str

class ImportIssue(BaseModel):
    level: str = "WARN"
    message: str

class ParsedMeeting(BaseModel):
    day_of_week: int | None = None
    start_period: int | None = None
    duration: int | None = None
    room: str | None = None
    campus_code: str | None = None
    is_lab: bool | None = None

class ParsedSection(BaseModel):
    subject_id: str
    section_code: str
    instructor_lt: str | None = None
    instructor_btn: str | None = None
    meetings: List[ParsedMeeting] = []

class PasteImportResponse(BaseModel):
    import_id: int
    sections: List[ParsedSection]
    issues: List[ImportIssue] = []
