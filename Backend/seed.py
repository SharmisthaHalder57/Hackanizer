"""
seed.py — Seed demo data into Firebase Firestore

Usage (from the Backend/ directory):
    python seed.py

This replaces the old SQLite seeder. It writes documents to each
Firestore collection. Run once to populate a fresh database.

WARNING: Running this script multiple times will add duplicate data.
         Clear the Firestore collections first if you want a clean seed.
"""
import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# ── Ensure we run from the Backend directory ───────────────────────────────────
BACKEND_DIR = Path(__file__).parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore as fb_firestore

# ── Init Firebase ──────────────────────────────────────────────────────────────
SA_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase_service_account.json")
if not firebase_admin._apps:
    if os.path.exists(SA_PATH):
        cred = credentials.Certificate(SA_PATH)
        firebase_admin.initialize_app(cred)
    else:
        print(f"[ERROR] Service account not found at {SA_PATH}")
        sys.exit(1)

db = fb_firestore.client()
now = datetime.now(timezone.utc)


def ts(hours_ago: int = 0):
    return now - timedelta(hours=hours_ago)


# ── Helper: add or overwrite a document by fixed ID ───────────────────────────
def seed_doc(collection: str, doc_id: str, data: dict):
    db.collection(collection).document(doc_id).set(data)
    print(f"  ✓ {collection}/{doc_id}")


def seed_add(collection: str, data: dict):
    _, ref = db.collection(collection).add(data)
    print(f"  ✓ {collection}/{ref.id}")
    return ref.id


# ══════════════════════════════════════════════════════════════════════════════
# USERS  (document ID = firebase_uid)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[1] Seeding users…")

users = [
    ("seed-uid-organizer1", {
        "firebase_uid": "seed-uid-organizer1",
        "full_name":    "Alice Sharma",
        "email":        "alice@hackanizer.dev",
        "photo_url":    None,
        "role":         "organizer",
        "skills":       None,
        "current_room": None,
        "is_active":    True,
        "created_at":   ts(48),
    }),
    ("seed-uid-mentor1", {
        "firebase_uid": "seed-uid-mentor1",
        "full_name":    "Bob Mehta",
        "email":        "bob@hackanizer.dev",
        "photo_url":    None,
        "role":         "mentor",
        "skills":       "Python, Machine Learning, FastAPI",
        "current_room": "Lab A",
        "is_active":    True,
        "created_at":   ts(47),
    }),
    ("seed-uid-mentor2", {
        "firebase_uid": "seed-uid-mentor2",
        "full_name":    "Carol Patel",
        "email":        "carol@hackanizer.dev",
        "photo_url":    None,
        "role":         "mentor",
        "skills":       "React, TypeScript, Node.js",
        "current_room": "Lab B",
        "is_active":    True,
        "created_at":   ts(46),
    }),
    ("seed-uid-judge1", {
        "firebase_uid": "seed-uid-judge1",
        "full_name":    "Dr. Divya Nair",
        "email":        "divya@hackanizer.dev",
        "photo_url":    None,
        "role":         "judge",
        "skills":       None,
        "current_room": "Auditorium",
        "is_active":    True,
        "created_at":   ts(45),
    }),
    ("seed-uid-volunteer1", {
        "firebase_uid": "seed-uid-volunteer1",
        "full_name":    "Ethan Kumar",
        "email":        "ethan@hackanizer.dev",
        "photo_url":    None,
        "role":         "volunteer",
        "skills":       None,
        "current_room": "Cafeteria",
        "is_active":    True,
        "created_at":   ts(44),
    }),
    ("seed-uid-participant1", {
        "firebase_uid": "seed-uid-participant1",
        "full_name":    "Fatima Qureshi",
        "email":        "fatima@hackanizer.dev",
        "photo_url":    None,
        "role":         "participant",
        "skills":       None,
        "current_room": "101",
        "is_active":    True,
        "created_at":   ts(43),
    }),
    ("seed-uid-participant2", {
        "firebase_uid": "seed-uid-participant2",
        "full_name":    "George Thomas",
        "email":        "george@hackanizer.dev",
        "photo_url":    None,
        "role":         "participant",
        "skills":       None,
        "current_room": None,
        "is_active":    True,
        "created_at":   ts(42),
    }),
    ("seed-uid-participant3", {
        "firebase_uid": "seed-uid-participant3",
        "full_name":    "Hina Sheikh",
        "email":        "hina@hackanizer.dev",
        "photo_url":    None,
        "role":         "participant",
        "skills":       None,
        "current_room": "102",
        "is_active":    True,
        "created_at":   ts(41),
    }),
]

for uid, data in users:
    seed_doc("users", uid, data)


# ══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ══════════════════════════════════════════════════════════════════════════════
print("\n[2] Seeding projects…")

project_ids = []
projects = [
    {
        "team": "Team Alpha",
        "title": "AI Mentor Matching",
        "description": "Uses NLP to match hackathon participants with the most relevant mentors based on skill similarity.",
        "score": 87.5,
        "status": "evaluated",
        "evaluated_by_id": "seed-uid-judge1",
        "created_at": ts(40),
    },
    {
        "team": "Team Beta",
        "title": "Smart Room Navigator",
        "description": "Indoor navigation system using BLE beacons and a React Native app.",
        "score": None,
        "status": "pending",
        "evaluated_by_id": None,
        "created_at": ts(39),
    },
    {
        "team": "Team Gamma",
        "title": "Meal Optimizer",
        "description": "Predicts meal demand using past hackathon data and reduces food wastage by 30%.",
        "score": 92.0,
        "status": "evaluated",
        "evaluated_by_id": "seed-uid-judge1",
        "created_at": ts(38),
    },
    {
        "team": "Team Delta",
        "title": "SOS Safety Net",
        "description": "Real-time emergency alert system with geo-location and volunteer dispatch.",
        "score": None,
        "status": "pending",
        "evaluated_by_id": None,
        "created_at": ts(37),
    },
]

for p in projects:
    pid = seed_add("projects", p)
    project_ids.append(pid)


# ══════════════════════════════════════════════════════════════════════════════
# QUERIES
# ══════════════════════════════════════════════════════════════════════════════
print("\n[3] Seeding queries…")

queries = [
    {
        "participant_id":   "seed-uid-participant1",
        "participant_name": "Fatima Qureshi",
        "target_type":      "mentor",
        "skill":            "Machine Learning",
        "message":          "I need help understanding how to fine-tune BERT for classification.",
        "status":           "assigned",
        "assigned_to_id":   "seed-uid-mentor1",
        "assigned_to_name": "Bob Mehta",
        "created_at":       ts(10),
    },
    {
        "participant_id":   "seed-uid-participant2",
        "participant_name": "George Thomas",
        "target_type":      "mentor",
        "skill":            "React",
        "message":          "Getting CORS errors when calling my FastAPI backend from React.",
        "status":           "in-progress",
        "assigned_to_id":   "seed-uid-mentor2",
        "assigned_to_name": "Carol Patel",
        "created_at":       ts(8),
    },
    {
        "participant_id":   "seed-uid-participant3",
        "participant_name": "Hina Sheikh",
        "target_type":      "judge",
        "skill":            None,
        "message":          "When can we schedule our project demo?",
        "status":           "resolved",
        "assigned_to_id":   "seed-uid-judge1",
        "assigned_to_name": "Dr. Divya Nair",
        "created_at":       ts(6),
    },
    {
        "participant_id":   "seed-uid-participant1",
        "participant_name": "Fatima Qureshi",
        "target_type":      "volunteer",
        "skill":            None,
        "message":          "Need help finding the charging station.",
        "status":           "pending",
        "assigned_to_id":   None,
        "assigned_to_name": None,
        "created_at":       ts(2),
    },
]

for q in queries:
    seed_add("queries", q)


# ══════════════════════════════════════════════════════════════════════════════
# MEAL CLAIMS
# ══════════════════════════════════════════════════════════════════════════════
print("\n[4] Seeding meal claims…")

meal_claims = [
    {"user_id": "seed-uid-participant1", "meal_type": "breakfast", "claimed_at": ts(36)},
    {"user_id": "seed-uid-participant1", "meal_type": "lunch",     "claimed_at": ts(24)},
    {"user_id": "seed-uid-participant2", "meal_type": "breakfast", "claimed_at": ts(35)},
    {"user_id": "seed-uid-mentor1",      "meal_type": "breakfast", "claimed_at": ts(34)},
    {"user_id": "seed-uid-mentor1",      "meal_type": "lunch",     "claimed_at": ts(22)},
    {"user_id": "seed-uid-mentor1",      "meal_type": "dinner",    "claimed_at": ts(10)},
    {"user_id": "seed-uid-volunteer1",   "meal_type": "breakfast", "claimed_at": ts(33)},
    {"user_id": "seed-uid-participant3", "meal_type": "breakfast", "claimed_at": ts(32)},
    {"user_id": "seed-uid-participant3", "meal_type": "lunch",     "claimed_at": ts(20)},
]

for m in meal_claims:
    seed_add("meal_claims", m)


# ══════════════════════════════════════════════════════════════════════════════
# SOS ALERTS
# ══════════════════════════════════════════════════════════════════════════════
print("\n[5] Seeding SOS alerts…")

sos_alerts = [
    {
        "user_id":        "seed-uid-participant2",
        "user_name":      "George Thomas",
        "emergency_type": "direction",
        "details":        "Lost on the 3rd floor, can't find room 301.",
        "resolved":       True,
        "created_at":     ts(15),
    },
    {
        "user_id":        "seed-uid-participant1",
        "user_name":      "Fatima Qureshi",
        "emergency_type": "health",
        "details":        "Feeling dizzy, need first aid.",
        "resolved":       False,
        "created_at":     ts(3),
    },
]

for a in sos_alerts:
    seed_add("sos_alerts", a)


# ══════════════════════════════════════════════════════════════════════════════
# FEEDBACK
# ══════════════════════════════════════════════════════════════════════════════
print("\n[6] Seeding feedback…")

feedbacks = [
    {
        "category":   "event",
        "rating":     5,
        "tags":       ["well-organized", "great-venue"],
        "comment":    "Best hackathon I've attended. Loved the mentor system!",
        "created_at": ts(5),
    },
    {
        "category":   "mentors",
        "rating":     4,
        "tags":       ["helpful", "knowledgeable"],
        "comment":    "The mentors were very responsive and supportive.",
        "created_at": ts(4),
    },
    {
        "category":   "food",
        "rating":     3,
        "tags":       ["okay"],
        "comment":    "Food was decent but limited options for vegetarians.",
        "created_at": ts(3),
    },
    {
        "category":   "judges",
        "rating":     5,
        "tags":       ["fair", "insightful"],
        "comment":    "Judges provided excellent feedback on our project.",
        "created_at": ts(2),
    },
    {
        "category":   "event",
        "rating":     4,
        "tags":       ["fun", "exciting"],
        "comment":    "Great energy throughout. Would come back next year.",
        "created_at": ts(1),
    },
]

for f in feedbacks:
    seed_add("feedback", f)


# ══════════════════════════════════════════════════════════════════════════════
# VOLUNTEER TASKS
# ══════════════════════════════════════════════════════════════════════════════
print("\n[7] Seeding volunteer tasks…")

tasks = [
    {
        "volunteer_id": "seed-uid-volunteer1",
        "title":        "Registration Desk Setup",
        "description":  "Set up the registration desk and badge printer at the main entrance by 8 AM.",
        "priority":     "high",
        "status":       "completed",
        "created_at":   ts(48),
    },
    {
        "volunteer_id": "seed-uid-volunteer1",
        "title":        "Guide participants to rooms",
        "description":  "Station at the elevator and direct participants to their assigned rooms.",
        "priority":     "medium",
        "status":       "pending",
        "created_at":   ts(24),
    },
    {
        "volunteer_id": None,
        "title":        "Cafeteria cleanup after lunch",
        "description":  "Ensure cafeteria is clean and ready for the afternoon session by 2 PM.",
        "priority":     "low",
        "status":       "pending",
        "created_at":   ts(12),
    },
]

for t in tasks:
    seed_add("volunteer_tasks", t)


# ══════════════════════════════════════════════════════════════════════════════
# ROOM LOGS
# ══════════════════════════════════════════════════════════════════════════════
print("\n[8] Seeding room logs…")

room_logs = [
    {"user_id": "seed-uid-participant1", "room": "101",       "action": "enter", "timestamp": ts(40)},
    {"user_id": "seed-uid-mentor1",      "room": "Lab A",     "action": "enter", "timestamp": ts(38)},
    {"user_id": "seed-uid-mentor2",      "room": "Lab B",     "action": "enter", "timestamp": ts(36)},
    {"user_id": "seed-uid-judge1",       "room": "Auditorium","action": "enter", "timestamp": ts(34)},
    {"user_id": "seed-uid-volunteer1",   "room": "Cafeteria", "action": "enter", "timestamp": ts(32)},
    {"user_id": "seed-uid-participant2", "room": "101",       "action": "enter", "timestamp": ts(30)},
    {"user_id": "seed-uid-participant2", "room": "101",       "action": "exit",  "timestamp": ts(20)},
    {"user_id": "seed-uid-participant3", "room": "102",       "action": "enter", "timestamp": ts(18)},
]

for r in room_logs:
    seed_add("room_logs", r)


print("\n✅  Firestore seed complete!")
print("   Collections populated: users, projects, queries, meal_claims,")
print("   sos_alerts, feedback, volunteer_tasks, room_logs")
