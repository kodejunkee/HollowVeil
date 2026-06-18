"""
Vote management for HollowVeil.

Handles vote casting, validation, tallying, tie-breaking, execution,
and the Necromancer's post-death Final Whisper mechanic.
"""

from __future__ import annotations

from typing import Any

from app.models.game_room import GameRoom, GamePhase
from app.models.player import Player
from app.models.roles import RoleType

SKIP_VOTE = "skip"


def cast_vote(
    room: GameRoom,
    voter_id: str,
    target_id: str,
) -> dict[str, Any]:
    """Record a vote from *voter_id* for *target_id* (or "skip").

    Returns a result dict with ``success`` bool and optional ``error``.
    """
    if room.phase != GamePhase.VOTING:
        return {"success": False, "error": "Voting is not active."}

    voter = room.get_player(voter_id)
    if not voter:
        return {"success": False, "error": "You are not in this game."}

    # Dead players cannot vote (unless Necromancer Final Whisper)
    if not voter.is_alive:
        if (
            voter.role == RoleType.NECROMANCER
            and voter.has_final_whisper
            and voter_id not in room.final_whisper_used_by
        ):
            # Allow the Final Whisper vote (processed separately)
            pass
        else:
            return {"success": False, "error": "Dead players cannot vote."}

    # Validate target
    if target_id != SKIP_VOTE:
        target = room.get_player(target_id)
        if not target:
            return {"success": False, "error": "Invalid vote target."}
        if not target.is_alive:
            return {"success": False, "error": "Cannot vote for a dead player."}
        if target_id == voter_id and voter.role != RoleType.JESTER:
            return {"success": False, "error": "You cannot vote for yourself."}

    room.votes[voter_id] = target_id

    # If this was a Necromancer Final Whisper, mark it
    if not voter.is_alive and voter.role == RoleType.NECROMANCER:
        room.final_whisper_used_by.add(voter_id)
        voter.has_final_whisper = False

    return {
        "success": True,
        "voter": voter_id,
        "target": target_id,
        "voter_name": voter.display_name,
    }


def tally_votes(room: GameRoom) -> dict[str, Any]:
    """Count votes and determine whether someone is executed.

    Returns a result dict with the vote breakdown and outcome.
    """
    vote_counts: dict[str, int] = {}  # target_id → count
    skip_count = 0
    voter_details: list[dict[str, str]] = []

    for voter_id, target_id in room.votes.items():
        voter = room.get_player(voter_id)
        voter_name = voter.display_name if voter else voter_id
        if target_id == SKIP_VOTE:
            skip_count += 1
            voter_details.append({"voter": voter_name, "target": "skip"})
        else:
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1
            target = room.get_player(target_id)
            target_name = target.display_name if target else target_id
            voter_details.append({"voter": voter_name, "target": target_name})

    # Determine outcome
    if not vote_counts:
        room.add_timeline_event("Noon", "No one was voted out. The village could not decide.")
        return {
            "outcome": "no_execution",
            "skip_count": skip_count,
            "votes": voter_details,
            "message": "No one was voted out. The village could not decide.",
        }

    max_votes = max(vote_counts.values())

    # Skip wins if it has more votes
    if skip_count > max_votes:
        room.add_timeline_event("Noon", "The village chose to skip the execution.")
        return {
            "outcome": "no_execution",
            "skip_count": skip_count,
            "votes": voter_details,
            "message": "The village chose to skip the execution.",
        }

    # Find top targets
    top_targets = sorted(
        [t for t, c in vote_counts.items() if c == max_votes],
    )

    # Tie → no execution
    if len(top_targets) > 1:
        names = [room.get_player(t).display_name if room.get_player(t) else t for t in top_targets]
        room.add_timeline_event("Noon", f"The vote was tied between {', '.join(names)}. No one was executed.")
        return {
            "outcome": "no_execution",
            "skip_count": skip_count,
            "tied": names,
            "votes": voter_details,
            "message": f"The vote was tied between {', '.join(names)}. No one was executed.",
        }

    # Skip ties with top target → no execution
    if skip_count >= max_votes:
        room.add_timeline_event("Noon", "The village could not reach a majority.")
        return {
            "outcome": "no_execution",
            "skip_count": skip_count,
            "votes": voter_details,
            "message": "The village could not reach a majority.",
        }

    # Single winner
    executed_id = top_targets[0]
    executed = room.get_player(executed_id)
    if not executed:
        return {
            "outcome": "no_execution",
            "votes": voter_details,
            "message": "Vote target no longer valid.",
        }

    room.add_timeline_event("Noon", f"Town voted to execute {executed.display_name}")

    return {
        "outcome": "execution",
        "executed_id": executed_id,
        "executed_name": executed.display_name,
        "vote_count": max_votes,
        "skip_count": skip_count,
        "votes": voter_details,
        "message": f"{executed.display_name} has been executed by the village!",
    }


def execute_player(room: GameRoom, user_id: str) -> dict[str, Any]:
    """Carry out the execution and check for Jester win.

    Returns an event dict for broadcast.
    """
    player = room.get_player(user_id)
    if not player or not player.is_alive:
        return {"event": "execution_failed", "message": "Target is already dead."}

    player.kill(room.round_number)
    room.execution_target = user_id

    result: dict[str, Any] = {
        "event": "execution",
        "public": True,
        "target": user_id,
        "target_name": player.display_name,
        "role_revealed": player.role.value,
        "message": f"{player.display_name} was executed! They were the {player.role.value}.",
    }

    # ── Jester Win Check ──────────────────────────────────────────────────
    if player.role == RoleType.JESTER:
        room.jester_wins = True
        room.winning_faction = "jester"
        result["jester_win"] = True
        result["message"] += " The Jester wins!"

    return result


def get_vote_status(room: GameRoom) -> dict[str, Any]:
    """Return current vote counts for the client to display."""
    alive_count = len(room.alive_players)
    voted_count = len(room.votes)

    # Count per target (anonymised counts only)
    counts: dict[str, int] = {}
    for target_id in room.votes.values():
        if target_id == SKIP_VOTE:
            counts["skip"] = counts.get("skip", 0) + 1
        else:
            target = room.get_player(target_id)
            name = target.display_name if target else target_id
            counts[name] = counts.get(name, 0) + 1

    return {
        "total_alive": alive_count,
        "votes_cast": voted_count,
        "counts": counts,
    }


def all_alive_voted(room: GameRoom) -> bool:
    """Check whether every alive player has cast a vote."""
    alive_ids = room.alive_player_ids
    # Also count Necromancer Final Whisper voters
    voted_alive = {v for v in room.votes if room.get_player(v) and room.get_player(v).is_alive}
    return alive_ids.issubset(voted_alive)
