"""
Async phase timer utilities for HollowVeil.

Provides a reusable coroutine that:
  1. Broadcasts countdown ticks to all players in a room.
  2. Fires a callback when the phase timer expires.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable

from app.ws.connection_manager import manager

logger = logging.getLogger("hollowveil.timer")

# How often (in seconds) countdown ticks are broadcast to clients
TICK_INTERVAL = 1


async def run_phase_timer(
    room_id: str,
    duration: int,
    on_expire: Callable[[], Awaitable[None]],
    *,
    tick_interval: int = TICK_INTERVAL,
) -> None:
    """Run a phase timer that broadcasts countdown ticks and fires *on_expire*.

    Parameters
    ----------
    room_id:
        The room to broadcast countdown ticks to.
    duration:
        Total phase duration in seconds.
    on_expire:
        Async callback invoked when the timer reaches zero.
    tick_interval:
        Seconds between countdown broadcasts (default 5).
    """
    remaining = duration
    try:
        while remaining > 0:
            # Broadcast current remaining time
            await manager.broadcast(room_id, {
                "type": "time_update",
                "remaining": remaining,
            })

            # Sleep for the shorter of tick_interval and remaining time
            sleep_for = min(tick_interval, remaining)
            await asyncio.sleep(sleep_for)
            remaining -= sleep_for

        # Final zero tick
        await manager.broadcast(room_id, {
            "type": "time_update",
            "remaining": 0,
        })

        # Phase expired — invoke callback
        try:
            await on_expire()
        except Exception:
            logger.exception("Error in phase timer callback for room=%s", room_id)

    except asyncio.CancelledError:
        logger.debug("Phase timer cancelled for room=%s", room_id)
        raise


async def start_phase_timer(
    room_id: str,
    duration: int,
    on_expire: Callable[[], Awaitable[None]],
) -> asyncio.Task:
    """Create and return a background task for the phase timer.

    The caller should store the returned task so it can be cancelled
    if the phase ends early (e.g. all votes are in).
    """
    task = asyncio.create_task(
        run_phase_timer(room_id, duration, on_expire),
        name=f"phase_timer_{room_id}",
    )
    return task
