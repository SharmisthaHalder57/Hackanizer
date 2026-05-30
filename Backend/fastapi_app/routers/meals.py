"""
routers/meals.py — Meal claim tracking per user

Firestore migration: meal claims stored in 'meal_claims' collection.
Duplicate claim check done by querying the collection in Python.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, MEAL_CLAIMS, USERS
from ..schemas import MealClaimRequest, MealStatusOut, MealStatsOut
from ..auth import get_current_user_id, require_role

router = APIRouter(prefix="/meals", tags=["meals"])

MEAL_TYPES = ("breakfast", "lunch", "dinner")


@router.get("/me", response_model=MealStatusOut)
def my_meal_status(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Return which meals the current user has claimed."""
    docs = (
        db.collection(MEAL_CLAIMS)
        .where("user_id", "==", user_id)
        .stream()
    )
    claimed = {d.to_dict().get("meal_type") for d in docs}
    return MealStatusOut(
        breakfast="breakfast" in claimed,
        lunch="lunch" in claimed,
        dinner="dinner" in claimed,
    )


@router.post("/claim")
def claim_meal(
    body: MealClaimRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Claim a meal. Returns 409 if already claimed."""
    existing = (
        db.collection(MEAL_CLAIMS)
        .where("user_id", "==", user_id)
        .where("meal_type", "==", body.meal_type)
        .limit(1)
        .stream()
    )
    for _ in existing:
        raise HTTPException(status_code=409, detail=f"{body.meal_type} already claimed")

    db.collection(MEAL_CLAIMS).add({
        "user_id":    user_id,
        "meal_type":  body.meal_type,
        "claimed_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "meal_type": body.meal_type}


@router.get("/stats", response_model=List[MealStatsOut])
def meal_stats(
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Meal distribution stats for the organizer dashboard."""
    # Count total active users
    total_users = sum(1 for _ in db.collection(USERS).where("is_active", "==", True).stream())

    # Count claims per meal type in Python
    all_claims = list(db.collection(MEAL_CLAIMS).stream())
    counts: dict[str, int] = {m: 0 for m in MEAL_TYPES}
    for doc in all_claims:
        meal = doc.to_dict().get("meal_type")
        if meal in counts:
            counts[meal] += 1

    return [
        MealStatsOut(meal_type=meal, claimed=counts[meal], total_users=total_users)
        for meal in MEAL_TYPES
    ]
