from __future__ import annotations
from typing import Dict

def schedule_score(conflicts: int, workload: float) -> float:
    # Lower conflicts and lower workload is better (simple heuristic)
    return -(conflicts * 1000.0 + workload)

def recommendation_score(course_type: str | None, workload: float) -> float:
    # Prefer CORE then others; lower workload better
    pri = {"CORE": 0, "MAJOR": 1, "POLITICAL": 2, "FREE_ELECTIVE": 3}
    return pri.get(course_type or "", 10) * 10.0 + workload
