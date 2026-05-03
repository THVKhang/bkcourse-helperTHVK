"""
Reseed all programs with EXACT mapping from CSV filename -> official program name & faculty.
No fuzzy matching. Every CSV must be explicitly mapped or skipped.
"""
import os, sys, glob
import pandas as pd
from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

root_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(os.path.join(root_dir, 'backend'))
load_dotenv(os.path.join(root_dir, '.env'))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.program import Program
from app.models.subject import Subject
from app.models.program_course import ProgramCourse
from app.models.semester_plan import SemesterPlan

# ============================================================
# EXACT mapping: CSV basename -> (official name, faculty)
# Uses KHGD-based CSVs where available (proper semester data).
# Old CTDT-based CSVs (khoa_*.csv) are skipped in favor of KHGD versions.
# ============================================================
CSV_TO_PROGRAM = {
    # ── KHOA CƠ KHÍ ──
    "khoa_co_khi":              None,  # Old CTDT, replaced by KHGD below
    "bao_duong_cong_nghiep_khgd": ("Bảo dưỡng Công nghiệp", "KHOA CƠ KHÍ"),
    "cong_nghe_det_may":        ("Công nghệ Dệt, May",         "KHOA CƠ KHÍ"),
    "ky_thuat_co_khi":          ("Kỹ thuật Cơ khí",            "KHOA CƠ KHÍ"),
    "ky_thuat_co_ien_tu":       ("Kỹ thuật Cơ điện tử",        "KHOA CƠ KHÍ"),
    "ky_thuat_det":             ("Kỹ thuật Dệt",               "KHOA CƠ KHÍ"),
    "ky_thuat_nhiet":           ("Kỹ thuật Nhiệt",             "KHOA CƠ KHÍ"),

    # ── KHOA KỸ THUẬT ĐỊA CHẤT VÀ DẦU KHÍ ──
    "khoa_ky_thuat_ia_chat_va_dau_khi": None,  # Old CTDT
    "ky_thuat_dia_chat_khgd":   ("Kỹ thuật Địa chất",          "KHOA KỸ THUẬT ĐỊA CHẤT VÀ DẦU KHÍ"),
    "ky_thuat_dau_khi":         ("Kỹ thuật Dầu khí",           "KHOA KỸ THUẬT ĐỊA CHẤT VÀ DẦU KHÍ"),
    "ia_ky_thuat_xay_dung":     ("Địa Kỹ thuật Xây dựng",     "KHOA KỸ THUẬT ĐỊA CHẤT VÀ DẦU KHÍ"),

    # ── KHOA ĐIỆN - ĐIỆN TỬ ──
    "khoa_ien_ien_tu":          None,  # Old CTDT
    "ky_thuat_dieu_khien_tdh_khgd": ("Kỹ thuật Điều khiển và Tự động hóa", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "ky_thuat_ien":             ("Kỹ thuật Điện",              "KHOA ĐIỆN - ĐIỆN TỬ"),
    "ky_thuat_ien_tu_vien_thong": ("Kỹ thuật Điện tử - Viễn thông", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "thiet_ke_vi_mach":         ("Thiết kế vi mạch",           "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ien_ky_thuat_ien_tu_vien_thong":
        ("Song ngành: Kỹ thuật Điện - Kỹ thuật Điện tử - Viễn thông", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ien_ky_thuat_ieu_khien_va_tu_ong_hoa":
        ("Song ngành: Kỹ thuật Điện - Kỹ thuật Điều khiển và Tự động hóa", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ien_tu_vien_thong_ky_thuat_ien":
        ("Song ngành: Kỹ thuật Điện tử - Viễn thông - Kỹ thuật Điện", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ien_tu_vien_thong_ky_thuat_ieu_khien_va_tu_ong_hoa":
        ("Song ngành: Kỹ thuật Điện tử - Viễn thông - Kỹ thuật Điều khiển và Tự động hóa", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ieu_khien_va_tu_ong_hoa_ky_thuat_ien":
        ("Song ngành: Kỹ thuật Điều khiển và Tự động hóa - Kỹ thuật Điện", "KHOA ĐIỆN - ĐIỆN TỬ"),
    "song_nganh_ky_thuat_ieu_khien_va_tu_ong_hoa_ky_thuat_ien_tu_vien_thong":
        ("Song ngành: Kỹ thuật Điều khiển và Tự động hóa - Kỹ thuật Điện tử - Viễn thông", "KHOA ĐIỆN - ĐIỆN TỬ"),

    # ── KHOA KỸ THUẬT GIAO THÔNG ──
    "khoa_ky_thuat_giao_thong": None,  # Faculty overview, skip
    "hang_khong_khgd":          ("Kỹ thuật Hàng không",        "KHOA KỸ THUẬT GIAO THÔNG"),
    "hang_khong":               None,  # Old CTDT, replaced by hang_khong_khgd
    "ky_thuat_o_to":            None,  # Old CTDT
    "ky_thuat_o_to_khgd":       ("Kỹ thuật Ô tô",             "KHOA KỸ THUẬT GIAO THÔNG"),
    "ky_thuat_tau_thuy":        ("Kỹ thuật Tàu thủy",         "KHOA KỸ THUẬT GIAO THÔNG"),
    "song_nganh_ky_thuat_tau_thuy_hang_khong":
        ("Song ngành: Kỹ thuật Tàu thủy - Hàng không", "KHOA KỸ THUẬT GIAO THÔNG"),

    # ── KHOA KỸ THUẬT HÓA HỌC ──
    "khoa_ky_thuat_hoa_hoc":    None,  # Old CTDT
    "cong_nghe_sinh_hoc_khgd":  ("Công nghệ Sinh học",         "KHOA KỸ THUẬT HÓA HỌC"),
    "ky_thuat_hoa_hoc":         ("Kỹ thuật Hóa học",           "KHOA KỸ THUẬT HÓA HỌC"),
    "cong_nghe_thuc_pham":      ("Công nghệ Thực phẩm",        "KHOA KỸ THUẬT HÓA HỌC"),

    # ── KHOA MÔI TRƯỜNG VÀ TÀI NGUYÊN ──
    "khoa_moi_truong_va_tai_nguyen": None,  # Old CTDT
    "ky_thuat_moi_truong_khgd": ("Kỹ thuật Môi trường",        "KHOA MÔI TRƯỜNG VÀ TÀI NGUYÊN"),
    "quan_ly_tai_nguyen_va_moi_truong": ("Quản lý Tài nguyên và Môi trường", "KHOA MÔI TRƯỜNG VÀ TÀI NGUYÊN"),

    # ── KHOA KHOA HỌC VÀ KỸ THUẬT MÁY TÍNH ──
    "khoa_khoa_hoc_va_ky_thuat_may_tinh": None,  # Old CTDT
    "khoa_hoc_may_tinh_khgd":   ("Khoa học Máy tính",          "KHOA KHOA HỌC VÀ KỸ THUẬT MÁY TÍNH"),
    "ky_thuat_may_tinh":        None,  # Old corrupt PDF
    "ky_thuat_may_tinh_khgd":   None,  # New PDF also corrupt (pdfplumber error)

    # ── KHOA QUẢN LÝ CÔNG NGHIỆP ──
    "khoa_quan_ly_cong_nghiep": None,  # Old CTDT
    "quan_ly_cong_nghiep_khgd": ("Quản lý công nghiệp",        "KHOA QUẢN LÝ CÔNG NGHIỆP"),
    "ky_thuat_he_thong_cong_nghiep": ("Kỹ thuật Hệ thống Công nghiệp", "KHOA QUẢN LÝ CÔNG NGHIỆP"),
    "logistics_va_quan_ly_chuoi_cung_ung": ("Logistics và Quản lý Chuỗi cung ứng", "KHOA QUẢN LÝ CÔNG NGHIỆP"),

    # ── KHOA KHOA HỌC ỨNG DỤNG ──
    "khoa_khoa_hoc_ung_dung":   None,  # Old CTDT
    "co_ky_thuat_khgd":         ("Cơ Kỹ thuật",                "KHOA KHOA HỌC ỨNG DỤNG"),
    "khoa_hoc_du_lieu":         ("Khoa học dữ liệu",           "KHOA KHOA HỌC ỨNG DỤNG"),
    "vat_ly_ky_thuat":          ("Vật lý Kỹ thuật",            "KHOA KHOA HỌC ỨNG DỤNG"),

    # ── KHOA CÔNG NGHỆ VẬT LIỆU ──
    "khoa_cong_nghe_vat_lieu":  None,  # Old CTDT
    "ky_thuat_vat_lieu_khgd":   ("Kỹ thuật Vật liệu",         "KHOA CÔNG NGHỆ VẬT LIỆU"),
    "cong_nghe_ky_thuat_vat_lieu_xay_dung": ("Công nghệ Kỹ thuật Vật liệu Xây dựng", "KHOA CÔNG NGHỆ VẬT LIỆU"),

    # ── KHOA KỸ THUẬT XÂY DỰNG ──
    "khoa_ky_thuat_xay_dung":   None,  # Old CTDT
    "ky_thuat_cong_trinh_bien_khgd": ("Kỹ thuật Công trình biển", "KHOA KỸ THUẬT XÂY DỰNG"),
    "ky_thuat_co_so_ha_tang":   ("Kỹ thuật Cơ sở hạ tầng",    "KHOA KỸ THUẬT XÂY DỰNG"),
    "ky_thuat_xay_dung":        ("Kỹ thuật Xây dựng",          "KHOA KỸ THUẬT XÂY DỰNG"),
    "kien_truc":                ("Kiến trúc",                   "KHOA KỸ THUẬT XÂY DỰNG"),
    "ky_thuat_trac_ia_ban_o":   ("Kỹ thuật Trắc địa - Bản đồ","KHOA KỸ THUẬT XÂY DỰNG"),
    "ky_thuat_xay_dung_cong_trinh_thuy": ("Kỹ thuật Xây dựng Công trình Thủy", "KHOA KỸ THUẬT XÂY DỰNG"),
    "ky_thuat_xay_dung_cong_trinh_giao_thong": ("Kỹ thuật Xây dựng Công trình Giao thông", "KHOA KỸ THUẬT XÂY DỰNG"),
    "kinh_te_xay_dung":         ("Kinh tế Xây dựng",           "KHOA KỸ THUẬT XÂY DỰNG"),

    # ── VIỆT PHÁP ──
    "viet_phap":                None,  # Faculty overview, skip
    "vat_lieu_polymer_va_composite": ("Vật liệu Polymer và Composite", "VIỆT PHÁP"),
    "vat_lieu_va_nang_luong":   ("Vật liệu và Năng lượng",     "VIỆT PHÁP"),
    "co_dien_tu_viet_phap_khgd": ("Kỹ thuật Cơ điện tử (Việt Pháp)", "VIỆT PHÁP"),
    "hang_khong_viet_phap_khgd": ("Hàng không (Việt Pháp)",     "VIỆT PHÁP"),

    # ── CHƯƠNG TRÌNH TIÊN TIẾN ──
    "vi_mach_tien_tien_khgd":   ("Vi mạch - Hệ thống phần cứng (Tiên tiến)", "CHƯƠNG TRÌNH TIÊN TIẾN"),
    "nang_luong_tien_tien_khgd": ("Hệ thống Năng lượng (Tiên tiến)", "CHƯƠNG TRÌNH TIÊN TIẾN"),
    "dktdh_tien_tien_khgd":     ("Kỹ thuật Điều khiển và Tự động hoá (Tiên tiến)", "CHƯƠNG TRÌNH TIÊN TIẾN"),
    "vien_thong_tien_tien_khgd": ("Hệ thống Viễn thông (Tiên tiến)", "CHƯƠNG TRÌNH TIÊN TIẾN"),
}

# ============================================================
# Programs that exist officially but have no CSV data yet.
# ============================================================
PROGRAMS_WITHOUT_CSV = [
    ("Kỹ thuật máy tính",                       "KHOA KHOA HỌC VÀ KỸ THUẬT MÁY TÍNH"),  # PDF corrupt
    ("Công nghệ Thông tin (Vừa Làm Vừa Học)",  "KHOA KHOA HỌC VÀ KỸ THUẬT MÁY TÍNH"),
    # Viet Phap (remaining without KHGD)
    ("Viễn thông (Việt Pháp)",                  "VIỆT PHÁP"),
    ("Hệ thống năng lượng điện (Việt Pháp)",   "VIỆT PHÁP"),
    ("Kỹ thuật và quản lý nước đô thị (Việt Pháp)", "VIỆT PHÁP"),
    ("Xây dựng dân dụng - Công nghiệp và Hiệu quả (Việt Pháp)", "VIỆT PHÁP"),
]


def seed_all():
    db: Session = SessionLocal()

    try:
        print("Truncating old data...")
        db.execute(text("TRUNCATE TABLE semester_plan CASCADE;"))
        db.execute(text("TRUNCATE TABLE program_courses CASCADE;"))
        db.execute(text("TRUNCATE TABLE programs CASCADE;"))
        db.commit()
        print("Data truncated successfully.")

        csv_dir = os.path.join(root_dir, 'data', 'parsed_csvs')
        csv_files = glob.glob(os.path.join(csv_dir, '*.csv'))
        total_subjects = 0
        total_programs = 0
        next_program_id = 1
        program_cache = {}  # name -> Program

        # Phase 1: Seed from CSV files
        for csv_path in sorted(csv_files):
            basename = os.path.basename(csv_path).replace('.csv', '')

            if basename not in CSV_TO_PROGRAM:
                print(f"  [WARN] Unknown CSV file, skipping: {basename}")
                continue

            mapping = CSV_TO_PROGRAM[basename]
            if mapping is None:
                print(f"  [SKIP] {basename}")
                continue

            program_name, faculty = mapping

            # Get or create program
            if program_name in program_cache:
                prog = program_cache[program_name]
            else:
                prog = Program(
                    program_id=next_program_id,
                    name=program_name,
                    faculty=faculty,
                    cohort_year=2024,
                    total_credits=130,
                )
                db.add(prog)
                db.flush()
                program_cache[program_name] = prog
                next_program_id += 1
                total_programs += 1

            program_id = prog.program_id

            # Read CSV
            df = pd.read_csv(csv_path)

            count = 0
            for _, row in df.iterrows():
                subj_id = str(row['subject_id']).strip()
                subj_name = str(row['subject_name']).strip()
                credits = int(row['credits'])
                sem = int(row['semester_no'])
                ctype = str(row['course_type']).strip()
                group = str(row['elective_group']).strip() if pd.notna(row.get('elective_group')) else None
                is_req = bool(row['is_required'])

                try:
                    # 1. Subject (upsert)
                    subj = db.query(Subject).filter_by(subject_id=subj_id).first()
                    if not subj:
                        subj = Subject(subject_id=subj_id, subject_name=subj_name, credits=credits)
                        db.add(subj)
                        db.flush()

                    # 2. Program Course (upsert)
                    pc = db.query(ProgramCourse).filter_by(program_id=program_id, subject_id=subj_id).first()
                    if not pc:
                        pc = ProgramCourse(
                            program_id=program_id, subject_id=subj_id,
                            course_type=ctype, elective_group=group,
                            recommended_semester=sem, is_summer_friendly=(credits <= 2),
                        )
                        db.add(pc)
                        db.flush()

                    # 3. Semester Plan (upsert)
                    sp = db.query(SemesterPlan).filter_by(
                        program_id=program_id, semester_no=sem, subject_id=subj_id
                    ).first()
                    if not sp:
                        sp = SemesterPlan(
                            program_id=program_id, semester_no=sem, subject_id=subj_id,
                            priority=10 if is_req else 50, is_required=is_req,
                        )
                        db.add(sp)

                    count += 1
                    total_subjects += 1
                except Exception as e:
                    db.rollback()
                    print(f"  [ERR] Skipping {subj_id} in {basename}: {e}")

            # Batch commit per CSV file (much faster for remote DB)
            db.commit()
            print(f"  [OK] {basename} -> {program_name} ({count} subjects, ID={program_id})")

        # Phase 2: Create placeholder programs (no CSV data yet)
        print("\n--- Creating placeholder programs (no course data yet) ---")
        for name, faculty in PROGRAMS_WITHOUT_CSV:
            if name not in program_cache:
                prog = Program(
                    program_id=next_program_id,
                    name=name,
                    faculty=faculty,
                    cohort_year=2024,
                    total_credits=130,
                )
                db.add(prog)
                db.flush()
                program_cache[name] = prog
                next_program_id += 1
                total_programs += 1
                print(f"  [PLACEHOLDER] {name} (ID={prog.program_id})")
            else:
                print(f"  [EXISTS] {name} already seeded from CSV")

        db.commit()

        print(f"\n{'='*60}")
        print(f"[SUCCESS] Created {total_programs} programs, seeded {total_subjects} course entries.")
        print(f"{'='*60}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n[FATAL] {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
