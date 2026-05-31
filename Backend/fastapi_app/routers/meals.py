"""
routers/meals.py — Meal claim tracking with QR code support

QR Flow:
  1. Anyone hits GET /api/meals/qr/{meal_type} → returns a short-lived signed token
     encoded as a QR code (base64 PNG). The QR is the SAME for all users for that meal.
  2. After scanning, the scanner's device sends POST /api/meals/claim/qr
     with the scanned token. The backend verifies it and marks the meal as claimed
     for the authenticated user. Real-time update fires to Firestore so the
     organizer dashboard refreshes instantly.
"""
from datetime import datetime, timedelta, timezone
from typing import List
import io
import base64
import hmac
import hashlib
import json
import os

from fastapi import APIRouter, Depends, HTTPException
import qrcode
from qrcode.image.pure import PyPNGImage

from ..firebase_db import get_firestore, get_hackathon_col, MEAL_CLAIMS, USERS
from ..schemas import MealClaimRequest, MealClaimQRRequest, MealStatusOut, MealStatsOut
from ..auth import get_current_user_id, get_hackathon_id_from_token, require_role, JWT_SECRET_KEY

router = APIRouter(prefix="/meals", tags=["meals"])

MEAL_TYPES = ("breakfast", "lunch", "dinner")

# QR token validity window in seconds (5 minutes is plenty for a scan)
QR_TOKEN_TTL_SECONDS = 300


# ─── QR Token Helpers ──────────────────────────────────────────────────────────

def _make_qr_token(meal_type: str, hackathon_id: str) -> str:
    """
    Build a compact signed token:
      payload = JSON { meal_type, hackathon_id, exp }
      signature = HMAC-SHA256(payload, JWT_SECRET_KEY)
    Returns base64url-encoded "payload.signature"
    """
    exp = int((datetime.now(timezone.utc) + timedelta(seconds=QR_TOKEN_TTL_SECONDS)).timestamp())
    payload_dict = {"meal_type": meal_type, "hackathon_id": hackathon_id, "exp": exp}
    payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode()
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode()

    sig = hmac.new(JWT_SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_qr_token(token: str) -> dict:
    """
    Verify the QR token signature and expiry.
    Returns the payload dict or raises HTTPException.
    """
    try:
        payload_b64, sig = token.rsplit(".", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Malformed QR token")

    expected_sig = hmac.new(JWT_SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=400, detail="Invalid QR token signature")

    try:
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=="))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed QR token payload")

    if datetime.now(timezone.utc).timestamp() > payload["exp"]:
        raise HTTPException(status_code=410, detail="QR code has expired. Please refresh and scan again.")

    return payload


def _token_to_qr_png_b64(token: str) -> str:
    """
    Encode a string as a QR code, return as base64 PNG string
    suitable for <img src="data:image/png;base64,...">
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)

    # qr.make_image() returns a qrcode PilImage wrapper.
    # .get_image() gives the raw PIL.Image so we can call .save(buf, "PNG").
    img = qr.make_image()
    buf = io.BytesIO()
    img.get_image().save(buf, "PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


# ─── Existing Endpoints ────────────────────────────────────────────────────────

@router.get("/me", response_model=MealStatusOut)
def my_meal_status(
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Return which meals the current user has claimed in this hackathon."""
    col = get_hackathon_col(db, hackathon_id, MEAL_CLAIMS)
    docs = col.where("user_id", "==", user_id).stream()
    claimed = {d.to_dict().get("meal_type") for d in docs}
    return MealStatusOut(
        breakfast="breakfast" in claimed,
        lunch="lunch" in claimed,
        dinner="dinner" in claimed,
    )


@router.post("/claim")
def claim_meal(
    body: MealClaimRequest,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Claim a meal directly (legacy / fallback). Returns 409 if already claimed."""
    col = get_hackathon_col(db, hackathon_id, MEAL_CLAIMS)
    existing = (
        col
        .where("user_id", "==", user_id)
        .where("meal_type", "==", body.meal_type)
        .limit(1)
        .stream()
    )
    for _ in existing:
        raise HTTPException(status_code=409, detail=f"{body.meal_type} already claimed")

    col.add({
        "user_id":    user_id,
        "meal_type":  body.meal_type,
        "claimed_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "meal_type": body.meal_type}


# ─── NEW: QR Endpoints ─────────────────────────────────────────────────────────

@router.get("/qr/{meal_type}")
def get_meal_qr(
    meal_type: str,
    hackathon_id: str = Depends(get_hackathon_id_from_token),
):
    """
    Generate a QR code for a meal coupon.

    - meal_type: "breakfast" | "lunch" | "dinner"
    - The QR code is SHARED — all participants/judges/volunteers/mentors
      see the same QR for the same meal in the same hackathon.
    - The token embedded in the QR expires after 5 minutes to prevent replay abuse.
    - Returns: { meal_type, qr_image (base64 PNG), expires_in_seconds }

    Usage:
      GET /api/meals/qr/breakfast
      GET /api/meals/qr/lunch
      GET /api/meals/qr/dinner

    The frontend calls this when the user presses the "Claim" button — the QR
    pops up instantly and the user scans it with another device / the organizer
    station scans it.
    """
    if meal_type not in MEAL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid meal_type. Must be one of: {', '.join(MEAL_TYPES)}")

    token = _make_qr_token(meal_type, hackathon_id)
    qr_b64 = _token_to_qr_png_b64(token)

    return {
        "meal_type": meal_type,
        "qr_image": f"data:image/png;base64,{qr_b64}",
        "token": token,                          # also return raw token for apps that prefer text QR readers
        "expires_in_seconds": QR_TOKEN_TTL_SECONDS,
    }


@router.post("/claim/qr")
def claim_meal_via_qr(
    body: MealClaimQRRequest,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """
    Claim a meal by submitting the token scanned from the QR code.

    Flow:
      1. User sees QR on screen (generated by GET /api/meals/qr/{meal_type})
      2. User (or organizer station) scans the QR
      3. Scanned token is sent to this endpoint
      4. Backend verifies token signature + expiry
      5. Meal is marked claimed for the authenticated user
      6. Firestore write triggers real-time update → organizer dashboard refreshes

    Returns 409 if already claimed, 410 if QR expired, 400 if invalid.
    """
    payload = _verify_qr_token(body.qr_token)

    # Ensure the token was issued for this hackathon
    if payload.get("hackathon_id") != hackathon_id:
        raise HTTPException(status_code=403, detail="QR token issued for a different hackathon")

    meal_type = payload["meal_type"]
    if meal_type not in MEAL_TYPES:
        raise HTTPException(status_code=400, detail="Invalid meal_type in token")

    col = get_hackathon_col(db, hackathon_id, MEAL_CLAIMS)

    # Idempotency check — prevent double-claiming
    existing = (
        col
        .where("user_id", "==", user_id)
        .where("meal_type", "==", meal_type)
        .limit(1)
        .stream()
    )
    for _ in existing:
        raise HTTPException(status_code=409, detail=f"{meal_type} already claimed")

    # Write claim — Firestore's real-time listeners on the organizer dashboard
    # will pick this up instantly without any polling needed.
    col.add({
        "user_id":    user_id,
        "meal_type":  meal_type,
        "claimed_at": datetime.now(timezone.utc),
        "via_qr":     True,
    })

    return {"ok": True, "meal_type": meal_type}


# ─── Organizer Stats (unchanged) ───────────────────────────────────────────────

@router.get("/stats", response_model=List[MealStatsOut])
def meal_stats(
    payload: dict = Depends(require_role("organizer")),
    db=Depends(get_firestore),
):
    """Meal distribution stats for the organizer dashboard — organizer only."""
    hackathon_id = payload.get("hackathon_id", "")
    users_col = get_hackathon_col(db, hackathon_id, USERS)
    meals_col = get_hackathon_col(db, hackathon_id, MEAL_CLAIMS)

    total_users = sum(1 for _ in users_col.where("is_active", "==", True).stream())

    all_claims = list(meals_col.stream())
    counts: dict[str, int] = {m: 0 for m in MEAL_TYPES}
    for doc in all_claims:
        meal = doc.to_dict().get("meal_type")
        if meal in counts:
            counts[meal] += 1

    return [
        MealStatsOut(meal_type=meal, claimed=counts[meal], total_users=total_users)
        for meal in MEAL_TYPES
    ]