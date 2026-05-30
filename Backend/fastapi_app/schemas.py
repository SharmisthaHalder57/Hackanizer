"""
schemas.py — Pydantic v2 schemas for request / response validation

Firestore migration: all `id` and `*_id` fields are now `str` (Firestore
document IDs are auto-generated strings, not integer primary keys).
`from_attributes=True` is no longer needed since we work with plain dicts.
"""
from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

# ─── Role Literals ─────────────────────────────────────────────────────────────
Role         = Literal["participant", "mentor", "judge", "volunteer", "organizer"]
TargetType   = Literal["mentor", "judge", "volunteer"]
QueryStatus  = Literal["pending", "assigned", "in-progress", "resolved"]
MealType     = Literal["breakfast", "lunch", "dinner"]
Priority     = Literal["high", "medium", "low"]
TaskStatus   = Literal["pending", "completed"]
ProjectStatus = Literal["pending", "evaluated"]


# ─── User Schemas ───────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: Role
    skills: Optional[str] = None


class UserOut(UserBase):
    id: str                         # Firestore document ID (firebase_uid)
    firebase_uid: Optional[str] = None
    photo_url: Optional[str] = None
    current_room: Optional[str] = None
    is_active: bool
    created_at: datetime


# ─── Auth Schemas ───────────────────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    """Frontend sends Firebase ID token + chosen role"""
    id_token: str = Field(..., description="Firebase ID token from Google Sign-In")
    role: Role
    skills: Optional[str] = None  # Required if role == mentor


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: UserOut
    token: TokenOut


# ─── Query Schemas ──────────────────────────────────────────────────────────────

class QueryCreate(BaseModel):
    target_type: TargetType
    skill: Optional[str] = None
    message: str


class QueryStatusUpdate(BaseModel):
    status: QueryStatus
    assigned_to_id: Optional[str] = None   # str (firebase_uid)


class QueryOut(BaseModel):
    id: str
    participant_id: str
    target_type: str
    skill: Optional[str] = None
    message: str
    status: str
    assigned_to_id: Optional[str] = None
    created_at: datetime
    participant_name: Optional[str] = None
    assigned_to_name: Optional[str] = None


# ─── Room Schemas ───────────────────────────────────────────────────────────────

class RoomEntryRequest(BaseModel):
    room: str
    action: Literal["enter", "exit"]


class RoomOccupancy(BaseModel):
    room: str
    occupants: int
    capacity: int
    users: list[str]  # list of user names


# ─── Meal Schemas ───────────────────────────────────────────────────────────────

class MealClaimRequest(BaseModel):
    meal_type: MealType


class MealStatusOut(BaseModel):
    breakfast: bool
    lunch: bool
    dinner: bool


class MealStatsOut(BaseModel):
    meal_type: str
    claimed: int
    total_users: int


# ─── SOS Schemas ────────────────────────────────────────────────────────────────

class SOSCreate(BaseModel):
    emergency_type: str
    details: str


class SOSOut(BaseModel):
    id: str
    user_id: str
    emergency_type: str
    details: str
    resolved: bool
    created_at: datetime
    user_name: Optional[str] = None


class SOSResolveRequest(BaseModel):
    resolved: bool = True


# ─── Feedback Schemas ────────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    category: str
    rating: int = Field(..., ge=1, le=5)
    tags: Optional[list[str]] = None
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: str
    category: str
    rating: int
    tags: Optional[list[str]] = None
    comment: Optional[str] = None
    created_at: datetime


class FeedbackStatsOut(BaseModel):
    total: int
    avg_rating: float
    by_category: dict[str, int]
    by_rating: dict[str, int]


# ─── Project Schemas ─────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    team: str
    title: str
    description: str


class EvaluationRequest(BaseModel):
    score: float = Field(..., ge=0, le=100)


class ProjectOut(BaseModel):
    id: str
    team: str
    title: str
    description: str
    score: Optional[float] = None
    status: str
    evaluated_by_id: Optional[str] = None
    created_at: datetime


# ─── Task Schemas ─────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str
    priority: Priority
    volunteer_id: Optional[str] = None     # str (firebase_uid)


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    id: str
    volunteer_id: Optional[str] = None
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime


# ─── Analytics Schemas ────────────────────────────────────────────────────────────

class SummaryStats(BaseModel):
    total_users: int
    participants: int
    mentors: int
    judges: int
    volunteers: int
    organizers: int
    total_queries: int
    resolved_queries: int
    active_sos: int
    total_feedback: int
    avg_rating: float
    meals_served_today: int
    projects_evaluated: int


class AttendancePoint(BaseModel):
    time: str
    participants: int
    mentors: int
    judges: int
    volunteers: int
