from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.imports import PasteImportRequest, PasteImportResponse
from app.services.import_service import paste_import, get_import

router = APIRouter(prefix="/imports", tags=["imports"])

@router.post("/paste", response_model=PasteImportResponse)
def paste(req: PasteImportRequest, db: Session = Depends(get_db)):
    return paste_import(db, req)

@router.get("/{import_id}")
def get_one(import_id: int, db: Session = Depends(get_db)):
    data = get_import(db, import_id)
    if not data:
        raise HTTPException(status_code=404, detail="Import not found")
    return data
