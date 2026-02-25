-- sql/07_recommendation_queries.sql

-- 1) View: môn đã PASSED của 1 student
CREATE OR REPLACE VIEW public.v_student_passed AS
SELECT student_id, subject_id
FROM public.student_course_history
WHERE status = 'PASSED';

-- 2) View: plan theo học kỳ + info môn
CREATE OR REPLACE VIEW public.v_semester_plan_detail AS
SELECT
  sp.program_id,
  sp.semester_no,
  sp.subject_id,
  sp.priority,
  sp.is_required,
  sub.subject_name,
  sub.credits,
  sub.workload_score
FROM public.semester_plan sp
JOIN public.subjects sub ON sub.subject_id = sp.subject_id;

-- 3) View: recommended candidates (plan trừ môn đã học)
-- Lọc theo student_id
CREATE OR REPLACE VIEW public.v_reco_candidates AS
SELECT
  p.program_id,
  p.semester_no,
  p.subject_id,
  p.subject_name,
  p.credits,
  p.workload_score,
  p.priority,
  p.is_required,
  pc.course_type
FROM public.v_semester_plan_detail p
LEFT JOIN public.program_courses pc
  ON pc.program_id = p.program_id AND pc.subject_id = p.subject_id;

-- Khi query bạn sẽ thêm WHERE:
-- WHERE program_id=? AND semester_no=? AND subject_id NOT IN (passed list)

-- 4) (Nâng cấp) Function: môn có đủ tiên quyết không?
-- Nếu môn có prerequisite PREREQ, student phải PASSED hết các prereq đó.
CREATE OR REPLACE FUNCTION public.fn_is_eligible(student_id_in BIGINT, subject_id_in VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM public.prerequisites pr
  LEFT JOIN public.student_course_history h
    ON h.student_id = student_id_in
   AND h.subject_id = pr.prereq_subject_id
   AND h.status = 'PASSED'
  WHERE pr.subject_id = subject_id_in
    AND pr.relation_type = 'PREREQ'
    AND h.subject_id IS NULL;

  RETURN (missing_count = 0);
END;
$$ LANGUAGE plpgsql;

-- 5) (Nâng cấp) View: candidates + eligible flag
-- (dùng được khi bạn muốn show "chưa đủ tiên quyết" trên UI)
CREATE OR REPLACE VIEW public.v_reco_candidates_with_eligibility AS
SELECT
  rc.*,
  NULL::BIGINT AS student_id,
  NULL::BOOLEAN AS eligible
FROM public.v_reco_candidates rc;
-- Lưu ý: view này chỉ là template.
-- Backend nên query v_reco_candidates rồi gọi fn_is_eligible(student_id, subject_id) cho từng môn,
-- hoặc viết query trực tiếp theo student_id để tránh NULL.