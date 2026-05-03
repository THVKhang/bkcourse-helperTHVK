import os
import sys
sys.path.insert(0, os.getcwd())

from app.db.session import SessionLocal
from app.models.prerequisite import Prerequisite

prereqs = [
    # CO2001 -> CO1005 (TQ)
    ("CO2001", "CO1005", "PREREQ"),
    # Cấu trúc DL & GT -> KTLT
    ("CO2003", "CO1027", "PREREQ"),
    # Kiến trúc Máy tính -> KTLT
    ("CO2007", "CO1027", "PREREQ"),
    # Nguyên lý Hệ điều hành -> KTMT
    ("CO2013", "CO2007", "PREREQ"),
    # Mạng máy tính -> Cấu trúc DL & GT
    ("CO2017", "CO2003", "PREREQ"),
    # Kỹ thuật phần mềm -> Cấu trúc DL & GT
    ("CO3015", "CO2003", "PREREQ"),
    # Cơ sở dữ liệu -> KTLT (hoặc CTDLGT, thường là KTLT)
    ("CO2011", "CO1027", "PREREQ"), # MH Toán
    ("CO2039", "CO2003", "PREREQ"), # CTDLGT Nâng cao
    # Môn Khoa học máy tính
    ("CO3001", "CO2003", "PREREQ"),
    ("CO3005", "CO2003", "PREREQ"),
    # Lập trình song song
    ("CO3065", "CO2013", "PREREQ"),
    ("CO3065", "CO2017", "PREREQ"),
    # Trí tuệ nhân tạo -> CTDLGT
    ("CO3061", "CO2003", "PREREQ"),
    # Thiết kế phần mềm -> KTPM
    ("CO3011", "CO3015", "PREREQ"),
    
    # Một số môn Đại cương
    ("PH1005", "PH1003", "PREREQ"), # Vật lý 2 -> Vật lý 1
    ("PH1007", "PH1003", "PREREQ"), # TN Vật lý -> Vật lý 1
    ("MT1005", "MT1003", "PREREQ"), # Giải tích 2 -> Giải tích 1
    
    # Lý luận chính trị
    ("SP1033", "SP1031", "PRECOURSE"), # KTCT -> TH Mac
    ("SP1035", "SP1033", "PRECOURSE"), # CNXHKH -> KTCT
    ("SP1039", "SP1035", "PRECOURSE"), # LSĐ -> CNXHKH
]

def seed_prerequisites():
    db = SessionLocal()
    try:
        count = 0
        for subj, prereq_subj, req_type in prereqs:
            # Check if exists
            exists = db.query(Prerequisite).filter(
                Prerequisite.subject_id == subj,
                Prerequisite.prereq_subject_id == prereq_subj
            ).first()
            if not exists:
                db.add(Prerequisite(
                    subject_id=subj,
                    prereq_subject_id=prereq_subj,
                    relation_type=req_type
                ))
                count += 1
        db.commit()
        print(f"Seeded {count} prerequisites.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_prerequisites()
