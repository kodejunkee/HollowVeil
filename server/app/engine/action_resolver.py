"""
Night-action resolution engine for HollowVeil.

Actions are resolved in strict spec order:
    Warden → Seer → Hunter → Vampire → Werewolf → Necromancer
    → Death Resolution → Win Check → Dawn

The resolver operates purely on the in-memory GameRoom state and returns
a list of events to be broadcast at dawn.
"""

from __future__ import annotations

from typing import Any

from app.models.game_room import GameRoom
from app.models.player import Player
from app.models.roles import RoleType, get_seer_result


def resolve_night(room: GameRoom) -> list[dict[str, Any]]:
    """Process all submitted night actions and mutate room state.

    Returns a list of event dicts suitable for broadcast.  Each event
    has at minimum ``{"event": "<type>", ...}``.
    """
    events: list[dict[str, Any]] = []

    # Gather actions indexed by role for deterministic ordering
    actions_by_role: dict[RoleType, list[tuple[Player, dict[str, Any]]]] = {}
    for user_id, action in room.night_actions.items():
        player = room.get_player(user_id)
        if player and player.is_alive:
            actions_by_role.setdefault(player.role, []).append((player, action))

    # ── 1. Warden ─────────────────────────────────────────────────────────
    for player, action in actions_by_role.get(RoleType.WARDEN, []):
        target_id = action.get("target")
        if not target_id:
            continue
        target = room.get_player(target_id)
        if not target or not target.is_alive:
            continue
        # Cannot protect same target consecutively
        if player.last_protected_target == target_id:
            events.append({
                "event": "warden_blocked",
                "recipient": player.user_id,
                "message": "You cannot protect the same player two nights in a row.",
            })
            continue
        target.is_protected = True
        player.last_protected_target = target_id
        room.add_timeline_event("Night", f"Warden ({player.display_name}) protected {target.display_name}")
        events.append({
            "event": "warden_protect",
            "recipient": player.user_id,
            "target": target_id,
            "message": f"You shielded {target.display_name} tonight.",
        })

    # ── 2. Seer ───────────────────────────────────────────────────────────
    for player, action in actions_by_role.get(RoleType.SEER, []):
        target_id = action.get("target")
        if not target_id:
            continue
        target = room.get_player(target_id)
        if not target:
            continue
        result = get_seer_result(target.role)
        room.add_timeline_event("Night", f"Seer ({player.display_name}) investigated {target.display_name} and found {result.value.upper()}")
        events.append({
            "event": "seer_result",
            "recipient": player.user_id,
            "target": target_id,
            "target_name": target.display_name,
            "result": result.value,
            "message": f"{target.display_name} is {result.value}.",
        })

    # ── 3. Hunter ─────────────────────────────────────────────────────────
    for player, action in actions_by_role.get(RoleType.HUNTER, []):
        target_id = action.get("target")
        if not target_id:
            continue
        # Cannot shoot Night 1
        if room.round_number <= 1:
            events.append({
                "event": "hunter_blocked",
                "recipient": player.user_id,
                "message": "You cannot fire on the first night.",
            })
            continue
        if player.arrows <= 0:
            events.append({
                "event": "hunter_blocked",
                "recipient": player.user_id,
                "message": "You have no arrows remaining.",
            })
            continue
        target = room.get_player(target_id)
        if not target or not target.is_alive:
            continue
        player.arrows -= 1
        room.add_timeline_event("Night", f"Hunter ({player.display_name}) shot {target.display_name}")
        room.pending_kills.append({
            "target": target_id,
            "source": "hunter",
            "prevented": False,
        })

    # ── 4. Vampire (shared Coven vote) ────────────────────────────────────
    vampire_target = _resolve_coven_vote(room)
    if vampire_target:
        t = room.get_player(vampire_target)
        target_name = t.display_name if t else vampire_target
        room.add_timeline_event("Night", f"Vampires voted to kill {target_name}")
        room.pending_kills.append({
            "target": vampire_target,
            "source": "vampire",
            "prevented": False,
        })

    # ── 5. Werewolf ───────────────────────────────────────────────────────
    for player, action in actions_by_role.get(RoleType.WEREWOLF, []):
        target_id = action.get("target")
        if not target_id:
            continue
        target = room.get_player(target_id)
        if not target or not target.is_alive:
            continue
        room.add_timeline_event("Night", f"Werewolf ({player.display_name}) mauled {target.display_name}")
        room.pending_kills.append({
            "target": target_id,
            "source": "werewolf",
            "prevented": False,
        })

    # ── 6. Necromancer ────────────────────────────────────────────────────
    for player, action in actions_by_role.get(RoleType.NECROMANCER, []):
        if action.get("action") != "revive":
            continue
        target_id = action.get("target")
        if not target_id or player.has_revived:
            events.append({
                "event": "necromancer_blocked",
                "recipient": player.user_id,
                "message": "You have already used your revive.",
            })
            continue
        target = room.get_player(target_id)
        if not target or target.is_alive:
            continue
        target.revive()
        player.has_revived = True
        room.add_timeline_event("Night", f"Necromancer ({player.display_name}) revived {target.display_name}")
        events.append({
            "event": "necromancer_revive",
            "public": True,
            "target": target_id,
            "target_name": target.display_name,
            "message": f"{target.display_name} has been brought back from the dead!",
        })

    # ── 7. Death Resolution ───────────────────────────────────────────────
    deaths = _resolve_deaths(room, events)

    # Record deaths in event log
    for death in deaths:
        events.append({
            "event": "death",
            "public": True,
            "target": death["target"],
            "target_name": death["target_name"],
            "source": death["source"],
            "message": f"{death['target_name']} was found dead at dawn.",
        })

    room.night_log = events
    return events


def _resolve_coven_vote(room: GameRoom) -> str | None:
    """Tally individual Vampire votes and return the majority target or None."""
    alive_vampires = room.get_alive_players_by_role(RoleType.VAMPIRE)
    if not alive_vampires:
        return None

    vote_counts: dict[str, int] = {}
    for vamp in alive_vampires:
        target = vamp.coven_vote_target
        if target:
            vote_counts[target] = vote_counts.get(target, 0) + 1

    if not vote_counts:
        # Fall back to night_actions if coven_vote_target wasn't set
        for vamp in alive_vampires:
            action = room.night_actions.get(vamp.user_id)
            if action and action.get("action") == "bite":
                t = action.get("target")
                if t:
                    vote_counts[t] = vote_counts.get(t, 0) + 1

    if not vote_counts:
        return None

    # Majority target (ties → first alphabetical target as tiebreaker)
    max_votes = max(vote_counts.values())
    top_targets = sorted(t for t, c in vote_counts.items() if c == max_votes)
    return top_targets[0]


def _resolve_deaths(
    room: GameRoom,
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Apply pending kills, accounting for Warden protection and Cursed Villager.

    Returns a list of death records.
    """
    deaths: list[dict[str, Any]] = []

    for kill in room.pending_kills:
        target_id = kill["target"]
        source = kill["source"]
        target = room.get_player(target_id)
        if not target or not target.is_alive:
            continue

        # ── Warden protection ─────────────────────────────────────────
        if target.is_protected:
            kill["prevented"] = True
            events.append({
                "event": "attack_prevented",
                "public": False,
                "target": target_id,
                "source": source,
                "message": f"An attack on {target.display_name} was prevented by the Warden.",
            })
            # Notify the Warden
            for p in room.players.values():
                if p.role == RoleType.WARDEN and p.is_alive:
                    events.append({
                        "event": "warden_save",
                        "recipient": p.user_id,
                        "message": f"Your protection saved {target.display_name} tonight!",
                    })
            continue

        # ── Cursed Villager transformation on vampire attack ──────────
        if source == "vampire" and target.role == RoleType.CURSED_VILLAGER:
            target.transform_to_werewolf()
            room.add_timeline_event("Night", f"{target.display_name}'s curse awakened, transforming them into a Werewolf!")
            events.append({
                "event": "cursed_transform",
                "recipient": target_id,
                "message": "The vampire bite has awakened your curse — you are now a Werewolf!",
            })
            events.append({
                "event": "attack_failed",
                "public": False,
                "target": target_id,
                "source": source,
                "message": f"The attack on {target.display_name} had an unexpected result...",
            })
            # Notify vampires their bite failed
            for vamp_id in room.get_vampire_ids():
                events.append({
                    "event": "coven_bite_failed",
                    "recipient": vamp_id,
                    "message": f"Your target {target.display_name} survived the bite somehow.",
                })
            continue

        # ── Actual death ──────────────────────────────────────────────
        target.kill(room.round_number)
        room.add_timeline_event("Dawn", f"{target.display_name} was found dead")
        deaths.append({
            "target": target_id,
            "target_name": target.display_name,
            "source": source,
        })

    return deaths
