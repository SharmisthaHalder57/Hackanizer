"""
main.py — FastAPI application entry point

Firestore migration: SQLAlchemy engine and Base.metadata.create_all() removed.
Firebase is initialized via firebase_db.init_firebase_app() at startup.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .firebase_db import init_firebase_app
from .auth import init_firebase
from .routers import auth, users, queries, rooms, meals, sos, feedback, projects, tasks, analytics

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="HackAnizer API",
    description="Backend API for the HackAnizer Event Management Platform (Firestore)",
    version="2.0.0",
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

app.include_router(auth.router,      prefix=API_PREFIX)
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
    return {"status": "ok", "service": "HackAnizer FastAPI", "database": "Firestore"}
