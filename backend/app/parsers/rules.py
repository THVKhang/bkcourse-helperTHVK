from __future__ import annotations
import re

# Subject header (available): "CO2003 - Ctrúc dữliệu & giảithuật"
RE_SUBJECT_AVAIL = re.compile(r'^([A-Z]{2}\d{4})\s*-\s*(.+)$')

# Subject header (registered): "1CO3107 - T/tập ĐAMH đa ngành-ttnt1.0"
RE_SUBJECT_REG = re.compile(r'^\d+([A-Z]{2}\d{4})\s*-\s*(.+?)(\d+\.\d+)$')

# Section line: "A01_A01\t29/40\tV\t..."
RE_SECTION_LINE = re.compile(r'^([A-Z]+\d+(?:_[A-Z]+\d+)?)\t(\d+)/(\d+)\t')

# Subject summary line: "1\t\tAS5041\tĐộng lực học máy\t3.0\t\t"
RE_SUBJECT_SUMMARY = re.compile(r'^\d+\t\t([A-Z]{2}\d{4})\t([^\t]+)\t(\d+\.\d+)')

# Meeting line: "Thứ 2\t- - - ... \tC6-103\t1\t...\t------7-9-1-3-5-7-------------" or "03|04|05..."
# Made flexible: campus_code and study_weeks are optional, trailing tabs may be absent
RE_MEETING_LINE = re.compile(r'^(Thứ \d)\t(.+?)\t([^\t]+?)(?:\t(\d))?(?:\t[^\t]*)?(?:\t([^\t]*))?$')

DAY_MAP = {
    'Thứ 2': 2, 'Thứ 3': 3, 'Thứ 4': 4,
    'Thứ 5': 5, 'Thứ 6': 6, 'Thứ 7': 7,
}

SKIP_PREFIXES = [
    'STT', '#\t', 'Nhóm lớp', 'Thứ\tTiết', 'Lịch đăng ký', 'Từ ngày',
    'Chọn môn học', 'ĐĂNG KÝ', 'Đăng xuất', 'Xem Lịch sử',
    'Phiếu đăng ký', 'Danh sách đã', 'Tổng số', 'Version', 'Copyright',
    '(HK', 'Đăng ký bổ sung', 'Mã MH',
]


def parse_periods(period_str: str):
    """Parse '- - - - - - - 8 9 10 11 12 - - - -' → (start_period, duration)."""
    parts = period_str.strip().split()
    numbers = []
    for p in parts:
        if p != '-':
            try:
                numbers.append(int(p))
            except ValueError:
                pass
    if not numbers:
        return None, None
    return numbers[0], len(numbers)


def parse_study_weeks(week_str: str | None) -> list[int]:
    """Parse week strings like '------7-9-1-3-5-7-------------' or '03|04|05|06|--|--|09...'"""
    if not week_str:
        return []
    
    weeks = []
    week_str = week_str.strip()
    
    if "Chưa" in week_str or "chưa" in week_str or "biết" in week_str.lower():
        return []
    
    # Format 2: "03|04|05|06|--|--|09..."
    if '|' in week_str:
        parts = week_str.split('|')
        for p in parts:
            if p != '--' and p.isdigit():
                weeks.append(int(p))
        return sorted(weeks)
    
    # Format 1: "------7-9-1-3-5-7-------------" where position + 1 = week number
    for i, char in enumerate(week_str):
        if char != '-':
            weeks.append(i + 1)
            
    return sorted(weeks)


def should_skip(line: str) -> bool:
    if not line.strip():
        return True
    for pf in SKIP_PREFIXES:
        if line.startswith(pf):
            return True
    # Student name pattern: "Trần Hoàng Vỹ Khang (2352502)"
    if re.match(r'^.+\(\d{7}\)\s*$', line):
        return True
    # Bare subject code used as search: just "CO2003" alone
    if re.match(r'^[A-Z]{2}\d{4}\s*$', line):
        return True
    # Tab-only summary rows: "1\t\tCO2003\t..."
    # We will no longer skip it so we can parse subjects
    # if re.match(r'^\d+\t\t[A-Z]{2}\d{4}\t', line):
    #     return True
    # Date rows
    if re.match(r'^\d{2}/\d{2}/\d{4}', line):
        return True
    return False
