-- sql/03_queries.sql

-- 1) Lấy import mới nhất của 1 student + term
-- (backend thường dùng để truy ra dataset hiện tại)
-- :student_code, :term_code
-- SELECT import_id FROM term_imports ... ORDER BY created_at DESC LIMIT 1

-- DBeaver test version:
-- SELECT import_id FROM public.term_imports WHERE term_code='242' ORDER BY import_id DESC LIMIT 1;

-- 2) Lấy tất cả môn + groups trong 1 import
-- :import_id
CREATE OR REPLACE VIEW public.v_import_sections AS
SELECT
  s.import_id,
  s.section_id,
  s.subject_id,
  sub.subject_name,
  sub.credits,
  sub.workload_score,
  s.section_code,
  s.enrolled,
  s.capacity,
  s.language,
  s.instructor_lt,
  s.instructor_btn
FROM public.sections s
JOIN public.subjects sub ON sub.subject_id = s.subject_id;

-- 3) Lấy meetings theo import (để render timetable candidates)
CREATE OR REPLACE VIEW public.v_import_meetings AS
SELECT
  s.import_id,
  s.subject_id,
  s.section_code,
  m.meeting_id,
  m.day_of_week,
  m.start_period,
  m.duration,
  m.room,
  m.campus_code,
  m.is_lab,
  m.warnings
FROM public.sections s
JOIN public.section_meetings m ON m.section_id = s.section_id;

-- 4) Tính tổng tín chỉ + workload hiện tại trong timetable (1 student + term)
-- :student_id, :term_code
CREATE OR REPLACE VIEW public.v_timetable_summary AS
SELECT
  ti.student_id,
  ti.term_code,
  SUM(sub.credits)::INT AS total_credits,
  SUM(sub.workload_score)::FLOAT AS total_workload,
  COUNT(DISTINCT sec.subject_id) AS distinct_courses
FROM public.timetable_items ti
JOIN public.sections sec ON sec.section_id = ti.section_id
JOIN public.subjects sub ON sub.subject_id = sec.subject_id
GROUP BY ti.student_id, ti.term_code;

-- 5) Check: một section có conflict với timetable hiện tại không?
-- backend có thể query kiểu:
-- SELECT EXISTS(SELECT 1 FROM ... ) as conflicts;
CREATE OR REPLACE FUNCTION public.fn_section_conflicts(student_id_in BIGINT, term_code_in TEXT, section_id_in BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  exists_conflict BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.timetable_items ti
    JOIN public.section_meetings m1 ON m1.section_id = ti.section_id
    JOIN public.section_meetings m2 ON m2.section_id = section_id_in
    WHERE ti.student_id = student_id_in
      AND ti.term_code = term_code_in
      AND m1.day_of_week IS NOT NULL
      AND m2.day_of_week IS NOT NULL
      AND m1.day_of_week = m2.day_of_week
      AND m1.start_period IS NOT NULL AND m1.duration IS NOT NULL
      AND m2.start_period IS NOT NULL AND m2.duration IS NOT NULL
      AND m1.start_period <= (m2.start_period + m2.duration - 1)
      AND m2.start_period <= (m1.start_period + m1.duration - 1)
  ) INTO exists_conflict;

  RETURN exists_conflict;
END;
$$ LANGUAGE plpgsql;