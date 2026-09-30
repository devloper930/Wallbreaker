-- ==============================================================================
-- Wallbreaker Supabase Database Schema Migration
-- Run this entire script in your Supabase Project: Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create the players table
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text UNIQUE NOT NULL,
  avatar text DEFAULT '👤',
  country text DEFAULT '🌍',
  rating integer NOT NULL DEFAULT 400,
  peak_rating integer NOT NULL DEFAULT 400,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 20)
);

-- Index for lightning-fast competitive leaderboard queries
CREATE INDEX IF NOT EXISTS idx_players_rating_desc ON public.players (rating DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow public read access (for leaderboard and viewing player profiles)
DROP POLICY IF EXISTS "Allow public read for leaderboard" ON public.players;
CREATE POLICY "Allow public read for leaderboard"
  ON public.players
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own initial profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.players;
CREATE POLICY "Users can insert own profile"
  ON public.players
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile row
DROP POLICY IF EXISTS "Users can update own profile" ON public.players;
CREATE POLICY "Users can update own profile"
  ON public.players
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Security: Prevent clients from directly tampering with rating/wins/losses
-- Only display_name, avatar, country, and updated_at can be updated by client sessions.
-- The server uses the Supabase Service Role Key (which bypasses RLS and table privileges)
-- to write authoritative match results and ratings.
REVOKE UPDATE ON public.players FROM authenticated, anon;
GRANT UPDATE (display_name, avatar, country, updated_at) ON public.players TO authenticated;

-- 4. Trigger to automatically update updated_at on record modifications
CREATE OR REPLACE FUNCTION public.handle_player_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_player_updated ON public.players;
CREATE TRIGGER on_player_updated
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_player_updated_at();

-- 5. Trigger to automatically provision a player profile row upon signup (Google OAuth or Email)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  base_name text;
  clean_name text;
  unique_name text;
  counter integer := 1;
BEGIN
  -- Extract candidate name from metadata or email
  base_name := COALESCE(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Player'
  );

  -- Sanitize name: alphanumeric and underscores only
  clean_name := regexp_replace(base_name, '[^a-zA-Z0-9_]', '', 'g');
  IF char_length(clean_name) < 2 THEN
    clean_name := 'Player';
  END IF;
  clean_name := substring(clean_name from 1 for 15);

  -- Ensure uniqueness
  unique_name := clean_name;
  WHILE EXISTS (SELECT 1 FROM public.players WHERE display_name = unique_name) LOOP
    unique_name := substring(clean_name from 1 for 14) || counter;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.players (
    id,
    display_name,
    avatar,
    rating,
    peak_rating,
    wins,
    losses,
    draws,
    games_played
  )
  VALUES (
    new.id,
    unique_name,
    '👤',
    400,
    400,
    0,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
