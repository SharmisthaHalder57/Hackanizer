"""
routers/feedback.py — Anonymous feedback submission and stats

Multi-tenant update: feedback scoped to hackathon sub-collection.
Submission remains anonymous (no auth required) but requires
hackathon_id as a query parameter for tenant scoping.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Query

from ..firebase_db import get_firestore, get_hackathon_col, FEEDBACK
from ..schemas import FeedbackCreate, FeedbackOut, FeedbackStatsOut
from ..auth import require_role

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _doc_to_feedback_out(doc_id: str, data: dict) -> FeedbackOut:
    return FeedbackOut(
        id=doc_id,
        category=data.get("category", ""),
        rating=data.get("rating", 0),
        tags=data.get("tags"),
        comment=data.get("comment"),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
    )


@router.post("", response_model=FeedbackOut, status_code=201)
def submit_feedback(
    body: FeedbackCreate,
    hackathon_id: str = Query(..., description="Hackathon tenant ID"),
    db=Depends(get_firestore),
):
    """
    Submit anonymous feedback for a specific hackathon.
    No auth required (by design — keeps the barrier to feedback low).
    hackathon_id must be provided as a query param: /feedback?hackathon_id=...
    """
    now = datetime.now(timezone.utc)
    data = {
        "category":   body.category,
        "rating":     body.rating,
        "tags":       body.tags or [],
        "comment":    body.comment,
        "created_at": now,
    }
    col = get_hackathon_col(db, hackathon_id, FEEDBACK)
    _, doc_ref = col.add(data)
    return _doc_to_feedback_out(doc_ref.id, data)


@router.get("/stats", response_model=FeedbackStatsOut)
def feedback_stats(
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Feedback aggregation for the analytics dashboard — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, FEEDBACK)
    all_docs = list(col.stream())
    if not all_docs:
        return FeedbackStatsOut(total=0, avg_rating=0.0, by_category={}, by_rating={})

    by_category: dict[str, int] = {}
    by_rating:   dict[str, int] = {}
    total_rating = 0

    for doc in all_docs:
        fb = doc.to_dict()
        cat    = fb.get("category", "unknown")
        rating = fb.get("rating", 0)
        by_category[cat] = by_category.get(cat, 0) + 1
        key = f"{rating}★"
        by_rating[key]   = by_rating.get(key, 0) + 1
        total_rating    += rating

    return FeedbackStatsOut(
        total=len(all_docs),
        avg_rating=round(total_rating / len(all_docs), 2),
        by_category=by_category,
        by_rating=by_rating,
    )


@router.get("", response_model=List[FeedbackOut])
def list_feedback(
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Raw feedback list — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, FEEDBACK)
    docs = col.stream()
    results = [_doc_to_feedback_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda f: f.created_at, reverse=True)
