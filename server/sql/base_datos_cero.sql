CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.players (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  username text UNIQUE,
  email text UNIQUE,
  role text NOT NULL DEFAULT 'player',
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

CREATE TABLE public.tournaments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  location text NOT NULL,
  description text NOT NULL,
  max_teams integer NOT NULL DEFAULT 8,
  winner_id varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  captain_id varchar NOT NULL,
  name text NOT NULL,
  name_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.tournament_groups (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.tournament_registrations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id varchar NOT NULL,
  tournament_id varchar NOT NULL,
  registered_at timestamp NOT NULL DEFAULT now(),
  is_captain boolean NOT NULL DEFAULT false,
  team_name text
);

CREATE TABLE public.team_players (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL,
  player_id varchar NOT NULL,
  drafted_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id varchar NOT NULL,
  team_id varchar NOT NULL,
  points integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  games_lost integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0
);

CREATE TABLE public.matches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  group_id varchar,
  stage text NOT NULL,
  round_number integer,
  home_team_id varchar,
  away_team_id varchar,
  home_score integer,
  away_score integer,
  winner_id varchar,
  status text NOT NULL DEFAULT 'pending',
  duration_minutes integer,
  started_at timestamp,
  scheduled_at timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.draft_state (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  team_order text NOT NULL,
  current_team_index integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  max_rounds integer NOT NULL DEFAULT 5,
  is_active text NOT NULL DEFAULT 'true',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.draft_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  team_id varchar NOT NULL,
  player_id varchar NOT NULL,
  round integer NOT NULL,
  pick_order integer NOT NULL,
  picked_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.player_skill_snapshots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id varchar NOT NULL,
  tournament_id varchar NOT NULL,
  pace integer NOT NULL,
  shooting integer NOT NULL,
  passing integer NOT NULL,
  dribbling integer NOT NULL,
  defense integer NOT NULL,
  physical integer NOT NULL,
  overall integer NOT NULL,
  snapshot_at timestamp NOT NULL DEFAULT now()
);

-- tournaments
ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournaments_winner
  FOREIGN KEY (winner_id) REFERENCES teams(id);

-- teams
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  ADD CONSTRAINT fk_teams_captain
  FOREIGN KEY (captain_id) REFERENCES players(id);

-- tournament_groups
ALTER TABLE tournament_groups
  ADD CONSTRAINT fk_groups_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);

-- tournament_registrations
ALTER TABLE tournament_registrations
  ADD CONSTRAINT fk_reg_player
  FOREIGN KEY (player_id) REFERENCES players(id),
  ADD CONSTRAINT fk_reg_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);

-- team_players
ALTER TABLE team_players
  ADD CONSTRAINT fk_team_players_team
  FOREIGN KEY (team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_team_players_player
  FOREIGN KEY (player_id) REFERENCES players(id);

-- group_members
ALTER TABLE group_members
  ADD CONSTRAINT fk_group_members_group
  FOREIGN KEY (group_id) REFERENCES tournament_groups(id),
  ADD CONSTRAINT fk_group_members_team
  FOREIGN KEY (team_id) REFERENCES teams(id);

-- matches
ALTER TABLE matches
  ADD CONSTRAINT fk_matches_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  ADD CONSTRAINT fk_matches_group
  FOREIGN KEY (group_id) REFERENCES tournament_groups(id),
  ADD CONSTRAINT fk_matches_home_team
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_matches_away_team
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_matches_winner
  FOREIGN KEY (winner_id) REFERENCES teams(id);

-- draft
ALTER TABLE draft_state
  ADD CONSTRAINT fk_draft_state_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);

ALTER TABLE draft_history
  ADD CONSTRAINT fk_draft_history_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  ADD CONSTRAINT fk_draft_history_team
  FOREIGN KEY (team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_draft_history_player
  FOREIGN KEY (player_id) REFERENCES players(id);

-- snapshots
ALTER TABLE player_skill_snapshots
  ADD CONSTRAINT fk_snapshot_player
  FOREIGN KEY (player_id) REFERENCES players(id),
  ADD CONSTRAINT fk_snapshot_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);
