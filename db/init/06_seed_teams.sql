-- Seed: teams + rosters for each tournament
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed) VALUES
  ('team-draft-1', 'tournament-draft-1', 'player-01', 'Equipo Rojo', false),
  ('team-draft-2', 'tournament-draft-1', 'player-02', 'Equipo Negro', false),
  ('team-active-1', 'tournament-active-1', 'player-03', 'Raptors Norte', true),
  ('team-active-2', 'tournament-active-1', 'player-04', 'Halcones Sur', true),
  ('team-active-3', 'tournament-active-1', 'player-05', 'Titanes City', true),
  ('team-active-4', 'tournament-active-1', 'player-06', 'Cometas Azul', true),
  ('team-completed-1', 'tournament-completed-1', 'player-07', 'Gladiadores', true),
  ('team-completed-2', 'tournament-completed-1', 'player-08', 'Fenix', true)
ON CONFLICT (id) DO NOTHING;

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
  ('tp-completed-6', 'team-completed-2', 'player-12')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.draft_state (id, tournament_id, team_order, current_team_index, current_round, max_rounds, is_active) VALUES
  ('draft-state-1', 'tournament-draft-1', '["team-draft-1","team-draft-2"]', 0, 2, 5, 'true')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.draft_history (id, tournament_id, team_id, player_id, round, pick_order) VALUES
  ('draft-pick-1', 'tournament-draft-1', 'team-draft-1', 'player-04', 1, 1),
  ('draft-pick-2', 'tournament-draft-1', 'team-draft-2', 'player-06', 1, 2),
  ('draft-pick-3', 'tournament-draft-1', 'team-draft-1', 'player-05', 2, 3)
ON CONFLICT (id) DO NOTHING;
