-- sql/04_curriculum_schema.sql

-- =========================
-- Programs (curriculum versions)
-- =========================
CREATE TABLE IF NOT EXISTS programs (
  program_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,              -- e.g. "CS 2024 - AI track"
  cohort_year INT NOT NULL,        -- 2024
  total_credits INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name, cohort_year)
);

-- Course types for recommendation
-- CORE: bắt buộc theo khung
-- ELECTIVE_GROUP: tự chọn theo nhóm (A/B/C...)
-- FREE_ELECTIVE: tự chọn tự do (bù tín)
-- POLITICAL: chính trị (ưu tiên hè)
-- PE: thể chất, MILITARY: GDQP (nếu muốn)
CREATE TABLE IF NOT EXISTS program_courses (
  program_id BIGINT NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  subject_id VARCHAR(10) NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  course_type TEXT NOT NULL,
  elective_group TEXT,                 -- 'A','B','C'... or NULL
  recommended_semester INT,            -- 1..8, nullable
  is_summer_friendly BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (program_id, subject_id),
  CHECK (course_type IN ('CORE','ELECTIVE_GROUP','FREE_ELECTIVE','POLITICAL','PE','MILITARY'))
);

CREATE INDEX IF NOT EXISTS idx_program_courses_type
ON program_courses(program_id, course_type);

-- Semester plan: môn nên học ở HK n
CREATE TABLE IF NOT EXISTS semester_plan (
  program_id BIGINT NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
  semester_no INT NOT NULL,
  subject_id VARCHAR(10) NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  priority INT DEFAULT 100,
  is_required BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (program_id, semester_no, subject_id),
  CHECK (semester_no BETWEEN 1 AND 8)
);

CREATE INDEX IF NOT EXISTS idx_semester_plan
ON semester_plan(program_id, semester_no, priority);

-- Student history: để loại môn đã học khỏi đề xuất
CREATE TABLE IF NOT EXISTS student_course_history (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id VARCHAR(10) NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  term_code TEXT,
  status TEXT NOT NULL,    -- PASSED/FAILED/IN_PROGRESS/DROPPED
  grade NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, subject_id, term_code),
  CHECK (status IN ('PASSED','FAILED','IN_PROGRESS','DROPPED'))
);

CREATE INDEX IF NOT EXISTS idx_history_student
ON student_course_history(student_id, status);