"""
Bot client for HollowVeil WebSocket testing.

Simulates players connecting to the game server, joining a room, and
progressing through the game phases. Useful for testing the backend logic
without the React Native client.

Requirements:
    pip install websockets httpx
"""

import asyncio
import json
import logging
import random
import string
import sys
from typing import Any

import httpx
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("bot")

SERVER_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

# ── Debug: Force the real player's role ───────────────────────────────
# ⚠️  TEMPORARY — FOR TESTING ONLY
# This forces the real player's role in bot mode so every role can be
# manually verified. Remove or set to None before production.
#
# HOW TO REVERT:
#   1. Set FORCE_PLAYER_ROLE = None  (below)
#   2. Optionally remove the "debug_force_role" handler in
#      server/app/ws/message_handler.py (lines marked TODO:REMOVE)
#   3. Optionally remove the forced_roles parameter from
#      server/app/engine/role_assigner.py (it's a no-op when None)
#
# Valid values: "seer", "warden", "hunter", "necromancer", "vampire",
#               "jester", "cursed_villager", "villager"
# Set to None for normal random assignment.
FORCE_PLAYER_ROLE = "necromancer"

import jwt
import os
import time
from dotenv import load_dotenv

load_dotenv()
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def generate_token(user_id: str, display_name: str) -> str:
    payload = {
        "sub": user_id,
        "role": "authenticated",
        "aud": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "user_metadata": {
            "display_name": display_name
        }
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
def generate_user_id() -> str:
    # A fake UUID-like string just for testing
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=8)) + "-test-user"


class BotClient:
    def __init__(self, name: str, user_id: str, is_host: bool = False):
        self.name = name
        self.user_id = user_id
        self.is_host = is_host
        self.ws = None
        self.role = None
        self.alive = True
        self.room_id = None
        self.players: dict[str, str] = {} # user_id -> name
        self.player_ready: dict[str, bool] = {}  # user_id -> is_ready
        self.alive_players: set[str] = set()  # user_ids of alive players
        self.coven_mates: set[str] = set()  # user_ids of fellow vampires

    async def connect(self, room_id: str, token: str):
        self.room_id = room_id
        uri = f"{WS_URL}/ws/{room_id}?token={token}"
        logger.info(f"[{self.name}] Connecting to {uri}")
        try:
            self.ws = await websockets.connect(uri, ping_interval=None)
            logger.info(f"[{self.name}] Connected!")
            asyncio.create_task(self.listen())
        except Exception as e:
            logger.error(f"[{self.name}] Connection failed: {e}")

    async def listen(self):
        try:
            async for message in self.ws:
                data = json.loads(message)
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"[{self.name}] Connection closed. Code: {e.code}, Reason: {e.reason}")

    async def send(self, data: dict[str, Any]):
        if self.ws:
            await self.ws.send(json.dumps(data))

    async def handle_message(self, data: dict[str, Any]):
        msg_type = data.get("type")
        
        if msg_type == "lobby_update":
            self.players = {p["user_id"]: p["display_name"] for p in data.get("players", [])}
            self.player_ready = {p["user_id"]: p.get("is_ready", False) for p in data.get("players", [])}
            self.alive_players = {p["user_id"] for p in data.get("players", []) if p.get("is_alive", True)}
            ready_count = sum(1 for r in self.player_ready.values() if r)
            logger.info(f"[{self.name}] Lobby update. Players: {len(self.players)}, Ready: {ready_count}/{len(self.players)}")
            
            # Automatically ready up ONLY once
            if data.get("phase") == "lobby" and not getattr(self, "has_readied", False):
                self.has_readied = True
                await asyncio.sleep(random.uniform(0.5, 2.0))
                await self.send({"type": "lobby_ready", "is_ready": True})

        elif msg_type == "role_assigned":
            self.role = data.get("role")
            logger.info(f"[{self.name}] Role assigned: {self.role}")

        elif msg_type == "game_state":
            # Sync player state (alive status, coven-mates)
            for p in data.get("players", []):
                if not p.get("is_alive", True):
                    self.alive_players.discard(p["user_id"])
                if p.get("role") == "vampire":
                    self.coven_mates.add(p["user_id"])

        elif msg_type == "phase_changed":
            phase = data.get("phase")
            logger.info(f"[{self.name}] Phase changed to: {phase}")
            
            if phase == "night" and self.alive:
                await self.do_night_action()
            elif phase == "voting" and self.alive:
                await self.do_vote()

        elif msg_type == "dawn_event":
            logger.info(f"[{self.name}] Dawn Event: {data.get('message')}")
            if data.get("event") == "death":
                target = data.get("target")
                self.alive_players.discard(target)
                if target == self.user_id:
                    self.alive = False
                    logger.info(f"[{self.name}] I have died.")
            elif data.get("event") == "necromancer_revive":
                target = data.get("target")
                self.alive_players.add(target)
                if target == self.user_id:
                    self.alive = True

        elif msg_type == "execution_result":
            logger.info(f"[{self.name}] Execution Result: {data.get('message')}")
            if data.get("outcome") == "execution":
                executed_id = data.get("executed_id")
                self.alive_players.discard(executed_id)
                if executed_id == self.user_id:
                    self.alive = False
                    logger.info(f"[{self.name}] I have been executed.")

        elif msg_type == "game_over":
            logger.info(f"[{self.name}] Game Over! Winner: {data.get('winner')}")

        elif msg_type == "error":
            logger.error(f"[{self.name}] Server Error: {data.get('message')}")

    async def do_night_action(self):
        # Wait a bit before acting
        await asyncio.sleep(random.uniform(1.0, 3.0))
        
        target_id = None
        action = None
        
        # Build valid target list: alive players, excluding self
        alive_others = [uid for uid in self.alive_players if uid != self.user_id]
        if not alive_others:
            return

        if self.role == "seer":
            action = "investigate"
            target_id = random.choice(alive_others)
        elif self.role == "warden":
            action = "protect"
            # Can protect self too
            alive_all = [uid for uid in self.alive_players]
            target_id = random.choice(alive_all) if alive_all else None
        elif self.role == "hunter":
            # 50% chance to shoot if hunter
            if random.random() > 0.5:
                action = "shoot"
                target_id = random.choice(alive_others)
        elif self.role == "vampire":
            action = "bite"
            # Filter out coven-mates
            valid_targets = [uid for uid in alive_others if uid not in self.coven_mates]
            if valid_targets:
                target_id = random.choice(valid_targets)
            else:
                return  # No valid non-coven targets
        elif self.role == "werewolf":
            action = "maul"
            target_id = random.choice(alive_others)
            
        if action and target_id:
            logger.info(f"[{self.name}] Submitting night action: {action} on {self.players.get(target_id)}")
            await self.send({
                "type": "action_submit",
                "action": action,
                "target_id": target_id
            })

    async def do_vote(self):
        await asyncio.sleep(random.uniform(2.0, 5.0))
        
        # 20% chance to skip
        if random.random() < 0.2:
            target_id = "skip"
            logger.info(f"[{self.name}] Voting to skip")
        else:
            # Only vote for alive players, excluding self
            alive_others = [uid for uid in self.alive_players if uid != self.user_id]
            if not alive_others:
                return
            target_id = random.choice(alive_others)
            logger.info(f"[{self.name}] Voting for {self.players.get(target_id)}")
            
        await self.send({
            "type": "vote_cast",
            "target_id": target_id
        })


async def create_room(token: str) -> str:
    # Use httpx to call the REST endpoint to create a room
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{SERVER_URL}/api/rooms/quickplay?token={token}"
    
    while True:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url)
                resp.raise_for_status()
                data = resp.json()
                logger.info(f"Room ready: {data['room_id']} (Code: {data['room_code']})")
                return data["room_id"], data["room_code"]
        except Exception as e:
            logger.info(f"Waiting for server to start... ({e})")
            await asyncio.sleep(2)


async def main():
    logger.info("Starting bot simulation...")
    
    # Needs 8 players to start. We'll spawn 7 bots, so the user can be the 8th!
    num_bots = 7
    
    host_id = generate_user_id()
    host_token = generate_token(host_id, "Bot-1")
    room_id, room_code = await create_room(host_token)
    
    with open("current_bot_room.txt", "w") as f:
        f.write(room_code)
    
    bots = []
    for i in range(num_bots):
        uid = host_id if i == 0 else generate_user_id()
        name = f"Bot-{i+1}"
        token = host_token if i == 0 else generate_token(uid, name)
        
        bot = BotClient(name, uid, is_host=(i==0))
        bots.append(bot)
        await bot.connect(room_id, token)
        # Stagger connections slightly
        await asyncio.sleep(0.2)
        
    # Give everyone time to connect and ready up
    logger.info("Waiting for the real player to join the lobby...")
    bot_ids = {b.user_id for b in bots}
    while len(bots[0].players) < 8:
        await asyncio.sleep(1)
    
    # Identify the real player (the one who isn't a bot)
    real_player_id = None
    for uid in bots[0].players:
        if uid not in bot_ids:
            real_player_id = uid
            break
    
    logger.info(f"Real player joined! ID: {real_player_id}")
    
    # Force role if configured
    if FORCE_PLAYER_ROLE and real_player_id:
        logger.info(f"Forcing real player role to: {FORCE_PLAYER_ROLE}")
        await bots[0].send({
            "type": "debug_force_role",
            "target_id": real_player_id,
            "role": FORCE_PLAYER_ROLE,
        })
    
    # Wait for the real player to ready up
    logger.info("Waiting for all players to be ready...")
    while True:
        all_ready = len(bots[0].player_ready) >= 8 and all(bots[0].player_ready.values())
        if all_ready:
            break
        await asyncio.sleep(1)
    
    logger.info("All players ready! Starting game in 3 seconds...")
    await asyncio.sleep(3)
    
    # Host starts the game
    logger.info("Host is starting the game...")
    await bots[0].send({"type": "lobby_start"})
    
    # Keep the script running to observe the game loop
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Simulation stopped by user.")


if __name__ == "__main__":
    asyncio.run(main())
