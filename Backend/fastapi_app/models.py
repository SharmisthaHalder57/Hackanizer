"""
models.py — REMOVED (Firestore Migration)

This file previously contained SQLAlchemy ORM models for SQLite.
The database has been migrated to Firebase Firestore (schemaless).

Data shapes are now enforced entirely by Pydantic schemas in schemas.py.
Collection names are defined in firebase_db.py.

This file is kept as a tombstone to avoid ImportError if any external
code references it. Do not import from here.
"""

# All SQLAlchemy models have been removed.
# See fastapi_app/schemas.py for data shapes.
# See fastapi_app/firebase_db.py for collection constants.
