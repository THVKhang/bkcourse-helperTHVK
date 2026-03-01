from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Section, SectionMeeting, Subject
from app.core.conflict import MeetingSlot, count_conflicts
from app.core.scoring import schedule_score
from app.schemas.schedule import ScheduleOption

def generate_options(db: Session, section_ids: list[int], max_options: int = 3) -> list[ScheduleOption]:
    sections = db.execute(select(Section).where(Section.section_id.in_(section_ids))).scalars().all()
    sec_by_id = {int(s.section_id): s for s in sections}

    meets = db.execute(select(SectionMeeting).where(SectionMeeting.section_id.in_(section_ids))).scalars().all()
    meet_by_sec = {}
    for m in meets:
        meet_by_sec.setdefault(int(m.section_id), []).append(m)

    subj_ids = list({s.subject_id for s in sections})
    subjects = db.execute(select(Subject).where(Subject.subject_id.in_(subj_ids))).scalars().all()
    subj_by_id = {s.subject_id: s for s in subjects}

    def build(order_key):
        chosen: list[int] = []
        chosen_slots: list[MeetingSlot] = []
        credits = 0
        workload = 0.0
        for sid in sorted(section_ids, key=order_key):
            sec = sec_by_id.get(int(sid))
            if not sec:
                continue
            slots = []
            for m in meet_by_sec.get(int(sid), []):
                if m.day_of_week is None or m.start_period is None or m.duration is None:
                    continue
                slots.append(MeetingSlot(m.day_of_week, m.start_period, m.duration))

            ok = True
            for s in slots:
                for c in chosen_slots:
                    if s.day_of_week == c.day_of_week and not (s.end_period <= c.start_period or c.end_period <= s.start_period):
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                continue

            chosen.append(int(sid))
            chosen_slots.extend(slots)

            subj = subj_by_id.get(sec.subject_id)
            if subj:
                credits += int(subj.credits or 0)
                workload += float(subj.workload_score or 0.0)

        conf = count_conflicts(chosen_slots)
        return ScheduleOption(
            option_name="",
            section_ids=chosen,
            registered_credits=credits,
            workload_score=round(workload, 2),
            conflicts_count=conf,
        )

    def key_safe(sid: int):
        sec = sec_by_id.get(int(sid))
        subj = subj_by_id.get(sec.subject_id) if sec else None
        return (float(subj.workload_score or 0.0), -int(subj.credits or 0))

    def key_chal(sid: int):
        sec = sec_by_id.get(int(sid))
        subj = subj_by_id.get(sec.subject_id) if sec else None
        return (-int(subj.credits or 0), -float(subj.workload_score or 0.0))

    def key_bal(sid: int):
        sec = sec_by_id.get(int(sid))
        subj = subj_by_id.get(sec.subject_id) if sec else None
        return (-int(subj.credits or 0), float(subj.workload_score or 0.0))

    opts = [build(key_bal), build(key_safe), build(key_chal)]
    names = ["Balanced", "Safe", "Challenge"]
    for o, n in zip(opts, names):
        o.option_name = n

    uniq = []
    seen = set()
    for o in opts:
        key = tuple(sorted(o.section_ids))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(o)

    uniq.sort(key=lambda o: schedule_score(o.conflicts_count, o.workload_score), reverse=True)
    return uniq[:max_options]
