from pydantic import BaseModel
from typing import Dict, Any
from app.schemas.schedule import ScheduleOption

class ShareRequest(BaseModel):
    student_id: str | None = None
    term_code: str | None = None
    plan_data: ScheduleOption

class ShareResponse(BaseModel):
    share_id: str

class ShareGetResponse(BaseModel):
    share_id: str
    plan_data: ScheduleOption
