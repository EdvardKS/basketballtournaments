-- Seed: groups, matches, snapshots
INSERT INTO public.tournament_groups (id, tournament_id, name) VALUES
  ('group-active-a', 'tournament-active-1', 'Grupo A'),
  ('group-active-b', 'tournament-active-1', 'Grupo B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_members (id, group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('gm-active-1', 'group-active-a', 'team-active-1', 3, 1, 1, 0, 21, 18),
  ('gm-active-2', 'group-active-a', 'team-active-2', 1, 1, 0, 1, 18, 21),
  ('gm-active-3', 'group-active-b', 'team-active-3', 0, 0, 0, 0, 0, 0),
  ('gm-active-4', 'group-active-b', 'team-active-4', 0, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matches (
  id, tournament_id, group_id, stage, round_number,
  home_team_id, away_team_id, home_score, away_score, winner_id,
  status, duration_minutes, started_at
) VALUES
  ('match-active-1', 'tournament-active-1', 'group-active-a', 'group', 1,
   'team-active-1', 'team-active-2', 21, 18, 'team-active-1',
   'in_progress', 20, now()),
  ('match-active-2', 'tournament-active-1', 'group-active-b', 'group', 1,
   'team-active-3', 'team-active-4', NULL, NULL, NULL,
   'pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matches (
  id, tournament_id, group_id, stage, round_number,
  home_team_id, away_team_id, home_score, away_score, winner_id,
  status, completed_at
) VALUES
  ('match-completed-final', 'tournament-completed-1', NULL, 'final', 1,
   'team-completed-1', 'team-completed-2', 62, 55, 'team-completed-1',
   'completed', now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.tournaments SET winner_id = 'team-completed-1'
WHERE id = 'tournament-completed-1' AND winner_id IS NULL;

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
  ('snap-10', 'player-10', 'tournament-active-1', 90, 88, 80, 92, 60, 75, 81)
ON CONFLICT (id) DO NOTHING;
