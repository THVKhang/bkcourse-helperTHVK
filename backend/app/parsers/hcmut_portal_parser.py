from __future__ import annotations
import unicodedata
from app.schemas.imports import ParsedSection, ParsedMeeting, ImportIssue, ParsedSubject
from app.parsers.rules import (
    RE_SUBJECT_AVAIL, RE_SUBJECT_REG, RE_SECTION_LINE, RE_MEETING_LINE,
    RE_SUBJECT_SUMMARY, DAY_MAP, parse_periods, parse_study_weeks, should_skip,
)


def parse_portal_text(raw_text: str) -> tuple[list[ParsedSection], list[ImportIssue], list[ParsedSubject]]:
    """Parse raw text copied from the HCMUT MyBK portal.

    Handles two sections:
      1. "Chọn môn học đăng ký" — available sections for a subject
      2. "Phiếu đăng ký / Danh sách đã đăng ký" — registered courses

    Subject header formats:
      Available:   CO2003 - Ctrúc dữliệu & giảithuật
      Registered:  1CO3107 - T/tập ĐAMH đa ngành-ttnt1.0

    Section line:
      A01_A01	29/40	V	A01		A01		40

    Meeting line:
      Thứ 2	- - - - - - - 8 9 10 11 12 - - - -	C6-103	1		------7-9-1-3-5-7-------------

    Period column: space-separated, '-' = no class, number = that period.
      e.g. '- - - - - - - 8 9 10 11 12 - - - -' → start=8, duration=5
    """
    # Normalize unicode to handle both composed (NFC) and decomposed (NFD) characters.
    # The portal sometimes returns 'Thứ' as decomposed 'u' + horn + acute, which breaks exact string matching.
    raw_text = unicodedata.normalize("NFC", raw_text)

    sections: list[ParsedSection] = []
    issues: list[ImportIssue] = []
    subjects_map: dict[str, ParsedSubject] = {}

    cur_subject: str | None = None
    cur_subject_name: str | None = None
    cur_section: str | None = None
    cur_meetings: list[ParsedMeeting] = []
    cur_enrolled: int | None = None
    cur_capacity: int | None = None
    cur_instructor_lt: str | None = None
    cur_instructor_btn: str | None = None

    def flush():
        nonlocal cur_section, cur_meetings
        if cur_subject and cur_section:
            sections.append(ParsedSection(
                subject_id=cur_subject,
                section_code=cur_section,
                instructor_lt=cur_instructor_lt,
                instructor_btn=cur_instructor_btn,
                meetings=cur_meetings,
            ))
        cur_section = None
        cur_meetings = []

    lines = raw_text.splitlines()

    for raw_ln in lines:
        ln = raw_ln.strip()

        if should_skip(ln):
            continue

        # --- Subject header (registered format first, more specific) ---
        m_reg = RE_SUBJECT_REG.match(ln)
        if m_reg:
            flush()
            cur_subject = m_reg.group(1)
            cur_subject_name = m_reg.group(2).strip()
            cur_section = None
            cur_instructor_lt = None
            cur_instructor_btn = None
            continue

        # --- Subject header (available format) ---
        m_avail = RE_SUBJECT_AVAIL.match(ln)
        if m_avail:
            flush()
            cur_subject = m_avail.group(1)
            cur_subject_name = m_avail.group(2).strip()
            cur_section = None
            cur_instructor_lt = None
            cur_instructor_btn = None
            continue

        # --- Section line ---
        m_sec = RE_SECTION_LINE.match(ln)
        if m_sec and cur_subject:
            flush()
            cur_section = m_sec.group(1)
            cur_enrolled = int(m_sec.group(2))
            cur_capacity = int(m_sec.group(3))
            # Try to extract instructors from tab-separated fields
            parts = ln.split('\t')
            # parts: [code, enrolled/cap, lang, lt_group, instructor, bt_group, instructor_btn, ...]
            if len(parts) >= 5:
                instr = parts[4].strip().strip('"')
                cur_instructor_lt = instr if instr and instr != 'Chưa/Đang phân công' else None
            if len(parts) >= 7:
                instr_btn = parts[6].strip().strip('"')
                cur_instructor_btn = instr_btn if instr_btn and instr_btn != 'Chưa/Đang phân công' else None
            continue

        # --- Meeting line ---
        m_meet = RE_MEETING_LINE.match(ln)
        if m_meet and cur_subject and cur_section:
            day_str = m_meet.group(1)
            period_str = m_meet.group(2)
            room = m_meet.group(3).strip() if m_meet.group(3) else None
            campus = m_meet.group(4) if m_meet.group(4) else None
            weeks_str = m_meet.group(5) if len(m_meet.groups()) >= 5 else None

            dow = DAY_MAP.get(day_str)
            if dow is None:
                continue  # skip unknown days

            start, dur = parse_periods(period_str)
            if start is None or dur is None:
                continue  # skip empty period lines

            # Clean room if it's all dashes
            if room and room.replace('-', '').strip() == '':
                room = None

            cur_meetings.append(ParsedMeeting(
                day_of_week=dow,
                start_period=start,
                duration=dur,
                room=room,
                campus_code=campus,
                study_weeks=parse_study_weeks(weeks_str),
            ))
            continue

        # --- Skip "Chưa biết" day lines ---
        if ln.startswith('Chưa biết'):
            continue

        # --- Unrecognized line → only warn for meaningful content ---
        if len(ln) > 3:
            # Check for subject summary line
            m_sum = RE_SUBJECT_SUMMARY.match(ln)
            if m_sum:
                sid = m_sum.group(1)
                sname = m_sum.group(2).strip()
                scred = float(m_sum.group(3))
                if sid not in subjects_map:
                    subjects_map[sid] = ParsedSubject(subject_id=sid, subject_name=sname, credits=scred)
                continue

            # Don't warn for common noise
            noise = ('--', '##', 'BB/TC', 'Sĩ số', 'DK/', 'Ngôn ngữ',
                     'Tuần học', 'BT/TN', 'Số tín chỉ', 'Tên MH')
            if not any(ln.startswith(n) for n in noise):
                issues.append(ImportIssue(level="WARN", message=f"Dòng không nhận diện: {ln[:80]}"))

    flush()

    if not sections:
        issues.append(ImportIssue(
            level="ERROR",
            message="Không parse được section nào. Kiểm tra format dữ liệu portal."
        ))

    return sections, issues, list(subjects_map.values())
