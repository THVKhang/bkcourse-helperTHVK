import os, sys, csv
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.subject import Subject
from app.models.program_course import ProgramCourse
from app.models.semester_plan import SemesterPlan

def import_from_csv(csv_path):
    db: Session = SessionLocal()
    count = 0
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                program_id = int(row['program_id'])
                sem = int(row['semester_no'])
                subj_id = row['subject_id'].strip()
                subj_name = row['subject_name'].strip()
                credits = int(row['credits'])
                ctype = row['course_type'].strip()
                group = row['elective_group'].strip() if row['elective_group'].strip() else None
                is_req = row['is_required'].strip().lower() == 'true'

                try:
                    # 1. Subject
                    subj = db.query(Subject).filter_by(subject_id=subj_id).first()
                    if not subj:
                        subj = Subject(subject_id=subj_id, subject_name=subj_name, credits=credits)
                        db.add(subj)
                        db.flush()
                    else:
                        subj.subject_name = subj_name
                        subj.credits = credits

                    # 2. Program Course
                    pc = db.query(ProgramCourse).filter_by(program_id=program_id, subject_id=subj_id).first()
                    if not pc:
                        pc = ProgramCourse(
                            program_id=program_id, subject_id=subj_id,
                            course_type=ctype, elective_group=group,
                            recommended_semester=sem, is_summer_friendly=(credits <= 2)
                        )
                        db.add(pc)
                        db.flush()

                    # 3. Semester Plan
                    sp = db.query(SemesterPlan).filter_by(
                        program_id=program_id, semester_no=sem, subject_id=subj_id
                    ).first()
                    if not sp:
                        sp = SemesterPlan(
                            program_id=program_id, semester_no=sem, subject_id=subj_id,
                            priority=10 if is_req else 50, is_required=is_req,
                        )
                        db.add(sp)
                        db.flush()

                    db.commit()
                    count += 1
                except Exception as e:
                    db.rollback()
                    print(f"[!] Lỗi tại dòng {subj_id}: {e}")

        print(f"✅ Hoàn tất import {count} môn học từ file {csv_path}!")
    except Exception as e:
        print(f"[X] Lỗi đọc file CSV: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách sử dụng: python seed_from_csv.py <đường_dẫn_file.csv>")
    else:
        import_from_csv(sys.argv[1])
