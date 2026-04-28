"""Quick test: parse real portal data and check campus_code"""
import sys
sys.path.insert(0, "backend")
sys.stdout.reconfigure(encoding="utf-8")

from app.parsers.hcmut_portal_parser import parse_portal_text

raw = r"""CO3117 - Học máy
A01	10/70	V	A01				70	
Thứ 6	- - - - - - - 8 9 - - - - - - -	B4-405	1		1234--789-12345678------------
L01	80/80	V	L01				80	
Thứ 3	- - - 4 5 - - - - - - - - - - -	H3-402	2		1234--789-12345678------------
TN01	7/70	V	TN01				70	
Thứ 6	- - - 4 5 - - - - - - - - - - -	C4-301	1		1234--789-12345678------------"""

secs, issues = parse_portal_text(raw)
print(f"Sections: {len(secs)}")
for s in secs:
    print(f"  {s.subject_id} {s.section_code}: {len(s.meetings)} meetings")
    for m in s.meetings:
        print(f"    day={m.day_of_week} start={m.start_period} dur={m.duration} room={m.room} campus={m.campus_code}")
print(f"Issues: {issues}")
