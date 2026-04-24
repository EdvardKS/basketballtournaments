-- Seed: players (admins, captains, regular players). Idempotent via ON CONFLICT
INSERT INTO public.players (
  id, name, mobile, username, email, role, password, is_public, position,
  pace, shooting, passing, dribbling, defense, physical, overall
) VALUES
  ('admin-1', 'Administrador base1', '700000001', 'base1', 'base1@villena.test', 'admin', '123123123', false, 'base', 50, 50, 50, 50, 50, 50, 50),
  ('admin-2', 'Administrador base2', '700000002', 'base2', 'base2@villena.test', 'admin', '123123123', false, 'base', 50, 50, 50, 50, 50, 50, 50),
  ('admin-3', 'Administrador base3', '700000003', 'base3', 'base3@villena.test', 'admin', '123123123', false, 'base', 50, 50, 50, 50, 50, 50, 50),
  ('player-01', 'Lucas Gil', '600000001', 'lucasg', 'lucas@villena.test', 'captain', '123123123', true, 'base', 85, 78, 74, 82, 68, 76, 77),
  ('player-02', 'Mario Ruiz', '600000002', 'marior', 'mario@villena.test', 'captain', '123123123', true, 'escolta', 76, 85, 70, 74, 65, 72, 74),
  ('player-03', 'Sergio Diaz', '600000003', 'sergiod', 'sergio@villena.test', 'captain', '123123123', false, 'alero', 70, 66, 82, 72, 78, 80, 75),
  ('player-04', 'Adrian Lopez', '600000004', 'adrianl', 'adrian@villena.test', 'player', '123123123', true, 'base', 88, 60, 64, 86, 55, 70, 71),
  ('player-05', 'Iker Mora', '600000005', 'ikerm', 'iker@villena.test', 'player', '123123123', false, 'escolta', 64, 90, 72, 68, 62, 70, 71),
  ('player-06', 'Pablo Cruz', '600000006', 'pabloc', 'pablo@villena.test', 'player', '123123123', false, 'alero', 73, 72, 70, 69, 74, 78, 73),
  ('player-07', 'Hugo Sanz', '600000007', 'hugos', 'hugo@villena.test', 'player', '123123123', false, 'ala-pivot', 66, 62, 70, 64, 82, 84, 71),
  ('player-08', 'Nico Rojas', '600000008', 'nicor', 'nico@villena.test', 'player', '123123123', true, 'alero', 80, 76, 79, 75, 60, 68, 73),
  ('player-09', 'Daniel Vega', '600000009', 'danielv', 'daniel@villena.test', 'player', '123123123', false, 'pivot', 58, 60, 65, 62, 70, 72, 65),
  ('player-10', 'Victor Luna', '600000010', 'victorl', 'victor@villena.test', 'player', '123123123', true, 'base', 90, 88, 80, 92, 60, 75, 81),
  ('player-11', 'Raul Soto', '600000011', 'rauls', 'raul@villena.test', 'player', '123123123', false, 'escolta', 62, 68, 60, 58, 66, 64, 63),
  ('player-12', 'Javi Costa', '600000012', 'javic', 'javi@villena.test', 'player', '123123123', false, 'ala-pivot', 74, 70, 68, 76, 72, 70, 72)
ON CONFLICT (id) DO NOTHING;
