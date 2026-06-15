"""
Role assignment algorithm for HollowVeil.

Distributes roles according to the game spec:
  - Always: 1 Seer, 1 Warden, 1 Cursed Villager
  - 2 Vampires for 8–9 players, 3 Vampires for 10–12
  - 1 random special from the special pool
  - Remaining slots filled with Villagers
"""

from __future__ import annotations

import random

from app.models.player import Player
from app.models.roles import RoleType


# Specials that may be drawn (one per game)
SPECIAL_POOL: list[RoleType] = [
    RoleType.HUNTER,
    RoleType.NECROMANCER,
    RoleType.JESTER,
]


def assign_roles(
    players: dict[str, Player],
    forced_roles: dict[str, RoleType] | None = None,
) -> None:
    """Assign roles in-place to all players in the dict.

    Parameters
    ----------
    players:
        Mapping of user_id → Player.  Must contain between 8 and 12
        entries (inclusive).
    forced_roles:
        Optional mapping of user_id → RoleType for debug/testing.
        Forced players get their requested role; the remaining pool
        adjusts so the overall distribution stays valid.

    Raises
    ------
    ValueError
        If the player count is outside [8, 12].
    """
    count = len(players)
    if count < 8 or count > 12:
        raise ValueError(f"Cannot assign roles for {count} players (need 8–12)")

    forced_roles = forced_roles or {}

    role_list: list[RoleType] = []

    # Mandatory roles
    role_list.append(RoleType.SEER)
    role_list.append(RoleType.WARDEN)
    role_list.append(RoleType.CURSED_VILLAGER)

    # Vampires
    num_vampires = 2 if count <= 9 else 3
    role_list.extend([RoleType.VAMPIRE] * num_vampires)

    # One random special
    special = random.choice(SPECIAL_POOL)
    role_list.append(special)

    # Fill remaining with Villagers
    remaining = count - len(role_list)
    role_list.extend([RoleType.VILLAGER] * remaining)

    # ── Handle forced roles (debug/testing only) ──────────────────────
    # Remove one instance of the forced role from the pool so the
    # distribution isn't duplicated.  If the forced role isn't in the
    # pool (e.g. forcing a second Jester), add it and remove a Villager.
    for uid, forced_role in forced_roles.items():
        if uid not in players:
            continue
        if forced_role in role_list:
            role_list.remove(forced_role)
        elif RoleType.VILLAGER in role_list:
            role_list.remove(RoleType.VILLAGER)
        else:
            role_list.pop()  # Last resort: drop any role

    # Shuffle the remaining role list for random assignment
    random.shuffle(role_list)

    # Build the unforced player list (shuffled)
    unforced_ids = [uid for uid in players if uid not in forced_roles]
    random.shuffle(unforced_ids)

    # Assign forced roles first
    for uid, forced_role in forced_roles.items():
        if uid in players:
            player = players[uid]
            player.role = forced_role
            _init_role_defaults(player, forced_role)

    # Assign remaining roles
    for user_id, role in zip(unforced_ids, role_list):
        player = players[user_id]
        player.role = role
        _init_role_defaults(player, role)


def _init_role_defaults(player: Player, role: RoleType) -> None:
    """Set role-specific initial state."""
    if role == RoleType.HUNTER:
        player.arrows = 2
    elif role == RoleType.NECROMANCER:
        player.has_revived = False
        player.has_final_whisper = True
