"""
routers/analytics.py — Aggregated stats for the Reports & Analytics page

Firestore migration: all counts done by streaming collections and counting in Python.
Firestore does not support COUNT() queries natively without the Aggregation API
(which requires Firestore in Native mode). This approach works universally.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends

from ..firebase_db import get_firestore, USERS, QUERIES, SOS_ALERTS, FEEDBACK, MEAL_CLAIMS, PROJECTS, ROOM_LOGS
from ..schemas import SummaryStats, AttendancePoint
from ..auth import get_current_user_id

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _count(db, collection: str, **filters) -> int:
    """Count documents in a Firestore collection with optional equality filters."""
    ref = db.collection(collection)
    for field, value in filters.items():
        ref = ref.where(field, "==", value)
    return sum(1 for _ in ref.stream())


@router.get("/summary", response_model=SummaryStats)
def get_summary(
    _: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Return aggregated stats for the ReportsAnalytics page."""
    # Stream all active users once, derive role counts in Python
    user_docs = list(db.collection(USERS).where("is_active", "==", True).stream())
    role_counts: dict[str, int] = {
        "participant": 0, "mentor": 0, "judge": 0, "volunteer": 0, "organizer": 0
    }
    for doc in user_docs:
        role = doc.to_dict().get("role", "participant")
        if role in role_counts:
            role_counts[role] += 1

    total_users = len(user_docs)

    # Queries
    query_docs    = list(db.collection(QUERIES).stream())
    total_queries = len(query_docs)
    resolved_queries = sum(
        1 for d in query_docs if d.to_dict().get("status") == "resolved"
    )

    # SOS alerts
    sos_docs   = list(db.collection(SOS_ALERTS).stream())
    active_sos = sum(1 for d in sos_docs if not d.to_dict().get("resolved", False))

    # Feedback
    feedback_docs = list(db.collection(FEEDBACK).stream())
    total_feedback = len(feedback_docs)
    avg_rating = (
        round(sum(d.to_dict().get("rating", 0) for d in feedback_docs) / total_feedback, 2)
        if total_feedback else 0.0
    )

    # Meals
    meals_served = sum(1 for _ in db.collection(MEAL_CLAIMS).stream())

    # Projects
    project_docs       = list(db.collection(PROJECTS).stream())
    projects_evaluated = sum(
        1 for d in project_docs if d.to_dict().get("status") == "evaluated"
    )

    return SummaryStats(
        total_users=total_users,
        participants=role_counts["participant"],
        mentors=role_counts["mentor"],
        judges=role_counts["judge"],
        volunteers=role_counts["volunteer"],
        organizers=role_counts["organizer"],
        total_queries=total_queries,
        resolved_queries=resolved_queries,
        active_sos=active_sos,
        total_feedback=total_feedback,
        avg_rating=avg_rating,
        meals_served_today=meals_served,
        projects_evaluated=projects_evaluated,
    )


@router.get("/attendance")
def get_attendance(
    _: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """
    Return hourly attendance data from room logs.
    Falls back to seeded demo data if insufficient real logs exist.
    """
    log_docs  = list(db.collection(ROOM_LOGS).stream())
    total_logs = len(log_docs)

    if total_logs < 10:
        return [
            {"time": "8 AM",  "participants": 15, "mentors": 3,  "judges": 1, "volunteers": 5},
            {"time": "10 AM", "participants": 45, "mentors": 8,  "judges": 3, "volunteers": 7},
            {"time": "12 PM", "participants": 60, "mentors": 10, "judges": 5, "volunteers": 10},
            {"time": "2 PM",  "participants": 58, "mentors": 9,  "judges": 4, "volunteers": 8},
            {"time": "4 PM",  "participants": 55, "mentors": 8,  "judges": 5, "volunteers": 9},
            {"time": "6 PM",  "participants": 40, "mentors": 6,  "judges": 3, "volunteers": 6},
        ]

    # Build from real log data (simplified — returns zeroed template for now)
    time_labels = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"]
    return [
        {"time": t, "participants": 0, "mentors": 0, "judges": 0, "volunteers": 0}
        for t in time_labels
    ]
