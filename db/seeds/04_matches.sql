-- Demo seed: groups, group_members (standings), matches (group + knockout).
-- Three completed tournaments with different bracket styles:
--   t-past-8: 2 groups of 4 → 4-team bracket (semis + 3rd + final)
--   t-past-6: 2 groups of 3 → 4-team bracket (semis + 3rd + final)
--   t-past-4: 1 group of 4 (round-robin) → 4-team bracket
--
-- All matches are completed with realistic 3x3 FIBA-style scores (15–25 range).
-- Group standings are computed by hand to match the listed match outcomes.

-- ============================================================
-- t-past-8: 8 teams, 2 groups of 4
-- ============================================================

INSERT INTO public.tournament_groups (id, tournament_id, name) VALUES
  ('g8-a', 't-past-8', 'Grupo A'),
  ('g8-b', 't-past-8', 'Grupo B')
ON CONFLICT (id) DO NOTHING;

-- Group A: team-1, team-2, team-3, team-4
-- Match results (G=games, W=wins, L=loss, PF=points for, PC=points against, pts):
--   t8-team-1: W vs t2 (21-15), W vs t3 (22-19), W vs t4 (19-17) → 3W 0L 62/51 = 6pts
--   t8-team-3: L vs t1 (19-22), W vs t2 (21-18), W vs t4 (20-16) → 2W 1L 60/56 = 4pts
--   t8-team-2: L vs t1 (15-21), L vs t3 (18-21), W vs t4 (21-18) → 1W 2L 54/60 = 2pts
--   t8-team-4: L vs t1 (17-19), L vs t3 (16-20), L vs t2 (18-21) → 0W 3L 51/60 = 0pts
INSERT INTO public.group_members (group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('g8-a', 't8-team-1', 6, 3, 3, 0, 62, 51),
  ('g8-a', 't8-team-3', 4, 3, 2, 1, 60, 56),
  ('g8-a', 't8-team-2', 2, 3, 1, 2, 54, 60),
  ('g8-a', 't8-team-4', 0, 3, 0, 3, 51, 60)
ON CONFLICT DO NOTHING;

-- Group B: team-5, team-6, team-7, team-8
--   t8-team-5: W vs t6 (24-18), W vs t7 (21-20), W vs t8 (19-15) → 3W 0L 64/53 = 6pts
--   t8-team-8: W vs t5 (but we said t5 won, so flip) - let me redo:
--   Let me make: 5 wins all 3, 8 wins 2, 7 wins 1, 6 wins 0
--   t8-team-5: W vs t6 (24-18), W vs t7 (21-20), W vs t8 (22-19) → 3W 0L 67/57 = 6pts
--   t8-team-8: L vs t5 (19-22), W vs t6 (20-17), W vs t7 (18-15) → 2W 1L 57/54 = 4pts
--   t8-team-7: L vs t5 (20-21), L vs t8 (15-18), W vs t6 (21-19) → 1W 2L 56/58 = 2pts
--   t8-team-6: L vs t5 (18-24), L vs t8 (17-20), L vs t7 (19-21) → 0W 3L 54/65 = 0pts
INSERT INTO public.group_members (group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('g8-b', 't8-team-5', 6, 3, 3, 0, 67, 57),
  ('g8-b', 't8-team-8', 4, 3, 2, 1, 57, 54),
  ('g8-b', 't8-team-7', 2, 3, 1, 2, 56, 58),
  ('g8-b', 't8-team-6', 0, 3, 0, 3, 54, 65)
ON CONFLICT DO NOTHING;

-- Group matches (12 total), all completed
INSERT INTO public.matches (id, tournament_id, group_id, stage, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m8-ga-1','t-past-8','g8-a','group','t8-team-1','t8-team-2',21,15,'t8-team-1','completed','2026-02-20 09:00'::timestamp, '2026-02-20 09:02'::timestamp, '2026-02-20 09:22'::timestamp),
  ('m8-ga-2','t-past-8','g8-a','group','t8-team-3','t8-team-4',20,16,'t8-team-3','completed','2026-02-20 09:00'::timestamp, '2026-02-20 09:02'::timestamp, '2026-02-20 09:22'::timestamp),
  ('m8-ga-3','t-past-8','g8-a','group','t8-team-1','t8-team-3',22,19,'t8-team-1','completed','2026-02-20 09:25'::timestamp, '2026-02-20 09:27'::timestamp, '2026-02-20 09:47'::timestamp),
  ('m8-ga-4','t-past-8','g8-a','group','t8-team-2','t8-team-4',21,18,'t8-team-2','completed','2026-02-20 09:25'::timestamp, '2026-02-20 09:27'::timestamp, '2026-02-20 09:47'::timestamp),
  ('m8-ga-5','t-past-8','g8-a','group','t8-team-1','t8-team-4',19,17,'t8-team-1','completed','2026-02-20 09:50'::timestamp, '2026-02-20 09:52'::timestamp, '2026-02-20 10:12'::timestamp),
  ('m8-ga-6','t-past-8','g8-a','group','t8-team-2','t8-team-3',18,21,'t8-team-3','completed','2026-02-20 09:50'::timestamp, '2026-02-20 09:52'::timestamp, '2026-02-20 10:12'::timestamp),
  ('m8-gb-1','t-past-8','g8-b','group','t8-team-5','t8-team-6',24,18,'t8-team-5','completed','2026-02-20 10:15'::timestamp, '2026-02-20 10:17'::timestamp, '2026-02-20 10:37'::timestamp),
  ('m8-gb-2','t-past-8','g8-b','group','t8-team-7','t8-team-8',15,18,'t8-team-8','completed','2026-02-20 10:15'::timestamp, '2026-02-20 10:17'::timestamp, '2026-02-20 10:37'::timestamp),
  ('m8-gb-3','t-past-8','g8-b','group','t8-team-5','t8-team-7',21,20,'t8-team-5','completed','2026-02-20 10:40'::timestamp, '2026-02-20 10:42'::timestamp, '2026-02-20 11:02'::timestamp),
  ('m8-gb-4','t-past-8','g8-b','group','t8-team-6','t8-team-8',17,20,'t8-team-8','completed','2026-02-20 10:40'::timestamp, '2026-02-20 10:42'::timestamp, '2026-02-20 11:02'::timestamp),
  ('m8-gb-5','t-past-8','g8-b','group','t8-team-5','t8-team-8',22,19,'t8-team-5','completed','2026-02-20 11:05'::timestamp, '2026-02-20 11:07'::timestamp, '2026-02-20 11:27'::timestamp),
  ('m8-gb-6','t-past-8','g8-b','group','t8-team-6','t8-team-7',19,21,'t8-team-7','completed','2026-02-20 11:05'::timestamp, '2026-02-20 11:07'::timestamp, '2026-02-20 11:27'::timestamp)
ON CONFLICT (id) DO NOTHING;

-- Knockout: top 2 per group → semis (4 teams). Winners to final, losers to 3rd place.
-- Semis: t1 (A1) vs t8 (B2); t5 (B1) vs t3 (A2)
-- t1 beats t8 (20-18); t5 beats t3 (22-19)
-- Final: t1 vs t5 → t1 wins (21-19); 3rd place: t8 vs t3 → t8 wins (19-17)
INSERT INTO public.matches (id, tournament_id, stage, round_number, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m8-sf-1', 't-past-8','semifinal',1,'t8-team-1','t8-team-8',20,18,'t8-team-1','completed','2026-02-20 12:00'::timestamp, '2026-02-20 12:02'::timestamp, '2026-02-20 12:25'::timestamp),
  ('m8-sf-2', 't-past-8','semifinal',2,'t8-team-5','t8-team-3',22,19,'t8-team-5','completed','2026-02-20 12:00'::timestamp, '2026-02-20 12:02'::timestamp, '2026-02-20 12:25'::timestamp),
  ('m8-3rd',  't-past-8','third_place',1,'t8-team-8','t8-team-3',19,17,'t8-team-8','completed','2026-02-20 13:00'::timestamp, '2026-02-20 13:02'::timestamp, '2026-02-20 13:25'::timestamp),
  ('m8-fin',  't-past-8','final',1,'t8-team-1','t8-team-5',21,19,'t8-team-1','completed','2026-02-20 13:30'::timestamp, '2026-02-20 13:32'::timestamp, '2026-02-20 13:55'::timestamp)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- t-past-6: 6 teams, 2 groups of 3
-- ============================================================

INSERT INTO public.tournament_groups (id, tournament_id, name) VALUES
  ('g6-a', 't-past-6', 'Grupo A'),
  ('g6-b', 't-past-6', 'Grupo B')
ON CONFLICT (id) DO NOTHING;

-- Group A: team-1 (Lobos), team-2 (Titanes), team-3 (Raptors)
--   t6-team-4 NOT here. Group A = t6-team-1, t6-team-2, t6-team-3.
--   t6-team-1: W vs t2 (21-18), W vs t3 (20-17) → 4pts
--   t6-team-3: L vs t1 (17-20), W vs t2 (19-16) → 2pts
--   t6-team-2: L vs t1 (18-21), L vs t3 (16-19) → 0pts
INSERT INTO public.group_members (group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('g6-a', 't6-team-1', 4, 2, 2, 0, 41, 35),
  ('g6-a', 't6-team-3', 2, 2, 1, 1, 36, 36),
  ('g6-a', 't6-team-2', 0, 2, 0, 2, 34, 40)
ON CONFLICT DO NOTHING;

-- Group B: team-4 (Cometas), team-5 (Gigantes), team-6 (Tiburones)
--   t6-team-4: W vs t5 (22-18), W vs t6 (23-20) → 4pts  ← champion
--   t6-team-6: L vs t4 (20-23), W vs t5 (21-19) → 2pts
--   t6-team-5: L vs t4 (18-22), L vs t6 (19-21) → 0pts
INSERT INTO public.group_members (group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('g6-b', 't6-team-4', 4, 2, 2, 0, 45, 38),
  ('g6-b', 't6-team-6', 2, 2, 1, 1, 41, 42),
  ('g6-b', 't6-team-5', 0, 2, 0, 2, 37, 43)
ON CONFLICT DO NOTHING;

-- Group matches (6 total)
INSERT INTO public.matches (id, tournament_id, group_id, stage, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m6-ga-1','t-past-6','g6-a','group','t6-team-1','t6-team-2',21,18,'t6-team-1','completed','2025-12-22 09:00'::timestamp, '2025-12-22 09:02'::timestamp, '2025-12-22 09:22'::timestamp),
  ('m6-ga-2','t-past-6','g6-a','group','t6-team-2','t6-team-3',16,19,'t6-team-3','completed','2025-12-22 09:25'::timestamp, '2025-12-22 09:27'::timestamp, '2025-12-22 09:47'::timestamp),
  ('m6-ga-3','t-past-6','g6-a','group','t6-team-1','t6-team-3',20,17,'t6-team-1','completed','2025-12-22 09:50'::timestamp, '2025-12-22 09:52'::timestamp, '2025-12-22 10:12'::timestamp),
  ('m6-gb-1','t-past-6','g6-b','group','t6-team-4','t6-team-5',22,18,'t6-team-4','completed','2025-12-22 10:15'::timestamp, '2025-12-22 10:17'::timestamp, '2025-12-22 10:37'::timestamp),
  ('m6-gb-2','t-past-6','g6-b','group','t6-team-5','t6-team-6',19,21,'t6-team-6','completed','2025-12-22 10:40'::timestamp, '2025-12-22 10:42'::timestamp, '2025-12-22 11:02'::timestamp),
  ('m6-gb-3','t-past-6','g6-b','group','t6-team-4','t6-team-6',23,20,'t6-team-4','completed','2025-12-22 11:05'::timestamp, '2025-12-22 11:07'::timestamp, '2025-12-22 11:27'::timestamp)
ON CONFLICT (id) DO NOTHING;

-- Knockout: top 2 per group = 4 teams (t1, t3, t4, t6)
-- Semis: t1 (A1) vs t6 (B2); t4 (B1) vs t3 (A2)
--   t4 beats t3 (22-16); t6 beats t1 (21-20 upset!)
-- 3rd: t1 vs t3 → t1 wins (23-19)
-- Final: t4 vs t6 → t4 wins (24-21) → Cometas champion
INSERT INTO public.matches (id, tournament_id, stage, round_number, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m6-sf-1', 't-past-6','semifinal',1,'t6-team-1','t6-team-6',20,21,'t6-team-6','completed','2025-12-22 12:00'::timestamp, '2025-12-22 12:02'::timestamp, '2025-12-22 12:25'::timestamp),
  ('m6-sf-2', 't-past-6','semifinal',2,'t6-team-4','t6-team-3',22,16,'t6-team-4','completed','2025-12-22 12:00'::timestamp, '2025-12-22 12:02'::timestamp, '2025-12-22 12:25'::timestamp),
  ('m6-3rd',  't-past-6','third_place',1,'t6-team-1','t6-team-3',23,19,'t6-team-1','completed','2025-12-22 13:00'::timestamp, '2025-12-22 13:02'::timestamp, '2025-12-22 13:25'::timestamp),
  ('m6-fin',  't-past-6','final',1,'t6-team-4','t6-team-6',24,21,'t6-team-4','completed','2025-12-22 13:30'::timestamp, '2025-12-22 13:32'::timestamp, '2025-12-22 13:55'::timestamp)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- t-past-4: 4 teams, 1 group, round-robin + 4-team bracket
-- ============================================================

INSERT INTO public.tournament_groups (id, tournament_id, name) VALUES
  ('g4-a', 't-past-4', 'Grupo Único')
ON CONFLICT (id) DO NOTHING;

-- All 4 teams round-robin (6 matches):
--   t4-team-2: W vs t1 (21-18), W vs t3 (22-19), W vs t4 (20-17) → 3W 0L = 6pts, 63/54 ← champion
--   t4-team-1: L vs t2 (18-21), W vs t3 (19-16), W vs t4 (20-18) → 2W 1L = 4pts, 57/55
--   t4-team-3: L vs t2 (19-22), L vs t1 (16-19), W vs t4 (21-19) → 1W 2L = 2pts, 56/60
--   t4-team-4: L vs t2 (17-20), L vs t1 (18-20), L vs t3 (19-21) → 0W 3L = 0pts, 54/61
INSERT INTO public.group_members (group_id, team_id, points, games_played, games_won, games_lost, points_for, points_against) VALUES
  ('g4-a', 't4-team-2', 6, 3, 3, 0, 63, 54),
  ('g4-a', 't4-team-1', 4, 3, 2, 1, 57, 55),
  ('g4-a', 't4-team-3', 2, 3, 1, 2, 56, 60),
  ('g4-a', 't4-team-4', 0, 3, 0, 3, 54, 61)
ON CONFLICT DO NOTHING;

-- Group matches (6 total)
INSERT INTO public.matches (id, tournament_id, group_id, stage, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m4-g-1','t-past-4','g4-a','group','t4-team-2','t4-team-1',21,18,'t4-team-2','completed','2025-07-10 09:00'::timestamp, '2025-07-10 09:02'::timestamp, '2025-07-10 09:22'::timestamp),
  ('m4-g-2','t-past-4','g4-a','group','t4-team-3','t4-team-4',21,19,'t4-team-3','completed','2025-07-10 09:00'::timestamp, '2025-07-10 09:02'::timestamp, '2025-07-10 09:22'::timestamp),
  ('m4-g-3','t-past-4','g4-a','group','t4-team-2','t4-team-3',22,19,'t4-team-2','completed','2025-07-10 09:25'::timestamp, '2025-07-10 09:27'::timestamp, '2025-07-10 09:47'::timestamp),
  ('m4-g-4','t-past-4','g4-a','group','t4-team-1','t4-team-4',20,18,'t4-team-1','completed','2025-07-10 09:25'::timestamp, '2025-07-10 09:27'::timestamp, '2025-07-10 09:47'::timestamp),
  ('m4-g-5','t-past-4','g4-a','group','t4-team-2','t4-team-4',20,17,'t4-team-2','completed','2025-07-10 09:50'::timestamp, '2025-07-10 09:52'::timestamp, '2025-07-10 10:12'::timestamp),
  ('m4-g-6','t-past-4','g4-a','group','t4-team-1','t4-team-3',19,16,'t4-team-1','completed','2025-07-10 09:50'::timestamp, '2025-07-10 09:52'::timestamp, '2025-07-10 10:12'::timestamp)
ON CONFLICT (id) DO NOTHING;

-- Knockout: 4 teams (all advance since 1 group) → semis + final + 3rd
-- Semis: #1 (t2) vs #4 (t4); #2 (t1) vs #3 (t3)
--   t2 beats t4 (24-16); t1 beats t3 (20-18)
-- Final: t2 vs t1 → t2 wins (23-19) → Dragones champion
-- 3rd: t4 vs t3 → t3 wins (19-17)
INSERT INTO public.matches (id, tournament_id, stage, round_number, home_team_id, away_team_id, home_score, away_score, winner_id, status, scheduled_at, started_at, completed_at) VALUES
  ('m4-sf-1', 't-past-4','semifinal',1,'t4-team-2','t4-team-4',24,16,'t4-team-2','completed','2025-07-10 12:00'::timestamp, '2025-07-10 12:02'::timestamp, '2025-07-10 12:25'::timestamp),
  ('m4-sf-2', 't-past-4','semifinal',2,'t4-team-1','t4-team-3',20,18,'t4-team-1','completed','2025-07-10 12:00'::timestamp, '2025-07-10 12:02'::timestamp, '2025-07-10 12:25'::timestamp),
  ('m4-3rd',  't-past-4','third_place',1,'t4-team-4','t4-team-3',17,19,'t4-team-3','completed','2025-07-10 13:00'::timestamp, '2025-07-10 13:02'::timestamp, '2025-07-10 13:25'::timestamp),
  ('m4-fin',  't-past-4','final',1,'t4-team-2','t4-team-1',23,19,'t4-team-2','completed','2025-07-10 13:30'::timestamp, '2025-07-10 13:32'::timestamp, '2025-07-10 13:55'::timestamp)
ON CONFLICT (id) DO NOTHING;
