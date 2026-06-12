import asyncio
import httpx
from bot_client import generate_token, generate_user_id

async def main():
    token = generate_token(generate_user_id(), "TestUser")
    url = f"http://localhost:8000/api/rooms/join?token={token}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"room_code": "75B9BE"})
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
