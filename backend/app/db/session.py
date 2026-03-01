from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.settings import settings

engine = create_engine(settings.DB_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
