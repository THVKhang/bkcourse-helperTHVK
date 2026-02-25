
A) SQL (sql/)
01_schema.sql

Tạo các bảng lõi: students, subjects, prerequisites, term_imports, raw_import_items, sections, section_meetings, timetable_items, view conflict…

02_seed_test.sql

Dữ liệu demo để test pipeline import/lịch (chạy xong là có vài môn, vài lớp, vài meeting).

03_queries.sql

Các câu query dùng thường xuyên: lấy data theo import_id, tính tổng credits/workload, xem conflict…

04_curriculum_schema.sql (mới)

Tạo bảng cho “kế hoạch 128 môn + đề xuất theo kỳ”:

programs (chương trình: CS2024…)

program_courses (môn thuộc chương trình + loại môn CORE/FREE_ELECTIVE/POLITICAL…)

semester_plan (HK1 nên học môn nào…)

student_course_history (môn đã học để tự loại)

05_seed_curriculum.sql (mới)

Seed dữ liệu kế hoạch theo học kỳ (ban đầu seed HK1–HK2 để test; sau đó seed đủ 128 môn).

06_seed_student_history_demo.sql (mới)

Seed lịch sử “đã học” demo (để test việc tự loại khỏi danh sách đề xuất).

07_recommendation_queries.sql (mới, optional)

View/CTE hỗ trợ gợi ý:

môn “eligible” (đủ tiên quyết)

môn còn thiếu theo semester

môn gợi ý cho summer (political/free elective nhẹ)

99_reset_dev.sql

Xoá dữ liệu dev/seed (tuỳ bạn viết: chỉ xoá data, không xoá schema).

B) Backend FastAPI (backend/)
backend/app/main.py

Khai báo FastAPI app + include routers:

/imports, /timetable, /schedule, /programs, /students, /recommendations

backend/app/settings.py

Đọc env: DB_URL, CORS, debug… (để không hardcode).

backend/app/db/session.py

Tạo SQLAlchemy engine + SessionLocal + dependency get_db().

backend/app/db/base.py

Chứa Base (DeclarativeBase) để ORM models kế thừa.

backend/app/models/*

Mỗi file tương ứng 1 bảng DB:

student.py ↔ students

subject.py ↔ subjects

prerequisite.py ↔ prerequisites

term_import.py ↔ term_imports

section.py ↔ sections

meeting.py ↔ section_meetings

timetable_item.py ↔ timetable_items

Nhóm mới cho Curriculum:

program.py ↔ programs

program_course.py ↔ program_courses

semester_plan.py ↔ semester_plan

student_course_history.py ↔ student_course_history

backend/app/schemas/*

Pydantic models (contract):

imports.py: request/response của import paste

timetable.py: add/remove timetable, summary

schedule.py: generate options, option result

Nhóm mới:

programs.py: response list programs + semester plan

history.py: request tick đã học + response history

recommendations.py: request đề xuất + response list đề xuất + reasons + totals

backend/app/api/routes/*

Endpoints HTTP (thin controllers):

imports.py: POST /imports/paste, GET /imports/{id}

timetable.py: POST /timetable/items, GET /timetable

schedule.py: POST /schedule/generate

Nhóm mới:

programs.py: GET /programs, GET /programs/{id}/plan

history.py: GET/POST /students/{id}/history

recommendations.py: POST /recommendations (trả list môn theo kỳ + extra elective)

backend/app/services/*

Business logic (đặt ở đây để routes gọn):

import_service.py: lưu raw, parse, upsert subjects/sections/meetings

timetable_service.py: add/remove, compute totals, conflict check

schedule_service.py: generate options (backtracking/OR-Tools sau)

curriculum_service.py (mới): lấy plan theo học kỳ, filter theo course_type

recommendation_service.py (mới): core logic gợi ý:

loại môn đã học

check tiên quyết

bù đủ 18–19 tín bằng 1 free elective

logic summer ưu tiên political/free elective nhẹ

backend/app/parsers/*

hcmut_portal_parser.py: parse raw portal text → structured JSON

rules.py: regex + helper rules

backend/app/core/*

conflict.py: hàm check overlap (day/period)

scoring.py: tính điểm schedule / recommendation

backend/app/tests/*

Unit tests quan trọng:

test_recommendations.py: test tự loại môn đã học + bù tín + summer

test_parser.py: test parser đọc được section/meeting

test_conflict.py: test overlap

C) Frontend Next.js (frontend/)
Pages (frontend/src/app/...)

/import : paste raw → preview

/planner: generate → timetable grid

/curriculum (mới): trang 128 môn + filter + tick “đã học”

/recommendations (mới): chọn học kỳ + term type (normal/summer) + list gợi ý + “Send to Planner”

Components

curriculum/

CurriculumFilters.tsx: bộ lọc (semester/type/credits/workload/search)

CourseGrid.tsx: lưới 128 môn

CourseCard.tsx: 1 card môn

MarkCompletedToggle.tsx: tick “đã học”

recommendations/

SemesterSelector.tsx: chọn program + semester + term profile

RecommendationList.tsx: list môn đề xuất

RecommendationSummary.tsx: tổng tín chỉ + workload + cảnh báo

ReasonChips.tsx: hiển thị lý do “theo tiến độ / bù tín / học hè / nhẹ”

frontend/src/lib/api.ts

Wrapper fetch gọi backend:

getPrograms(), getPlan()

postHistory()

getRecommendations()

postGenerateSchedule()

frontend/src/lib/types.ts

TypeScript types khớp schema backend (rất quan trọng để không lệch contract).