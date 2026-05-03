import sys, pdfplumber
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf = pdfplumber.open('data/raw_pdfs/ky_thuat_o_to_khgd.pdf')
for i, p in enumerate(pdf.pages[:3]):
    text = p.extract_text() or ''
    print(f'--- Page {i+1} (text) ---')
    print(text[:2000])
    print()
