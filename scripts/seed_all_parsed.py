import os, sys, glob
import pandas as pd
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.program import Program
from app.models.subject import Subject
from app.models.program_course import ProgramCourse
from app.models.semester_plan import SemesterPlan

def seed_all():
    db: Session = SessionLocal()
    
    csv_files = glob.glob('data/parsed_csvs/*.csv')
    
    total_subjects = 0
    total_programs = 0

    try:
        # Get current max program_id
        max_id = db.query(func.max(Program.program_id)).scalar()
        next_program_id = (max_id or 0) + 1

        for csv_path in csv_files:
            basename = os.path.basename(csv_path).replace('.csv', '')
            program_name = basename.replace('_', ' ').title()
            
            # Check if program exists
            prog = db.query(Program).filter(Program.name.ilike(f"%{program_name}%")).first()
            if not prog:
                prog = Program(
                    program_id=next_program_id,
                    name=program_name,
                    cohort_year=2024,
                    total_credits=130 # Approximation
                )
                db.add(prog)
                db.flush()
                next_program_id += 1
                total_programs += 1
            
            program_id = prog.program_id
            
            # Read CSV
            df = pd.read_csv(csv_path)
            
            count = 0
            for idx, row in df.iterrows():
                subj_id = str(row['subject_id']).strip()
                subj_name = str(row['subject_name']).strip()
                credits = int(row['credits'])
                sem = int(row['semester_no'])
                ctype = str(row['course_type']).strip()
                group = str(row['elective_group']).strip() if pd.notna(row['elective_group']) else None
                is_req = bool(row['is_required'])

                try:
                    # 1. Subject
                    subj = db.query(Subject).filter_by(subject_id=subj_id).first()
                    if not subj:
                        subj = Subject(subject_id=subj_id, subject_name=subj_name, credits=credits)
                        db.add(subj)
                        db.flush()

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
                    total_subjects += 1
                except Exception as e:
                    db.rollback()
                    print(f"Skipping {subj_id} in {basename}: {e}")

            print(f"[OK] Seeded {count} subjects for {program_name} (ID: {program_id})")

        print(f"\n[SUCCESS] Created {total_programs} new programs and seeded {total_subjects} subjects total.")
    except Exception as e:
        print(f"[X] Fatal Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
