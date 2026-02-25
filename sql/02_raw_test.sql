-- sql/02_seed_test.sql
-- Seed data để test schedule/timetable

-- 1) Student
INSERT INTO public.students(student_code, full_name)
VALUES ('2212345', 'Test User')
ON CONFLICT (student_code) DO NOTHING;

-- 2) Subject demo (dùng luôn chung với curriculum seed nếu có)
INSERT INTO public.subjects(subject_id, subject_name, credits, department, workload_score)
VALUES
('GE1013','Khoa học trái đất',4,'GE',6.0),
('CO2001','Data Structures',3,'CO',7.5),
('CO2002','Computer Architecture',3,'CO',7.0)
ON CONFLICT (subject_id) DO UPDATE
SET subject_name=EXCLUDED.subject_name,
    credits=EXCLUDED.credits,
    workload_score=EXCLUDED.workload_score;

-- 3) Create import session
INSERT INTO public.term_imports(student_id, term_code, source_type)
SELECT student_id, '242', 'paste'
FROM public.students
WHERE student_code='2212345'
RETURNING import_id;

-- Nếu bạn không dùng RETURNING, chạy câu dưới để lấy import mới nhất:
-- SELECT import_id FROM public.term_imports ORDER BY import_id DESC LIMIT 1;

-- Giả sử import_id là 1 (hãy thay = import_id thật nếu khác)
-- 4) Store raw (idempotent)
INSERT INTO public.raw_import_items(import_id, raw_text, status)
VALUES (1, 'RAW: demo import for term 242', 'parsed')
ON CONFLICT (import_id, raw_hash) DO NOTHING;

-- 5) Sections (2 section trùng lịch để test conflict)
INSERT INTO public.sections(import_id, subject_id, section_code, enrolled, capacity, language, instructor_lt)
VALUES
(1, 'GE1013', 'A01_A01', 35, 35, 'V', 'Chưa/Đang phân công'),
(1, 'GE1013', 'A01_A02', 30, 35, 'V', 'Chưa/Đang phân công'),
(1, 'CO2001', 'L01', 20, 60, 'V', 'Chưa/Đang phân công'),
(1, 'CO2002', 'L01', 20, 60, 'V', 'Chưa/Đang phân công')
ON CONFLICT (import_id, subject_id, section_code) DO UPDATE
SET enrolled=EXCLUDED.enrolled, capacity=EXCLUDED.capacity;

-- 6) Meetings
-- GE1013 A01_A01: Thứ 3 tiết 2-3
INSERT INTO public.section_meetings(section_id, day_of_week, start_period, duration, room, campus_code)
SELECT s.section_id, 3, 2, 2, 'B4-406', '1'
FROM public.sections s
WHERE s.import_id=1 AND s.subject_id='GE1013' AND s.section_code='A01_A01';

-- GE1013 A01_A02: cũng Thứ 3 tiết 2-3 => conflict
INSERT INTO public.section_meetings(section_id, day_of_week, start_period, duration, room, campus_code)
SELECT s.section_id, 3, 2, 2, 'B4-406', '1'
FROM public.sections s
WHERE s.import_id=1 AND s.subject_id='GE1013' AND s.section_code='A01_A02';

-- CO2001 L01: Thứ 4 tiết 4-5
INSERT INTO public.section_meetings(section_id, day_of_week, start_period, duration, room, campus_code)
SELECT s.section_id, 4, 4, 2, 'H6-201', '1'
FROM public.sections s
WHERE s.import_id=1 AND s.subject_id='CO2001' AND s.section_code='L01';

-- CO2002 L01: Thứ 6 tiết 2-3
INSERT INTO public.section_meetings(section_id, day_of_week, start_period, duration, room, campus_code)
SELECT s.section_id, 6, 2, 2, 'H6-301', '1'
FROM public.sections s
WHERE s.import_id=1 AND s.subject_id='CO2002' AND s.section_code='L01';

-- 7) Add timetable items (add 2 section trùng lịch)
INSERT INTO public.timetable_items(student_id, term_code, section_id)
SELECT st.student_id, '242', s.section_id
FROM public.students st
JOIN public.sections s ON s.import_id=1
WHERE st.student_code='2212345'
  AND s.subject_id='GE1013'
  AND s.section_code IN ('A01_A01','A01_A02')
ON CONFLICT (student_id, term_code, section_id) DO NOTHING;

-- 8) Check conflict
SELECT * FROM public.v_timetable_conflicts
WHERE student_id = (SELECT student_id FROM public.students WHERE student_code='2212345')
  AND term_code='242';