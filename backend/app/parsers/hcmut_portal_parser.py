from __future__ import annotations
from app.schemas.imports import ParsedSection, ParsedMeeting, ImportIssue
from app.parsers.rules import RE_SUBJECT, RE_SECTION, RE_MEETING

def parse_portal_text(raw_text: str) -> tuple[list[ParsedSection], list[ImportIssue]]:
    """Parser placeholder.
    Bạn sẽ thay regex trong rules.py theo đúng format portal thật.

    Ví dụ lines:
      CO1005 - Nhập môn lập trình (4)
      L01
      2 P1 3 H1-305
    """
    sections: list[ParsedSection] = []
    issues: list[ImportIssue] = []

    cur_subject: str | None = None
    cur_section: str | None = None
    cur_meetings: list[ParsedMeeting] = []

    def flush():
        nonlocal cur_subject, cur_section, cur_meetings
        if cur_subject and cur_section:
            sections.append(ParsedSection(subject_id=cur_subject, section_code=cur_section, meetings=cur_meetings))
        cur_section = None
        cur_meetings = []

    for ln in [l.strip() for l in raw_text.splitlines() if l.strip()]:
        m_sub = RE_SUBJECT.search(ln)
        if m_sub:
            flush()
            cur_subject = m_sub.group("code")
            continue

        m_sec = RE_SECTION.search(ln)
        if m_sec:
            flush()
            cur_section = f"L{int(m_sec.group('section')):02d}"
            continue

        m_meet = RE_MEETING.search(ln)
        if m_meet and cur_subject and cur_section:
            cur_meetings.append(ParsedMeeting(
                day_of_week=int(m_meet.group("dow")),
                start_period=int(m_meet.group("start")),
                duration=int(m_meet.group("dur")),
                room=m_meet.group("room"),
            ))
            continue

        issues.append(ImportIssue(level="WARN", message=f"Unparsed line: {ln}"))

    flush()
    if not sections:
        issues.append(ImportIssue(level="ERROR", message="No sections parsed. Cần chỉnh parser (rules.py) theo format portal thật."))
    return sections, issues
