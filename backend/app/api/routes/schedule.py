from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schedule import ScheduleGenerateRequest, ScheduleGenerateResponse
from app.services.schedule_service import generate_options

router = APIRouter(prefix="/schedule", tags=["schedule"])

@router.post("/generate", response_model=ScheduleGenerateResponse)
def generate(req: ScheduleGenerateRequest, db: Session = Depends(get_db)):
    options, alternative_sections = generate_options(db, req)
    return ScheduleGenerateResponse(options=options, alternative_sections=alternative_sections)
