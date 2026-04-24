-- Demo seed: tournaments.
-- Business rule "only one active tournament at a time" → exactly ONE in a
-- non-completed state + several 'completed' with different bracket styles.
--
-- t-draft-now: 6 teams, mid-draft (round 1, 3 picks done). Default 3x3.
-- t-past-8:    8 teams, full quarters→semis→final bracket. Completed.
-- t-past-6:    6 teams, 2 groups of 3 → semis + final + 3rd place. Completed.
-- t-past-4:    4 teams, 1 round-robin group → direct final + 3rd place. Completed.

INSERT INTO public.tournaments (
  id, name, date, status, location, description, rules, max_teams,
  inscription_start, inscription_end, draft_start, draft_end, match_date,
  court_count, half_court, game_duration_minutes, hours_confirmed, team_size
) VALUES
  -- 1) Currently mid-draft
  ('t-draft-now', 'Liga Primavera 2026',
   (CURRENT_DATE + INTERVAL '7 days')::text, 'draft',
   'Polideportivo Norte, Villena',
   'Draft en vivo — los capitanes están eligiendo plantilla',
   E'Formato 3x3 Media Cancha\nPartidos de 20 minutos\n2 partidos simultáneos\nReglas FIBA 3x3 adaptadas',
   6,
   CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '2 days',
   CURRENT_DATE - INTERVAL '1 day',   CURRENT_DATE + INTERVAL '1 day',
   CURRENT_DATE + INTERVAL '7 days',
   1, true, 20, false, 3),

  -- 2) Completed — full 8-team bracket (quarters → semis → final)
  ('t-past-8', 'Copa Invierno 2026',
   '2026-02-20', 'completed',
   'Pabellon Sur, Villena',
   'Torneo de invierno con 8 equipos — cuartos, semis y final',
   E'Formato 3x3\nFase de grupos + cuartos de final\nReglas FIBA 3x3', 8,
   '2025-12-01', '2026-01-31', '2026-02-01', '2026-02-19', '2026-02-20',
   2, true, 20, true, 3),

  -- 3) Completed — 6 teams, 2 groups of 3 → semis + 3rd place + final
  ('t-past-6', 'Torneo Navidad 2025',
   '2025-12-22', 'completed',
   'Pabellon Centro, Villena',
   'Torneo navideño — dos grupos clasificaron a semis',
   E'Formato 3x3\nDos grupos + eliminatoria directa\nReglas FIBA 3x3', 6,
   '2025-11-01', '2025-12-15', '2025-12-16', '2025-12-21', '2025-12-22',
   1, true, 20, true, 3),

  -- 4) Completed — 4 teams, 1 round-robin group → direct final + 3rd place
  ('t-past-4', 'Copa Verano 2025',
   '2025-07-10', 'completed',
   'Pistas Municipales al aire libre',
   'Mini-torneo de 4 equipos todos contra todos + final',
   E'Formato 3x3\nGrupo único + final directa\nReglas FIBA 3x3', 4,
   '2025-05-01', '2025-06-30', '2025-07-01', '2025-07-09', '2025-07-10',
   1, true, 20, true, 3)
ON CONFLICT DO NOTHING;

-- Registrations — many players, all tournaments
INSERT INTO public.tournament_registrations (id, player_id, tournament_id, is_captain, team_name) VALUES
  -- t-draft-now: 18 players (6 captains + 12 regulars). Draft in progress.
  ('reg-d-01','player-01','t-draft-now',true,'Los Halcones'),
  ('reg-d-02','player-02','t-draft-now',true,'Los Dragones'),
  ('reg-d-03','player-03','t-draft-now',true,'Los Titanes'),
  ('reg-d-04','player-04','t-draft-now',true,'Los Lobos'),
  ('reg-d-05','player-05','t-draft-now',true,'Los Cometas'),
  ('reg-d-06','player-06','t-draft-now',true,'Los Raptors'),
  ('reg-d-07','player-13','t-draft-now',false,null),
  ('reg-d-08','player-14','t-draft-now',false,null),
  ('reg-d-09','player-15','t-draft-now',false,null),
  ('reg-d-10','player-16','t-draft-now',false,null),
  ('reg-d-11','player-17','t-draft-now',false,null),
  ('reg-d-12','player-18','t-draft-now',false,null),
  ('reg-d-13','player-19','t-draft-now',false,null),
  ('reg-d-14','player-20','t-draft-now',false,null),
  ('reg-d-15','player-21','t-draft-now',false,null),
  ('reg-d-16','player-22','t-draft-now',false,null),
  ('reg-d-17','player-23','t-draft-now',false,null),
  ('reg-d-18','player-24','t-draft-now',false,null),

  -- t-past-8: 24 players (8 captains + 16 regulars), all drafted
  ('reg-8-01','player-01','t-past-8',true,'Los Halcones'),
  ('reg-8-02','player-02','t-past-8',true,'Los Dragones'),
  ('reg-8-03','player-03','t-past-8',true,'Los Titanes'),
  ('reg-8-04','player-07','t-past-8',true,'Los Fenix'),
  ('reg-8-05','player-08','t-past-8',true,'Los Pumas'),
  ('reg-8-06','player-09','t-past-8',true,'Los Truenos'),
  ('reg-8-07','player-10','t-past-8',true,'Los Cometas'),
  ('reg-8-08','player-12','t-past-8',true,'Los Tiburones'),
  ('reg-8-09','player-13','t-past-8',false,null),
  ('reg-8-10','player-14','t-past-8',false,null),
  ('reg-8-11','player-15','t-past-8',false,null),
  ('reg-8-12','player-16','t-past-8',false,null),
  ('reg-8-13','player-17','t-past-8',false,null),
  ('reg-8-14','player-18','t-past-8',false,null),
  ('reg-8-15','player-25','t-past-8',false,null),
  ('reg-8-16','player-26','t-past-8',false,null),
  ('reg-8-17','player-27','t-past-8',false,null),
  ('reg-8-18','player-28','t-past-8',false,null),
  ('reg-8-19','player-29','t-past-8',false,null),
  ('reg-8-20','player-30','t-past-8',false,null),
  ('reg-8-21','player-31','t-past-8',false,null),
  ('reg-8-22','player-32','t-past-8',false,null),
  ('reg-8-23','player-33','t-past-8',false,null),
  ('reg-8-24','player-34','t-past-8',false,null),

  -- t-past-6: 18 players (6 captains + 12 regulars)
  ('reg-6-01','player-04','t-past-6',true,'Los Lobos'),
  ('reg-6-02','player-05','t-past-6',true,'Los Titanes'),
  ('reg-6-03','player-06','t-past-6',true,'Los Raptors'),
  ('reg-6-04','player-11','t-past-6',true,'Los Gigantes'),
  ('reg-6-05','player-10','t-past-6',true,'Los Cometas'),
  ('reg-6-06','player-12','t-past-6',true,'Los Tiburones'),
  ('reg-6-07','player-19','t-past-6',false,null),
  ('reg-6-08','player-20','t-past-6',false,null),
  ('reg-6-09','player-21','t-past-6',false,null),
  ('reg-6-10','player-22','t-past-6',false,null),
  ('reg-6-11','player-23','t-past-6',false,null),
  ('reg-6-12','player-24','t-past-6',false,null),
  ('reg-6-13','player-35','t-past-6',false,null),
  ('reg-6-14','player-36','t-past-6',false,null),
  ('reg-6-15','player-37','t-past-6',false,null),
  ('reg-6-16','player-38','t-past-6',false,null),
  ('reg-6-17','player-39','t-past-6',false,null),
  ('reg-6-18','player-40','t-past-6',false,null),

  -- t-past-4: 12 players (4 captains + 8 regulars)
  ('reg-4-01','player-01','t-past-4',true,'Los Halcones'),
  ('reg-4-02','player-02','t-past-4',true,'Los Dragones'),
  ('reg-4-03','player-06','t-past-4',true,'Los Raptors'),
  ('reg-4-04','player-08','t-past-4',true,'Los Pumas'),
  ('reg-4-05','player-13','t-past-4',false,null),
  ('reg-4-06','player-14','t-past-4',false,null),
  ('reg-4-07','player-15','t-past-4',false,null),
  ('reg-4-08','player-16','t-past-4',false,null),
  ('reg-4-09','player-25','t-past-4',false,null),
  ('reg-4-10','player-26','t-past-4',false,null),
  ('reg-4-11','player-27','t-past-4',false,null),
  ('reg-4-12','player-28','t-past-4',false,null)
ON CONFLICT DO NOTHING;
