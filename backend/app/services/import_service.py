from __future__ import annotations
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import TermImport, RawImportItem, Section, SectionMeeting, Subject
from app.schemas.imports import PasteImportRequest, PasteImportResponse
from app.parsers.hcmut_portal_parser import parse_portal_text
from app.services.student_service import get_or_create_student

def paste_import(db: Session, req: PasteImportRequest) -> PasteImportResponse:
    student = get_or_create_student(db, req.student_code)
    sections, issues, parsed_subjects = parse_portal_text(req.raw_text)

    # Upsert subjects to ensure we have the correct credits and names
    for ps in parsed_subjects:
        subj = db.get(Subject, ps.subject_id)
        if not subj:
            subj = Subject(
                subject_id=ps.subject_id,
                subject_name=ps.subject_name,
                credits=int(ps.credits),
                workload_score=5.00,
                is_active=True
            )
            db.add(subj)
        else:
            subj.subject_name = ps.subject_name
            subj.credits = int(ps.credits)
    db.flush()

    # Ensure all subjects referenced by sections exist (placeholder if missing)
    for s in sections:
        subj = db.get(Subject, s.subject_id)
        if not subj:
            subj = Subject(
                subject_id=s.subject_id,
                subject_name="Môn học (Tự động tạo)",
                credits=3,  # Default
                workload_score=5.00,
                is_active=True
            )
            db.add(subj)
            db.flush()

    imp = TermImport(student_id=student.student_id, term_code=req.term_code, source_type="paste")
    db.add(imp)
    db.flush()  # get import_id

    raw_hash = hashlib.sha256(req.raw_text.encode("utf-8")).digest()
    db.add(RawImportItem(import_id=imp.import_id, raw_text=req.raw_text, raw_hash=raw_hash, status="parsed", errors=None))

    for s in sections:
        sec = Section(
            import_id=imp.import_id,
            subject_id=s.subject_id,
            section_code=s.section_code,
            instructor_lt=s.instructor_lt,
            instructor_btn=s.instructor_btn,
        )
        db.add(sec)
        db.flush()
        for m in s.meetings:
            db.add(SectionMeeting(
                section_id=sec.section_id,
                day_of_week=m.day_of_week,
                start_period=m.start_period,
                duration=m.duration,
                room=m.room,
                campus_code=m.campus_code,
                is_lab=m.is_lab,
                study_weeks=m.study_weeks,
                warnings=None,
            ))
    db.commit()
    return PasteImportResponse(import_id=int(imp.import_id), sections=sections, issues=issues)

def get_import(db: Session, import_id: int) -> dict:
    imp = db.get(TermImport, import_id)
    if not imp:
        return {}
    secs = db.execute(select(Section).where(Section.import_id == import_id)).scalars().all()
    sec_ids = [s.section_id for s in secs]
    meets = db.execute(select(SectionMeeting).where(SectionMeeting.section_id.in_(sec_ids))).scalars().all() if sec_ids else []
    meet_by_sec = {}
    for m in meets:
        meet_by_sec.setdefault(m.section_id, []).append(m)

    return {
        "import_id": int(imp.import_id),
        "student_id": int(imp.student_id),
        "term_code": imp.term_code,
        "source_type": imp.source_type,
        "created_at": str(imp.created_at),
        "sections": [
            {
                "section_id": int(s.section_id),
                "subject_id": s.subject_id,
                "section_code": s.section_code,
                "instructor_lt": s.instructor_lt,
                "instructor_btn": s.instructor_btn,
                "meetings": [
                    {
                        "day_of_week": m.day_of_week,
                        "start_period": m.start_period,
                        "duration": m.duration,
                        "room": m.room,
                    } for m in meet_by_sec.get(s.section_id, [])
                ],
            } for s in secs
        ],
    }
