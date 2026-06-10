"""
WebSocket connection manager for HollowVeil.

Tracks active WebSocket connections per room and provides helpers
for unicast, multicast, and broadcast messaging.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("hollowveil.ws")


class ConnectionManager:
    """Manages WebSocket connections grouped by room_id."""

    def __init__(self) -> None:
        # room_id → {user_id → WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    # ── Connect / Disconnect ──────────────────────────────────────────────

    async def connect(
        self,
        room_id: str,
        user_id: str,
        websocket: WebSocket,
    ) -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            if room_id not in self._rooms:
                self._rooms[room_id] = {}
            self._rooms[room_id][user_id] = websocket
        logger.info("WS connected: room=%s user=%s", room_id, user_id)

    async def disconnect(self, room_id: str, user_id: str) -> None:
        """Remove a connection (idempotent)."""
        async with self._lock:
            room_conns = self._rooms.get(room_id)
            if room_conns:
                room_conns.pop(user_id, None)
                if not room_conns:
                    del self._rooms[room_id]
        logger.info("WS disconnected: room=%s user=%s", room_id, user_id)

    def get_connection(self, room_id: str, user_id: str) -> WebSocket | None:
        """Return the WebSocket for a specific user in a room, or None."""
        return self._rooms.get(room_id, {}).get(user_id)

    def get_room_connections(self, room_id: str) -> dict[str, WebSocket]:
        """Return all connections in a room (snapshot)."""
        return dict(self._rooms.get(room_id, {}))

    # ── Sending ───────────────────────────────────────────────────────────

    async def send_personal(
        self,
        room_id: str,
        user_id: str,
        data: dict[str, Any],
    ) -> None:
        """Send a JSON message to a single user."""
        ws = self.get_connection(room_id, user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                logger.warning("Failed to send to user=%s room=%s", user_id, room_id)
                await self.disconnect(room_id, user_id)

    async def send_to_many(
        self,
        room_id: str,
        user_ids: list[str],
        data: dict[str, Any],
    ) -> None:
        """Send the same JSON message to a list of users."""
        tasks = [
            self.send_personal(room_id, uid, data)
            for uid in user_ids
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast(
        self,
        room_id: str,
        data: dict[str, Any],
        *,
        exclude: set[str] | None = None,
    ) -> None:
        """Broadcast a JSON message to all connections in a room."""
        conns = self.get_room_connections(room_id)
        exclude = exclude or set()
        tasks = [
            self._safe_send(ws, data)
            for uid, ws in conns.items()
            if uid not in exclude
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_personal(
        self,
        room_id: str,
        builder: Any,  # Callable[[str], dict] — builds per-user payload
    ) -> None:
        """Send a personalised message to every user in a room.

        *builder* is called with each user_id and must return a dict.
        """
        conns = self.get_room_connections(room_id)
        tasks = []
        for uid, ws in conns.items():
            payload = builder(uid)
            if payload:
                tasks.append(self._safe_send(ws, payload))
        await asyncio.gather(*tasks, return_exceptions=True)

    async def close_room(self, room_id: str) -> None:
        """Close all connections in a room."""
        conns = self.get_room_connections(room_id)
        for uid, ws in conns.items():
            try:
                await ws.close()
            except Exception:
                pass
        async with self._lock:
            self._rooms.pop(room_id, None)

    # ── Internal ──────────────────────────────────────────────────────────

    @staticmethod
    async def _safe_send(ws: WebSocket, data: dict[str, Any]) -> None:
        try:
            await ws.send_json(data)
        except Exception:
            pass  # connection already dead


# ── Singleton ─────────────────────────────────────────────────────────────────
manager = ConnectionManager()
