from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.recommendations import RecommendationRequest, RecommendationResponse
from app.models import Program
from app.services.recommendation_service import recommend

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("", response_model=RecommendationResponse)
def post(req: RecommendationRequest, db: Session = Depends(get_db)):
    program = db.get(Program, req.program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    total = int(program.total_credits if program.total_credits is not None else 128)
    return recommend(db, req, program_total_credits=total)
