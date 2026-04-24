-- Seed: tournaments. Business rule "sólo un torneo activo a la vez"
-- → exactamente UNO en un estado no 'completed', resto finalizados.
INSERT INTO public.tournaments (id, name, date, status, location, description, rules, max_teams) VALUES
  ('tournament-active-1', 'Liga Otono', '2026-04-15', 'active',
   'Polideportivo Norte', 'Fase de grupos en juego — torneo en vivo',
   E'Formato 5v5 Cancha Completa\nFase de grupos y eliminatorias\nReglas FIBA', 8),

  ('tournament-completed-1', 'Copa Invierno 2026', '2026-02-20', 'completed',
   'Pabellon Sur', 'Torneo de invierno con 8 equipos — ganado por Gladiadores',
   E'Formato 5v5 Cancha Completa\nEliminacion directa\nReglas FIBA', 8),

  ('tournament-completed-2', 'Torneo Navidad 2025', '2025-12-22', 'completed',
   'Pabellon Centro', 'Mini-torneo navideño 3x3 de exhibición',
   E'Formato 3v3 Media Cancha\nRotacion rapida\nReglas FIBA 3x3', 6),

  ('tournament-completed-3', 'Liga Verano 2025', '2025-07-10', 'completed',
   'Pistas Municipales Villena', 'Liga de verano al aire libre — calor y básquet',
   E'Formato 5v5 Cancha Completa\nLiga regular + playoffs\nReglas FIBA', 10),

  ('tournament-completed-4', 'Copa Primavera 2025', '2025-04-05', 'completed',
   'Polideportivo Norte', 'Torneo de primavera con participación récord',
   E'Formato 5v5 Cancha Completa\nEliminacion doble\nReglas FIBA', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tournament_registrations (id, player_id, tournament_id, is_captain, team_name) VALUES
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
  ('reg-completed-6', 'player-12', 'tournament-completed-1', false, NULL)
ON CONFLICT (id) DO NOTHING;
