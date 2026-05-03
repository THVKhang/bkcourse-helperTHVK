"""Debug: check contents of khoa_co_khi.pdf"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import pdfplumber

pdf_path = 'data/raw_pdfs/khoa_co_khi.pdf'

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    for page_no, page in enumerate(pdf.pages[:5]):
        text = page.extract_text() or ""
        print(f"\n--- Page {page_no+1} text snippet ---")
        print(text[:300])
