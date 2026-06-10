"""
Player model for HollowVeil.

Represents one participant inside a game room.  All mutable game state
for a single player lives here — role, alive status, ability counters,
and action tracking.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.roles import Faction, RoleType, ROLE_FACTION_MAP


@dataclass
class Player:
    """Server-authoritative representation of a player in-game."""

    # ── Identity ──────────────────────────────────────────────────────────
    user_id: str
    display_name: str

    # ── Role ──────────────────────────────────────────────────────────────
    role: RoleType = RoleType.VILLAGER

    # ── Status ────────────────────────────────────────────────────────────
    is_alive: bool = True
    is_connected: bool = True
    death_round: int | None = None       # round the player died

    # ── Warden State ──────────────────────────────────────────────────────
    is_protected: bool = False            # currently shielded this night
    last_protected_target: str | None = None  # user_id Warden protected last night

    # ── Hunter State ──────────────────────────────────────────────────────
    arrows: int = 2                       # remaining silver arrows

    # ── Necromancer State ─────────────────────────────────────────────────
    has_revived: bool = False             # one-time revive used?
    has_final_whisper: bool = True        # one post-death vote remaining?

    # ── Cursed Villager State ─────────────────────────────────────────────
    is_transformed: bool = False          # became Werewolf?

    # ── Night Action Tracking ─────────────────────────────────────────────
    night_action: dict[str, Any] | None = None
    """
    Populated each night by the owning player's submitted action.
    Examples:
        Seer:   {"action": "investigate", "target": "<user_id>"}
        Warden: {"action": "protect", "target": "<user_id>"}
        Hunter: {"action": "shoot", "target": "<user_id>"}
        Vampire: {"action": "bite", "target": "<user_id>"}
        Werewolf: {"action": "maul", "target": "<user_id>"}
        Necromancer: {"action": "revive", "target": "<user_id>"}
    """

    # ── Vampire Coven Vote ────────────────────────────────────────────────
    coven_vote_target: str | None = None  # whom this vampire voted to bite

    @property
    def faction(self) -> Faction:
        """Derive faction from current role (accounts for transformation)."""
        return ROLE_FACTION_MAP[self.role]

    # ── Helpers ───────────────────────────────────────────────────────────

    def reset_night_state(self) -> None:
        """Clear per-night transient fields at the start of each night."""
        self.night_action = None
        self.is_protected = False
        self.coven_vote_target = None

    def kill(self, round_number: int) -> None:
        """Mark the player as dead."""
        self.is_alive = False
        self.death_round = round_number

    def revive(self) -> None:
        """Bring the player back to life (Necromancer ability)."""
        self.is_alive = True
        self.death_round = None

    def transform_to_werewolf(self) -> None:
        """Cursed Villager transforms into a Werewolf."""
        self.role = RoleType.WEREWOLF
        self.is_transformed = True

    def to_self_dict(self) -> dict[str, Any]:
        """Serialize for the owning player (includes their own role)."""
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "role": self.role.value,
            "is_alive": self.is_alive,
            "is_connected": self.is_connected,
            "arrows": self.arrows if self.role == RoleType.HUNTER else None,
            "has_revived": self.has_revived if self.role == RoleType.NECROMANCER else None,
            "has_final_whisper": self.has_final_whisper if self.role == RoleType.NECROMANCER else None,
        }

    def to_public_dict(self) -> dict[str, Any]:
        """Serialize for other players (role is HIDDEN)."""
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "is_alive": self.is_alive,
            "is_connected": self.is_connected,
        }
