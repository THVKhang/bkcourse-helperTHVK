from __future__ import annotations
import re

# NOTE: You should replace these regex rules with the actual portal format you have.
RE_SUBJECT = re.compile(r"(?P<code>[A-Z]{2,4}\d{3,4})\s+-\s+(?P<name>.+?)\s+\((?P<credits>\d+)\)")
RE_SECTION = re.compile(r"L\s*(?P<section>\d+)")
RE_MEETING = re.compile(r"(?P<dow>[2-7])\s+P(?P<start>\d+)\s+(?P<dur>\d+)\s+(?P<room>\S+)")
