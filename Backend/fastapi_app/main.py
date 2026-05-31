"""
main.py — FastAPI application entry point

Multi-tenant update: hackathons router added for tenant management.
All other routers now scope data to hackathon sub-collections via JWT.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .firebase_db import init_firebase_app
from .auth import init_firebase
from .routers import auth, users, queries, rooms, meals, sos, feedback, projects, tasks, analytics, hackathons

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="HackAnizer API",
    description="Multi-tenant Backend API for the HackAnizer Event Management Platform (Firestore)",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:5000",   # Flask gateway
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup Event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # Initialize Firebase Admin + Firestore client
    init_firebase_app()
    # Also call legacy init_firebase so token verification still works
    init_firebase()

# ─── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

# Public — no auth required
app.include_router(hackathons.router, prefix=API_PREFIX)

# Auth
app.include_router(auth.router,      prefix=API_PREFIX)

# Protected — all scoped to hackathon via JWT
app.include_router(users.router,     prefix=API_PREFIX)
app.include_router(queries.router,   prefix=API_PREFIX)
app.include_router(rooms.router,     prefix=API_PREFIX)
app.include_router(meals.router,     prefix=API_PREFIX)
app.include_router(sos.router,       prefix=API_PREFIX)
app.include_router(feedback.router,  prefix=API_PREFIX)
app.include_router(projects.router,  prefix=API_PREFIX)
app.include_router(tasks.router,     prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)

# ─── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "HackAnizer FastAPI",
        "database": "Firestore",
        "multitenancy": "enabled",
    }
