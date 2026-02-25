-- sql/01_schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- 1) Students
-- =========================
CREATE TABLE IF NOT EXISTS students (
  student_id BIGSERIAL PRIMARY KEY,
  student_code VARCHAR(20) UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- 2) Subjects (course catalog)
-- =========================
CREATE TABLE IF NOT EXISTS subjects (
  subject_id VARCHAR(10) PRIMARY KEY,       -- GE1013, CO3061...
  subject_name VARCHAR(150) NOT NULL,
  credits INT NOT NULL,
  department VARCHAR(100),
  workload_score NUMERIC(4,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT chk_credits CHECK (credits BETWEEN 0 AND 10),
  CONSTRAINT chk_workload CHECK (workload_score BETWEEN 0 AND 10)
);
ALTER TABLE subjects DROP CONSTRAINT chk_credits;
ALTER TABLE subjects ADD CONSTRAINT chk_credits CHECK (credits BETWEEN 0 AND 10);
-- =========================
-- 3) Prerequisites
-- =========================
CREATE TABLE IF NOT EXISTS prerequisites (
  subject_id VARCHAR(10) NOT NULL,
  prereq_subject_id VARCHAR(10) NOT NULL,
  relation_type VARCHAR(12) NOT NULL DEFAULT 'PREREQ', -- PREREQ/COREQ/RECOMMENDED
  PRIMARY KEY (subject_id, prereq_subject_id, relation_type),
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  FOREIGN KEY (prereq_subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  CONSTRAINT chk_relation_type CHECK (relation_type IN ('PREREQ','COREQ','RECOMMENDED')),
  CONSTRAINT chk_not_self CHECK (subject_id <> prereq_subject_id)
);

CREATE INDEX IF NOT EXISTS idx_prereq_subject ON prerequisites(subject_id);
CREATE INDEX IF NOT EXISTS idx_prereq_required ON prerequisites(prereq_subject_id);

-- =========================
-- 4) Term imports (data per registration period/term)
-- =========================
CREATE TABLE IF NOT EXISTS term_imports (
  import_id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  term_code TEXT NOT NULL,  -- e.g. "242"
  source_type TEXT NOT NULL CHECK (source_type IN ('paste','csv','pdf')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imports_student_term
ON term_imports(student_id, term_code);

-- =========================
-- 5) Raw import items (idempotent with hash)
-- =========================
CREATE TABLE IF NOT EXISTS raw_import_items (
  raw_id BIGSERIAL PRIMARY KEY,
  import_id BIGINT NOT NULL REFERENCES term_imports(import_id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  raw_hash BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed','error')),
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_raw_per_import_hash
ON raw_import_items(import_id, raw_hash);

CREATE INDEX IF NOT EXISTS idx_raw_items_import
ON raw_import_items(import_id);

-- Auto hash trigger (optional but recommended)
CREATE OR REPLACE FUNCTION public.fn_set_raw_hash()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_hash IS NULL THEN
    NEW.raw_hash := digest(NEW.raw_text, 'sha256');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_raw_hash ON public.raw_import_items;
CREATE TRIGGER trg_set_raw_hash
BEFORE INSERT OR UPDATE OF raw_text
ON public.raw_import_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_raw_hash();

-- =========================
-- 6) Sections (group/section per subject per import)
-- =========================
CREATE TABLE IF NOT EXISTS sections (
  section_id BIGSERIAL PRIMARY KEY,
  import_id BIGINT NOT NULL REFERENCES term_imports(import_id) ON DELETE CASCADE,
  subject_id VARCHAR(10) NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  section_code VARCHAR(30) NOT NULL,     -- A01_A01, CC02...
  enrolled INT,
  capacity INT,
  language TEXT,
  instructor_lt TEXT,
  instructor_btn TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (import_id, subject_id, section_code)
);

CREATE INDEX IF NOT EXISTS idx_sections_import ON sections(import_id);

-- =========================
-- 7) Meetings (multiple per section)
-- Only care week-1 timetable => no weeks_pattern needed
-- =========================
CREATE TABLE IF NOT EXISTS section_meetings (
  meeting_id BIGSERIAL PRIMARY KEY,
  section_id BIGINT NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 2 AND 8),  -- NULL if unknown
  start_period INT CHECK (start_period BETWEEN 1 AND 15),
  duration INT CHECK (duration BETWEEN 1 AND 8),
  room VARCHAR(50),
  campus_code TEXT,
  is_lab BOOLEAN,
  warnings JSONB,
  CHECK (
    (start_period IS NULL AND duration IS NULL)
    OR (start_period IS NOT NULL AND duration IS NOT NULL AND start_period + duration - 1 <= 15)
  )
);

CREATE INDEX IF NOT EXISTS idx_meetings_section ON section_meetings(section_id);

-- =========================
-- 8) Timetable items (student selects sections)
-- =========================
CREATE TABLE IF NOT EXISTS timetable_items (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  term_code TEXT NOT NULL,
  section_id BIGINT NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, term_code, section_id)
);

CREATE INDEX IF NOT EXISTS idx_timetable_student_term
ON timetable_items(student_id, term_code);

-- =========================
-- 9) Conflict view (week-1 overlap only)
-- =========================
CREATE OR REPLACE VIEW v_timetable_conflicts AS
SELECT
  a.student_id,
  a.term_code,
  a.section_id AS section_a,
  b.section_id AS section_b,
  ma.day_of_week,
  ma.start_period AS start_a,
  (ma.start_period + ma.duration - 1) AS end_a,
  mb.start_period AS start_b,
  (mb.start_period + mb.duration - 1) AS end_b
FROM timetable_items a
JOIN timetable_items b
  ON a.student_id = b.student_id
 AND a.term_code = b.term_code
 AND a.section_id < b.section_id
JOIN section_meetings ma ON ma.section_id = a.section_id
JOIN section_meetings mb ON mb.section_id = b.section_id
WHERE ma.day_of_week IS NOT NULL
  AND mb.day_of_week IS NOT NULL
  AND ma.day_of_week = mb.day_of_week
  AND ma.start_period IS NOT NULL AND ma.duration IS NOT NULL
  AND mb.start_period IS NOT NULL AND mb.duration IS NOT NULL
  AND ma.start_period <= (mb.start_period + mb.duration - 1)
  AND mb.start_period <= (ma.start_period + ma.duration - 1);