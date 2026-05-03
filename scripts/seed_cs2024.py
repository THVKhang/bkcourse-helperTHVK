import os, sys
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.program import Program
from app.models.subject import Subject
from app.models.program_course import ProgramCourse
from app.models.semester_plan import SemesterPlan

def seed():
    db: Session = SessionLocal()
    program_id = 1

    # Ensure Program exists
    prog = db.query(Program).filter_by(program_id=program_id).first()
    if not prog:
        prog = Program(program_id=program_id, name="Khoa học Máy tính", cohort_year=2024, total_credits=128)
        db.add(prog)
        db.commit()

    # (subject_id, name, credits, semester, course_type, elective_group, is_required)
    curriculum = [
        # === Semester 1 (16 tín) ===
        ("LA1003", "Anh văn 1", 2, 1, "BẮT BUỘC", None, True),
        ("MT1003", "Giải tích 1", 4, 1, "BẮT BUỘC", None, True),
        ("PH1003", "Vật lý 1", 4, 1, "BẮT BUỘC", None, True),
        ("CO1005", "Nhập môn điện toán", 3, 1, "BẮT BUỘC", None, True),
        ("CO1023", "Hệ thống số", 3, 1, "BẮT BUỘC", None, True),
        ("PE1009", "Giáo dục thể chất 1", 0, 1, "BẮT BUỘC", None, True),

        # === Semester 2 (17 tín) ===
        ("LA1005", "Anh văn 2", 2, 2, "BẮT BUỘC", None, True),
        ("MT1005", "Giải tích 2", 4, 2, "BẮT BUỘC", None, True),
        ("MT1007", "Đại số Tuyến tính", 3, 2, "BẮT BUỘC", None, True),
        ("CO1007", "Cấu trúc rời rạc cho KHMT", 4, 2, "BẮT BUỘC", None, True),
        ("CO1027", "Kỹ thuật lập trình", 3, 2, "BẮT BUỘC", None, True),
        ("PH1007", "Thí nghiệm Vật lý", 1, 2, "BẮT BUỘC", None, True),
        ("MI1003", "Giáo dục Quốc phòng", 0, 2, "BẮT BUỘC", None, True),
        ("PE1033", "Giáo dục thể chất 2", 0, 2, "BẮT BUỘC", None, True),

        # === Semester 3 (16 tín) ===
        ("LA1007", "Anh văn 3", 2, 3, "BẮT BUỘC", None, True),
        ("SP1031", "Triết học Mác - Lênin", 3, 3, "BẮT BUỘC", None, True),
        ("CO2007", "Kiến trúc máy tính", 4, 3, "BẮT BUỘC", None, True),
        ("CO2011", "Mô hình hóa toán học", 3, 3, "BẮT BUỘC", None, True),
        ("CO2003", "Cấu trúc dữ liệu và giải thuật", 4, 3, "BẮT BUỘC", None, True),

        # === Semester 4 (17 tín) ===
        ("LA1009", "Anh văn 4", 2, 4, "BẮT BUỘC", None, True),
        ("SP1033", "Kinh tế chính trị Mác - Lênin", 2, 4, "BẮT BUỘC", None, True),
        ("CO2017", "Hệ điều hành", 3, 4, "BẮT BUỘC", None, True),
        ("CO2039", "Lập trình nâng cao", 3, 4, "BẮT BUỘC", None, True),
        ("MT2013", "Xác suất và thống kê", 4, 4, "BẮT BUỘC", None, True),
        # Free elective 3 credits placeholder
        ("ELEC01", "Tự chọn tự do (HK4)", 3, 4, "TỰ CHỌN TỰ DO", "FREE", False),

        # === Semester 5 (16 tín) ===
        ("SP1035", "Chủ nghĩa xã hội khoa học", 2, 5, "BẮT BUỘC", None, True),
        ("CO2001", "Mạng máy tính", 3, 5, "BẮT BUỘC", None, True),
        ("CO2013", "Hệ cơ sở dữ liệu", 4, 5, "BẮT BUỘC", None, True),
        ("CO3001", "Công nghệ phần mềm", 3, 5, "BẮT BUỘC", None, True),
        ("CH1003", "Hóa đại cương", 3, 5, "BẮT BUỘC", None, True),
        # Elective A (chọn 1 tín)
        ("CO3101", "Đồ án tổng hợp - hướng AI", 1, 5, "TỰ CHỌN NHÓM A", "A", False),
        ("CO3103", "Đồ án tổng hợp - hướng CNPM", 1, 5, "TỰ CHỌN NHÓM A", "A", False),
        ("CO3105", "Đồ án tổng hợp - hướng HTTT", 1, 5, "TỰ CHỌN NHÓM A", "A", False),
        ("CO3127", "Đồ án tổng hợp - hướng KTDL", 1, 5, "TỰ CHỌN NHÓM A", "A", False),
        ("CO3119", "Đồ án mạng máy tính", 1, 5, "TỰ CHỌN NHÓM A", "A", False),

        # === Semester 6 (15 tín) ===
        ("SP1039", "Lịch sử Đảng CSVN", 2, 6, "BẮT BUỘC", None, True),
        ("CO3093", "Kỹ năng chuyên nghiệp cho kỹ sư", 3, 6, "BẮT BUỘC", None, True),
        ("CO3005", "Nguyên lý ngôn ngữ lập trình", 4, 6, "BẮT BUỘC", None, True),
        ("CO3335", "Thực tập ngoài trường", 2, 6, "BẮT BUỘC", None, True),
        # Free elective 3 credits
        ("ELEC02", "Tự chọn tự do (HK6)", 3, 6, "TỰ CHỌN TỰ DO", "FREE", False),
        # Elective B (chọn 1 tín)
        ("CO3107", "TT ĐAMH đa ngành - AI", 1, 6, "TỰ CHỌN NHÓM B", "B", False),
        ("CO3109", "TT ĐAMH đa ngành - CNPM", 1, 6, "TỰ CHỌN NHÓM B", "B", False),
        ("CO3111", "TT ĐAMH đa ngành - HTTT", 1, 6, "TỰ CHỌN NHÓM B", "B", False),

        # === Semester 7 (16 tín) ===
        ("SP1037", "Tư tưởng Hồ Chí Minh", 2, 7, "BẮT BUỘC", None, True),
        ("CO4029", "Đồ án chuyên ngành", 2, 7, "BẮT BUỘC", None, True),
        # Free elective 3 credits
        ("ELEC03", "Tự chọn tự do (HK7)", 3, 7, "TỰ CHỌN TỰ DO", "FREE", False),
        # Elective C (chọn 6 tín)
        ("CO3011", "Quản lý dự án phần mềm", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3015", "Kiểm tra phần mềm", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3017", "Kiến trúc phần mềm", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3021", "Hệ quản trị CSDL", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3027", "Thương mại điện tử", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3029", "Khai phá dữ liệu", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3033", "Bảo mật hệ thống thông tin", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3037", "Phát triển ứng dụng IoT", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3041", "Hệ thống thông minh", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3043", "Phát triển ứng dụng di động", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3045", "Lập trình game", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3049", "Lập trình web", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3051", "Hệ thống thiết bị di động", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3057", "Xử lý ảnh số và thị giác máy tính", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3059", "Đồ họa máy tính", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3061", "Nhập môn trí tuệ nhân tạo", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3065", "Công nghệ phần mềm nâng cao", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3067", "Tính toán song song", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3069", "Mật mã và an ninh mạng", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3085", "Xử lý ngôn ngữ tự nhiên", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3089", "Chủ đề nâng cao trong KHMT", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3115", "Phân tích và thiết kế hệ thống", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3117", "Học máy", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3129", "Bảo mật Phần mềm", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3131", "Công nghệ PM thế hệ mới", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3133", "Học sâu và Ứng dụng", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3135", "Lập trình cho AI và KHDL", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3137", "Dữ liệu lớn", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3139", "Chuyển đổi số", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3151", "Quản trị mạng", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO3153", "Đánh giá an toàn mạng", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO4031", "Kho dữ liệu và hệ HTQĐ", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO4033", "Phân tích dữ liệu lớn và TTDNKD", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO4035", "Hệ hoạch định tài nguyên", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO4037", "Hệ thống thông tin quản lý", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        ("CO4039", "Bảo mật sinh trắc", 3, 7, "TỰ CHỌN NHÓM C", "C", False),
        # Management electives (chọn 3 tín)
        ("IM1013", "Kinh tế học đại cương", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("IM1023", "Quản lý sản xuất cho kỹ sư", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("IM1025", "Quản lý dự án cho kỹ sư", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("IM1027", "Kinh tế kỹ thuật", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("IM3001", "Quản trị kinh doanh cho kỹ sư", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("IM1031", "Khởi nghiệp và Đổi mới sáng tạo", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),
        ("ME1019", "Quản lý năng suất và chất lượng", 3, 7, "TỰ CHỌN QUẢN LÝ", "MGT", False),

        # === Semester 8 (15 tín) ===
        ("SP1007", "Pháp luật Việt Nam đại cương", 2, 8, "BẮT BUỘC", None, True),
        ("CO4337", "Đồ án tốt nghiệp (KHMT)", 4, 8, "BẮT BUỘC", None, True),
        # Elective C (chọn 9 tín - same pool as semester 7)
        # We don't duplicate the C entries; they show in semester 7 pool
        # Free elective placeholder not needed since C pool covers it
    ]

    count = 0
    for row in curriculum:
        subj_id, subj_name, credits, sem, ctype, group, is_req = row

        try:
            # Upsert subject
            subj = db.query(Subject).filter_by(subject_id=subj_id).first()
            if not subj:
                subj = Subject(subject_id=subj_id, subject_name=subj_name, credits=credits)
                db.add(subj)
                db.flush()
            else:
                subj.subject_name = subj_name
                subj.credits = credits

            # Upsert program_course
            pc = db.query(ProgramCourse).filter_by(program_id=program_id, subject_id=subj_id).first()
            if not pc:
                pc = ProgramCourse(
                    program_id=program_id, subject_id=subj_id,
                    course_type=ctype, elective_group=group,
                    recommended_semester=sem, is_summer_friendly=(credits <= 2)
                )
                db.add(pc)
                db.flush()
            else:
                pc.course_type = ctype
                pc.elective_group = group
                pc.recommended_semester = sem

            # Upsert semester_plan (THIS WAS MISSING BEFORE!)
            sp = db.query(SemesterPlan).filter_by(
                program_id=program_id, semester_no=sem, subject_id=subj_id
            ).first()
            if not sp:
                sp = SemesterPlan(
                    program_id=program_id,
                    semester_no=sem,
                    subject_id=subj_id,
                    priority=10 if is_req else 50,
                    is_required=is_req,
                )
                db.add(sp)
                db.flush()
            else:
                sp.priority = 10 if is_req else 50
                sp.is_required = is_req

            db.commit()
            count += 1
        except Exception as e:
            db.rollback()
            print(f"  ⚠ Skipping {subj_id}: {e}")

    db.close()
    print(f"[OK] Seeded {count} items into subjects + program_courses + semester_plan.")

if __name__ == "__main__":
    seed()
