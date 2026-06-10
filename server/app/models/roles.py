"""
Role and faction definitions for HollowVeil.

Every role in the game is enumerated here together with its faction
affiliation, Seer investigation result, and descriptive metadata used
by the client for tooltips / role cards.
"""

from __future__ import annotations

from enum import Enum


# ── Factions ──────────────────────────────────────────────────────────────────

class Faction(str, Enum):
    """High-level faction groupings that drive win conditions."""
    TOWN = "town"
    COVEN = "coven"          # Vampires
    WEREWOLF = "werewolf"
    NEUTRAL = "neutral"      # Jester


# ── Roles ─────────────────────────────────────────────────────────────────────

class RoleType(str, Enum):
    """Every assignable role in the game."""
    VILLAGER = "villager"
    SEER = "seer"
    WARDEN = "warden"
    HUNTER = "hunter"
    NECROMANCER = "necromancer"
    VAMPIRE = "vampire"
    JESTER = "jester"
    CURSED_VILLAGER = "cursed_villager"
    WEREWOLF = "werewolf"


# ── Faction Map ───────────────────────────────────────────────────────────────

ROLE_FACTION_MAP: dict[RoleType, Faction] = {
    RoleType.VILLAGER:         Faction.TOWN,
    RoleType.SEER:             Faction.TOWN,
    RoleType.WARDEN:           Faction.TOWN,
    RoleType.HUNTER:           Faction.TOWN,
    RoleType.NECROMANCER:      Faction.TOWN,
    RoleType.VAMPIRE:          Faction.COVEN,
    RoleType.JESTER:           Faction.NEUTRAL,
    RoleType.CURSED_VILLAGER:  Faction.TOWN,     # starts Town
    RoleType.WEREWOLF:         Faction.WEREWOLF,
}


# ── Seer Investigation Results ───────────────────────────────────────────────

class SeerResult(str, Enum):
    """What the Seer learns when investigating a player."""
    TOWN = "town"
    EVIL = "evil"


def get_seer_result(role: RoleType) -> SeerResult:
    """Return what the Seer sees when they investigate a player with *role*.

    The Cursed Villager is special-cased to read as Town.
    """
    if role == RoleType.CURSED_VILLAGER:
        return SeerResult.TOWN
    faction = ROLE_FACTION_MAP[role]
    if faction == Faction.TOWN:
        return SeerResult.TOWN
    return SeerResult.EVIL


# ── Role Metadata (client-facing) ────────────────────────────────────────────

ROLE_METADATA: dict[RoleType, dict[str, str]] = {
    RoleType.VILLAGER: {
        "name": "Villager",
        "description": "An ordinary resident of HollowVeil with no special ability.",
        "faction_label": "Town",
        "ability": "None",
    },
    RoleType.SEER: {
        "name": "Seer",
        "description": "A mystic who can peer into a player's alignment each night.",
        "faction_label": "Town",
        "ability": "Investigate one player per night to learn their alignment.",
    },
    RoleType.WARDEN: {
        "name": "Warden",
        "description": "A stalwart guardian who shields one player from harm each night.",
        "faction_label": "Town",
        "ability": "Protect one player per night. Cannot protect the same player two nights in a row.",
    },
    RoleType.HUNTER: {
        "name": "Hunter",
        "description": "A deadly marksman armed with two silver arrows.",
        "faction_label": "Town",
        "ability": "Kill a target at night. Has 2 arrows total. Cannot shoot on Night 1.",
    },
    RoleType.NECROMANCER: {
        "name": "Necromancer",
        "description": "A forbidden practitioner who can pull one soul back from the grave.",
        "faction_label": "Town",
        "ability": "Revive one dead player (once per game). After death: cast one Final Whisper vote.",
    },
    RoleType.VAMPIRE: {
        "name": "Vampire",
        "description": "A member of the hidden Coven who feeds on the living under cover of night.",
        "faction_label": "Coven",
        "ability": "Vote with other Vampires on a shared nightly kill target. Access Coven Chat.",
    },
    RoleType.JESTER: {
        "name": "Jester",
        "description": "A chaotic trickster who wins only if the village votes to execute them.",
        "faction_label": "Neutral",
        "ability": "Win by being executed during the village vote.",
    },
    RoleType.CURSED_VILLAGER: {
        "name": "Cursed Villager",
        "description": "Appears innocent, but carries a dormant curse. If attacked by Vampires, transforms into a Werewolf.",
        "faction_label": "Town",
        "ability": "Reads as Town to the Seer. Transforms into Werewolf if attacked by Vampires.",
    },
    RoleType.WEREWOLF: {
        "name": "Werewolf",
        "description": "A lone predator who hunts alone and wins by being the last one standing.",
        "faction_label": "Werewolf",
        "ability": "Kill one player per night. Wins by being the last player alive.",
    },
}
