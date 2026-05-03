"""Debug: dump ALL table rows from khoa_co_khi.pdf"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import pdfplumber

pdf_path = 'data/raw_pdfs/khoa_co_khi.pdf'

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    for page_no, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for ti, table in enumerate(tables):
            print(f"\n--- Page {page_no+1} Table {ti}: {len(table)} rows ---")
            for ri, row in enumerate(table[:15]):  # first 15 rows of each table
                cells = [str(c).replace('\n',' ')[:40] if c else '' for c in row]
                print(f"    Row {ri}: {cells}")
