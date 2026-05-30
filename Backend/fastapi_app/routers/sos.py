"""
routers/sos.py — SOS emergency alerts

Firestore migration: alerts stored in 'sos_alerts' collection.
User name is denormalized into each alert document for efficient reads.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, SOS_ALERTS, USERS
from ..schemas import SOSCreate, SOSOut, SOSResolveRequest
from ..auth import get_current_user_id, require_role

router = APIRouter(prefix="/sos", tags=["sos"])


def _doc_to_sos_out(doc_id: str, data: dict) -> SOSOut:
    return SOSOut(
        id=doc_id,
        user_id=data.get("user_id", ""),
        emergency_type=data.get("emergency_type", ""),
        details=data.get("details", ""),
        resolved=data.get("resolved", False),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
        user_name=data.get("user_name"),
    )


def _get_user_name(db, uid: str) -> str | None:
    doc = db.collection(USERS).document(uid).get()
    if doc.exists:
        return doc.to_dict().get("full_name")
    return None


@router.post("", response_model=SOSOut, status_code=201)
def create_sos(
    body: SOSCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Submit an SOS alert. Immediately visible to organizers."""
    user_name = _get_user_name(db, user_id)
    now = datetime.now(timezone.utc)
    data = {
        "user_id":        user_id,
        "user_name":      user_name,
        "emergency_type": body.emergency_type,
        "details":        body.details,
        "resolved":       False,
        "created_at":     now,
    }
    _, doc_ref = db.collection(SOS_ALERTS).add(data)
    return _doc_to_sos_out(doc_ref.id, data)


@router.get("", response_model=List[SOSOut])
def get_all_sos(
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Get all SOS alerts — organizer only."""
    docs = db.collection(SOS_ALERTS).stream()
    results = [_doc_to_sos_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda s: s.created_at, reverse=True)


@router.patch("/{alert_id}/resolve", response_model=SOSOut)
def resolve_sos(
    alert_id: str,
    body: SOSResolveRequest,
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Mark an SOS alert as resolved."""
    doc_ref = db.collection(SOS_ALERTS).document(alert_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    doc_ref.update({"resolved": body.resolved})
    data = {**doc.to_dict(), "resolved": body.resolved}
    return _doc_to_sos_out(alert_id, data)
