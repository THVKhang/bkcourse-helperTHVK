-- sql/06_seed_student_history_demo.sql

-- ensure student exists
INSERT INTO students(student_code, full_name)
VALUES ('2212345','Test User')
ON CONFLICT (student_code) DO NOTHING;

-- mark CO1001 as PASSED
INSERT INTO student_course_history(student_id, subject_id, term_code, status, grade)
SELECT s.student_id, 'CO1005', '241', 'PASSED', 8.0
FROM students s
WHERE s.student_code='2212345'
ON CONFLICT (student_id, subject_id, term_code) DO UPDATE
SET status=EXCLUDED.status, grade=EXCLUDED.grade;