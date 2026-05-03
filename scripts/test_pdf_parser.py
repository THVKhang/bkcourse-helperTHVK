import re

def parse_curriculum(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    semesters = {}
    current_sem = None
    
    # regex for ID line: "1 MT1003 4" or "1.1 PE1009 0"
    id_pattern = re.compile(r'^(\d+(?:\.\d+)?)\s+([A-Za-z]{2,4}\d{4})\s+(\d+)(?:\s+(.*))?$')
    
    # Split into semester blocks
    sem_blocks = []
    current_block = []
    
    for line in lines:
        if line.startswith('Học kỳ ') and '(Semester' in line:
            if current_block:
                sem_blocks.append(current_block)
            current_block = [line]
        elif current_block:
            current_block.append(line)
            
    if current_block:
        sem_blocks.append(current_block)

    ignore_phrases = [
        "Các học phần bắt buộc", "Compulsory Courses",
        "Các học phần tự chọn", "Elective Courses",
        "x - cốt lõi", "Honors",
        "Giáo dục thể chất học phần", "Physical Education Part",
        "Chọn một trong các học phần", "Select one of the courses",
        "1", "2", "3", "4", "5", "6" # stray numbers
    ]

    all_courses = []

    for block in sem_blocks:
        m = re.search(r'Học kỳ (\d+)', block[0])
        if not m: continue
        sem_num = int(m.group(1))
        
        # Extract ID lines
        id_lines = []
        text_lines = []
        for line in block[1:]:
            match = id_pattern.match(line)
            if match:
                id_lines.append(match)
            else:
                text_lines.append(line)
                
        # Filter text lines to get names
        valid_name_lines = []
        for line in text_lines:
            # Skip if it's a known ignore phrase
            if any(p.lower() in line.lower() for p in ignore_phrases):
                continue
            if line.isdigit():
                continue
            valid_name_lines.append(line)
            
        # The valid_name_lines should contain pairs (Vietnamese, English)
        # So the Vietnamese names are at even indices (0, 2, 4...)
        vn_names = []
        for i in range(0, len(valid_name_lines), 2):
            vn_names.append(valid_name_lines[i])
            
        # Match them up
        if len(vn_names) != len(id_lines):
            print(f"Mismatch in Sem {sem_num}: {len(vn_names)} names vs {len(id_lines)} IDs")
            print("Names:", vn_names)
            print("IDs:", [m.group(2) for m in id_lines])
            # Try to recover by taking the last N names
            if len(vn_names) > len(id_lines):
                vn_names = vn_names[-len(id_lines):]
                
        for i, match in enumerate(id_lines):
            name = vn_names[i] if i < len(vn_names) else "Unknown Name"
            idx, code, credits, notes = match.groups()
            
            is_req = not ('.' in idx) # heuristic: 1.1, 1.2 are usually electives
            
            all_courses.append({
                "semester": sem_num,
                "code": code,
                "name": name,
                "credits": int(credits),
                "is_required": is_req,
                "notes": notes
            })

    return all_courses

if __name__ == "__main__":
    courses = parse_curriculum("data/raw_programs/bao_duong_cong_nghiep.txt")
    for c in courses:
        print(f"HK{c['semester']} | {c['code']} - {c['name']} ({c['credits']} TC) - Req: {c['is_required']}")
