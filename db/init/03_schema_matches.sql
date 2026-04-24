-- Groups, matches and skill snapshots
CREATE TABLE IF NOT EXISTS public.tournament_groups (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id varchar NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_id varchar NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  games_lost integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  UNIQUE (group_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  group_id varchar REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  stage text NOT NULL,
  round_number integer,
  home_team_id varchar REFERENCES public.teams(id),
  away_team_id varchar REFERENCES public.teams(id),
  home_score integer,
  away_score integer,
  winner_id varchar REFERENCES public.teams(id),
  status text NOT NULL DEFAULT 'pending',
  duration_minutes integer,
  started_at timestamp,
  scheduled_at timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_skill_snapshots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id varchar NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pace integer NOT NULL,
  shooting integer NOT NULL,
  passing integer NOT NULL,
  dribbling integer NOT NULL,
  defense integer NOT NULL,
  physical integer NOT NULL,
  overall integer NOT NULL,
  snapshot_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (player_id, tournament_id)
);

-- Tournament winner FK added after teams table exists
DO $$ BEGIN
  ALTER TABLE public.tournaments
    ADD CONSTRAINT fk_tournaments_winner
    FOREIGN KEY (winner_id) REFERENCES public.teams(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
