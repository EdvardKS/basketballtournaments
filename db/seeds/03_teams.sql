-- Demo seed: teams + team rosters + draft state for mid-draft tournament.
--
-- Each completed tournament has fully drafted teams (3 players each).
-- The mid-draft tournament has 6 teams where round-1 is half-done:
-- 3 teams already picked 1 player (so 3 picks made), 3 haven't (draft in progress).

-- ============================================================
-- Teams for t-draft-now (6 teams, each with its captain; rosters partially built)
-- ============================================================
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed, description) VALUES
  ('td-team-1', 't-draft-now', 'player-01', 'Los Halcones',  true, 'Equipo veterano con ritmo'),
  ('td-team-2', 't-draft-now', 'player-02', 'Los Dragones',  true, 'Tiradores puros'),
  ('td-team-3', 't-draft-now', 'player-03', 'Los Titanes',   true, 'Defensa sólida'),
  ('td-team-4', 't-draft-now', 'player-04', 'Los Lobos',     true, 'Bloqueo y pick&roll'),
  ('td-team-5', 't-draft-now', 'player-05', 'Los Cometas',   true, 'Tiro exterior'),
  ('td-team-6', 't-draft-now', 'player-06', 'Los Raptors',   true, 'Contraataque rápido')
ON CONFLICT (id) DO NOTHING;

-- Captains auto-added to their own teams
INSERT INTO public.team_players (team_id, player_id) VALUES
  ('td-team-1','player-01'),('td-team-2','player-02'),('td-team-3','player-03'),
  ('td-team-4','player-04'),('td-team-5','player-05'),('td-team-6','player-06'),
  -- First 3 picks already done: teams 1,2,3 have picked a player
  ('td-team-1','player-13'),  -- pick 1
  ('td-team-2','player-14'),  -- pick 2
  ('td-team-3','player-15')   -- pick 3
ON CONFLICT DO NOTHING;

-- Draft state: round 1, 3 picks made, currentTeamIndex=3 (team 4's turn)
INSERT INTO public.draft_state (
  id, tournament_id, team_order, current_team_index, current_round, max_rounds,
  is_active, round_order_history, created_at
) VALUES (
  'draft-state-1', 't-draft-now',
  '["td-team-1","td-team-2","td-team-3","td-team-4","td-team-5","td-team-6"]',
  3, 1, 99, 'true',
  '[{"round":1,"order":["td-team-1","td-team-2","td-team-3","td-team-4","td-team-5","td-team-6"]}]',
  now() - interval '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.draft_history (tournament_id, team_id, player_id, round, pick_order, picked_at) VALUES
  ('t-draft-now', 'td-team-1', 'player-13', 1, 1, now() - interval '2 hours'),
  ('t-draft-now', 'td-team-2', 'player-14', 1, 2, now() - interval '1 hour 50 minutes'),
  ('t-draft-now', 'td-team-3', 'player-15', 1, 3, now() - interval '1 hour 40 minutes');

-- ============================================================
-- Teams for t-past-8 (8 teams × 3 players = 24 roster slots)
-- ============================================================
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed) VALUES
  ('t8-team-1', 't-past-8', 'player-01', 'Los Halcones',   true),
  ('t8-team-2', 't-past-8', 'player-02', 'Los Dragones',   true),
  ('t8-team-3', 't-past-8', 'player-03', 'Los Titanes',    true),
  ('t8-team-4', 't-past-8', 'player-07', 'Los Fenix',      true),
  ('t8-team-5', 't-past-8', 'player-08', 'Los Pumas',      true),
  ('t8-team-6', 't-past-8', 'player-09', 'Los Truenos',    true),
  ('t8-team-7', 't-past-8', 'player-10', 'Los Cometas',    true),
  ('t8-team-8', 't-past-8', 'player-12', 'Los Tiburones',  true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_players (team_id, player_id) VALUES
  ('t8-team-1','player-01'),('t8-team-1','player-13'),('t8-team-1','player-25'),
  ('t8-team-2','player-02'),('t8-team-2','player-14'),('t8-team-2','player-26'),
  ('t8-team-3','player-03'),('t8-team-3','player-15'),('t8-team-3','player-27'),
  ('t8-team-4','player-07'),('t8-team-4','player-16'),('t8-team-4','player-28'),
  ('t8-team-5','player-08'),('t8-team-5','player-17'),('t8-team-5','player-29'),
  ('t8-team-6','player-09'),('t8-team-6','player-18'),('t8-team-6','player-30'),
  ('t8-team-7','player-10'),('t8-team-7','player-31'),('t8-team-7','player-33'),
  ('t8-team-8','player-12'),('t8-team-8','player-32'),('t8-team-8','player-34')
ON CONFLICT DO NOTHING;

-- Set winner (t8-team-1 — Los Halcones)
UPDATE public.tournaments SET winner_id='t8-team-1' WHERE id='t-past-8';

-- ============================================================
-- Teams for t-past-6 (6 teams × 3 players = 18 roster slots)
-- ============================================================
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed) VALUES
  ('t6-team-1', 't-past-6', 'player-04', 'Los Lobos',      true),
  ('t6-team-2', 't-past-6', 'player-05', 'Los Titanes',    true),
  ('t6-team-3', 't-past-6', 'player-06', 'Los Raptors',    true),
  ('t6-team-4', 't-past-6', 'player-10', 'Los Cometas',    true),
  ('t6-team-5', 't-past-6', 'player-11', 'Los Gigantes',   true),
  ('t6-team-6', 't-past-6', 'player-12', 'Los Tiburones',  true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_players (team_id, player_id) VALUES
  ('t6-team-1','player-04'),('t6-team-1','player-19'),('t6-team-1','player-35'),
  ('t6-team-2','player-05'),('t6-team-2','player-20'),('t6-team-2','player-36'),
  ('t6-team-3','player-06'),('t6-team-3','player-21'),('t6-team-3','player-37'),
  ('t6-team-4','player-10'),('t6-team-4','player-22'),('t6-team-4','player-38'),
  ('t6-team-5','player-11'),('t6-team-5','player-23'),('t6-team-5','player-39'),
  ('t6-team-6','player-12'),('t6-team-6','player-24'),('t6-team-6','player-40')
ON CONFLICT DO NOTHING;

-- Winner: t6-team-4 (Los Cometas)
UPDATE public.tournaments SET winner_id='t6-team-4' WHERE id='t-past-6';

-- ============================================================
-- Teams for t-past-4 (4 teams × 3 players = 12 roster slots)
-- ============================================================
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed) VALUES
  ('t4-team-1', 't-past-4', 'player-01', 'Los Halcones',   true),
  ('t4-team-2', 't-past-4', 'player-02', 'Los Dragones',   true),
  ('t4-team-3', 't-past-4', 'player-06', 'Los Raptors',    true),
  ('t4-team-4', 't-past-4', 'player-08', 'Los Pumas',      true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_players (team_id, player_id) VALUES
  ('t4-team-1','player-01'),('t4-team-1','player-13'),('t4-team-1','player-25'),
  ('t4-team-2','player-02'),('t4-team-2','player-14'),('t4-team-2','player-26'),
  ('t4-team-3','player-06'),('t4-team-3','player-15'),('t4-team-3','player-27'),
  ('t4-team-4','player-08'),('t4-team-4','player-16'),('t4-team-4','player-28')
ON CONFLICT DO NOTHING;

-- Winner: t4-team-2 (Los Dragones)
UPDATE public.tournaments SET winner_id='t4-team-2' WHERE id='t-past-4';
