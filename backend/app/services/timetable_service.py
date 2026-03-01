from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func

from app.models import TimetableItem, Section, SectionMeeting, Subject
from app.schemas.timetable import TimetableItemOut, TimetableMeeting, TimetableSummary
from app.core.conflict import MeetingSlot, count_conflicts
from app.services.student_service import get_or_create_student

def add_item(db: Session, student_code: str, term_code: str, section_id: int) -> int:
    student = get_or_create_student(db, student_code)
    item = TimetableItem(student_id=student.student_id, term_code=term_code, section_id=section_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return int(item.id)

def remove_item(db: Session, student_code: str, term_code: str, item_id: int) -> None:
    student = get_or_create_student(db, student_code)
    db.execute(delete(TimetableItem).where(
        TimetableItem.id == item_id,
        TimetableItem.student_id == student.student_id,
        TimetableItem.term_code == term_code,
    ))
    db.commit()

def get_timetable(db: Session, student_code: str, term_code: str) -> tuple[list[TimetableItemOut], TimetableSummary]:
    student = get_or_create_student(db, student_code)

    items = db.execute(select(TimetableItem).where(
        TimetableItem.student_id == student.student_id,
        TimetableItem.term_code == term_code,
    )).scalars().all()

    if not items:
        return [], TimetableSummary(registered_credits=0, workload_score=0.0, conflicts_count=0)

    section_ids = [i.section_id for i in items]
    sections = db.execute(select(Section).where(Section.section_id.in_(section_ids))).scalars().all()
    sec_by_id = {s.section_id: s for s in sections}

    meets = db.execute(select(SectionMeeting).where(SectionMeeting.section_id.in_(section_ids))).scalars().all()
    meet_by_sec = {}
    for m in meets:
        meet_by_sec.setdefault(m.section_id, []).append(m)

    subj_ids = list({sec_by_id[sid].subject_id for sid in sec_by_id})
    subjects = db.execute(select(Subject).where(Subject.subject_id.in_(subj_ids))).scalars().all()
    subj_by_id = {s.subject_id: s for s in subjects}

    # Build slots
    all_slots = []
    item_slots = {}
    for it in items:
        for m in meet_by_sec.get(it.section_id, []):
            if m.day_of_week is None or m.start_period is None or m.duration is None:
                continue
            slot = MeetingSlot(day_of_week=m.day_of_week, start_period=m.start_period, duration=m.duration)
            all_slots.append(slot)
            item_slots.setdefault(it.id, []).append(slot)

    total_conflicts = count_conflicts(all_slots)

    has_conf = {}
    for it in items:
        slots = item_slots.get(it.id, [])
        flag = False
        for a in slots:
            for other in items:
                if other.id == it.id:
                    continue
                for b in item_slots.get(other.id, []):
                    if a.day_of_week == b.day_of_week and not (a.end_period <= b.start_period or b.end_period <= a.start_period):
                        flag = True
                        break
                if flag:
                    break
            if flag:
                break
        has_conf[it.id] = flag

    registered_credits = 0
    workload = 0.0
    out: list[TimetableItemOut] = []
    for it in items:
        sec = sec_by_id.get(it.section_id)
        subj = subj_by_id.get(sec.subject_id) if sec else None
        if subj:
            registered_credits += int(subj.credits or 0)
            workload += float(subj.workload_score or 0.0)
        out.append(TimetableItemOut(
            id=int(it.id),
            section_id=int(it.section_id),
            subject_id=sec.subject_id if sec else "",
            section_code=sec.section_code if sec else "",
            subject_name=subj.subject_name if subj else None,
            credits=int(subj.credits) if subj else None,
            meetings=[
                TimetableMeeting(day_of_week=m.day_of_week, start_period=m.start_period, duration=m.duration, room=m.room)
                for m in meet_by_sec.get(it.section_id, [])
            ],
            has_conflict=has_conf.get(it.id, False),
        ))

    summary = TimetableSummary(
        registered_credits=registered_credits,
        workload_score=round(workload, 2),
        conflicts_count=total_conflicts,
    )
    return out, summary
