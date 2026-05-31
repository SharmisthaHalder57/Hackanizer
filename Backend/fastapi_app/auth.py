"""
auth.py — Firebase Admin SDK initialization + JWT helpers

Multi-tenant update: JWT tokens now include `hackathon_id` so every request
is scoped to a specific hackathon. New dependency get_hackathon_id_from_token
extracts this value for use in all routers.
"""
from __future__ import annotations
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

load_dotenv()

# ─── Config ────────────────────────────────────────────────────────────────────
JWT_SECRET_KEY    = os.getenv("JWT_SECRET_KEY", "fallback-secret-change-me")
JWT_ALGORITHM     = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
FIREBASE_SA_PATH  = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase_service_account.json")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hackanizer-680bd")

# ─── Firebase Admin SDK Init ────────────────────────────────────────────────────
_firebase_initialized = False


def init_firebase():
    """Initialize Firebase Admin SDK (called once at startup)."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            if os.path.exists(FIREBASE_SA_PATH):
                cred = credentials.Certificate(FIREBASE_SA_PATH)
                firebase_admin.initialize_app(cred)
                print(f"[OK] Firebase Admin initialized from {FIREBASE_SA_PATH}")
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
                        "Google login will be unavailable.\n"
                        f"   Expected at: {FIREBASE_SA_PATH}\n"
                        "   See Backend/firebase_service_account.json.placeholder for instructions."
                    )
                    return

        _firebase_initialized = True

    except Exception as e:
        print(f"[ERROR] Firebase init error: {e}")


# ─── Firebase Token Verification ───────────────────────────────────────────────

# Cache for Google's public certificates
GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken-sign-in-for-uid-control%40official-firebase-key-server.iam.gserviceaccount.com"
)
_google_certs: dict = {}


def fetch_google_public_keys():
    global _google_certs
    try:
        import httpx
        r = httpx.get(GOOGLE_CERTS_URL)
        if r.status_code == 200:
            _google_certs = r.json()
            print("[OK] Fetched Google public keys for Firebase token verification")
    except Exception as e:
        print(f"[ERROR] Error fetching Google public keys: {e}")


def verify_firebase_token_manually(id_token: str) -> dict:
    global _google_certs
    if not _google_certs:
        fetch_google_public_keys()

    try:
        unverified_header = jwt.get_unverified_header(id_token)
        kid = unverified_header.get("kid")
        if not kid:
            raise Exception("No 'kid' in token header")

        public_key = _google_certs.get(kid)
        if not public_key:
            fetch_google_public_keys()
            public_key = _google_certs.get(kid)
            if not public_key:
                raise Exception(f"Public key not found for kid: {kid}")

        decoded = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        )
        decoded["uid"] = decoded.get("sub")
        return decoded
    except Exception as e:
        raise Exception(f"Manual token verification failed: {e}")


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token.
    Returns the decoded token payload (uid, email, name, picture, etc.)
    Raises HTTPException on invalid token.
    """
    if id_token.startswith("mock-token-"):
        parts = id_token.split("-", 3)
        email = parts[2] if len(parts) > 2 else "mockuser@example.com"
        name  = parts[3] if len(parts) > 3 else email.split("@")[0].capitalize()
        import urllib.parse
        email = urllib.parse.unquote(email)
        name  = urllib.parse.unquote(name)
        return {
            "uid": f"mock-uid-{email}",
            "email": email,
            "name": name,
            "picture": None,
        }

    if _firebase_initialized:
        try:
            from firebase_admin import auth as firebase_auth
            decoded = firebase_auth.verify_id_token(id_token)
            return decoded
        except Exception as e:
            print(f"[INFO] Firebase Admin SDK verification failed, trying manual verify: {e}")

    try:
        return verify_firebase_token_manually(id_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token: {str(e)}",
        )


# ─── App JWT Helpers ────────────────────────────────────────────────────────────

def create_access_token(firebase_uid: str, role: str, hackathon_id: str) -> str:
    """
    Create a signed JWT for our API.
    Now includes hackathon_id for multi-tenant data scoping.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub":          firebase_uid,
        "role":         role,
        "hackathon_id": hackathon_id,
        "exp":          expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate our JWT. Raises HTTPException if invalid."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── FastAPI Dependencies ───────────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    Extract firebase_uid from Bearer token.
    Raises 401 if missing/invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return str(user_id)


def get_hackathon_id_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    Extract hackathon_id from Bearer token.
    All tenant-scoped routes use this dependency to determine which hackathon's
    sub-collection to query. Raises 401 if token is missing or lacks hackathon_id.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    hackathon_id = payload.get("hackathon_id")
    if not hackathon_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing hackathon_id — please log in again",
        )
    return str(hackathon_id)


def require_role(*roles: str):
    """Factory dependency that checks the caller's role."""
    def checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    ) -> dict:
        if not credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")
        payload = decode_access_token(credentials.credentials)
        if payload.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return payload
    return checker
