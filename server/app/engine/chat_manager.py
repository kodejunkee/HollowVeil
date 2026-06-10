"""
Chat channel management for HollowVeil.

Three chat channels with server-enforced permissions:
    1. **Village** — alive players write, dead players read-only
    2. **Ghost**   — dead players only, invisible to the living
    3. **Coven**   — vampires only (alive + dead), night phase only
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from app.models.game_room import GameRoom, GamePhase
from app.models.player import Player
from app.models.roles import RoleType


class ChatChannel(str, Enum):
    VILLAGE = "village"
    GHOST = "ghost"
    COVEN = "coven"


def validate_message(
    room: GameRoom,
    sender_id: str,
    channel: str,
    content: str,
) -> dict[str, Any]:
    """Validate and return a chat message or an error.

    Returns
    -------
    dict
        On success: ``{"valid": True, "channel": ..., "message": ...}``
        On failure: ``{"valid": False, "error": "..."}``
    """
    sender = room.get_player(sender_id)
    if not sender:
        return {"valid": False, "error": "You are not in this game."}

    # Normalise channel
    try:
        ch = ChatChannel(channel)
    except ValueError:
        return {"valid": False, "error": f"Unknown chat channel: {channel}"}

    # Sanitise content
    content = content.strip()
    if not content:
        return {"valid": False, "error": "Message cannot be empty."}
    if len(content) > 500:
        return {"valid": False, "error": "Message too long (max 500 chars)."}

    # ── Channel Permission Checks ─────────────────────────────────────────
    if ch == ChatChannel.VILLAGE:
        return _validate_village(room, sender, content)
    elif ch == ChatChannel.GHOST:
        return _validate_ghost(room, sender, content)
    elif ch == ChatChannel.COVEN:
        return _validate_coven(room, sender, content)

    return {"valid": False, "error": "Unknown channel."}


def _validate_village(
    room: GameRoom,
    sender: Player,
    content: str,
) -> dict[str, Any]:
    """Village chat: alive players write during Discussion/Voting, dead read-only."""
    if not sender.is_alive:
        return {"valid": False, "error": "Dead players cannot write in village chat."}

    # Only allow messages during Discussion, Voting, or Execution phases
    if room.phase not in (
        GamePhase.DISCUSSION,
        GamePhase.VOTING,
        GamePhase.EXECUTION,
    ):
        return {"valid": False, "error": "Village chat is not active during this phase."}

    return {
        "valid": True,
        "channel": ChatChannel.VILLAGE.value,
        "message": _build_message(sender, ChatChannel.VILLAGE, content),
    }


def _validate_ghost(
    room: GameRoom,
    sender: Player,
    content: str,
) -> dict[str, Any]:
    """Ghost chat: dead players only, invisible to the living."""
    if sender.is_alive:
        return {"valid": False, "error": "Alive players cannot access ghost chat."}

    return {
        "valid": True,
        "channel": ChatChannel.GHOST.value,
        "message": _build_message(sender, ChatChannel.GHOST, content),
    }


def _validate_coven(
    room: GameRoom,
    sender: Player,
    content: str,
) -> dict[str, Any]:
    """Coven chat: vampires only (alive + dead), night phase only."""
    if sender.role != RoleType.VAMPIRE:
        return {"valid": False, "error": "Only vampires can access Coven chat."}

    if room.phase != GamePhase.NIGHT:
        return {"valid": False, "error": "Coven chat is only available at night."}

    return {
        "valid": True,
        "channel": ChatChannel.COVEN.value,
        "message": _build_message(sender, ChatChannel.COVEN, content),
    }


def _build_message(
    sender: Player,
    channel: ChatChannel,
    content: str,
) -> dict[str, Any]:
    """Construct a standardised chat message payload."""
    return {
        "type": "chat_message",
        "channel": channel.value,
        "sender_id": sender.user_id,
        "sender_name": sender.display_name,
        "content": content,
        "is_alive": sender.is_alive,
    }


def get_recipients(room: GameRoom, channel: ChatChannel) -> list[str]:
    """Return the list of user_ids who should receive messages on *channel*.

    Village: all players (alive read+write, dead read-only)
    Ghost:   dead players only
    Coven:   vampires only (alive + dead)
    """
    if channel == ChatChannel.VILLAGE:
        return [p.user_id for p in room.players.values()]
    elif channel == ChatChannel.GHOST:
        return [p.user_id for p in room.players.values() if not p.is_alive]
    elif channel == ChatChannel.COVEN:
        return [p.user_id for p in room.players.values() if p.role == RoleType.VAMPIRE]
    return []
