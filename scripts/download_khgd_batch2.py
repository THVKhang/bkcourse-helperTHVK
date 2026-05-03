"""Download remaining KHGD PDFs (batch 2)."""
import os, sys, time, requests

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'raw_pdfs')

def download_gdrive(file_id, output_path, label=""):
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    session = requests.Session()
    print(f"  Downloading {label}...", end=" ", flush=True)
    try:
        resp = session.get(url, stream=True, timeout=30)
        for key, val in resp.cookies.items():
            if key.startswith('download_warning'):
                resp = session.get(url + f"&confirm={val}", stream=True, timeout=30)
                break
        content = resp.content
        if not content[:5].startswith(b'%PDF'):
            resp2 = session.get(url + "&confirm=t", stream=True, timeout=30)
            if resp2.status_code == 200 and resp2.content[:5].startswith(b'%PDF'):
                content = resp2.content
            else:
                print(f"FAILED (not PDF)")
                return False
        with open(output_path, 'wb') as f:
            f.write(content)
        print(f"OK ({len(content)/1024:.0f} KB)")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

DOWNLOADS_BATCH2 = {
    # Remaining broken programs
    "ky_thuat_vat_lieu_khgd":       "1i1M_5A1a7FJiw6dbHDbLM3FNMo6l6ay6",
    "ky_thuat_dia_chat_khgd":       "1KPiNqnSnVUWyFi_1EnnMWMYrSeU4Y5nt",
    "hang_khong_khgd":              "1JN4T5W568mkCTNK1Yt0sZ9RuvAsvckHo",
    "ky_thuat_o_to_khgd":           "1lqT61khTSdW1urc8w1gu4NmKcJPVau0u",
    "cong_nghe_sinh_hoc_khgd":      "1qflSyQja-OrTKSMWI7k5DkSPHO4GzhXO",
    "ky_thuat_moi_truong_khgd":     "13knYKKgGhMI0QHAmfRX-zYwnMEDJT0td",
    "co_ky_thuat_khgd":             "12lI1a_jkdR4B7GvhbqIi1QAxXs53pCcx",
    "quan_ly_cong_nghiep_khgd":     "1Rzo-uwwzpeEz88FISG9ze8xccuEHIr0q",
    "ky_thuat_cong_trinh_bien_khgd":"14GzAHvdGudGMhYHlFpnYByrmOsVb0ikV",
}

if __name__ == "__main__":
    print("="*60)
    print("KHGD PDF Downloader - Batch 2")
    print("="*60)
    ok = 0
    for name, fid in DOWNLOADS_BATCH2.items():
        out = os.path.join(OUT_DIR, f"{name}.pdf")
        if download_gdrive(fid, out, name):
            ok += 1
        time.sleep(0.5)
    print(f"\nResults: {ok}/{len(DOWNLOADS_BATCH2)} downloaded")
