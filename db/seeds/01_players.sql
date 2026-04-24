-- Demo seed: players.
-- 3 admins (username login) + 40 players (mobile login).
-- All use password '123123123' for easy testing.
-- Captains (12) have role='captain'; the remaining 28 are role='player'.

INSERT INTO public.players (
  id, name, mobile, username, email, role, password, is_public, position,
  age, gdpr_accepted, gdpr_accepted_at,
  pace, shooting, passing, dribbling, defense, physical, overall
) VALUES
  -- Admins (login: username + password)
  ('admin-1', 'Administrador base1', '700000001', 'base1', 'base1@villena.test', 'admin',   '123123123', false, 'base',    null, false, null, 50, 50, 50, 50, 50, 50, 50),
  ('admin-2', 'Administrador base2', '700000002', 'base2', 'base2@villena.test', 'admin',   '123123123', false, 'base',    null, false, null, 50, 50, 50, 50, 50, 50, 50),
  ('admin-3', 'Administrador base3', '700000003', 'base3', 'base3@villena.test', 'admin',   '123123123', false, 'base',    null, false, null, 50, 50, 50, 50, 50, 50, 50),

  -- Captains (12) — role='captain'
  ('player-01', 'Lucas Gil',       '600000001', 'lucasg',   'lucas@villena.test',  'captain', '123123123', true,  'base',       28, true, now() - interval '40 days', 85, 78, 74, 82, 68, 76, 77),
  ('player-02', 'Mario Ruiz',      '600000002', 'marior',   'mario@villena.test',  'captain', '123123123', true,  'escolta',    30, true, now() - interval '40 days', 76, 85, 70, 74, 65, 72, 74),
  ('player-03', 'Sergio Diaz',     '600000003', 'sergiod',  'sergio@villena.test', 'captain', '123123123', false, 'alero',      27, true, now() - interval '40 days', 70, 66, 82, 72, 78, 80, 75),
  ('player-04', 'Dario Navarro',   '600000004', 'darion',   'dario@villena.test',  'captain', '123123123', true,  'ala-pivot',  32, true, now() - interval '40 days', 66, 74, 72, 70, 82, 84, 75),
  ('player-05', 'Manuel Torres',   '600000005', 'manuelt',  'manuel@villena.test', 'captain', '123123123', true,  'pivot',      29, true, now() - interval '40 days', 58, 64, 68, 62, 80, 88, 70),
  ('player-06', 'Alex Vidal',      '600000006', 'alexv',    'alex@villena.test',   'captain', '123123123', false, 'base',       26, true, now() - interval '40 days', 88, 72, 80, 86, 60, 70, 76),
  ('player-07', 'Nicolas Pons',    '600000007', 'nicop',    'nico@villena.test',   'captain', '123123123', false, 'escolta',    25, true, now() - interval '60 days', 72, 88, 74, 70, 64, 68, 73),
  ('player-08', 'Ivan Molina',     '600000008', 'ivanm',    'ivan@villena.test',   'captain', '123123123', true,  'alero',      31, true, now() - interval '60 days', 74, 72, 78, 74, 76, 80, 76),
  ('player-09', 'Rafa Gomez',      '600000009', 'rafag',    'rafa@villena.test',   'captain', '123123123', false, 'ala-pivot',  28, true, now() - interval '60 days', 68, 70, 68, 66, 78, 82, 72),
  ('player-10', 'Victor Luna',     '600000010', 'victorl',  'victor@villena.test', 'captain', '123123123', true,  'base',       27, true, now() - interval '80 days', 90, 88, 80, 92, 60, 75, 81),
  ('player-11', 'Bruno Castro',    '600000011', 'brunoc',   'bruno@villena.test',  'captain', '123123123', false, 'pivot',      33, true, now() - interval '80 days', 56, 60, 66, 58, 82, 90, 69),
  ('player-12', 'Carlos Reyes',    '600000012', 'carlosr',  'carlos@villena.test', 'captain', '123123123', true,  'escolta',    24, true, now() - interval '80 days', 80, 82, 76, 78, 68, 72, 76),

  -- Regular players (28) — role='player'
  ('player-13', 'Adrian Lopez',    '600000013', 'adrianl',  'adrian@villena.test', 'player',  '123123123', true,  'base',       23, true, now() - interval '30 days', 88, 60, 64, 86, 55, 70, 71),
  ('player-14', 'Iker Mora',       '600000014', 'ikerm',    'iker.m@villena.test', 'player',  '123123123', false, 'escolta',    22, true, now() - interval '30 days', 64, 90, 72, 68, 62, 70, 71),
  ('player-15', 'Pablo Cruz',      '600000015', 'pabloc',   'pablo.c@villena.test','player',  '123123123', false, 'alero',      29, true, now() - interval '30 days', 73, 72, 70, 69, 74, 78, 73),
  ('player-16', 'Hugo Sanz',       '600000016', 'hugos',    'hugo.s@villena.test', 'player',  '123123123', false, 'ala-pivot',  26, true, now() - interval '30 days', 66, 62, 70, 64, 82, 84, 71),
  ('player-17', 'Nico Rojas',      '600000017', 'nicor',    'nico.r@villena.test', 'player',  '123123123', true,  'alero',      28, true, now() - interval '30 days', 80, 76, 79, 75, 60, 68, 73),
  ('player-18', 'Daniel Vega',     '600000018', 'danielv',  'daniel@villena.test', 'player',  '123123123', false, 'pivot',      31, true, now() - interval '30 days', 58, 60, 65, 62, 70, 72, 65),
  ('player-19', 'Raul Soto',       '600000019', 'rauls',    'raul@villena.test',   'player',  '123123123', false, 'escolta',    25, true, now() - interval '50 days', 62, 68, 60, 58, 66, 64, 63),
  ('player-20', 'Javi Costa',      '600000020', 'javic',    'javi@villena.test',   'player',  '123123123', false, 'ala-pivot',  27, true, now() - interval '50 days', 74, 70, 68, 76, 72, 70, 72),
  ('player-21', 'Marcos Parra',    '600000021', 'marcosp',  'marcos@villena.test', 'player',  '123123123', true,  'base',       24, true, now() - interval '50 days', 82, 68, 72, 80, 60, 68, 72),
  ('player-22', 'Joan Esteve',     '600000022', 'joane',    'joan@villena.test',   'player',  '123123123', false, 'escolta',    22, true, now() - interval '50 days', 70, 84, 66, 72, 60, 66, 70),
  ('player-23', 'David Bernal',    '600000023', 'davidb',   'david@villena.test',  'player',  '123123123', true,  'alero',      26, true, now() - interval '50 days', 72, 74, 74, 72, 70, 72, 72),
  ('player-24', 'Toni Lara',       '600000024', 'tonil',    'toni@villena.test',   'player',  '123123123', false, 'pivot',      30, true, now() - interval '70 days', 55, 58, 60, 55, 80, 86, 66),
  ('player-25', 'Samuel Peris',    '600000025', 'samuelp',  'samuel@villena.test', 'player',  '123123123', true,  'base',       25, true, now() - interval '70 days', 86, 70, 75, 82, 58, 70, 73),
  ('player-26', 'Marc Ibanez',     '600000026', 'marci',    'marc@villena.test',   'player',  '123123123', false, 'escolta',    23, true, now() - interval '70 days', 68, 86, 70, 66, 62, 68, 70),
  ('player-27', 'Pedro Campos',    '600000027', 'pedroc',   'pedro@villena.test',  'player',  '123123123', false, 'alero',      29, true, now() - interval '70 days', 74, 70, 72, 70, 74, 76, 73),
  ('player-28', 'Jaume Serra',     '600000028', 'jaumes',   'jaume@villena.test',  'player',  '123123123', false, 'ala-pivot',  31, true, now() - interval '70 days', 64, 68, 66, 62, 80, 82, 70),
  ('player-29', 'Xavi Mena',       '600000029', 'xavim',    'xavi@villena.test',   'player',  '123123123', true,  'pivot',      32, true, now() - interval '70 days', 52, 56, 62, 54, 82, 90, 66),
  ('player-30', 'Isaac Pla',       '600000030', 'isaacp',   'isaac@villena.test',  'player',  '123123123', true,  'base',       26, true, now() - interval '90 days', 78, 66, 70, 76, 62, 68, 70),
  ('player-31', 'Oscar Ribes',     '600000031', 'oscarr',   'oscar@villena.test',  'player',  '123123123', false, 'escolta',    27, true, now() - interval '90 days', 66, 80, 68, 64, 64, 70, 69),
  ('player-32', 'Pau Marti',       '600000032', 'paum',     'pau@villena.test',    'player',  '123123123', true,  'alero',      28, true, now() - interval '90 days', 72, 74, 72, 70, 72, 76, 73),
  ('player-33', 'Eric Fuentes',    '600000033', 'ericf',    'eric@villena.test',   'player',  '123123123', false, 'ala-pivot',  24, true, now() - interval '90 days', 70, 72, 68, 68, 76, 80, 72),
  ('player-34', 'Dani Miro',       '600000034', 'danim',    'dani@villena.test',   'player',  '123123123', false, 'pivot',      29, true, now() - interval '90 days', 54, 58, 64, 56, 80, 88, 67),
  ('player-35', 'Guillem Roig',    '600000035', 'guillemr', 'guillem@villena.test','player',  '123123123', true,  'base',       23, true, now() - interval '110 days', 84, 68, 72, 82, 60, 70, 73),
  ('player-36', 'Jose Salom',      '600000036', 'joses',    'jose@villena.test',   'player',  '123123123', false, 'escolta',    26, true, now() - interval '110 days', 68, 82, 72, 66, 64, 68, 70),
  ('player-37', 'Aitor Palau',     '600000037', 'aitorp',   'aitor@villena.test',  'player',  '123123123', false, 'alero',      25, true, now() - interval '110 days', 72, 72, 76, 70, 70, 74, 72),
  ('player-38', 'Sergi Verdu',     '600000038', 'sergiv',   'sergi@villena.test',  'player',  '123123123', true,  'ala-pivot',  28, true, now() - interval '110 days', 66, 66, 68, 64, 78, 82, 70),
  ('player-39', 'Miquel Grau',     '600000039', 'miquelg',  'miquel@villena.test', 'player',  '123123123', false, 'pivot',      31, true, now() - interval '110 days', 50, 54, 60, 52, 80, 90, 64),
  ('player-40', 'Saul Cano',       '600000040', 'saulc',    'saul@villena.test',   'player',  '123123123', true,  'base',       22, true, now() - interval '110 days', 86, 72, 76, 84, 58, 68, 74)
ON CONFLICT DO NOTHING;
