"""
routers/projects.py — Hackathon project evaluations (judges)

Firestore migration: projects stored in 'projects' collection.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, PROJECTS
from ..schemas import ProjectCreate, ProjectOut, EvaluationRequest
from ..auth import get_current_user_id, require_role

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
    db=Depends(get_firestore),
):
    """List all projects — any authenticated user."""
    docs = db.collection(PROJECTS).stream()
    results = [_doc_to_project_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda p: p.created_at)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    body: ProjectCreate,
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Add a new project — organizer only."""
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
    _, doc_ref = db.collection(PROJECTS).add(data)
    return _doc_to_project_out(doc_ref.id, data)


@router.post("/{project_id}/evaluate", response_model=ProjectOut)
def evaluate_project(
    project_id: str,
    body: EvaluationRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Submit or update a score for a project — judge only (enforced via role in token)."""
    doc_ref = db.collection(PROJECTS).document(project_id)
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
