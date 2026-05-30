"""
routers/users.py — User listing and room updates

Firestore migration: queries against the 'users' Firestore collection.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..firebase_db import get_firestore, USERS
from ..schemas import UserOut
from ..auth import get_current_user_id, require_role

router = APIRouter(prefix="/users", tags=["users"])


def _doc_to_user_out(doc) -> UserOut:
    data = doc.to_dict()
    return UserOut(
        id=doc.id,
        firebase_uid=data.get("firebase_uid"),
        full_name=data.get("full_name", ""),
        email=data.get("email", ""),
        photo_url=data.get("photo_url"),
        role=data.get("role", "participant"),
        skills=data.get("skills"),
        current_room=data.get("current_room"),
        is_active=data.get("is_active", True),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
    )


@router.get("", response_model=List[UserOut])
def list_users(
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """List all active users — organizer only."""
    docs = db.collection(USERS).where("is_active", "==", True).stream()
    return [_doc_to_user_out(d) for d in docs]


@router.get("/mentors/list", response_model=List[UserOut])
def list_mentors(
    _: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Return all active mentors (used for skill-matching in participant dashboard)."""
    docs = (
        db.collection(USERS)
        .where("role", "==", "mentor")
        .where("is_active", "==", True)
        .stream()
    )
    return [_doc_to_user_out(d) for d in docs]


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    _: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Get a specific user's profile."""
    doc = db.collection(USERS).document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    return _doc_to_user_out(doc)


@router.put("/{user_id}/room")
def update_room(
    user_id: str,
    room: str | None = None,
    current_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Update a user's current_room field (users can only update their own)."""
    if current_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's room")
    doc_ref = db.collection(USERS).document(user_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")
    doc_ref.update({"current_room": room})
    return {"ok": True, "current_room": room}
