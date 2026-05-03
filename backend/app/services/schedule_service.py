from __future__ import annotations
import logging
import random
from typing import List, Dict, Set, Tuple

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Section, SectionMeeting, Subject, TermImport
from app.core.conflict import MeetingSlot, CampusSlot, count_conflicts, detect_campus_conflicts, score_plan
from app.schemas.schedule import (
    ScheduleGenerateRequest, ScheduleOption, ScheduleItem, ScheduleMeeting, CampusConflict,
)
from app.services.student_service import get_or_create_student


# ---- helpers ----

def _load_sections_for_subjects(
    db: Session, student_code: str, term_code: str, subject_ids: List[str], program_type: str = "STANDARD"
) -> Dict[str, List[Section]]:
    """Get all sections per subject from ALL of the student's imports for the term."""
    student = get_or_create_student(db, student_code)
    imports = db.execute(
        select(TermImport)
        .where(TermImport.student_id == student.student_id, TermImport.term_code == term_code)
    ).scalars().all()
    if not imports:
        return {}
    import_ids = [imp.import_id for imp in imports]
    sections = db.execute(
        select(Section).where(
            Section.import_id.in_(import_ids),
            Section.subject_id.in_(subject_ids),
        )
    ).scalars().all()
    seen = set()
    by_subj: Dict[str, List[Section]] = {}
    for s in sections:
        # Strict program type filtering
        if s.class_type != program_type:
            continue
        key = (s.subject_id, s.section_code)
        if key in seen:
            continue
        seen.add(key)
        by_subj.setdefault(s.subject_id, []).append(s)
    return by_subj


def _load_meetings(db: Session, section_ids: List[int]) -> Dict[int, List[SectionMeeting]]:
    if not section_ids:
        return {}
    meets = db.execute(
        select(SectionMeeting).where(SectionMeeting.section_id.in_(section_ids))
    ).scalars().all()
    by_sec: Dict[int, List[SectionMeeting]] = {}
    for m in meets:
        by_sec.setdefault(int(m.section_id), []).append(m)
    return by_sec


def _to_slots(meetings: List[SectionMeeting]) -> List[MeetingSlot]:
    return [
        MeetingSlot(m.day_of_week, m.start_period, m.duration)
        for m in meetings
        if m.day_of_week is not None and m.start_period is not None and m.duration is not None
    ]


def _to_campus_slots(meetings: List[SectionMeeting]) -> List[CampusSlot]:
    return [
        CampusSlot(m.day_of_week, m.start_period, m.duration, _infer_campus(m))
        for m in meetings
        if m.day_of_week is not None and m.start_period is not None and m.duration is not None
    ]


def _infer_campus(m: SectionMeeting) -> str | None:
    """Infer campus from campus_code field or room name."""
    if m.campus_code:
        return m.campus_code
    if m.room:
        r = m.room.upper()
        # CS2 (Dĩ An): rooms starting with H (H1, H2, H3, H6...)
        if r.startswith("H"):
            return "2"
        # CS1 (LTK): rooms starting with B, C (B4, C4, C5, C6...)
        if r.startswith(("B", "C")):
            return "1"
    return None


# ---- Study-Weeks Aware Conflict Detection ----

def _get_study_weeks(m: SectionMeeting) -> List[int]:
    """Extract study_weeks list from a meeting, or empty list if unavailable."""
    if isinstance(m.study_weeks, list):
        return m.study_weeks
    return []


def _weeks_overlap(w1: List[int], w2: List[int]) -> bool:
    """Check if two study_weeks lists have any overlapping weeks.
    If either list is empty, assume they overlap (safe default)."""
    if not w1 or not w2:
        return True  # No data → assume overlap (conservative)
    return bool(set(w1) & set(w2))


def _has_conflict_with(
    new_meets: List[SectionMeeting],
    existing_meets: List[SectionMeeting],
) -> bool:
    """Check time conflicts between new meetings and existing ones.
    Uses study_weeks to avoid false positives: if two meetings are on the same
    day and period but never share a study week, they don't conflict."""
    for nm in new_meets:
        if nm.day_of_week is None or nm.start_period is None or nm.duration is None:
            continue
        n_end = nm.start_period + nm.duration
        for em in existing_meets:
            if em.day_of_week is None or em.start_period is None or em.duration is None:
                continue
            if nm.day_of_week != em.day_of_week:
                continue
            e_end = em.start_period + em.duration
            # Check time overlap
            if not (n_end <= em.start_period or e_end <= nm.start_period):
                # Time overlaps — check if study weeks also overlap
                if _weeks_overlap(_get_study_weeks(nm), _get_study_weeks(em)):
                    return True
    return False


def _has_campus_conflict_in_day(new_meets: List[SectionMeeting], existing_meets: List[SectionMeeting]) -> bool:
    """Check if adding new meetings creates a cross-campus day."""
    combined = new_meets + existing_meets
    by_day: Dict[int, Set[str]] = {}
    for m in combined:
        if m.day_of_week is None:
            continue
        campus = _infer_campus(m)
        if campus:
            by_day.setdefault(m.day_of_week, set()).add(campus)
    return any(len(cs) > 1 for cs in by_day.values())


# ---- preference helpers ----

def _calc_pref_match_pct(slots: List[MeetingSlot], preference: str) -> float:
    """Calculate what percentage of meetings match the given preference."""
    if not slots:
        return 100.0
    if preference == "MORNING_ONLY":
        matching = sum(1 for s in slots if s.end_period <= 7)
        return (matching / len(slots)) * 100
    if preference == "AFTERNOON_ONLY":
        matching = sum(1 for s in slots if s.start_period >= 7)
        return (matching / len(slots)) * 100
    if preference == "COMPACT_DAYS":
        days = len(set(s.day_of_week for s in slots))
        return max(0, (6 - days) / 3) * 100
    return 100.0  # BALANCED / CUSTOM_DAYS is always 100%


# ---- plan builder ----

def _build_plan(
    db: Session,
    sections_per_subject: Dict[str, List[Section]],
    meet_by_sec: Dict[int, List[SectionMeeting]],
    subj_by_id: Dict[str, Subject],
    preference: str,
    campus_pref: str,
    custom_days: List[int],
    allow_heavy_days: bool,
) -> Tuple[List[ScheduleOption], List[str]]:
    """Build schedule options. Returns (options, warnings)."""

    build_warnings: List[str] = []

    # ====== Phase 1: Pre-filter sections ======

    # 1a. Filter by campus
    pref_code = None
    if campus_pref == "CS1":
        pref_code = "1"
    elif campus_pref == "CS2":
        pref_code = "2"

    filtered: Dict[str, List[Section]] = {}
    for sid, sections in sections_per_subject.items():
        valid_secs = []
        for sec in sections:
            meets = meet_by_sec.get(int(sec.section_id), [])

            # Campus filter
            if pref_code:
                bad_campus = False
                for m in meets:
                    if m.day_of_week is None:
                        continue
                    campus = _infer_campus(m)
                    if campus and campus != pref_code:
                        bad_campus = True
                        break
                if bad_campus:
                    continue

            # Custom days filter (HARD constraint)
            if preference == "CUSTOM_DAYS" and custom_days:
                bad_day = False
                for m in meets:
                    if m.day_of_week is not None and m.day_of_week not in custom_days:
                        bad_day = True
                        break
                if bad_day:
                    continue

            valid_secs.append(sec)

        if not valid_secs:
            subj = subj_by_id.get(sid)
            subj_name = subj.subject_name if subj else sid
            if preference == "CUSTOM_DAYS" and custom_days:
                day_names = {2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7"}
                chosen = ", ".join(day_names.get(d, f"T{d}") for d in sorted(custom_days))
                build_warnings.append(f"Môn {sid} ({subj_name}) không có lớp nào vào {chosen}.")
            elif pref_code:
                cs_label = "CS1 (LTK)" if pref_code == "1" else "CS2 (Dĩ An)"
                build_warnings.append(f"Môn {sid} ({subj_name}) không có lớp nào tại {cs_label}.")
            return [], build_warnings
        filtered[sid] = valid_secs

    if not filtered:
        return [], build_warnings

    # ====== Phase 2: DFS with Diversity (Randomized Restarts) ======

    subject_ids = sorted(list(filtered.keys()), key=lambda sid: len(filtered[sid]))

    all_found_combos: List[Tuple[float, List[Section]]] = []
    seen_keys: Set[Tuple[int, ...]] = set()
    MAX_PLANS = 10
    MAX_ITERATIONS_PER_RUN = 100000
    NUM_RUNS = 3

    for run_idx in range(NUM_RUNS):
        # Shuffle section order within each subject for diversity
        run_filtered = {}
        for sid in subject_ids:
            secs = list(filtered[sid])
            if run_idx > 0:
                random.shuffle(secs)
            run_filtered[sid] = secs

        iterations = 0
        run_combos: List[Tuple[float, List[Section]]] = []

        def dfs(subj_idx: int, current_combo: List[Section], current_meets: List[SectionMeeting]):
            nonlocal iterations, run_combos

            if iterations >= MAX_ITERATIONS_PER_RUN:
                return
            if len(run_combos) >= 5:
                return  # 5 per run is enough

            if subj_idx == len(subject_ids):
                # Full valid combo found — score it
                combo_key = tuple(sorted(int(s.section_id) for s in current_combo))
                if combo_key in seen_keys:
                    return
                seen_keys.add(combo_key)

                all_slots = []
                all_campus = []
                for sec in current_combo:
                    ms = meet_by_sec.get(int(sec.section_id), [])
                    all_slots.extend(_to_slots(ms))
                    all_campus.extend(_to_campus_slots(ms))

                days = set(s.day_of_week for s in all_slots)
                cc = detect_campus_conflicts(all_campus)
                sc, _ = score_plan(all_slots, all_campus, cc, preference, len(days), allow_heavy_days)
                run_combos.append((sc, list(current_combo)))
                return

            sid = subject_ids[subj_idx]
            for sec in run_filtered[sid]:
                iterations += 1
                if iterations >= MAX_ITERATIONS_PER_RUN:
                    break

                meets = meet_by_sec.get(int(sec.section_id), [])

                # Pruning 1: Time conflict (study-weeks aware)
                if _has_conflict_with(meets, current_meets):
                    continue

                # Pruning 2: Campus conflict in the same day (if ALL)
                if campus_pref == "ALL":
                    if _has_campus_conflict_in_day(meets, current_meets):
                        continue

                # Valid — branch deeper
                dfs(subj_idx + 1, current_combo + [sec], current_meets + meets)

        dfs(0, [], [])
        all_found_combos.extend(run_combos)

    # Sort all found combos by score, take top 10
    all_found_combos.sort(key=lambda x: x[0], reverse=True)
    top_combos = all_found_combos[:MAX_PLANS]

    # ====== Phase 2b: Greedy Fallback (safety net) ======
    if not top_combos:
        logger.warning("[Scheduler] DFS found 0 results, trying greedy fallback")
        for start_idx in range(min(MAX_PLANS, len(filtered[subject_ids[0]])) if subject_ids else 1):
            chosen: List[Section] = []
            chosen_meets: List[SectionMeeting] = []
            for i, sid in enumerate(subject_ids):
                picked = False
                sections_to_try = [filtered[sid][start_idx % len(filtered[sid])]] if i == 0 else filtered[sid]
                for sec in sections_to_try:
                    meets = meet_by_sec.get(int(sec.section_id), [])
                    if not _has_conflict_with(meets, chosen_meets):
                        if campus_pref == "ALL" and _has_campus_conflict_in_day(meets, chosen_meets):
                            continue
                        chosen.append(sec)
                        chosen_meets.extend(meets)
                        picked = True
                        break
                if not picked:
                    chosen.append(filtered[sid][0])
                    chosen_meets.extend(meet_by_sec.get(int(filtered[sid][0].section_id), []))

            all_slots = []
            all_campus = []
            for sec in chosen:
                ms = meet_by_sec.get(int(sec.section_id), [])
                all_slots.extend(_to_slots(ms))
                all_campus.extend(_to_campus_slots(ms))
            days = set(s.day_of_week for s in all_slots)
            cc = detect_campus_conflicts(all_campus)
            sc, _ = score_plan(all_slots, all_campus, cc, preference, len(days), allow_heavy_days)
            top_combos.append((sc, chosen))

        top_combos.sort(key=lambda x: x[0], reverse=True)
        top_combos = top_combos[:MAX_PLANS]

    # ====== Phase 3: Build result objects ======
    results: List[ScheduleOption] = []
    labels = {
        "BALANCED": "Cân bằng",
        "MORNING_ONLY": "Chỉ buổi sáng (tiết 2-6)",
        "AFTERNOON_ONLY": "Chỉ buổi chiều (tiết 7-12)",
        "COMPACT_DAYS": "Gom ít ngày",
        "CUSTOM_DAYS": "Ngày tùy chọn",
    }

    for rank, (score, combo) in enumerate(top_combos):
        items: List[ScheduleItem] = []
        all_slots: List[MeetingSlot] = []
        all_campus: List[CampusSlot] = []
        total_credits = 0
        total_workload = 0.0
        days_set: Set[int] = set()

        for sec in combo:
            subj = subj_by_id.get(sec.subject_id)
            meets = meet_by_sec.get(int(sec.section_id), [])
            slots = _to_slots(meets)
            campus_s = _to_campus_slots(meets)
            all_slots.extend(slots)
            all_campus.extend(campus_s)
            for s in slots:
                days_set.add(s.day_of_week)

            items.append(ScheduleItem(
                section_id=int(sec.section_id),
                subject_id=sec.subject_id,
                section_code=sec.section_code,
                subject_name=subj.subject_name if subj else None,
                credits=int(subj.credits or 0) if subj else 0,
                instructor_lt=sec.instructor_lt,
                instructor_btn=sec.instructor_btn,
                meetings=[
                    ScheduleMeeting(
                        day_of_week=m.day_of_week,
                        start_period=m.start_period,
                        duration=m.duration,
                        room=m.room,
                        campus_code=_infer_campus(m),
                        study_weeks=m.study_weeks if isinstance(m.study_weeks, list) else [],
                    )
                    for m in meets
                    if m.day_of_week is not None and m.start_period is not None and m.duration is not None
                ],
            ))
            if subj:
                total_credits += int(subj.credits or 0)
                total_workload += float(subj.workload_score or 0.0)

        campus_conflicts = detect_campus_conflicts(all_campus)
        plan_score, breakdown = score_plan(all_slots, all_campus, campus_conflicts, preference, len(days_set), allow_heavy_days)

        warnings = list(build_warnings)  # include pre-filter warnings
        if preference == "AFTERNOON_ONLY":
            for item in items:
                if item.meetings and all(m.start_period < 7 for m in item.meetings):
                    warnings.append(f"Môn {item.subject_id} không có nhóm chiều, hệ thống đã xếp tạm vào buổi sáng.")
        elif preference == "MORNING_ONLY":
            for item in items:
                if item.meetings and all(m.start_period >= 7 for m in item.meetings):
                    warnings.append(f"Môn {item.subject_id} không có nhóm sáng, hệ thống đã xếp tạm vào buổi chiều.")

        # Calculate preference match percentage
        pref_match_pct = _calc_pref_match_pct(all_slots, preference)
        if pref_match_pct < 100:
            logger.info(f"[Scheduler] Không tìm được lịch 100% {preference}. Best match: {pref_match_pct:.0f}%")

        results.append(ScheduleOption(
            option_name=preference,
            label=labels.get(preference, preference),
            section_ids=[int(s.section_id) for s in combo],
            items=items,
            registered_credits=total_credits,
            workload_score=round(total_workload, 2),
            conflicts_count=count_conflicts(all_slots),
            days_used=sorted(days_set),
            score=plan_score,
            score_breakdown=breakdown,
            campus_conflicts=[CampusConflict(**c) for c in campus_conflicts],
            warnings=warnings,
            pref_match_pct=round(pref_match_pct, 0),
        ))

    return results, build_warnings

# ---- public API ----

def generate_options(
    db: Session, req: ScheduleGenerateRequest
) -> Tuple[List[ScheduleOption], Dict[str, List[ScheduleItem]]]:
    sections_per_subject = _load_sections_for_subjects(
        db, req.student_code, req.term_code, req.subject_ids, req.program_type
    )
    if not sections_per_subject:
        return [], {}

    all_sec_ids = [int(s.section_id) for secs in sections_per_subject.values() for s in secs]
    meet_by_sec = _load_meetings(db, all_sec_ids)

    subj_ids = list(sections_per_subject.keys())
    subjects = db.execute(select(Subject).where(Subject.subject_id.in_(subj_ids))).scalars().all()
    subj_by_id = {s.subject_id: s for s in subjects}

    options_by_key: Dict[Tuple[int, ...], ScheduleOption] = {}

    for pref in req.preferences:
        opts, warnings = _build_plan(
            db, sections_per_subject, meet_by_sec, subj_by_id,
            pref, req.campus_pref, req.custom_days, req.allow_heavy_days,
        )
        for opt in opts:
            key = tuple(sorted(opt.section_ids))
            if key in options_by_key:
                # Plan is identical to a previous preference, just merge the label
                if opt.label not in options_by_key[key].label:
                    options_by_key[key].label += f" + {opt.label}"
                continue

            options_by_key[key] = opt

    options = list(options_by_key.values())

    # Sort by score descending — best plan first
    options.sort(key=lambda o: o.score, reverse=True)

    # Relabel: Plan A (best), Plan B, ...
    for i, opt in enumerate(options):
        letter = chr(65 + i)
        suffix = " ⭐" if i == 0 and len(options) > 1 else ""
        opt.label = f"{opt.label}{suffix}"

    # Build alternative_sections for drag and drop
    alternative_sections: Dict[str, List[ScheduleItem]] = {}
    for sid, secs in sections_per_subject.items():
        subj = subj_by_id.get(sid)
        items = []
        for sec in secs:
            meets = meet_by_sec.get(int(sec.section_id), [])
            items.append(ScheduleItem(
                section_id=int(sec.section_id),
                subject_id=sec.subject_id,
                section_code=sec.section_code,
                subject_name=subj.subject_name if subj else None,
                credits=int(subj.credits or 0) if subj else 0,
                instructor_lt=sec.instructor_lt,
                instructor_btn=sec.instructor_btn,
                meetings=[
                    ScheduleMeeting(
                        day_of_week=m.day_of_week,
                        start_period=m.start_period,
                        duration=m.duration,
                        room=m.room,
                        campus_code=_infer_campus(m),
                        study_weeks=m.study_weeks if isinstance(m.study_weeks, list) else [],
                    )
                    for m in meets
                    if m.day_of_week is not None and m.start_period is not None and m.duration is not None
                ],
            ))
        alternative_sections[sid] = items

    return options, alternative_sections
