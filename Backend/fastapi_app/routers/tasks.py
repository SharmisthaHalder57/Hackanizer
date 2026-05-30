"""
routers/tasks.py — Volunteer task management

Firestore migration: tasks stored in 'volunteer_tasks' collection.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..firebase_db import get_firestore, VOLUNTEER_TASKS
from ..schemas import TaskOut, TaskStatusUpdate, TaskCreate
from ..auth import get_current_user_id, require_role

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _doc_to_task_out(doc_id: str, data: dict) -> TaskOut:
    return TaskOut(
        id=doc_id,
        volunteer_id=data.get("volunteer_id"),
        title=data.get("title", ""),
        description=data.get("description", ""),
        priority=data.get("priority", "medium"),
        status=data.get("status", "pending"),
        created_at=data.get("created_at", datetime.now(timezone.utc)),
    )


@router.get("/me", response_model=List[TaskOut])
def my_tasks(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Get tasks assigned to the current volunteer."""
    docs = (
        db.collection(VOLUNTEER_TASKS)
        .where("volunteer_id", "==", user_id)
        .stream()
    )
    results = [_doc_to_task_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda t: t.created_at)


@router.get("", response_model=List[TaskOut])
def all_tasks(
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Get all tasks — organizer only."""
    docs = db.collection(VOLUNTEER_TASKS).stream()
    results = [_doc_to_task_out(d.id, d.to_dict()) for d in docs]
    return sorted(results, key=lambda t: t.created_at)


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    body: TaskCreate,
    _: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Create a new volunteer task — organizer only."""
    now = datetime.now(timezone.utc)
    data = {
        "volunteer_id": body.volunteer_id,
        "title":        body.title,
        "description":  body.description,
        "priority":     body.priority,
        "status":       "pending",
        "created_at":   now,
    }
    _, doc_ref = db.collection(VOLUNTEER_TASKS).add(data)
    return _doc_to_task_out(doc_ref.id, data)


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: str,
    body: TaskStatusUpdate,
    _: str = Depends(get_current_user_id),
    db=Depends(get_firestore),
):
    """Toggle task completion — volunteer updates their own tasks."""
    doc_ref = db.collection(VOLUNTEER_TASKS).document(task_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")
    doc_ref.update({"status": body.status})
    data = {**doc.to_dict(), "status": body.status}
    return _doc_to_task_out(task_id, data)
