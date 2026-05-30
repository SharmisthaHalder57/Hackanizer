"""
database.py — Compatibility shim (kept for any legacy imports)

The database layer has been fully migrated to Firebase Firestore.
This module re-exports everything from firebase_db for backward-compat.
"""
from .firebase_db import (
    get_firestore as get_db,
    get_firestore,
    get_firestore_client,
    init_firebase_app,
    USERS, QUERIES, ROOM_LOGS, MEAL_CLAIMS,
    SOS_ALERTS, FEEDBACK, PROJECTS, VOLUNTEER_TASKS,
)

__all__ = [
    "get_db", "get_firestore", "get_firestore_client", "init_firebase_app",
    "USERS", "QUERIES", "ROOM_LOGS", "MEAL_CLAIMS",
    "SOS_ALERTS", "FEEDBACK", "PROJECTS", "VOLUNTEER_TASKS",
]
