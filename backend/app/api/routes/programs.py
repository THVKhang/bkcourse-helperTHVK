from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.programs import ProgramOut, ProgramPlanResponse, SemesterPlanItem
from app.services.curriculum_service import list_programs, get_program_plan

router = APIRouter(prefix="/programs", tags=["programs"])

@router.get("", response_model=list[ProgramOut])
def programs(db: Session = Depends(get_db)):
    rows = list_programs(db)
    return [ProgramOut(program_id=p.program_id, name=p.name, cohort_year=p.cohort_year, total_credits=p.total_credits) for p in rows]

@router.get("/{program_id}/plan", response_model=ProgramPlanResponse)
def plan(program_id: int, db: Session = Depends(get_db)):
    program, items = get_program_plan(db, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return ProgramPlanResponse(
        program=ProgramOut(program_id=program.program_id, name=program.name, cohort_year=program.cohort_year, total_credits=program.total_credits),
        items=[SemesterPlanItem(**it) for it in items],
    )
