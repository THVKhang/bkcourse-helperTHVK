from __future__ import annotations
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

def db_dep() -> Session:
    return Depends(get_db)
