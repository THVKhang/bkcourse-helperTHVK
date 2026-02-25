-- sql/99_reset_dev.sql
-- Reset DEV data (NOT dropping tables)

-- 1) Clear timetable + meetings + sections for all imports
TRUNCATE TABLE public.timetable_items RESTART IDENTITY CASCADE;

-- 2) Clear imported class data
TRUNCATE TABLE public.section_meetings RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sections RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.raw_import_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.term_imports RESTART IDENTITY CASCADE;

-- 3) Clear recommendation-related data (keep subjects/prereq if you want)
TRUNCATE TABLE public.student_course_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.semester_plan RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.program_courses RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.programs RESTART IDENTITY CASCADE;

-- 4) Optionally clear students/subjects/prerequisites too (commented)
TRUNCATE TABLE public.prerequisites RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.subjects RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.students RESTART IDENTITY CASCADE;