"""
routers/hackathons.py — Hackathon tenant management

Multi-tenancy: each hackathon is a top-level document in /hackathons/{id}.
All per-hackathon data lives in sub-collections under that document.

Public routes (no auth):
  GET  /hackathons          — list all active hackathons (for login picker)
  GET  /hackathons/{id}     — get one hackathon

Authenticated routes:
  POST /hackathons          — create a hackathon (organizer only)
  PATCH /hackathons/{id}    — update a hackathon (organizer + must own it)
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, HACKATHONS
from ..schemas import HackathonCreate, HackathonOut
from ..auth import get_current_user_id, require_role, decode_access_token, bearer_scheme
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional

router = APIRouter(prefix="/hackathons", tags=["hackathons"])


def _doc_to_hackathon_out(doc_id: str, data: dict) -> HackathonOut:
    return HackathonOut(
        id=doc_id,
        name=data.get("name", ""),
        description=data.get("description"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        location=data.get("location"),
        max_participants=data.get("max_participants"),
        is_active=data.get("is_active", True),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
        organizer_id=data.get("organizer_id"),
    )


@router.get("", response_model=List[HackathonOut])
def list_hackathons(db=Depends(get_firestore)):
    """
    List all active hackathons. Public — no authentication required.
    Used by the frontend login page to present a hackathon picker.
    """
    docs = (
        db.collection(HACKATHONS)
        .where("is_active", "==", True)
        .stream()
    )
    results = [_doc_to_hackathon_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda h: h.created_at)


@router.get("/{hackathon_id}", response_model=HackathonOut)
def get_hackathon(hackathon_id: str, db=Depends(get_firestore)):
    """Get a specific hackathon by ID. Public — no authentication required."""
    doc = db.collection(HACKATHONS).document(hackathon_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return _doc_to_hackathon_out(doc.id, doc.to_dict())


@router.post("", response_model=HackathonOut, status_code=201)
def create_hackathon(
    body: HackathonCreate,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db=Depends(get_firestore),
):
    """
    Create a new hackathon tenant.

    Auth rules:
    - If a Bearer token is present, it must belong to an organizer.
    - If NO token is provided and there are zero existing hackathons, the
      request is allowed as a bootstrap operation (first hackathon creation).
    """
    organizer_id = None

    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload.get("role") != "organizer":
            raise HTTPException(status_code=403, detail="Only organizers can create hackathons")
        organizer_id = payload.get("sub")
    else:
        # Allow unauthenticated creation only if no hackathons exist yet (bootstrap)
        existing = list(db.collection(HACKATHONS).limit(1).stream())
        if existing:
            raise HTTPException(
                status_code=401,
                detail="Authentication required to create a hackathon",
            )

    now = datetime.now(timezone.utc)
    data = {
        "name":             body.name,
        "description":      body.description,
        "start_date":       body.start_date,
        "end_date":         body.end_date,
        "location":         body.location,
        "max_participants": body.max_participants,
        "is_active":        body.is_active,
        "organizer_id":     organizer_id,
        "created_at":       now,
    }
    _, doc_ref = db.collection(HACKATHONS).add(data)
    return _doc_to_hackathon_out(doc_ref.id, data)


@router.patch("/{hackathon_id}", response_model=HackathonOut)
def update_hackathon(
    hackathon_id: str,
    body: HackathonCreate,
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Update a hackathon's metadata — organizer only."""
    doc_ref = db.collection(HACKATHONS).document(hackathon_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    update = {
        "name":             body.name,
        "description":      body.description,
        "start_date":       body.start_date,
        "end_date":         body.end_date,
        "location":         body.location,
        "max_participants": body.max_participants,
        "is_active":        body.is_active,
    }
    doc_ref.update(update)
    data = {**doc.to_dict(), **update}
    return _doc_to_hackathon_out(hackathon_id, data)
