# HollowVeil

A dark fantasy multiplayer social deduction game. 8–12 players take on hidden roles across Town, Vampire Coven, Neutral, and Lone Wolf factions, navigating nights of deadly abilities and days of heated discussion and voting.

## Tech Stack

- **Frontend**: React Native + Expo (TypeScript)
- **Backend**: Python + FastAPI + WebSockets
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth

## Project Structure

```
HollowVeil/
├── supabase/          # Database migrations (auto-deployed via GitHub)
├── client/            # Expo React Native app
└── server/            # FastAPI WebSocket game server
```

## Setup

### Backend

```bash
cd server
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env        # Fill in your values
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd client
npm install
npx expo prebuild            # Generate native android/ directory
npx expo run:android         # Run development build
```

### Database

Database migrations are auto-deployed to Supabase when pushed to `main` via the GitHub integration. To apply manually:

```bash
npx supabase login
npx supabase link
npx supabase db push
```

## Status

🚧 **Prototype Phase** — Gameplay correctness over visual polish.
