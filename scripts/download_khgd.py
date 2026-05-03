"""
Download KHGD (Kế hoạch giảng dạy) PDFs from HCMUT Google Drive.
These replace the broken CTĐT-based files that lack semester info.
Strategy: Try 2024 KHGD first, fallback to 2023 if download fails.
"""
import os, sys, time, requests

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'raw_pdfs')
os.makedirs(OUT_DIR, exist_ok=True)

def download_gdrive(file_id, output_path, label=""):
    """Download a file from Google Drive (handles virus scan warning for large files)."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    session = requests.Session()
    print(f"  Downloading {label or file_id}...", end=" ", flush=True)
    
    try:
        resp = session.get(url, stream=True, timeout=30)
        # Check for download confirmation (virus scan for large files)
        for key, val in resp.cookies.items():
            if key.startswith('download_warning'):
                resp = session.get(url + f"&confirm={val}", stream=True, timeout=30)
                break
        
        if resp.status_code != 200:
            print(f"FAILED (HTTP {resp.status_code})")
            return False
            
        content = resp.content
        # Verify it's actually a PDF
        if not content[:5].startswith(b'%PDF'):
            # Try confirm=t approach
            resp2 = session.get(url + "&confirm=t", stream=True, timeout=30)
            if resp2.status_code == 200 and resp2.content[:5].startswith(b'%PDF'):
                content = resp2.content
            else:
                print(f"FAILED (not a PDF, got {len(content)} bytes)")
                return False
        
        with open(output_path, 'wb') as f:
            f.write(content)
        size_kb = len(content) / 1024
        print(f"OK ({size_kb:.0f} KB)")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

# ============================================================
# KHGD 2024 Google Drive File IDs
# Pattern: Each program row on HCMUT page has:
#   - 6 CTĐT links (2024,2023,...,2019)
#   - 6 KHGD links (2024,2023,...,2019)
# We want the KHGD 2024 link (7th link = 1st KHGD link)
# ============================================================

DOWNLOADS = {
    # Format: "output_filename": ("khgd_2024_id", "khgd_2023_id_fallback")
    
    # ── KHOA CƠ KHÍ: Bảo dưỡng Công nghiệp ──
    "bao_duong_cong_nghiep_khgd": ("1d_SC8SsEnD1vHEuKnQkJLMhsZ8UpH0T-", "1uh0e8FaZsc82WZBBE6aYobZN5APD2Fdp"),
    
    # ── KHOA ĐIỆN: KT Điều khiển & TĐH ──
    "ky_thuat_dieu_khien_tdh_khgd": ("1KP6S1arHzXJCkV7UpNsNNQLvqJP20dMQ", "1izO2C1NZJ_Y6DbphodjKxX0Coj5ZIEK3"),
    
    # ── KHOA KHMT: Khoa học Máy tính ──
    "khoa_hoc_may_tinh_khgd": ("1aY6sPCFx1p7DK9IcSSZRQmmrobUI_4Oq", "1ebgPzwl88UWAzhI5Jg0O71JzlkhIKQyE"),
    
    # ── KHOA KHMT: Kỹ thuật máy tính ──
    "ky_thuat_may_tinh_khgd": ("16VlPhqu4-xgJHpCVedrMUWLPywZl1dez", "1RI8IA5wipI8ffNKhL3b9wB9Rt94-5hRM"),
    
    # ── CTTT: Vi mạch - Hệ thống phần cứng ──
    "vi_mach_tien_tien_khgd": ("1-xCylHBtQFT0aaNS6N3iERTNkU-5egfq", "1dCOrsmRYbVkIMKxD3E-0yWvbOKdwTT7U"),
    
    # ── CTTT: Hệ thống Năng lượng ──
    "nang_luong_tien_tien_khgd": ("10qqsmoV2XsXLTzVgxm9YXokq0UHywrMk", "1RlQe7dgOE9B_RGfaG5GtaWnsoaQtj6_0"),
    
    # ── CTTT: KT Điều khiển & TĐH (Tiên tiến) ──
    "dktdh_tien_tien_khgd": ("1TLKLr7d-idiJCdgENbETuJPTeJ3ODU8G", "12r1ruyCFps0rkIapY1BAQ4t7rFgUo4J1"),
    
    # ── CTTT: Hệ thống Viễn thông ──
    "vien_thong_tien_tien_khgd": ("1HCUSCk-FlmPjeQ-HZl1OyrDhbUiAXRXH", "1M_MB0CwRu3GtfWC3M4u-JBXYr2PKaMes"),
    
    # ── VIỆT PHÁP: Cơ điện tử ──
    "co_dien_tu_viet_phap_khgd": ("19_E6IjZHvzry7wIH_KMmjfhgmyDS-VzZ", "1ZaVW_zjNJN6kaoA-9-esvQDKWpknceNh"),
    
    # ── VIỆT PHÁP: Hàng không ──
    "hang_khong_viet_phap_khgd": ("1Mv4loaw8LYvMPisxMXr5q5Ak2aVD6m-a", "1BdOIkYQMIGQCPDRISooGTBb9H6jDajNt"),
}

# ============================================================
# Programs we need but don't have exact KHGD links for yet.
# These will need browser-based extraction from the HCMUT page.
# ============================================================
NEEDS_BROWSER_EXTRACTION = [
    "khoa_cong_nghe_vat_lieu",    # Kỹ thuật Vật liệu
    "khoa_ky_thuat_ia_chat_va_dau_khi",  # KT Địa chất
    "khoa_ky_thuat_giao_thong",   # KT Hàng không (faculty overview)
    "ky_thuat_o_to",              # KT Ô tô
    "khoa_ky_thuat_hoa_hoc",      # CN Sinh học
    "khoa_moi_truong_va_tai_nguyen", # KT Môi trường
    "khoa_khoa_hoc_ung_dung",     # Cơ Kỹ thuật
    "khoa_quan_ly_cong_nghiep",   # QLCN
    "khoa_ky_thuat_xay_dung",     # KT Công trình biển
    "viet_phap",                  # Việt Pháp overview
]


def main():
    print("="*60)
    print("KHGD PDF Downloader for BKCourse Helper")
    print("="*60)
    
    success = 0
    failed = 0
    
    for name, (id_2024, id_2023) in DOWNLOADS.items():
        out_path = os.path.join(OUT_DIR, f"{name}.pdf")
        
        # Try 2024 first
        if download_gdrive(id_2024, out_path, f"{name} (KHGD 2024)"):
            success += 1
        elif download_gdrive(id_2023, out_path, f"{name} (KHGD 2023 fallback)"):
            success += 1
        else:
            failed += 1
            print(f"  [FAIL] Could not download {name}")
        
        time.sleep(0.5)  # Be polite to Google
    
    print(f"\n{'='*60}")
    print(f"Results: {success} downloaded, {failed} failed")
    print(f"{'='*60}")
    
    if NEEDS_BROWSER_EXTRACTION:
        print(f"\n[NOTE] {len(NEEDS_BROWSER_EXTRACTION)} programs still need KHGD links:")
        for name in NEEDS_BROWSER_EXTRACTION:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
