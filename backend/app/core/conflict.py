from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable, List, Tuple

@dataclass(frozen=True)
class MeetingSlot:
    day_of_week: int
    start_period: int
    duration: int

    @property
    def end_period(self) -> int:
        return self.start_period + self.duration

def overlaps(a: MeetingSlot, b: MeetingSlot) -> bool:
    if a.day_of_week != b.day_of_week:
        return False
    # [start, end)
    return not (a.end_period <= b.start_period or b.end_period <= a.start_period)

def count_conflicts(slots: List[MeetingSlot]) -> int:
    c = 0
    for i in range(len(slots)):
        for j in range(i + 1, len(slots)):
            if overlaps(slots[i], slots[j]):
                c += 1
    return c
