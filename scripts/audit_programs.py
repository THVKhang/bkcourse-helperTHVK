"""
Audit: Compare official HCMUT program list vs what we have in CSV files.
"""

# Official list from HCMUT website (programs with "Tu 2024" teaching plans)
OFFICIAL_2024 = {
    "KHOA CO KHI": [
        "Bao duong Cong nghiep",
        "Ky thuat Co khi",
        "Cong nghe Det, May",
        "Ky thuat Co dien tu",
        "Ky thuat Det",
        "Ky thuat Nhiet",
    ],
    "KHOA KY THUAT DIA CHAT VA DAU KHI": [
        "Ky thuat Dia chat",
        "Ky thuat Dau khi",
        "Dia Ky thuat Xay dung",
    ],
    "KHOA DIEN - DIEN TU": [
        "Ky thuat Dieu khien va Tu dong hoa",
        "Ky thuat Dien tu - Vien thong",
        "Ky thuat Dien",
        "Thiet ke vi mach",
        "Song nganh: Ky thuat Dien tu - Vien thong - Ky thuat Dien",
        "Song nganh: Ky thuat Dien tu - Vien thong - Ky thuat Dieu khien va Tu dong hoa",
        "Song nganh: Ky thuat Dien - Ky thuat Dien tu - Vien thong",
        "Song nganh: Ky thuat Dien - Ky thuat Dieu khien va Tu dong hoa",
        "Song nganh: Ky thuat Dieu khien va Tu dong hoa - Ky thuat Dien tu - Vien thong",
        "Song nganh: Ky thuat Dieu khien va Tu dong hoa - Ky thuat Dien",
    ],
    "KHOA KY THUAT GIAO THONG": [
        "Ky thuat Hang khong",
        "Ky thuat O to",
        "Ky thuat Tau thuy",
        "Song nganh: Ky thuat Tau thuy - Hang khong",
    ],
    "KHOA KY THUAT HOA HOC": [
        "Cong nghe Sinh hoc",
        "Ky thuat Hoa hoc",
        "Cong nghe Thuc pham",
    ],
    "KHOA MOI TRUONG VA TAI NGUYEN": [
        "Ky thuat Moi truong",
        "Quan ly Tai nguyen va Moi truong",
    ],
    "KHOA KHOA HOC VA KY THUAT MAY TINH": [
        "Khoa hoc May tinh",
        "Ky thuat may tinh",
        "Cong nghe Thong tin (Vua Lam Vua Hoc)",
    ],
    "KHOA QUAN LY CONG NGHIEP": [
        "Quan ly cong nghiep",
        "Ky thuat He thong Cong nghiep",
        "Logistics va Quan ly Chuoi cung ung",
    ],
    "KHOA KHOA HOC UNG DUNG": [
        "Co Ky thuat",
        "Vat ly Ky thuat",
        "Khoa hoc du lieu",
    ],
    "KHOA CONG NGHE VAT LIEU": [
        "Ky thuat Vat lieu",
    ],
    "KHOA KY THUAT XAY DUNG": [
        "Ky thuat Cong trinh bien",
        "Ky thuat Co so ha tang",
        "Cong nghe Ky thuat Vat lieu Xay dung",
        "Ky thuat Xay dung",
        "Kien truc",
        "Ky thuat Trac dia - Ban do",
        "Ky thuat Xay dung Cong trinh Thuy",
        "Ky thuat Xay dung Cong trinh Giao thong",
        "Kinh te Xay dung",
    ],
    "VIET PHAP": [
        "Ky thuat Co dien tu (VP)",
        "Hang khong (VP)",
        "Vat lieu Polymer va Composite",
        "Vat lieu va Nang luong",
        "Vien thong (VP)",
        "He thong nang luong dien (VP)",
        "Ky thuat va quan ly nuoc do thi (VP)",
        "Xay dung dan dung - Cong nghiep va Hieu qua (VP)",
    ],
    "CHUONG TRINH TIEN TIEN": [
        "Vi mach - He thong phan cung",
        "He thong Nang luong",
        "Ky thuat Dieu khien va Tu dong hoa (TT)",
        "He thong Vien thong",
    ],
}

import unicodedata, re

def normalize(name):
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = re.sub(r'[^\w\s]', '', name).strip().lower()
    return name.replace(' ', '')

# CSV files we have
import os, glob
csv_files = glob.glob('data/parsed_csvs/*.csv')
csv_basenames = [os.path.basename(f).replace('.csv', '') for f in csv_files]
csv_keys = [b.replace('_', '') for b in csv_basenames]

# Count official programs
total_official = sum(len(v) for v in OFFICIAL_2024.values())
print(f"Total official programs (with 2024 teaching plans): {total_official}")
print(f"Total CSV files: {len(csv_basenames)}")

# Check which official programs have matching CSVs
print("\n=== MATCHING STATUS ===")
matched = []
missing = []

for faculty, programs in OFFICIAL_2024.items():
    for prog in programs:
        key = normalize(prog)
        # Check if any CSV key contains this key or vice versa
        found = None
        for i, ck in enumerate(csv_keys):
            if key in ck or ck in key:
                found = csv_basenames[i]
                break
        if found:
            matched.append((prog, found, faculty))
        else:
            missing.append((prog, faculty))

print(f"\nMATCHED: {len(matched)}")
for prog, csv, fac in matched:
    print(f"  [OK] {prog} -> {csv}")

print(f"\nMISSING (no CSV): {len(missing)}")
for prog, fac in missing:
    print(f"  [X] {prog} ({fac})")

# Check CSVs that don't match any official program
print(f"\nUNMATCHED CSVs (junk or overview files):")
all_matched_csvs = set(m[1] for m in matched)
for bn in csv_basenames:
    if bn not in all_matched_csvs:
        print(f"  [?] {bn}")

if __name__ == "__main__":
    pass
