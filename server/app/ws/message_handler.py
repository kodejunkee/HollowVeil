"""
Central WebSocket message handler for HollowVeil.

Routes incoming client messages to the appropriate subsystem based on
message type and current game phase.  Orchestrates the full game loop:
    Lobby → Role Assignment → Night → Dawn → Discussion → Voting
    → Execution → (repeat or Victory)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.config import get_settings
from app.models.game_room import GameRoom, GamePhase
from app.models.player import Player
from app.models.roles import RoleType, ROLE_METADATA
from app.engine import role_assigner, action_resolver, vote_manager, chat_manager, win_checker
from app.engine.chat_manager import ChatChannel, get_recipients
from app.utils.timer import start_phase_timer
from app.ws.connection_manager import ConnectionManager

logger = logging.getLogger("hollowveil.handler")
settings = get_settings()


class MessageHandler:
    """Stateless message dispatcher — all state lives in GameRoom."""

    def __init__(self, mgr: ConnectionManager) -> None:
        self.mgr = mgr

    # ── Entry Point ───────────────────────────────────────────────────────

    async def handle(
        self,
        room: GameRoom,
        user_id: str,
        display_name: str,
        data: dict[str, Any],
    ) -> None:
        msg_type = data.get("type", "")
        logger.debug("room=%s user=%s type=%s", room.room_id, user_id, msg_type)

        try:
            if msg_type == "lobby_join":
                await self._lobby_join(room, user_id, display_name)
            elif msg_type == "lobby_ready":
                await self._lobby_ready(room, user_id, data)
            elif msg_type == "lobby_start":
                await self._lobby_start(room, user_id)
            elif msg_type == "player_disconnect":
                await self._player_disconnect(room, user_id)
            elif msg_type == "chat_message":
                await self._chat_message(room, user_id, data)
            elif msg_type == "action_submit":
                await self._action_submit(room, user_id, data)
            elif msg_type == "vote_cast":
                await self._vote_cast(room, user_id, data)
            elif msg_type == "debug_force_role":
                await self._debug_force_role(room, user_id, data)
            elif msg_type == "ping":
                pass
            else:
                await self.mgr.send_personal(room.room_id, user_id, {
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })
        except Exception:
            logger.exception("Error handling %s from %s", msg_type, user_id)

    # ── Lobby Handlers ───────────────────────────────────────────────────

    async def _lobby_join(
        self, room: GameRoom, user_id: str, display_name: str,
    ) -> None:
        if room.phase != GamePhase.LOBBY:
            # Reconnection during game — mark connected
            player = room.get_player(user_id)
            if player:
                player.is_connected = True
                await self.mgr.send_personal(room.room_id, user_id, {
                    "type": "game_state",
                    **room.game_state_for(user_id),
                })
            return

        if user_id not in room.players:
            if room.player_count >= settings.MAX_PLAYERS:
                await self.mgr.send_personal(room.room_id, user_id, {
                    "type": "error", "message": "Room is full.",
                })
                return
            room.add_player(user_id, display_name)
        else:
            room.players[user_id].is_connected = True

        await self.mgr.broadcast(room.room_id, {
            "type": "lobby_update",
            **room.lobby_state(),
        })

    async def _lobby_ready(
        self, room: GameRoom, user_id: str, data: dict,
    ) -> None:
        if room.phase != GamePhase.LOBBY:
            return
        player = room.get_player(user_id)
        if not player:
            return
        # Toggle ready, or set explicitly
        is_ready = data.get("is_ready")
        if is_ready is None:
            # Legacy toggle support
            player.is_connected = not getattr(player, "_is_ready", False)
        # Store ready state on a simple attribute
        if not hasattr(player, "_is_ready"):
            player._is_ready = False
        player._is_ready = data.get("is_ready", not player._is_ready)

        # Cancel countdown if someone unreadies
        if not player._is_ready and room._lobby_countdown_task:
            room._lobby_countdown_task.cancel()
            room._lobby_countdown_task = None
            await self.mgr.broadcast(room.room_id, {
                "type": "lobby_countdown_stopped",
            })

        await self.mgr.broadcast(room.room_id, {
            "type": "lobby_update",
            **room.lobby_state(),
        })

    async def _lobby_start(self, room: GameRoom, user_id: str) -> None:
        if room.phase != GamePhase.LOBBY:
            return
        if user_id != room.host_user_id:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": "Only the host can start the game.",
            })
            return

        player_count = room.player_count
        # For prototype testing, allow 1+ players. Production should require 8.
        if player_count < 1:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error",
                "message": f"Need at least 1 player (production: 8). Currently: {player_count}",
            })
            return

        # All players must be ready
        not_ready = [
            p.display_name for p in room.players.values()
            if not getattr(p, "_is_ready", False)
        ]
        if not_ready:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error",
                "message": f"Not all players are ready. Waiting on: {', '.join(not_ready)}",
            })
            return

        if room._lobby_countdown_task:
            return  # Already counting down

        async def countdown():
            try:
                for i in range(10, 0, -1):
                    await self.mgr.broadcast(room.room_id, {
                        "type": "lobby_countdown",
                        "remaining": i,
                    })
                    await asyncio.sleep(1)
                
                room._lobby_countdown_task = None
                await self.mgr.broadcast(room.room_id, {
                    "type": "lobby_countdown_stopped",
                })
                await self._start_game(room)
            except asyncio.CancelledError:
                pass

        room._lobby_countdown_task = asyncio.create_task(countdown())

    async def _player_disconnect(self, room: GameRoom, user_id: str) -> None:
        player = room.get_player(user_id)
        if not player:
            return
        player.is_connected = False

        if room.phase == GamePhase.LOBBY:
            room.remove_player(user_id)
            await self.mgr.broadcast(room.room_id, {
                "type": "lobby_update",
                **room.lobby_state(),
            })
    # ── Debug / Testing ────────────────────────────────────────────────────
    # TODO:REMOVE — Temporary debug handler for forcing player roles during
    # bot testing. Remove this entire block and its route in handle() after
    # testing is complete. See bot_client.py for full revert instructions.

    async def _debug_force_role(
        self, room: GameRoom, user_id: str, data: dict,
    ) -> None:
        """Store a forced role for a player (debug/bot-testing only)."""
        if room.phase != GamePhase.LOBBY:
            return
        target_id = data.get("target_id", user_id)
        role_str = data.get("role", "").lower()
        try:
            role = RoleType(role_str)
        except ValueError:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": f"Unknown role: {role_str}",
            })
            return
        if not hasattr(room, "_debug_forced_roles"):
            room._debug_forced_roles = {}
        room._debug_forced_roles[target_id] = role
        logger.info("DEBUG: Forced role %s for %s in room %s", role.value, target_id, room.room_id)

    # ── Game Flow ─────────────────────────────────────────────────────────

    async def _start_game(self, room: GameRoom) -> None:
        """Assign roles and kick off the first night."""
        room.match_started_at = __import__("time").time()

        # Assign roles (mutates players in place)
        forced = getattr(room, '_debug_forced_roles', None)
        role_assigner.assign_roles(room.players, forced_roles=forced)

        room.set_phase(GamePhase.ROLE_ASSIGNMENT)

        # Send each player their personal role
        vampire_ids = room.get_vampire_ids()
        for uid, player in room.players.items():
            meta = ROLE_METADATA.get(player.role, {})
            role_msg: dict[str, Any] = {
                "type": "role_assigned",
                "role": player.role.value,
                "role_name": meta.get("name", player.role.value),
                "faction": meta.get("faction_label", ""),
                "description": meta.get("description", ""),
                "ability": meta.get("ability", ""),
                "passive": meta.get("passive", ""),
            }
            # Tell vampires who their coven-mates are
            if player.role == RoleType.VAMPIRE:
                role_msg["coven_mate_ids"] = [vid for vid in vampire_ids if vid != uid]
            await self.mgr.send_personal(room.room_id, uid, role_msg)

        # Broadcast phase change
        await self.mgr.broadcast(room.room_id, {
            "type": "phase_changed",
            "phase": GamePhase.ROLE_ASSIGNMENT.value,
        })

        # Wait a few seconds for players to read their role, then start night
        await asyncio.sleep(5)
        await self._start_night(room)

    async def _start_night(self, room: GameRoom) -> None:
        room.begin_night()
        room.set_phase(GamePhase.NIGHT, settings.NIGHT_DURATION)

        await self.mgr.broadcast(room.room_id, {
            "type": "phase_changed",
            "phase": GamePhase.NIGHT.value,
            "round": room.round_number,
            "duration": settings.NIGHT_DURATION,
        })

        # Tell the Necromancer which dead players are non-revivable (dead vampires)
        for uid, player in room.players.items():
            if player.role == RoleType.NECROMANCER and player.is_alive:
                dead_vampire_ids = [
                    p.user_id for p in room.players.values()
                    if not p.is_alive and p.role == RoleType.VAMPIRE
                ]
                if dead_vampire_ids:
                    await self.mgr.send_personal(room.room_id, uid, {
                        "type": "non_revivable_ids",
                        "ids": dead_vampire_ids,
                    })

        # Start phase timer
        room.cancel_phase_task()
        room._phase_task = await start_phase_timer(
            room.room_id,
            settings.NIGHT_DURATION,
            lambda: self._end_night(room),
        )

    async def _end_night(self, room: GameRoom) -> None:
        """Resolve night actions and transition to Dawn."""
        events = action_resolver.resolve_night(room)

        room.set_phase(GamePhase.DAWN)

        # Broadcast dawn events
        for event in events:
            if event.get("public"):
                await self.mgr.broadcast(room.room_id, {
                    "type": "dawn_event",
                    **event,
                })
            elif event.get("recipient"):
                await self.mgr.send_personal(
                    room.room_id, event["recipient"],
                    {"type": "dawn_event", **event},
                )

        await self.mgr.broadcast(room.room_id, {
            "type": "phase_changed",
            "phase": GamePhase.DAWN.value,
        })

        # Check win condition after night deaths
        win = win_checker.check_win(room)
        if win:
            await self._end_game(room, win)
            return

        # Pause at dawn for 5 seconds, then discussion
        await asyncio.sleep(5)
        await self._start_discussion(room)

    async def _start_discussion(self, room: GameRoom) -> None:
        room.set_phase(GamePhase.DISCUSSION, settings.DISCUSSION_DURATION)

        await self.mgr.broadcast(room.room_id, {
            "type": "phase_changed",
            "phase": GamePhase.DISCUSSION.value,
            "duration": settings.DISCUSSION_DURATION,
        })

        room.cancel_phase_task()
        room._phase_task = await start_phase_timer(
            room.room_id,
            settings.DISCUSSION_DURATION,
            lambda: self._start_voting(room),
        )

    async def _start_voting(self, room: GameRoom) -> None:
        room.begin_voting()
        room.set_phase(GamePhase.VOTING, settings.VOTING_DURATION)

        await self.mgr.broadcast(room.room_id, {
            "type": "phase_changed",
            "phase": GamePhase.VOTING.value,
            "duration": settings.VOTING_DURATION,
        })

        room.cancel_phase_task()
        room._phase_task = await start_phase_timer(
            room.room_id,
            settings.VOTING_DURATION,
            lambda: self._end_voting(room),
        )

    async def _end_voting(self, room: GameRoom) -> None:
        """Tally votes and execute if applicable."""
        result = vote_manager.tally_votes(room)

        await self.mgr.broadcast(room.room_id, {
            "type": "vote_result",
            **result,
        })

        if result["outcome"] == "execution":
            room.set_phase(GamePhase.EXECUTION)
            exec_result = vote_manager.execute_player(room, result["executed_id"])

            await self.mgr.broadcast(room.room_id, {
                "type": "execution_result",
                **exec_result,
            })

            await self.mgr.broadcast(room.room_id, {
                "type": "phase_changed",
                "phase": GamePhase.EXECUTION.value,
            })

            # Check win condition after execution
            win = win_checker.check_win(room)
            if win:
                await asyncio.sleep(3)
                await self._end_game(room, win)
                return

            await asyncio.sleep(settings.EXECUTION_DURATION)
        else:
            # No execution — broadcast the reason so the UI can display it
            room.set_phase(GamePhase.EXECUTION)

            await self.mgr.broadcast(room.room_id, {
                "type": "execution_result",
                "event": "no_execution",
                "message": result.get("message", "No one was executed."),
            })

            await self.mgr.broadcast(room.room_id, {
                "type": "phase_changed",
                "phase": GamePhase.EXECUTION.value,
            })

            await asyncio.sleep(5)

        # Next night
        await self._start_night(room)

    async def _end_game(self, room: GameRoom, win: dict[str, Any]) -> None:
        """Broadcast victory and reveal all roles."""
        room.match_ended_at = __import__("time").time()
        room.set_phase(GamePhase.VICTORY)
        room.winning_faction = win.get("winner")

        # Reveal all roles
        all_roles = {
            uid: {
                "role": p.role.value,
                "display_name": p.display_name,
                "is_alive": p.is_alive,
            }
            for uid, p in room.players.items()
        }

        await self.mgr.broadcast(room.room_id, {
            "type": "game_over",
            "phase": GamePhase.VICTORY.value,
            "winner": win["winner"],
            "message": win["message"],
            "winners": win["winners"],
            "all_roles": all_roles,
            "timeline": room.timeline,
        })

    # ── Chat ──────────────────────────────────────────────────────────────

    async def _chat_message(
        self, room: GameRoom, user_id: str, data: dict,
    ) -> None:
        channel = data.get("channel", "village")
        content = data.get("text", "").strip()

        result = chat_manager.validate_message(room, user_id, channel, content)
        if not result["valid"]:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": result["error"],
            })
            return

        msg = result["message"]
        ch = ChatChannel(result["channel"])
        recipients = get_recipients(room, ch)

        await self.mgr.send_to_many(room.room_id, recipients, msg)

    # ── Night Actions ─────────────────────────────────────────────────────

    async def _action_submit(
        self, room: GameRoom, user_id: str, data: dict,
    ) -> None:
        if room.phase != GamePhase.NIGHT:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": "Actions can only be submitted at night.",
            })
            return

        player = room.get_player(user_id)
        if not player or not player.is_alive:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": "You cannot act.",
            })
            return

        target_id = data.get("target_id")
        action_type = data.get("action", "use_ability")

        # Map client action types to internal action names
        action_map = {
            RoleType.SEER: "investigate",
            RoleType.WARDEN: "protect",
            RoleType.HUNTER: "shoot",
            RoleType.VAMPIRE: "bite",
            RoleType.WEREWOLF: "maul",
            RoleType.NECROMANCER: "revive",
        }

        action_name = action_map.get(player.role)
        if not action_name:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": "Your role has no night action.",
            })
            return

        # ── Target validation ─────────────────────────────────────────────
        if target_id:
            target = room.get_player(target_id)

            # Vampires cannot target fellow vampires
            if player.role == RoleType.VAMPIRE and target and target.role == RoleType.VAMPIRE:
                await self.mgr.send_personal(room.room_id, user_id, {
                    "type": "error", "message": "You cannot target a fellow Coven member.",
                })
                return

            # Killing roles cannot target dead players (except Necromancer revive)
            if action_name != "revive" and target and not target.is_alive:
                await self.mgr.send_personal(room.room_id, user_id, {
                    "type": "error", "message": "You cannot target a dead player.",
                })
                return

        # Store the action
        room.night_actions[user_id] = {
            "action": action_name,
            "target": target_id,
        }

        # For vampires, also store coven vote
        if player.role == RoleType.VAMPIRE:
            player.coven_vote_target = target_id

        await self.mgr.send_personal(room.room_id, user_id, {
            "type": "action_confirmed",
            "message": "Your action has been recorded.",
        })

        # Check if all living players with night actions have submitted
        await self._check_all_actions_in(room)

    async def _check_all_actions_in(self, room: GameRoom) -> None:
        """If every alive player who CAN act has submitted, end night early."""
        actionable_roles = {
            RoleType.SEER, RoleType.WARDEN, RoleType.HUNTER,
            RoleType.VAMPIRE, RoleType.WEREWOLF, RoleType.NECROMANCER,
        }
        for player in room.alive_players:
            if player.role in actionable_roles and player.user_id not in room.night_actions:
                return  # Still waiting

        # Everyone's in — end night early
        room.cancel_phase_task()
        await self._end_night(room)

    # ── Voting ────────────────────────────────────────────────────────────

    async def _vote_cast(
        self, room: GameRoom, user_id: str, data: dict,
    ) -> None:
        target_id = data.get("target_id", "skip")

        result = vote_manager.cast_vote(room, user_id, target_id)
        if not result["success"]:
            await self.mgr.send_personal(room.room_id, user_id, {
                "type": "error", "message": result["error"],
            })
            return

        # Broadcast updated vote status
        status = vote_manager.get_vote_status(room)
        await self.mgr.broadcast(room.room_id, {
            "type": "vote_update",
            **status,
        })

        # Check if all alive players have voted
        if vote_manager.all_alive_voted(room):
            room.cancel_phase_task()
            await self._end_voting(room)
