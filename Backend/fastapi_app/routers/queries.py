"""
routers/queries.py — Help queries from participants to mentors/judges/volunteers

Multi-tenant update: all queries scoped to hackathon sub-collection.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from ..firebase_db import get_firestore, get_hackathon_col, QUERIES, USERS
from ..schemas import QueryCreate, QueryOut, QueryStatusUpdate
from ..auth import (
    get_current_user_id, get_hackathon_id_from_token,
    decode_access_token, bearer_scheme,
)

router = APIRouter(prefix="/queries", tags=["queries"])


def _doc_to_query_out(doc_id: str, data: dict) -> QueryOut:
    return QueryOut(
        id=doc_id,
        participant_id=data.get("participant_id", ""),
        target_type=data.get("target_type", ""),
        skill=data.get("skill"),
        message=data.get("message", ""),
        status=data.get("status", "pending"),
        assigned_to_id=data.get("assigned_to_id"),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
        participant_name=data.get("participant_name"),
        assigned_to_name=data.get("assigned_to_name"),
    )


def _find_best_mentor(db, hackathon_id: str, skill: str | None, target_type: str) -> Optional[dict]:
    """
    Return best-matching user dict within the hackathon.
    Skill matching done in Python (Firestore has no ILIKE).
    """
    users_col = get_hackathon_col(db, hackathon_id, USERS)

    if target_type != "mentor":
        docs = (
            users_col
            .where("role", "==", target_type)
            .where("is_active", "==", True)
            .limit(1)
            .stream()
        )
        for doc in docs:
            return {"id": doc.id, "full_name": doc.to_dict().get("full_name", "")}
        return None

    if skill:
        all_mentors = (
            users_col
            .where("role", "==", "mentor")
            .where("is_active", "==", True)
            .stream()
        )
        skill_lower = skill.lower()
        for doc in all_mentors:
            data = doc.to_dict()
            mentor_skills = (data.get("skills") or "").lower()
            if skill_lower in mentor_skills:
                return {"id": doc.id, "full_name": data.get("full_name", "")}

    # Fallback: any available mentor
    docs = (
        users_col
        .where("role", "==", "mentor")
        .where("is_active", "==", True)
        .limit(1)
        .stream()
    )
    for doc in docs:
        return {"id": doc.id, "full_name": doc.to_dict().get("full_name", "")}
    return None


def _get_user_name(db, hackathon_id: str, uid: str | None) -> str | None:
    if not uid:
        return None
    col = get_hackathon_col(db, hackathon_id, USERS)
    doc = col.document(uid).get()
    if doc.exists:
        return doc.to_dict().get("full_name")
    return None


@router.post("", response_model=QueryOut, status_code=201)
def create_query(
    body: QueryCreate,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Submit a help query scoped to the current hackathon. Auto-assigns best-matched mentor."""
    matched = _find_best_mentor(db, hackathon_id, body.skill, body.target_type)
    participant_name = _get_user_name(db, hackathon_id, user_id)

    now = datetime.now(timezone.utc)
    data = {
        "participant_id":    user_id,
        "target_type":       body.target_type,
        "skill":             body.skill,
        "message":           body.message,
        "status":            "assigned" if matched else "pending",
        "assigned_to_id":    matched["id"] if matched else None,
        "created_at":        now,
        "participant_name":  participant_name,
        "assigned_to_name":  matched["full_name"] if matched else None,
    }
    queries_col = get_hackathon_col(db, hackathon_id, QUERIES)
    _, doc_ref = queries_col.add(data)
    return _doc_to_query_out(doc_ref.id, data)


@router.get("/me", response_model=List[QueryOut])
def my_queries(
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Get all queries submitted by the current participant in this hackathon."""
    col = get_hackathon_col(db, hackathon_id, QUERIES)
    docs = col.where("participant_id", "==", user_id).stream()
    results = [_doc_to_query_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda q: q.created_at, reverse=True)


@router.get("/assigned", response_model=List[QueryOut])
def assigned_queries(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db=Depends(get_firestore),
):
    """Get queries assigned to the current user (mentor/judge/volunteer) in this hackathon."""
    payload = decode_access_token(credentials.credentials)
    user_id = str(payload["sub"])
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, QUERIES)
    docs = col.where("assigned_to_id", "==", user_id).stream()
    results = [_doc_to_query_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda q: q.created_at, reverse=True)


@router.get("", response_model=List[QueryOut])
def all_queries(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db=Depends(get_firestore),
):
    """Get all queries in this hackathon — organizer only."""
    payload = decode_access_token(credentials.credentials)
    if payload.get("role") != "organizer":
        raise HTTPException(status_code=403, detail="Organizer access required")
    hackathon_id = payload.get("hackathon_id", "")
    col = get_hackathon_col(db, hackathon_id, QUERIES)
    docs = col.stream()
    results = [_doc_to_query_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda q: q.created_at, reverse=True)


@router.patch("/{query_id}/status", response_model=QueryOut)
def update_query_status(
    query_id: str,
    body: QueryStatusUpdate,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Update query status (mentor marks in-progress or resolved)."""
    col = get_hackathon_col(db, hackathon_id, QUERIES)
    doc_ref = col.document(query_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Query not found")

    update: dict = {"status": body.status}
    if body.assigned_to_id:
        update["assigned_to_id"] = body.assigned_to_id
        update["assigned_to_name"] = _get_user_name(db, hackathon_id, body.assigned_to_id)

    doc_ref.update(update)
    data = {**doc.to_dict(), **update}
    return _doc_to_query_out(query_id, data)
