-- Core tables: players, tournaments, registrations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.players (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  username text UNIQUE,
  email text UNIQUE,
  role text NOT NULL DEFAULT 'player',
  position text NOT NULL DEFAULT 'base',
  password text,
  avatar text,
  is_public boolean NOT NULL DEFAULT false,
  pace integer NOT NULL DEFAULT 50,
  shooting integer NOT NULL DEFAULT 50,
  passing integer NOT NULL DEFAULT 50,
  dribbling integer NOT NULL DEFAULT 50,
  defense integer NOT NULL DEFAULT 50,
  physical integer NOT NULL DEFAULT 50,
  overall integer NOT NULL DEFAULT 50,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  location text NOT NULL,
  description text NOT NULL,
  rules text,
  max_teams integer NOT NULL DEFAULT 8,
  winner_id varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id varchar NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  is_captain boolean NOT NULL DEFAULT false,
  team_name text,
  registered_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (player_id, tournament_id)
);
