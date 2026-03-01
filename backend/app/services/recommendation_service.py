from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import SemesterPlan, ProgramCourse, Subject, StudentCourseHistory, Prerequisite
from app.schemas.recommendations import RecommendationRequest, RecommendationResponse, RecommendedCourse, RecommendationReason
from app.services.student_service import get_or_create_student
from app.core.scoring import recommendation_score

def _passed_set(db: Session, student_id: int) -> set[str]:
    rows = db.execute(
        select(StudentCourseHistory.subject_id).where(
            StudentCourseHistory.student_id == student_id,
            StudentCourseHistory.status == "PASSED",
        )
    ).all()
    return {r[0] for r in rows}

def _prereq_map(db: Session) -> dict[str, set[str]]:
    rows = db.execute(select(Prerequisite).where(Prerequisite.relation_type == "PREREQ")).scalars().all()
    mp: dict[str, set[str]] = {}
    for r in rows:
        mp.setdefault(r.subject_id, set()).add(r.prereq_subject_id)
    return mp

def _eligible(subject_id: str, passed: set[str], prereq_map: dict[str, set[str]]) -> bool:
    reqs = prereq_map.get(subject_id, set())
    return reqs.issubset(passed)

def recommend(db: Session, req: RecommendationRequest, program_total_credits: int) -> RecommendationResponse:
    student = get_or_create_student(db, req.student_code)
    passed = _passed_set(db, student.student_id)
    prereq_map = _prereq_map(db)

    # Semester plan ordered by priority then subject_id
    plan_rows = db.execute(select(SemesterPlan).where(
        SemesterPlan.program_id == req.program_id,
        SemesterPlan.semester_no == req.semester_no
    ).order_by(SemesterPlan.priority.asc(), SemesterPlan.subject_id.asc())).scalars().all()

    plan_ids = [p.subject_id for p in plan_rows]
    subjects = db.execute(select(Subject).where(Subject.subject_id.in_(plan_ids))).scalars().all() if plan_ids else []
    subj_by_id = {s.subject_id: s for s in subjects}

    type_rows = db.execute(select(ProgramCourse).where(
        ProgramCourse.program_id == req.program_id,
        ProgramCourse.subject_id.in_(plan_ids)
    )).scalars().all() if plan_ids else []
    type_by_id = {t.subject_id: t.course_type for t in type_rows}

    courses: list[RecommendedCourse] = []
    total_credits = 0
    total_workload = 0.0
    warnings: list[str] = []

    for sid in plan_ids:
        if sid in passed:
            continue
        if not _eligible(sid, passed, prereq_map):
            warnings.append(f"Chưa đủ tiên quyết cho {sid} (tạm loại khỏi gợi ý).")
            continue
        subj = subj_by_id.get(sid)
        if not subj:
            continue
        ctype = type_by_id.get(sid)

        if req.term_profile == "SUMMER" and ctype not in ("POLITICAL", "FREE_ELECTIVE"):
            continue

        courses.append(RecommendedCourse(
            subject_id=sid,
            subject_name=subj.subject_name,
            credits=int(subj.credits or 0),
            workload_score=float(subj.workload_score or 0.0),
            course_type=ctype,
            reasons=[RecommendationReason(code="ON_TRACK", text="Theo đúng kế hoạch học kỳ")],
        ))
        total_credits += int(subj.credits or 0)
        total_workload += float(subj.workload_score or 0.0)

    if total_credits < req.target_credits:
        cand_rows = db.execute(select(ProgramCourse).where(ProgramCourse.program_id == req.program_id)).scalars().all()
        cand_ids = []
        for r in cand_rows:
            if r.subject_id in passed or r.subject_id in plan_ids:
                continue
            if not _eligible(r.subject_id, passed, prereq_map):
                continue
            if req.term_profile == "SUMMER":
                if r.course_type not in ("POLITICAL", "FREE_ELECTIVE"):
                    continue
            else:
                if r.course_type != "FREE_ELECTIVE":
                    continue
            cand_ids.append(r.subject_id)

        cand_ids = list(set(cand_ids))
        if cand_ids:
            cand_subjects = db.execute(select(Subject).where(Subject.subject_id.in_(cand_ids))).scalars().all()
            ct_map = {r.subject_id: r.course_type for r in cand_rows}
            cand_subjects.sort(key=lambda s: recommendation_score(ct_map.get(s.subject_id), float(s.workload_score or 0.0)))

            for subj in cand_subjects:
                if total_credits >= req.target_credits:
                    break
                ctype = ct_map.get(subj.subject_id)
                reason_code = "SUMMER_LIGHT" if req.term_profile == "SUMMER" else "FILL_CREDITS"
                reason_text = "Học hè ưu tiên môn nhẹ" if req.term_profile == "SUMMER" else "Bù đủ tín chỉ mục tiêu"
                courses.append(RecommendedCourse(
                    subject_id=subj.subject_id,
                    subject_name=subj.subject_name,
                    credits=int(subj.credits or 0),
                    workload_score=float(subj.workload_score or 0.0),
                    course_type=ctype,
                    reasons=[RecommendationReason(code=reason_code, text=reason_text)],
                ))
                total_credits += int(subj.credits or 0)
                total_workload += float(subj.workload_score or 0.0)
        else:
            warnings.append("Không tìm thấy FREE_ELECTIVE/POLITICAL phù hợp để bù tín.")

    return RecommendationResponse(
        student_code=req.student_code,
        program_id=req.program_id,
        semester_no=req.semester_no,
        term_profile=req.term_profile,
        target_credits=req.target_credits,
        total_credits=total_credits,
        total_workload=round(total_workload, 2),
        courses=courses,
        warnings=warnings,
    )
