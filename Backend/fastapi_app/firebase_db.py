"""
firebase_db.py — Firebase Admin SDK initialization + Firestore client

Multi-tenant migration: every hackathon's data lives under
  /hackathons/{hackathon_id}/{collection}/{doc}
Use get_hackathon_col(db, hackathon_id, collection) everywhere instead
of db.collection(COLLECTION).
"""
from __future__ import annotations
import os
import json

from dotenv import load_dotenv

load_dotenv()

# ─── Top-level collection names ────────────────────────────────────────────────
HACKATHONS       = "hackathons"   # top-level tenant documents

# ─── Sub-collection name constants (used inside each hackathon) ────────────────
USERS            = "users"
QUERIES          = "queries"
ROOM_LOGS        = "room_logs"
MEAL_CLAIMS      = "meal_claims"
SOS_ALERTS       = "sos_alerts"
FEEDBACK         = "feedback"
PROJECTS         = "projects"
VOLUNTEER_TASKS  = "volunteer_tasks"

# ─── Firebase Init ─────────────────────────────────────────────────────────────
_firebase_initialized = False
_firestore_client = None


def init_firebase_app():
    """Initialize Firebase Admin SDK once. Called at startup."""
    global _firebase_initialized, _firestore_client

    if _firebase_initialized:
        return

    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase_service_account.json")
        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
            print(f"[OK] Firebase Admin initialized from {sa_path}")
        else:
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if sa_json:
                sa_dict = json.loads(sa_json)
                cred = credentials.Certificate(sa_dict)
                firebase_admin.initialize_app(cred)
                print("[OK] Firebase Admin initialized from environment variable")
            else:
                print(
                    "[WARNING] Firebase service account not found. "
                    "Firestore will be unavailable.\n"
                    f"   Expected at: {sa_path}\n"
                    "   See Backend/firebase_service_account.json.placeholder for instructions."
                )
                return

    _firestore_client = firestore.client()
    _firebase_initialized = True
    print("[OK] Firestore client ready")


def get_firestore_client():
    """Return the initialized Firestore client. Raises RuntimeError if not initialized."""
    if _firestore_client is None:
        raise RuntimeError(
            "Firestore client is not initialized. "
            "Make sure init_firebase_app() was called at startup and a valid "
            "service account is configured."
        )
    return _firestore_client


def get_firestore():
    """
    FastAPI dependency — yields the Firestore client.
    """
    yield get_firestore_client()


def get_hackathon_col(db, hackathon_id: str, sub_collection: str):
    """
    Return the Firestore CollectionReference scoped to a specific hackathon.

    Usage:
        col = get_hackathon_col(db, hackathon_id, USERS)
        docs = col.stream()
    """
    return (
        db.collection(HACKATHONS)
        .document(hackathon_id)
        .collection(sub_collection)
    )
