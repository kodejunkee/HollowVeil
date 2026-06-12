"""
GameRoom model — the heart of server-authoritative game state.

Each ``GameRoom`` instance lives in-memory and owns the complete state
of a single match: players, phase, round counter, action logs, and vote
tallies.  Nothing here touches the database; persistence is handled
externally when a match ends.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from enum import Enum
from dataclasses import dataclass, field
from typing import Any

from app.models.player import Player
from app.models.roles import RoleType


# ── Game Phases ───────────────────────────────────────────────────────────────

class GamePhase(str, Enum):
    LOBBY = "lobby"
    ROLE_ASSIGNMENT = "role_assignment"
    NIGHT = "night"
    DAWN = "dawn"
    DISCUSSION = "discussion"
    VOTING = "voting"
    EXECUTION = "execution"
    VICTORY = "victory"


# ── GameRoom ──────────────────────────────────────────────────────────────────

@dataclass
class GameRoom:
    """Complete, server-authoritative state for one game match."""

    room_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    room_code: str = field(default_factory=lambda: uuid.uuid4().hex[:6].upper())
    host_user_id: str = ""
    created_at: float = field(default_factory=time.time)

    # ── Player Registry ───────────────────────────────────────────────────
    players: dict[str, Player] = field(default_factory=dict)
    """Keyed by user_id."""

    # ── Phase Control ─────────────────────────────────────────────────────
    phase: GamePhase = GamePhase.LOBBY
    round_number: int = 0      # increments at each night start
    phase_end_time: float = 0  # unix timestamp when current phase expires

    # ── Phase Timer Handle ────────────────────────────────────────────────
    _phase_task: asyncio.Task | None = field(default=None, init=False, repr=False)
    _lobby_countdown_task: asyncio.Task | None = field(default=None, init=False, repr=False)

    # ── Night Actions Buffer ──────────────────────────────────────────────
    night_actions: dict[str, dict[str, Any]] = field(default_factory=dict)
    """Keyed by user_id → action dict."""

    # ── Vote Ledger ───────────────────────────────────────────────────────
    votes: dict[str, str] = field(default_factory=dict)
    """voter_user_id → target_user_id  (or "skip")."""

    # ── Execution Log ─────────────────────────────────────────────────────
    execution_target: str | None = None

    # ── Kill Queue (populated during night resolution) ────────────────────
    pending_kills: list[dict[str, Any]] = field(default_factory=list)
    """
    Each entry: {"target": user_id, "source": "vampire"|"werewolf"|"hunter",
                 "prevented": bool}
    """

    # ── Event Log (broadcast to clients at dawn) ──────────────────────────
    night_log: list[dict[str, Any]] = field(default_factory=list)

    # ── Full Event Timeline ───────────────────────────────────────────────
    timeline: list[dict[str, Any]] = field(default_factory=list)

    def add_timeline_event(self, phase: str, message: str) -> None:
        self.timeline.append({
            "day": self.round_number,
            "phase": phase,
            "message": message,
        })

    # ── Necromancer Final Whisper Tracking ────────────────────────────────
    final_whisper_used_by: set[str] = field(default_factory=set)

    # ── Jester Win Flag ───────────────────────────────────────────────────
    jester_wins: bool = False
    winning_faction: str | None = None

    # ── Match Metadata ────────────────────────────────────────────────────
    match_started_at: float | None = None
    match_ended_at: float | None = None

    # ── Quick Play ────────────────────────────────────────────────────────
    is_quick_play: bool = False

    # ──────────────────────────────────────────────────────────────────────
    # Player management
    # ──────────────────────────────────────────────────────────────────────

    def add_player(self, user_id: str, display_name: str) -> Player:
        """Add a player to the lobby. Returns the new Player."""
        player = Player(user_id=user_id, display_name=display_name)
        self.players[user_id] = player
        return player

    def remove_player(self, user_id: str) -> Player | None:
        """Remove and return a player, or None if not found."""
        return self.players.pop(user_id, None)

    def get_player(self, user_id: str) -> Player | None:
        return self.players.get(user_id)

    @property
    def player_count(self) -> int:
        return len(self.players)

    @property
    def alive_players(self) -> list[Player]:
        return [p for p in self.players.values() if p.is_alive]

    @property
    def dead_players(self) -> list[Player]:
        return [p for p in self.players.values() if not p.is_alive]

    @property
    def alive_player_ids(self) -> set[str]:
        return {p.user_id for p in self.alive_players}

    def get_players_by_role(self, role: RoleType) -> list[Player]:
        return [p for p in self.players.values() if p.role == role]

    def get_alive_players_by_role(self, role: RoleType) -> list[Player]:
        return [p for p in self.alive_players if p.role == role]

    def get_vampire_ids(self) -> set[str]:
        return {p.user_id for p in self.players.values() if p.role == RoleType.VAMPIRE}

    # ──────────────────────────────────────────────────────────────────────
    # Phase transitions
    # ──────────────────────────────────────────────────────────────────────

    def set_phase(self, phase: GamePhase, duration: int = 0) -> None:
        """Transition to a new phase, optionally setting a duration timer."""
        self.phase = phase
        if duration > 0:
            self.phase_end_time = time.time() + duration
        else:
            self.phase_end_time = 0

    def begin_night(self) -> None:
        """Prepare state for a new night phase."""
        self.round_number += 1
        self.night_actions.clear()
        self.pending_kills.clear()
        self.night_log.clear()
        self.votes.clear()
        self.execution_target = None
        for player in self.players.values():
            player.reset_night_state()

    def begin_voting(self) -> None:
        """Prepare state for a voting phase."""
        self.votes.clear()
        self.execution_target = None

    def cancel_phase_task(self) -> None:
        """Cancel any running phase timer task."""
        if self._phase_task and not self._phase_task.done():
            self._phase_task.cancel()
            self._phase_task = None

    # ──────────────────────────────────────────────────────────────────────
    # Serialisation
    # ──────────────────────────────────────────────────────────────────────

    def lobby_state(self) -> dict[str, Any]:
        """Snapshot for lobby screens."""
        return {
            "room_id": self.room_id,
            "room_code": self.room_code,
            "host_user_id": self.host_user_id,
            "player_count": self.player_count,
            "players": [p.to_public_dict() for p in self.players.values()],
            "phase": self.phase.value,
        }

    def game_state_for(self, user_id: str) -> dict[str, Any]:
        """Personalised game state for a specific player.

        The requesting player sees their own role; everyone else's role is
        hidden.  Vampires additionally see their Coven-mates.
        """
        me = self.players.get(user_id)
        players_view: list[dict[str, Any]] = []
        for p in self.players.values():
            if p.user_id == user_id:
                players_view.append(p.to_self_dict())
            elif me and me.role == RoleType.VAMPIRE and p.role == RoleType.VAMPIRE:
                # Vampires know each other
                d = p.to_public_dict()
                d["role"] = RoleType.VAMPIRE.value
                players_view.append(d)
            else:
                players_view.append(p.to_public_dict())

        remaining = max(0, self.phase_end_time - time.time())
        return {
            "room_id": self.room_id,
            "phase": self.phase.value,
            "round_number": self.round_number,
            "remaining_seconds": round(remaining, 1),
            "players": players_view,
        }
