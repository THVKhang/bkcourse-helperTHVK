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

app = FastAPI(title="BKCourse Helper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(programs_router)
app.include_router(history_router)
app.include_router(imports_router)
app.include_router(timetable_router)
app.include_router(schedule_router)
app.include_router(rec_router)
