"""
routers/rooms.py — Room entry/exit tracking + occupancy

Multi-tenant update: room logs and user updates scoped to hackathon sub-collection.
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends

from ..firebase_db import get_firestore, get_hackathon_col, ROOM_LOGS, USERS
from ..schemas import RoomEntryRequest, RoomOccupancy
from ..auth import get_current_user_id, get_hackathon_id_from_token

router = APIRouter(prefix="/rooms", tags=["rooms"])

ROOM_CAPACITIES: dict[str, int] = {
    "101": 30, "102": 30, "103": 30, "104": 30, "105": 30,
    "201": 30, "202": 30, "203": 30,
    "Cafeteria": 100, "Auditorium": 200,
    "Lab A": 40, "Lab B": 40,
}


@router.post("/entry")
def log_room_entry(
    body: RoomEntryRequest,
    user_id: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Log a room entry or exit event and update the user's current_room."""
    # Record the room log in hackathon sub-collection
    get_hackathon_col(db, hackathon_id, ROOM_LOGS).add({
        "user_id":   user_id,
        "room":      body.room,
        "action":    body.action,
        "timestamp": datetime.now(timezone.utc),
    })

    # Update user's current_room in hackathon sub-collection
    new_room = body.room if body.action == "enter" else None
    get_hackathon_col(db, hackathon_id, USERS).document(user_id).update(
        {"current_room": new_room}
    )

    return {"ok": True, "room": body.room, "action": body.action}


@router.get("/occupancy", response_model=List[RoomOccupancy])
def get_room_occupancy(
    _: str = Depends(get_current_user_id),
    hackathon_id: str = Depends(get_hackathon_id_from_token),
    db=Depends(get_firestore),
):
    """Return current headcount in each room for this hackathon."""
    users_col = get_hackathon_col(db, hackathon_id, USERS)
    all_users = users_col.where("is_active", "==", True).stream()

    room_map: dict[str, list[str]] = {}
    for doc in all_users:
        data = doc.to_dict()
        room = data.get("current_room")
        if room:
            room_map.setdefault(room, []).append(data.get("full_name", ""))

    all_rooms = set(list(ROOM_CAPACITIES.keys()) + list(room_map.keys()))
    result = []
    for room in sorted(all_rooms):
        occupants_list = room_map.get(room, [])
        result.append(RoomOccupancy(
            room=room,
            occupants=len(occupants_list),
            capacity=ROOM_CAPACITIES.get(room, 50),
            users=occupants_list,
        ))
    return result
