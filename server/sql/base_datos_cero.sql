CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.players (
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

CREATE TABLE public.tournaments (
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

CREATE TABLE public.teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  captain_id varchar NOT NULL,
  name text NOT NULL,
  name_confirmed boolean NOT NULL DEFAULT false,
  whatsapp_group_name text,
  whatsapp_group_link text,
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

CREATE TABLE public.trade_offers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  requesting_team_id varchar NOT NULL,
  target_team_id varchar NOT NULL,
  target_player_id varchar NOT NULL,
  offered_player_ids text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp,
  resolved_by varchar
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

ALTER TABLE trade_offers
  ADD CONSTRAINT fk_trade_offers_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  ADD CONSTRAINT fk_trade_offers_requesting_team
  FOREIGN KEY (requesting_team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_trade_offers_target_team
  FOREIGN KEY (target_team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_trade_offers_target_player
  FOREIGN KEY (target_player_id) REFERENCES players(id),
  ADD CONSTRAINT fk_trade_offers_resolved_by
  FOREIGN KEY (resolved_by) REFERENCES players(id);

-- snapshots
ALTER TABLE player_skill_snapshots
  ADD CONSTRAINT fk_snapshot_player
  FOREIGN KEY (player_id) REFERENCES players(id),
  ADD CONSTRAINT fk_snapshot_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id);

-- sample data
INSERT INTO public.players (
  id, name, mobile, username, email, role, password, is_public,
  pace, shooting, passing, dribbling, defense, physical, overall
) VALUES
  ('admin-1', 'Administrador base1', '700000001', 'base1', 'base1@villena.test', 'admin', '123123123', false, 50, 50, 50, 50, 50, 50, 50),
  ('admin-2', 'Administrador base2', '700000002', 'base2', 'base2@villena.test', 'admin', '123123123', false, 50, 50, 50, 50, 50, 50, 50),
  ('admin-3', 'Administrador base3', '700000003', 'base3', 'base3@villena.test', 'admin', '123123123', false, 50, 50, 50, 50, 50, 50, 50),
  ('player-01', 'Lucas Gil', '600000001', 'lucasg', 'lucas@villena.test', 'captain', '123123123', true, 85, 78, 74, 82, 68, 76, 77),
  ('player-02', 'Mario Ruiz', '600000002', 'marior', 'mario@villena.test', 'captain', '123123123', true, 76, 85, 70, 74, 65, 72, 74),
  ('player-03', 'Sergio Diaz', '600000003', 'sergiod', 'sergio@villena.test', 'captain', '123123123', false, 70, 66, 82, 72, 78, 80, 75),
  ('player-04', 'Adrian Lopez', '600000004', 'adrianl', 'adrian@villena.test', 'player', '123123123', true, 88, 60, 64, 86, 55, 70, 71),
  ('player-05', 'Iker Mora', '600000005', 'ikerm', 'iker@villena.test', 'player', '123123123', false, 64, 90, 72, 68, 62, 70, 71),
  ('player-06', 'Pablo Cruz', '600000006', 'pabloc', 'pablo@villena.test', 'player', '123123123', false, 73, 72, 70, 69, 74, 78, 73),
  ('player-07', 'Hugo Sanz', '600000007', 'hugos', 'hugo@villena.test', 'player', '123123123', false, 66, 62, 70, 64, 82, 84, 71),
  ('player-08', 'Nico Rojas', '600000008', 'nicor', 'nico@villena.test', 'player', '123123123', true, 80, 76, 79, 75, 60, 68, 73),
  ('player-09', 'Daniel Vega', '600000009', 'danielv', 'daniel@villena.test', 'player', '123123123', false, 58, 60, 65, 62, 70, 72, 65),
  ('player-10', 'Victor Luna', '600000010', 'victorl', 'victor@villena.test', 'player', '123123123', true, 90, 88, 80, 92, 60, 75, 81),
  ('player-11', 'Raul Soto', '600000011', 'rauls', 'raul@villena.test', 'player', '123123123', false, 62, 68, 60, 58, 66, 64, 63),
  ('player-12', 'Javi Costa', '600000012', 'javic', 'javi@villena.test', 'player', '123123123', false, 74, 70, 68, 76, 72, 70, 72);

INSERT INTO public.tournaments (
  id, name, date, status, location, description, rules, max_teams
) VALUES
  ('tournament-open-1', 'Torneo Villena Open', '2026-06-30', 'open', 'Pistas Municipales Villena', 'Inscripciones abiertas', $$Formato 5v5 Cancha Completa
Eliminacion Doble
Dos partes de 20 minutos
Seleccion por Draft de Capitanes
Reglas FIBA$$, 8),
  ('tournament-draft-1', 'Draft Primavera', '2026-05-10', 'draft', 'Pabellon Centro', 'Draft en curso', $$Formato 5v5 Cancha Completa
Eliminacion Doble
Seleccion por Draft de Capitanes
Reglas FIBA$$, 8),
  ('tournament-active-1', 'Liga Otono', '2026-04-15', 'active', 'Polideportivo Norte', 'Fase de grupos en juego', $$Formato 5v5 Cancha Completa
Fase de grupos y eliminatorias
Reglas FIBA$$, 8),
  ('tournament-completed-1', 'Copa Invierno', '2026-02-20', 'completed', 'Pabellon Sur', 'Torneo finalizado', $$Formato 5v5 Cancha Completa
Eliminacion directa
Reglas FIBA$$, 8);

INSERT INTO public.tournament_registrations (
  id, player_id, tournament_id, is_captain, team_name
) VALUES
  ('reg-open-1', 'player-04', 'tournament-open-1', false, NULL),
  ('reg-open-2', 'player-05', 'tournament-open-1', false, NULL),
  ('reg-open-3', 'player-06', 'tournament-open-1', false, NULL),
  ('reg-open-4', 'player-09', 'tournament-open-1', false, NULL),
  ('reg-open-5', 'player-10', 'tournament-open-1', false, NULL),

  ('reg-draft-1', 'player-01', 'tournament-draft-1', true, NULL),
  ('reg-draft-2', 'player-02', 'tournament-draft-1', true, NULL),
  ('reg-draft-3', 'player-04', 'tournament-draft-1', false, NULL),
  ('reg-draft-4', 'player-05', 'tournament-draft-1', false, NULL),
  ('reg-draft-5', 'player-06', 'tournament-draft-1', false, NULL),
  ('reg-draft-6', 'player-07', 'tournament-draft-1', false, NULL),
  ('reg-draft-7', 'player-08', 'tournament-draft-1', false, NULL),
  ('reg-draft-8', 'player-09', 'tournament-draft-1', false, NULL),

  ('reg-active-1', 'player-03', 'tournament-active-1', true, 'Raptors Norte'),
  ('reg-active-2', 'player-04', 'tournament-active-1', true, 'Halcones Sur'),
  ('reg-active-3', 'player-05', 'tournament-active-1', true, 'Titanes City'),
  ('reg-active-4', 'player-06', 'tournament-active-1', true, 'Cometas Azul'),
  ('reg-active-5', 'player-07', 'tournament-active-1', false, NULL),
  ('reg-active-6', 'player-08', 'tournament-active-1', false, NULL),
  ('reg-active-7', 'player-09', 'tournament-active-1', false, NULL),
  ('reg-active-8', 'player-10', 'tournament-active-1', false, NULL),

  ('reg-completed-1', 'player-07', 'tournament-completed-1', true, 'Gladiadores'),
  ('reg-completed-2', 'player-08', 'tournament-completed-1', true, 'Fenix'),
  ('reg-completed-3', 'player-09', 'tournament-completed-1', false, NULL),
  ('reg-completed-4', 'player-10', 'tournament-completed-1', false, NULL),
  ('reg-completed-5', 'player-11', 'tournament-completed-1', false, NULL),
  ('reg-completed-6', 'player-12', 'tournament-completed-1', false, NULL);

INSERT INTO public.teams (
  id, tournament_id, captain_id, name, name_confirmed
) VALUES
  ('team-draft-1', 'tournament-draft-1', 'player-01', 'Equipo Rojo', false),
  ('team-draft-2', 'tournament-draft-1', 'player-02', 'Equipo Negro', false),
  ('team-active-1', 'tournament-active-1', 'player-03', 'Raptors Norte', true),
  ('team-active-2', 'tournament-active-1', 'player-04', 'Halcones Sur', true),
  ('team-active-3', 'tournament-active-1', 'player-05', 'Titanes City', true),
  ('team-active-4', 'tournament-active-1', 'player-06', 'Cometas Azul', true),
  ('team-completed-1', 'tournament-completed-1', 'player-07', 'Gladiadores', true),
  ('team-completed-2', 'tournament-completed-1', 'player-08', 'Fenix', true);

INSERT INTO public.team_players (id, team_id, player_id) VALUES
  ('tp-draft-1', 'team-draft-1', 'player-01'),
  ('tp-draft-2', 'team-draft-1', 'player-04'),
  ('tp-draft-3', 'team-draft-1', 'player-05'),
  ('tp-draft-4', 'team-draft-2', 'player-02'),
  ('tp-draft-5', 'team-draft-2', 'player-06'),
  ('tp-draft-6', 'team-draft-2', 'player-07'),
  ('tp-active-1', 'team-active-1', 'player-03'),
  ('tp-active-2', 'team-active-1', 'player-07'),
  ('tp-active-3', 'team-active-2', 'player-04'),
  ('tp-active-4', 'team-active-2', 'player-08'),
  ('tp-active-5', 'team-active-3', 'player-05'),
  ('tp-active-6', 'team-active-3', 'player-09'),
  ('tp-active-7', 'team-active-4', 'player-06'),
  ('tp-active-8', 'team-active-4', 'player-10'),
  ('tp-completed-1', 'team-completed-1', 'player-07'),
  ('tp-completed-2', 'team-completed-1', 'player-09'),
  ('tp-completed-3', 'team-completed-1', 'player-11'),
  ('tp-completed-4', 'team-completed-2', 'player-08'),
  ('tp-completed-5', 'team-completed-2', 'player-10'),
  ('tp-completed-6', 'team-completed-2', 'player-12');

INSERT INTO public.tournament_groups (id, tournament_id, name) VALUES
  ('group-active-a', 'tournament-active-1', 'Grupo A'),
  ('group-active-b', 'tournament-active-1', 'Grupo B');

INSERT INTO public.group_members (
  id, group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against
) VALUES
  ('gm-active-1', 'group-active-a', 'team-active-1', 3, 1, 1, 0, 21, 18),
  ('gm-active-2', 'group-active-a', 'team-active-2', 1, 1, 0, 1, 18, 21),
  ('gm-active-3', 'group-active-b', 'team-active-3', 0, 0, 0, 0, 0, 0),
  ('gm-active-4', 'group-active-b', 'team-active-4', 0, 0, 0, 0, 0, 0);

INSERT INTO public.matches (
  id, tournament_id, group_id, stage, round_number, home_team_id, away_team_id,
  home_score, away_score, winner_id, status, duration_minutes, started_at
) VALUES
  ('match-active-1', 'tournament-active-1', 'group-active-a', 'group', 1, 'team-active-1', 'team-active-2', 21, 18, 'team-active-1', 'in_progress', 20, now()),
  ('match-active-2', 'tournament-active-1', 'group-active-b', 'group', 1, 'team-active-3', 'team-active-4', NULL, NULL, NULL, 'pending', NULL, NULL);

INSERT INTO public.matches (
  id, tournament_id, group_id, stage, round_number, home_team_id, away_team_id,
  home_score, away_score, winner_id, status, completed_at
) VALUES
  ('match-completed-final', 'tournament-completed-1', NULL, 'final', 1, 'team-completed-1', 'team-completed-2', 62, 55, 'team-completed-1', 'completed', now());

INSERT INTO public.draft_state (
  id, tournament_id, team_order, current_team_index, current_round, max_rounds, is_active
) VALUES
  ('draft-state-1', 'tournament-draft-1', '["team-draft-1","team-draft-2"]', 0, 2, 5, 'true');

INSERT INTO public.draft_history (
  id, tournament_id, team_id, player_id, round, pick_order
) VALUES
  ('draft-pick-1', 'tournament-draft-1', 'team-draft-1', 'player-04', 1, 1),
  ('draft-pick-2', 'tournament-draft-1', 'team-draft-2', 'player-06', 1, 2),
  ('draft-pick-3', 'tournament-draft-1', 'team-draft-1', 'player-05', 2, 3);

INSERT INTO public.player_skill_snapshots (
  id, player_id, tournament_id, pace, shooting, passing, dribbling, defense, physical, overall
) VALUES
  ('snap-1', 'player-01', 'tournament-completed-1', 80, 74, 70, 78, 64, 72, 73),
  ('snap-2', 'player-01', 'tournament-active-1', 85, 78, 74, 82, 68, 76, 77),
  ('snap-3', 'player-02', 'tournament-completed-1', 72, 80, 66, 70, 60, 68, 69),
  ('snap-4', 'player-02', 'tournament-active-1', 76, 85, 70, 74, 65, 72, 74),
  ('snap-5', 'player-03', 'tournament-completed-1', 66, 62, 78, 70, 74, 78, 71),
  ('snap-6', 'player-03', 'tournament-active-1', 70, 66, 82, 72, 78, 80, 75),
  ('snap-7', 'player-04', 'tournament-completed-1', 84, 58, 60, 82, 52, 66, 67),
  ('snap-8', 'player-04', 'tournament-active-1', 88, 60, 64, 86, 55, 70, 71),
  ('snap-9', 'player-10', 'tournament-completed-1', 86, 84, 76, 88, 56, 72, 77),
  ('snap-10', 'player-10', 'tournament-active-1', 90, 88, 80, 92, 60, 75, 81);

UPDATE tournaments
SET winner_id = 'team-completed-1'
WHERE id = 'tournament-completed-1';
