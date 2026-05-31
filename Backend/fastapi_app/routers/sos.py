"""
routers/sos.py — SOS emergency alerts

Multi-tenant update: SOS alerts scoped to hackathon sub-collection.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, get_hackathon_col, SOS_ALERTS, USERS
from ..schemas import SOSCreate, SOSOut, SOSResolveRequest
from ..auth import get_current_user_id, get_hackathon_id_from_token, require_role

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


def _get_user_name(db, hackathon_id: str, uid: str) -> str | None:
    col = get_hackathon_col(db, hackathon_id, USERS)
    doc = col.document(uid).get()
    if doc.exists:
        return doc.to_dict().get("full_name")
    return None


@router.post("", response_model=SOSOut, status_code=201)
def create_sos(
    body: SOSCreate,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Submit an SOS alert scoped to the current hackathon."""
    user_name = _get_user_name(db, hackathon_id, user_id)
    now = datetime.now(timezone.utc)
    data = {
        "user_id":        user_id,
        "user_name":      user_name,
        "emergency_type": body.emergency_type,
        "details":        body.details,
        "resolved":       False,
        "created_at":     now,
    }
    col = get_hackathon_col(db, hackathon_id, SOS_ALERTS)
    _, doc_ref = col.add(data)
    return _doc_to_sos_out(doc_ref.id, data)


@router.get("", response_model=List[SOSOut])
def get_all_sos(
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Get all SOS alerts for this hackathon — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, SOS_ALERTS)
    docs = col.stream()
    results = [_doc_to_sos_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda s: s.created_at, reverse=True)


@router.patch("/{alert_id}/resolve", response_model=SOSOut)
def resolve_sos(
    alert_id: str,
    body: SOSResolveRequest,
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Mark an SOS alert as resolved — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, SOS_ALERTS)
    doc_ref = col.document(alert_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    doc_ref.update({"resolved": body.resolved})
    data = {**doc.to_dict(), "resolved": body.resolved}
    return _doc_to_sos_out(alert_id, data)
