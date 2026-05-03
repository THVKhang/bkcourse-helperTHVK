"""
Improved PDF parser for HCMUT curriculum PDFs.
Handles various table formats and semester detection patterns.
"""
import os, re, sys, glob
import pandas as pd
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def parse_pdf(pdf_path, output_csv):
    basename = os.path.basename(pdf_path).replace('.pdf', '')
    print(f"Parsing {basename}...")

    all_data = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_no, page in enumerate(pdf.pages):
                # Extract text for semester detection (more robust than table-only)
                page_text = page.extract_text() or ""
                
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        cleaned_row = [
                            str(cell).replace('\n', ' ').strip() if cell else ''
                            for cell in row
                        ]
                        all_data.append(cleaned_row)
    except Exception as e:
        print(f"  [ERR] Failed to extract {basename}: {e}")
        return

    if not all_data:
        print(f"  [WARN] No tables found in {basename}")
        return

    df = pd.DataFrame(all_data)

    parsed_courses = []
    current_sem = 1
    course_type = "BẮT BUỘC"
    group = None

    for idx, row in df.iterrows():
        if len(row) < 2:
            continue

        # Join all columns for broad text matching
        full_row_text = ' '.join(str(c) for c in row if c).strip()
        full_row_lower = full_row_text.lower()

        # --- Semester detection (check ALL columns) ---
        sem_match = re.search(r'[Hh]ọc\s*[Kk]ỳ\s*(\d+)', full_row_text)
        if not sem_match:
            sem_match = re.search(r'[Ss]emester\s*(\d+)', full_row_text)
        if not sem_match:
            # Pattern: KHGD_KTCK_K2024_HK2_17TC or similar codes
            sem_match = re.search(r'_HK(\d+)_', full_row_text)
        if not sem_match:
            # Pattern: HK 2 or HK2
            sem_match = re.search(r'\bHK\s*(\d+)\b', full_row_text)
        if not sem_match:
            # Pattern: "Kế hoạch giảng dạy học kì I/II năm học 2024-2025"
            # Roman numeral I=odd semester, II=even semester within academic year
            khgd_match = re.search(r'[Kk]ế\s*hoạch.*học\s*kì\s*(I{1,3}|IV|V)\s*năm\s*học\s*(\d{4})', full_row_text)
            if khgd_match:
                roman = khgd_match.group(1)
                year = int(khgd_match.group(2))
                # Calculate semester number: (year - base_year) * 2 + (1 if kì I, 2 if kì II)
                base_year = 2024  # Cohort year
                year_offset = year - base_year
                half = 1 if roman == 'I' else 2
                computed_sem = year_offset * 2 + half
                sem_match = type('M', (), {'group': lambda self, x: str(computed_sem)})()
        if sem_match:
            current_sem = int(sem_match.group(1))
            course_type = "BẮT BUỘC"
            group = None
            continue

        # --- Course type detection (check ALL columns) ---
        if 'bắt buộc' in full_row_lower or 'compulsory' in full_row_lower:
            course_type = "BẮT BUỘC"
            group = None
            continue

        is_elective_header = ('tự chọn' in full_row_lower or 'elective' in full_row_lower)
        if is_elective_header:
            if 'thể dục' in full_row_lower or 'physical' in full_row_lower:
                course_type = "Thể dục (Chọn 1)"
                group = "PE"
            elif 'nhóm a' in full_row_lower or 'group a' in full_row_lower:
                course_type = "TỰ CHỌN NHÓM A"
                group = "A"
            elif 'nhóm b' in full_row_lower or 'group b' in full_row_lower:
                course_type = "TỰ CHỌN NHÓM B"
                group = "B"
            elif 'nhóm c' in full_row_lower or 'group c' in full_row_lower:
                course_type = "TỰ CHỌN NHÓM C"
                group = "C"
            elif 'tự do' in full_row_lower or 'free' in full_row_lower:
                course_type = "TỰ CHỌN TỰ DO"
                group = "FREE"
            elif 'ngoại ngữ' in full_row_lower or 'english' in full_row_lower or 'foreign' in full_row_lower:
                course_type = "Ngoại ngữ (Chọn 1)"
                group = "LANG"
            else:
                course_type = "TỰ CHỌN"
                group = None
            continue

        # Also check for PE / language headers that don't use "tự chọn"
        if ('giáo dục thể chất' in full_row_lower or 'physical education' in full_row_lower):
            course_type = "Thể dục (Chọn 1)"
            group = "PE"
            continue

        # --- Course row detection ---
        # Try to find subject_id pattern in any column
        subject_id = None
        subject_name = None
        credits = 0
        
        for col_idx in range(min(len(row), 5)):
            cell = str(row[col_idx]).strip()
            if re.match(r'^[A-Za-z]{2,4}\d{3,4}$', cell):
                subject_id = cell.upper()
                # Subject name is typically the next column
                if col_idx + 1 < len(row):
                    subject_name = str(row[col_idx + 1]).strip()
                # Credits is typically 2 columns after subject_id
                if col_idx + 2 < len(row):
                    try:
                        credits = int(float(str(row[col_idx + 2]).strip()))
                    except (ValueError, TypeError):
                        pass
                break

        if not subject_id:
            continue
        if not subject_name or subject_name in ('', 'None', 'nan'):
            subject_name = ""

        is_req = (course_type == "BẮT BUỘC")

        parsed_courses.append({
            "semester_no": current_sem,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "credits": credits,
            "course_type": course_type,
            "elective_group": group if group else "",
            "is_required": is_req,
        })

    if parsed_courses:
        out_df = pd.DataFrame(parsed_courses)
        out_df = out_df.drop_duplicates(subset=['subject_id', 'semester_no'])
        out_df.to_csv(output_csv, index=False, encoding='utf-8-sig')
        
        n_sems = out_df['semester_no'].nunique()
        print(f"  [OK] {len(out_df)} courses, {n_sems} semesters -> {output_csv}")
        return len(out_df), n_sems
    else:
        print(f"  [WARN] No courses found in {basename}")
        return 0, 0


def process_all():
    os.makedirs('data/parsed_csvs', exist_ok=True)
    pdfs = sorted(glob.glob('data/raw_pdfs/*.pdf'))
    
    print(f"Found {len(pdfs)} PDFs to parse\n")
    
    results = []
    for pdf in pdfs:
        basename = os.path.basename(pdf).replace('.pdf', '')
        output_csv = f"data/parsed_csvs/{basename}.csv"
        result = parse_pdf(pdf, output_csv)
        results.append((basename, result))

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    good = [(n, r) for n, r in results if r and r[1] > 1]
    partial = [(n, r) for n, r in results if r and r[1] == 1 and r[0] > 0]
    failed = [(n, r) for n, r in results if not r or r[0] == 0]
    
    print(f"\nFull programs (multi-semester): {len(good)}")
    for name, (courses, sems) in good:
        print(f"  [OK] {name}: {courses} courses, {sems} semesters")
    
    print(f"\nPartial (semester 1 only): {len(partial)}")
    for name, (courses, sems) in partial:
        print(f"  [!] {name}: {courses} courses, {sems} semester")
    
    print(f"\nFailed (0 courses): {len(failed)}")
    for name, _ in failed:
        print(f"  [X] {name}")


if __name__ == "__main__":
    process_all()
