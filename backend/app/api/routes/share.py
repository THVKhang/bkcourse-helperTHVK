from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import SharedPlan
from app.schemas.share import ShareRequest, ShareResponse, ShareGetResponse

router = APIRouter()

@router.post("", response_model=ShareResponse)
def create_share(req: ShareRequest, db: Session = Depends(get_db)):
    plan = SharedPlan(
        student_id=req.student_id,
        term_code=req.term_code,
        plan_data=req.plan_data.model_dump()
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return ShareResponse(share_id=plan.share_id)

@router.get("/{share_id}", response_model=ShareGetResponse)
def get_share(share_id: str, db: Session = Depends(get_db)):
    plan = db.query(SharedPlan).filter(SharedPlan.share_id == share_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Shared plan not found")
    return ShareGetResponse(share_id=plan.share_id, plan_data=plan.plan_data)
