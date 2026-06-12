"""
HollowVeil — FastAPI application entry point.

Provides:
- WebSocket endpoint at /ws/{room_id} for real-time game communication
- REST endpoints for room creation and quick-play matchmaking
- Health check endpoint
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import get_settings
from .auth import verify_token
from .room_registry import create_room, get_room, find_or_create_quick_play, get_room_by_code
from .ws.connection_manager import manager
from .ws.message_handler import MessageHandler

settings = get_settings()

logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)
logger = logging.getLogger("hollowveil.main")

# ── App Setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="HollowVeil API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = MessageHandler(manager)

# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "game": "HollowVeil"}

# ── WebSocket Endpoint ───────────────────────────────────────────────────────

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...),
):
    # Authenticate before accepting
    try:
        user = verify_token(token)
    except Exception as e:
        logger.warning("WebSocket auth failed for room %s: %s", room_id, e)
        await websocket.close(code=1008)
        return

    # Look up the room
    room = get_room(room_id)
    if room is None:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close(code=4004)
        return

    # Register connection (this also calls websocket.accept())
    await manager.connect(room_id, user.user_id, websocket)
    logger.info(
        "User %s (%s) connected to room %s",
        user.user_id, user.display_name, room_id,
    )

    # Process join
    try:
        await handler.handle(room, user.user_id, user.display_name, {
            "type": "lobby_join",
        })
    except Exception:
        logger.exception("Error during lobby_join for %s", user.user_id)

    # Main receive loop
    try:
        while True:
            data = await websocket.receive_json()
            await handler.handle(room, user.user_id, user.display_name, data)
    except WebSocketDisconnect:
        await manager.disconnect(room_id, user.user_id)
        logger.info("User %s disconnected from room %s", user.user_id, room_id)
        try:
            await handler.handle(room, user.user_id, user.display_name, {
                "type": "player_disconnect",
            })
        except Exception:
            logger.exception("Error during disconnect handling for %s", user.user_id)

# ── REST Endpoints ───────────────────────────────────────────────────────────

class RoomResponse(BaseModel):
    room_id: str
    room_code: str

class CreateRoomRequest(BaseModel):
    is_private: bool = False

class JoinRoomRequest(BaseModel):
    room_code: str

@app.post("/api/rooms/quickplay", response_model=RoomResponse)
async def api_quickplay(token: str = Query(...)):
    try:
        user = verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    room = await find_or_create_quick_play(user.user_id)
    return RoomResponse(room_id=room.room_id, room_code=room.room_code)

@app.post("/api/rooms", response_model=RoomResponse)
async def api_create_room(req: CreateRoomRequest, token: str = Query(...)):
    try:
        user = verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    room = await create_room(user.user_id)
    return RoomResponse(room_id=room.room_id, room_code=room.room_code)

@app.post("/api/rooms/join", response_model=RoomResponse)
async def api_join_room(req: JoinRoomRequest, token: str = Query(...)):
    with open("join_debug.log", "a") as f:
        f.write(f"JOIN ATTEMPT: room_code={req.room_code}\n")
    try:
        user = verify_token(token)
    except Exception as e:
        with open("join_debug.log", "a") as f:
            f.write(f"TOKEN VERIFY FAILED: {e}\n")
        raise HTTPException(status_code=401, detail="Invalid token")

    room = get_room_by_code(req.room_code)
    if not room:
        with open("join_debug.log", "a") as f:
            from .room_registry import _rooms_by_code
            f.write(f"ROOM NOT FOUND. Current rooms: {list(_rooms_by_code.keys())}\n")
        raise HTTPException(status_code=404, detail="Room not found")
    
    with open("join_debug.log", "a") as f:
        f.write(f"JOIN SUCCESS\n")
    return RoomResponse(room_id=room.room_id, room_code=room.room_code)
