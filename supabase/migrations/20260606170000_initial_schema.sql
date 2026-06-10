-- HollowVeil Initial Schema
-- This migration creates the core tables for user profiles and match history.
-- Active game state lives in Python memory on the FastAPI server.

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MATCH HISTORY (saved post-game by the server)
-- ============================================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    winning_faction TEXT NOT NULL,
    player_count INT NOT NULL,
    round_count INT NOT NULL
);

-- Per-player match results
CREATE TABLE public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    faction TEXT NOT NULL,
    is_winner BOOLEAN NOT NULL,
    survived BOOLEAN NOT NULL
);

-- Match timeline events (for endgame replay)
CREATE TABLE public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    phase TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    event_order INT NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by all authenticated, writable by owner
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Matches: readable by all authenticated (public match history)
CREATE POLICY "Matches are viewable by authenticated users"
    ON public.matches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Match players are viewable by authenticated users"
    ON public.match_players FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Match events are viewable by authenticated users"
    ON public.match_events FOR SELECT
    TO authenticated
    USING (true);

-- Insert policies (server uses service_role which bypasses RLS,
-- but these allow inserts via authenticated role if needed)
CREATE POLICY "Service can insert matches"
    ON public.matches FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Service can insert match players"
    ON public.match_players FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Service can insert match events"
    ON public.match_events FOR INSERT
    TO authenticated
    WITH CHECK (true);
