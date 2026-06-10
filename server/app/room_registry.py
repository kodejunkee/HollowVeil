"""
Global room registry for HollowVeil.

All active game rooms live here in a plain dict.  This module provides
helpers for creating, finding, listing, and deleting rooms, as well as
quick-play matchmaking logic.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.config import get_settings
from app.models.game_room import GameRoom, GamePhase

logger = logging.getLogger("hollowveil.rooms")

# ── Global Registry ───────────────────────────────────────────────────────────
_rooms: dict[str, GameRoom] = {}
_lock = asyncio.Lock()


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_room(
    host_user_id: str,
    *,
    is_quick_play: bool = False,
) -> GameRoom:
    """Create a new GameRoom and register it."""
    room = GameRoom(host_user_id=host_user_id, is_quick_play=is_quick_play)
    async with _lock:
        _rooms[room.room_id] = room
    logger.info("Room created: id=%s host=%s quick=%s", room.room_id, host_user_id, is_quick_play)
    return room


def get_room(room_id: str) -> GameRoom | None:
    """Return a room by its ID, or None."""
    return _rooms.get(room_id)


def get_room_by_code(room_code: str) -> GameRoom | None:
    """Look up a room by its short join code."""
    code_upper = room_code.upper()
    for room in _rooms.values():
        if room.room_code == code_upper:
            return room
    return None


async def delete_room(room_id: str) -> GameRoom | None:
    """Remove and return a room from the registry."""
    async with _lock:
        room = _rooms.pop(room_id, None)
    if room:
        room.cancel_phase_task()
        logger.info("Room deleted: id=%s", room_id)
    return room


def list_rooms(*, include_in_progress: bool = False) -> list[dict[str, Any]]:
    """Return a list of room summaries for the lobby browser.

    By default only rooms in LOBBY phase are shown.
    """
    results: list[dict[str, Any]] = []
    settings = get_settings()
    for room in _rooms.values():
        if not include_in_progress and room.phase != GamePhase.LOBBY:
            continue
        results.append({
            "room_id": room.room_id,
            "room_code": room.room_code,
            "host_user_id": room.host_user_id,
            "player_count": room.player_count,
            "max_players": settings.MAX_PLAYERS,
            "phase": room.phase.value,
            "is_quick_play": room.is_quick_play,
        })
    return results


# ── Quick Play ────────────────────────────────────────────────────────────────

async def find_or_create_quick_play(user_id: str) -> GameRoom:
    """Find an existing quick-play lobby with space, or create a new one.

    Parameters
    ----------
    user_id:
        The player looking for a quick game.

    Returns
    -------
    GameRoom
        A room the player can join immediately.
    """
    settings = get_settings()
    async with _lock:
        # Look for an existing quick-play lobby with space
        for room in _rooms.values():
            if (
                room.is_quick_play
                and room.phase == GamePhase.LOBBY
                and room.player_count < settings.MAX_PLAYERS
                and user_id not in room.players
            ):
                return room

    # Nothing available — create a fresh one
    return await create_room(user_id, is_quick_play=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def room_count() -> int:
    """Total number of active rooms."""
    return len(_rooms)
