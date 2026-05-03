import os, sys
from dotenv import load_dotenv

root_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(os.path.join(root_dir, 'backend'))
load_dotenv(os.path.join(root_dir, '.env'))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.program import Program
import unicodedata
import re

MAPPING = {
    "KHOA CƠ KHÍ": ["Bảo dưỡng Công nghiệp", "Kỹ thuật Cơ khí", "Công nghệ Dệt, May", "Kỹ thuật Cơ điện tử", "Kỹ thuật Dệt", "Kỹ thuật Nhiệt"],
    "KHOA KỸ THUẬT ĐỊA CHẤT VÀ DẦU KHÍ": ["Kỹ thuật Địa chất", "Kỹ thuật Dầu khí", "Địa Kỹ thuật Xây dựng"],
    "KHOA ĐIỆN - ĐIỆN TỬ": ["Kỹ thuật Điều khiển và Tự động hóa", "Kỹ thuật Điện tử - Viễn thông", "Kỹ thuật Điện", "Thiết kế vi mạch", "Song ngành: Kỹ thuật Điện tử - Viễn thông - Kỹ thuật Điện", "Song ngành: Kỹ thuật Điện tử - Viễn thông - Kỹ thuật Điều khiển và Tự động hóa", "Song ngành: Kỹ thuật Điện - Kỹ thuật Điện tử - Viễn thông", "Song ngành: Kỹ thuật Điện - Kỹ thuật Điều khiển và Tự động hóa", "Song ngành: Kỹ thuật Điều khiển và Tự động hóa - Kỹ thuật Điện tử - Viễn thông", "Song ngành: Kỹ thuật Điều khiển và Tự động hóa - Kỹ thuật Điện"],
    "KHOA KỸ THUẬT GIAO THÔNG": ["Kỹ thuật Hàng không", "Kỹ thuật Ô tô", "Kỹ thuật Tàu thủy", "Song ngành: Kỹ thuật Tàu thủy - Hàng không", "Kỹ thuật Đường sắt"],
    "KHOA KỸ THUẬT HÓA HỌC": ["Công nghệ Sinh học", "Kỹ thuật Hóa học", "Công nghệ Thực phẩm"],
    "KHOA MÔI TRƯỜNG VÀ TÀI NGUYÊN": ["Kỹ thuật Môi trường", "Quản lý Tài nguyên và Môi trường", "Kinh tế tài nguyên thiên nhiên"],
    "KHOA KHOA HỌC VÀ KỸ THUẬT MÁY TÍNH": ["Khoa học Máy tính", "Kỹ thuật máy tính", "Công nghệ Thông tin (Vừa Làm Vừa Học)"],
    "KHOA QUẢN LÝ CÔNG NGHIỆP": ["Quản lý công nghiệp", "Quản trị Kinh doanh", "Kỹ thuật Hệ thống Công nghiệp", "Logistics và Quản lý Chuỗi cung ứng"],
    "KHOA KHOA HỌC ỨNG DỤNG": ["Cơ Kỹ thuật", "Vật lý Kỹ thuật", "Khoa học dữ liệu", "Kỹ thuật Hạt nhân"],
    "KHOA CÔNG NGHỆ VẬT LIỆU": ["Kỹ thuật Vật liệu", "Kỹ thuật Bán dẫn", "Công nghệ Kỹ thuật Vật liệu Xây dựng"], # Note: CN Kỹ thuật VLXD moved to Xay Dung in user list, but keeping it here if needed.
    "KHOA KỸ THUẬT XÂY DỰNG": ["Kỹ thuật Công trình biển", "Kỹ thuật Cơ sở hạ tầng", "Công nghệ Kỹ thuật Vật liệu Xây dựng", "Kỹ thuật Xây dựng", "Kiến trúc", "Kỹ thuật Trắc địa - Bản đồ", "Kỹ thuật Xây dựng Công trình Thủy", "Kỹ thuật Xây dựng Công trình Giao thông", "Kinh tế Xây dựng"],
    "VIỆT PHÁP": ["Kỹ thuật Cơ điện tử", "Hàng không", "Vật liệu Polymer và Composite", "Vật liệu và Năng lượng", "Viễn thông", "Hệ thống năng lượng điện", "Kỹ thuật và quản lý nước đô thị", "Xây dựng dân dụng - Công nghiệp và Hiệu quả"],
    "CHƯƠNG TRÌNH TIÊN TIẾN": ["Vi mạch - Hệ thống phần cứng", "Hệ thống Năng lượng", "Kỹ thuật Điều khiển và Tự động hoá", "Hệ thống Viễn thông"]
}

def normalize(name):
    # Remove accents and lowercase
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = re.sub(r'[^\w\s]', '', name).strip().lower()
    return name

def update_programs():
    db = SessionLocal()
    try:
        # Alter table if needed
        try:
            db.execute(text("ALTER TABLE programs ADD COLUMN faculty TEXT;"))
            db.commit()
            print("Added 'faculty' column to programs table.")
        except Exception as e:
            db.rollback()
            print("Column 'faculty' might already exist.")

        programs = db.query(Program).all()
        
        # Flatten mapping for easier searching
        flat_mapping = {}
        for faculty, majors in MAPPING.items():
            for major in majors:
                # We normalize the major name to match the DB format (which was extracted from the filename)
                # Note: 'Công nghệ Dệt, May' -> 'cong nghe det may'
                # But in DB, it might be 'Cong Nghe Det May'
                key = normalize(major).replace(' ', '')
                flat_mapping[key] = {
                    "clean_name": major,
                    "faculty": faculty
                }

        updated = 0
        for p in programs:
            db_name_norm = normalize(p.name).replace(' ', '')
            
            # Find best match
            match = None
            for k, v in flat_mapping.items():
                if k in db_name_norm or db_name_norm in k:
                    match = v
                    break
                    
            if match:
                p.name = match["clean_name"]
                p.faculty = match["faculty"]
                updated += 1
            else:
                print(f"Warning: Could not match DB program '{p.name}' to any faculty.")
                # Try a fallback heuristic
                if "Ky Thuat" in p.name:
                     pass

        db.commit()
        print(f"Successfully updated {updated} programs with faculty information.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_programs()
