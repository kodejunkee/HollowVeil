"""
Win-condition checker for HollowVeil.

Evaluated after every death resolution (night or execution).

Win conditions:
    - **Town wins** when all Vampires, Werewolves, and hostile neutrals are dead.
    - **Coven wins** when Vampires ≥ non-Vampires among the living
      (and no Werewolf remains).
    - **Werewolf wins** when the Werewolf is the last player alive.
    - **Jester wins** immediately upon being executed by village vote
      (handled in vote_manager; this module double-checks).
"""

from __future__ import annotations

from typing import Any

from app.models.game_room import GameRoom
from app.models.player import Player
from app.models.roles import Faction, RoleType


def check_win(room: GameRoom) -> dict[str, Any] | None:
    """Return a win-condition dict if the game is over, else ``None``.

    The returned dict contains:
        - ``winner``:  faction string ("town", "coven", "werewolf", "jester")
        - ``message``: human-readable victory message
        - ``winners``: list of user_ids on the winning side
    """

    # ── Jester instant win (set by vote_manager) ──────────────────────────
    if room.jester_wins:
        jester_players = room.get_players_by_role(RoleType.JESTER)
        return {
            "winner": "jester",
            "message": "The Jester has fooled the village and wins!",
            "winners": [p.user_id for p in jester_players],
        }

    alive = room.alive_players
    if not alive:
        # Everybody is dead — very unlikely, treat as Town loss / draw
        return {
            "winner": "none",
            "message": "Everyone is dead. There are no winners.",
            "winners": [],
        }

    alive_factions = _faction_census(alive)

    # ── Werewolf solo win ─────────────────────────────────────────────────
    # Werewolf wins by being the last player alive
    if len(alive) == 1 and alive[0].role == RoleType.WEREWOLF:
        return {
            "winner": "werewolf",
            "message": "The Werewolf is the last one standing and wins!",
            "winners": [alive[0].user_id],
        }

    # Also check: if only werewolf + one other remain, werewolf can still
    # kill that person next night, but the game isn't over yet — unless
    # the remaining non-werewolf is a vampire (coven parity would trigger).
    # We'll keep it simple: werewolf only wins at 1 alive.

    num_vampires = alive_factions.get(Faction.COVEN, 0)
    num_werewolves = alive_factions.get(Faction.WEREWOLF, 0)
    num_town = alive_factions.get(Faction.TOWN, 0)
    num_neutral = alive_factions.get(Faction.NEUTRAL, 0)
    total_alive = len(alive)

    # ── Coven wins ────────────────────────────────────────────────────────
    # Vampires reach parity (≥ non-vampires) AND no werewolf alive
    non_vampire_alive = total_alive - num_vampires
    if num_vampires > 0 and num_vampires >= non_vampire_alive and num_werewolves == 0:
        winners = [p.user_id for p in alive if p.role == RoleType.VAMPIRE]
        # Include dead vampires in the winners list
        winners += [p.user_id for p in room.dead_players if p.role == RoleType.VAMPIRE]
        return {
            "winner": "coven",
            "message": "The Coven has taken over HollowVeil!",
            "winners": winners,
        }

    # ── Town wins ─────────────────────────────────────────────────────────
    # All vampires and werewolves are dead
    if num_vampires == 0 and num_werewolves == 0:
        winners = [p.user_id for p in room.players.values()
                   if p.faction == Faction.TOWN]
        return {
            "winner": "town",
            "message": "The Town has vanquished all evil! The village is safe.",
            "winners": winners,
        }

    # Game continues
    return None


def _faction_census(alive: list[Player]) -> dict[Faction, int]:
    """Count alive players per faction."""
    counts: dict[Faction, int] = {}
    for p in alive:
        f = p.faction
        counts[f] = counts.get(f, 0) + 1
    return counts
