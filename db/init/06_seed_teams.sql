-- Seed: teams + rosters. Sólo para el torneo activo y los completados.
INSERT INTO public.teams (id, tournament_id, captain_id, name, name_confirmed) VALUES
  ('team-active-1', 'tournament-active-1', 'player-03', 'Raptors Norte', true),
  ('team-active-2', 'tournament-active-1', 'player-04', 'Halcones Sur', true),
  ('team-active-3', 'tournament-active-1', 'player-05', 'Titanes City', true),
  ('team-active-4', 'tournament-active-1', 'player-06', 'Cometas Azul', true),
  ('team-completed-1', 'tournament-completed-1', 'player-07', 'Gladiadores', true),
  ('team-completed-2', 'tournament-completed-1', 'player-08', 'Fenix', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_players (id, team_id, player_id) VALUES
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
