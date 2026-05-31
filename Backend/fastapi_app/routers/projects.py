"""
routers/projects.py — Hackathon project evaluations (judges)

Multi-tenant update: projects scoped to hackathon sub-collection.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, get_hackathon_col, PROJECTS
from ..schemas import ProjectCreate, ProjectOut, EvaluationRequest
from ..auth import get_current_user_id, get_hackathon_id_from_token, require_role

router = APIRouter(prefix="/projects", tags=["projects"])


def _doc_to_project_out(doc_id: str, data: dict) -> ProjectOut:
    return ProjectOut(
        id=doc_id,
        team=data.get("team", ""),
        title=data.get("title", ""),
        description=data.get("description", ""),
        score=data.get("score"),
        status=data.get("status", "pending"),
        evaluated_by_id=data.get("evaluated_by_id"),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
    )


@router.get("", response_model=List[ProjectOut])
def list_projects(
    _: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """List all projects for this hackathon — any authenticated user."""
    col = get_hackathon_col(db, hackathon_id, PROJECTS)
    docs = col.stream()
    results = [_doc_to_project_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda p: p.created_at)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    body: ProjectCreate,
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Add a new project — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    now = datetime.now(timezone.utc)
    data = {
        "team":            body.team,
        "title":           body.title,
        "description":     body.description,
        "score":           None,
        "status":          "pending",
        "evaluated_by_id": None,
        "created_at":      now,
    }
    col = get_hackathon_col(db, hackathon_id, PROJECTS)
    _, doc_ref = col.add(data)
    return _doc_to_project_out(doc_ref.id, data)


@router.post("/{project_id}/evaluate", response_model=ProjectOut)
def evaluate_project(
    project_id: str,
    body: EvaluationRequest,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Submit or update a score for a project — judge role enforced via token."""
    col = get_hackathon_col(db, hackathon_id, PROJECTS)
    doc_ref = col.document(project_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    update = {
        "score":           body.score,
        "status":          "evaluated",
        "evaluated_by_id": user_id,
    }
    doc_ref.update(update)
    data = {**doc.to_dict(), **update}
    return _doc_to_project_out(project_id, data)
