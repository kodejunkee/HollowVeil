"""
Role assignment algorithm for HollowVeil.

Distributes roles according to the game spec:
  - Always: 1 Seer, 1 Warden, 1 Werewolf
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


def assign_roles(players: dict[str, Player]) -> None:
    """Assign roles in-place to all players in the dict.

    Parameters
    ----------
    players:
        Mapping of user_id → Player.  Must contain between 8 and 12
        entries (inclusive).

    Raises
    ------
    ValueError
        If the player count is outside [8, 12].
    """
    count = len(players)
    if count < 8 or count > 12:
        raise ValueError(f"Cannot assign roles for {count} players (need 8–12)")

    ids = list(players.keys())
    random.shuffle(ids)

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

    # Shuffle the role list so assignment is random
    random.shuffle(role_list)

    for user_id, role in zip(ids, role_list):
        player = players[user_id]
        player.role = role
        # Initialise role-specific defaults
        if role == RoleType.HUNTER:
            player.arrows = 2
        elif role == RoleType.NECROMANCER:
            player.has_revived = False
            player.has_final_whisper = True
