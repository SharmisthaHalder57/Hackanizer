"""
routers/auth.py — Google Firebase login + /me endpoint

Firestore migration: user data is stored in and retrieved from the
Firestore 'users' collection. The document ID is the firebase_uid.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from ..firebase_db import get_firestore, USERS
from ..schemas import GoogleLoginRequest, AuthResponse, UserOut, TokenOut
from ..auth import (
    init_firebase, verify_firebase_token, create_access_token,
    get_current_user_id,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _doc_to_user_out(doc_id: str, data: dict) -> UserOut:
    """Convert a Firestore document dict to a UserOut schema."""
    return UserOut(
        id=doc_id,
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


def _get_or_create_user(
    db,
    decoded_token: dict,
    role: str,
    skills: str | None,
) -> tuple[str, dict]:
    """
    Upsert a user in Firestore.
    Returns (doc_id, data_dict).
    Document ID == firebase_uid for easy lookups.
    """
    uid   = decoded_token.get("uid", "")
    email = decoded_token.get("email", "")
    name  = (
        decoded_token.get("name")
        or decoded_token.get("display_name")
        or email.split("@")[0]
    )
    photo = decoded_token.get("picture")

    users_ref = db.collection(USERS)

    # 1) Try by document ID == firebase_uid
    user_doc = users_ref.document(uid).get()
    if user_doc.exists:
        data = user_doc.to_dict()
        # Update mutable fields
        update: dict = {"full_name": name}
        if photo:
            update["photo_url"] = photo
        users_ref.document(uid).update(update)
        data.update(update)
        return uid, data

    # 2) Try by email (legacy users without a doc at their UID)
    existing = users_ref.where("email", "==", email).limit(1).stream()
    for doc in existing:
        data = doc.to_dict()
        update = {"firebase_uid": uid, "full_name": name}
        if photo:
            update["photo_url"] = photo
        # Move document to UID-keyed doc if it was stored under a different ID
        if doc.id != uid:
            users_ref.document(uid).set({**data, **update})
            users_ref.document(doc.id).delete()
        else:
            users_ref.document(doc.id).update(update)
        data.update(update)
        return uid, data

    # 3) Create brand-new user
    now = datetime.now(timezone.utc)
    data = {
        "firebase_uid": uid,
        "full_name":    name,
        "email":        email,
        "photo_url":    photo,
        "role":         role,
        "skills":       skills,
        "current_room": None,
        "is_active":    True,
        "created_at":   now,
    }
    users_ref.document(uid).set(data)
    return uid, data


@router.post("/google", response_model=AuthResponse)
def google_login(payload: GoogleLoginRequest, db=Depends(get_firestore)):
    """
    Exchange a Firebase Google ID token for an app JWT.

    Flow:
    1. Frontend calls Firebase signInWithPopup()
    2. Gets idToken from Firebase
    3. POSTs { id_token, role, skills? } here
    4. We verify the Firebase token, upsert the user in Firestore, return our JWT
    """
    init_firebase()

    try:
        decoded = verify_firebase_token(payload.id_token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase token verification failed: {str(e)}",
        )

    doc_id, data = _get_or_create_user(db, decoded, payload.role, payload.skills)
    access_token = create_access_token(doc_id, data["role"])

    return AuthResponse(
        user=_doc_to_user_out(doc_id, data),
        token=TokenOut(access_token=access_token),
    )


@router.get("/me", response_model=UserOut)
def get_me(user_id: str = Depends(get_current_user_id), db=Depends(get_firestore)):
    """Return the currently authenticated user's profile."""
    doc = db.collection(USERS).document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    return _doc_to_user_out(doc.id, doc.to_dict())
