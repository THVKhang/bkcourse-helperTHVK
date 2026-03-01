from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Program, SemesterPlan, ProgramCourse, Subject

def list_programs(db: Session):
    return db.execute(select(Program).order_by(Program.program_id.asc())).scalars().all()

def get_program_plan(db: Session, program_id: int):
    program = db.get(Program, program_id)
    if not program:
        return None, []

    plan = db.execute(select(SemesterPlan).where(SemesterPlan.program_id == program_id)).scalars().all()
    course_types = db.execute(select(ProgramCourse).where(ProgramCourse.program_id == program_id)).scalars().all()
    type_by_id = {c.subject_id: c.course_type for c in course_types}

    subj_ids = list({p.subject_id for p in plan})
    subjects = db.execute(select(Subject).where(Subject.subject_id.in_(subj_ids))).scalars().all()
    subj_by_id = {s.subject_id: s for s in subjects}

    items = []
    for p in sorted(plan, key=lambda x: (x.semester_no, x.priority, x.subject_id)):
        subj = subj_by_id.get(p.subject_id)
        items.append({
            "semester_no": p.semester_no,
            "subject_id": p.subject_id,
            "subject_name": subj.subject_name if subj else None,
            "credits": int(subj.credits) if subj else None,
            "workload_score": float(subj.workload_score) if subj else None,
            "course_type": type_by_id.get(p.subject_id),
            "priority": p.priority,
            "is_required": p.is_required,
        })
    return program, items
