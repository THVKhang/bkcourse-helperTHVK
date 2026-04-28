from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings
from app.api.routes.health import router as health_router
from app.api.routes.imports import router as imports_router
from app.api.routes.timetable import router as timetable_router
from app.api.routes.schedule import router as schedule_router
from app.api.routes.programs import router as programs_router
from app.api.routes.history import router as history_router
from app.api.routes.recommendations import router as rec_router
from app.api.routes.share import router as share_router
from app.api.routes.auth import router as auth_router

from app.db.session import engine
from app.db.base import Base
import app.models  # ensure models are imported

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BKCourse Helper API")

import os
origins = [
    settings.CORS_ORIGINS,
    "http://localhost:3000",
]
# On Vercel, frontend and backend share the same domain
if os.environ.get("VERCEL"):
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(programs_router)
app.include_router(history_router)
app.include_router(imports_router)
app.include_router(timetable_router)
app.include_router(schedule_router)
app.include_router(rec_router)
app.include_router(share_router, prefix="/share", tags=["share"])
