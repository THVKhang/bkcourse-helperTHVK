from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple

@dataclass(frozen=True)
class MeetingSlot:
    day_of_week: int
    start_period: int
    duration: int

    @property
    def end_period(self) -> int:
        return self.start_period + self.duration

@dataclass(frozen=True)
class CampusSlot:
    day_of_week: int
    start_period: int
    duration: int
    campus_code: str | None  # "1" = LTK, "2" = Dĩ An

    @property
    def end_period(self) -> int:
        return self.start_period + self.duration

def overlaps(a: MeetingSlot, b: MeetingSlot) -> bool:
    if a.day_of_week != b.day_of_week:
        return False
    return not (a.end_period <= b.start_period or b.end_period <= a.start_period)

def count_conflicts(slots: List[MeetingSlot]) -> int:
    c = 0
    for i in range(len(slots)):
        for j in range(i + 1, len(slots)):
            if overlaps(slots[i], slots[j]):
                c += 1
    return c

def detect_campus_conflicts(slots: List[CampusSlot]) -> List[dict]:
    """Detect days where student must travel between campuses with < 2 period gap."""
    # Group by day
    by_day: dict[int, list[CampusSlot]] = {}
    for s in slots:
        if s.campus_code:
            by_day.setdefault(s.day_of_week, []).append(s)

    conflicts = []
    DAY_NAMES = {2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7"}

    for day, day_slots in sorted(by_day.items()):
        campuses = set(s.campus_code for s in day_slots if s.campus_code)
        if len(campuses) <= 1:
            continue
        # Multiple campuses on same day — check gap
        sorted_slots = sorted(day_slots, key=lambda s: s.start_period)
        for i in range(len(sorted_slots) - 1):
            a, b = sorted_slots[i], sorted_slots[i + 1]
            if a.campus_code != b.campus_code:
                gap = b.start_period - a.end_period
                conflicts.append({
                    "day": day,
                    "day_name": DAY_NAMES.get(day, f"T{day}"),
                    "from_campus": a.campus_code,
                    "to_campus": b.campus_code,
                    "gap_periods": gap,
                    "is_critical": gap < 2,  # < 2 tiết = nguy hiểm
                })
    return conflicts

# ---- Scoring System ----

def score_plan(
    slots: List[MeetingSlot],
    campus_slots: List[CampusSlot],
    campus_conflicts: List[dict],
    preference: str,
    num_days: int,
) -> Tuple[float, dict]:
    """Score a schedule plan 0-100 based on intelligent heuristics. Returns (score, breakdown)."""

    # 1. Gap score (35%) — non-linear penalty for large gaps
    gap_score = _calc_gap_score(slots)

    # 2. Preference match (30%) — high weight to respect user choice
    pref_score = _calc_pref_score(slots, preference)

    # 3. Commute Efficiency (20%) — penalize days with very few periods (<= 3)
    commute_score = _calc_commute_score(slots)

    # 4. Campus score (15%) — penalize bad campus transitions
    critical_conflicts = sum(1 for c in campus_conflicts if c.get("is_critical"))
    campus_score = max(0, 100 - critical_conflicts * 50)

    breakdown = {
        "gap": round(gap_score, 1),
        "commute": round(commute_score, 1),
        "preference": round(pref_score, 1),
        "campus": round(campus_score, 1),
    }

    total = (
        gap_score * 0.35 +
        pref_score * 0.30 +
        commute_score * 0.20 +
        campus_score * 0.15
    )

    return round(total, 1), breakdown


def _calc_gap_score(slots: List[MeetingSlot]) -> float:
    """
    Calculate gap score with non-linear penalties.
    Gap of 1 period around noon (e.g., period 6) is tolerated.
    Larger gaps are squared to heavily penalize them.
    """
    if not slots:
        return 100.0

    by_day: dict[int, list[MeetingSlot]] = {}
    for s in slots:
        by_day.setdefault(s.day_of_week, []).append(s)

    penalty = 0.0
    for day_slots in by_day.values():
        sorted_s = sorted(day_slots, key=lambda s: s.start_period)
        for i in range(len(sorted_s) - 1):
            gap = sorted_s[i + 1].start_period - sorted_s[i].end_period
            if gap > 0:
                # If it's a 1-period gap and happens around noon (period 6), ignore it or small penalty
                if gap == 1 and (sorted_s[i].end_period == 6 or sorted_s[i + 1].start_period == 7):
                    penalty += 0.5
                elif gap == 1:
                    penalty += 2.0
                else:
                    # Exponential penalty for larger gaps: gap 2 -> 4, gap 3 -> 9, gap 4 -> 16, etc.
                    penalty += (gap ** 2.2) * 2.5

    # Base 100, subtract penalty
    return max(0.0, 100.0 - penalty)

def _calc_commute_score(slots: List[MeetingSlot]) -> float:
    """
    Penalize going to school just for 1 class (<= 3 periods).
    """
    if not slots:
        return 100.0

    by_day: dict[int, int] = {}
    for s in slots:
        by_day[s.day_of_week] = by_day.get(s.day_of_week, 0) + s.duration

    penalty = 0.0
    for day, total_periods in by_day.items():
        if total_periods <= 3:
            # Huge penalty for a day with <= 3 periods (likely just 1 subject)
            penalty += 35.0
            
    return max(0.0, 100.0 - penalty)


def _calc_pref_score(slots: List[MeetingSlot], preference: str) -> float:
    """How well does the schedule match the preference?"""
    if not slots:
        return 100.0

    if preference == "MORNING_ONLY":
        # Weight periods by how deep they are in the afternoon. Period >= 7 are afternoon.
        total_periods = sum(s.duration for s in slots)
        morning_periods = sum(min(s.duration, max(0, 7 - s.start_period)) for s in slots)
        return (morning_periods / total_periods) * 100.0 if total_periods > 0 else 100.0

    if preference == "AFTERNOON_ONLY":
        total_periods = sum(s.duration for s in slots)
        afternoon_periods = sum(min(s.duration, max(0, s.end_period - 7)) for s in slots)
        return (afternoon_periods / total_periods) * 100.0 if total_periods > 0 else 100.0

    if preference == "COMPACT_DAYS":
        days = len(set(s.day_of_week for s in slots))
        # 3 days -> 100, 4 days -> ~66, 5 days -> ~33, 6 days -> 0
        return max(0.0, (6 - days) / 3.0) * 100.0

    # BALANCED — evenly distributed periods across days
    by_day: dict[int, int] = {}
    for s in slots:
        by_day[s.day_of_week] = by_day.get(s.day_of_week, 0) + s.duration
        
    if len(by_day) <= 1:
        return 50.0
        
    avg = sum(by_day.values()) / len(by_day)
    variance = sum((v - avg) ** 2 for v in by_day.values()) / len(by_day)
    # Variance of periods: if every day has exactly 4 periods, variance is 0.
    # If one day has 8 and another has 2, avg = 5, variance = 9 -> penalty 45.
    return max(0.0, 100.0 - variance * 5)
