-- SPEC-013: per-tournament theme palettes.
-- See sdd/specs/spec-013-cromo-por-torneo/data-model.md + themes.md.
--
-- A tournament_themes row represents one slot in a curated catalog (`catalog_index`).
-- A tournament can reference exactly one theme (via tournaments.theme_id), and a
-- theme can be used by exactly one tournament — enforced by the partial unique
-- index on tournaments(theme_id).

CREATE TABLE IF NOT EXISTS public.tournament_themes (
  id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_index INT     NOT NULL UNIQUE,
  palette       JSONB   NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_themes_catalog_index
  ON public.tournament_themes(catalog_index);

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS theme_id VARCHAR NULL
  REFERENCES public.tournament_themes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournaments_theme_id
  ON public.tournaments(theme_id) WHERE theme_id IS NOT NULL;

-- Seed the curated palette catalog (32 entries: fluor / pastel / metallic / mix).
-- Idempotent: ON CONFLICT (catalog_index) DO NOTHING.
INSERT INTO public.tournament_themes (catalog_index, palette) VALUES
  -- Fluor
  (0,  '{"style":"fluor","c1":"#021820","c2":"#00ffe5","c3":"#000a10","glow":"#00ffe5","frame":"#c2fff8","tier_text":"#c2fff8","label":"Fluor Cyan"}'),
  (1,  '{"style":"fluor","c1":"#1a0014","c2":"#ff2bd6","c3":"#0c0009","glow":"#ff2bd6","frame":"#ffd0f4","tier_text":"#ffd0f4","label":"Fluor Magenta"}'),
  (2,  '{"style":"fluor","c1":"#0c1a00","c2":"#b6ff1f","c3":"#050c00","glow":"#b6ff1f","frame":"#e7ffb1","tier_text":"#e7ffb1","label":"Fluor Lime"}'),
  (3,  '{"style":"fluor","c1":"#1f0a00","c2":"#ff7a1a","c3":"#100400","glow":"#ff7a1a","frame":"#ffd6b0","tier_text":"#ffd6b0","label":"Fluor Orange"}'),
  (4,  '{"style":"fluor","c1":"#1e1900","c2":"#ffe600","c3":"#0f0c00","glow":"#ffe600","frame":"#fff7a8","tier_text":"#fff7a8","label":"Fluor Yellow"}'),
  (5,  '{"style":"fluor","c1":"#200008","c2":"#ff1f4a","c3":"#100004","glow":"#ff1f4a","frame":"#ffc2cf","tier_text":"#ffc2cf","label":"Fluor Red"}'),
  (6,  '{"style":"fluor","c1":"#100020","c2":"#9b3aff","c3":"#060010","glow":"#9b3aff","frame":"#d8c0ff","tier_text":"#d8c0ff","label":"Fluor Violet"}'),
  (7,  '{"style":"fluor","c1":"#001a18","c2":"#1affc6","c3":"#000d0c","glow":"#1affc6","frame":"#c0ffe9","tier_text":"#c0ffe9","label":"Fluor Teal"}'),
  -- Pastel
  (8,  '{"style":"pastel","c1":"#1c0e14","c2":"#ffb3c8","c3":"#0d050a","glow":"#ffb3c8","frame":"#ffe1ea","tier_text":"#ffe1ea","label":"Pastel Rose"}'),
  (9,  '{"style":"pastel","c1":"#0c1a14","c2":"#b3ffd4","c3":"#05100c","glow":"#b3ffd4","frame":"#defff0","tier_text":"#defff0","label":"Pastel Mint"}'),
  (10, '{"style":"pastel","c1":"#1a1208","c2":"#ffd2a3","c3":"#100804","glow":"#ffd2a3","frame":"#fff0db","tier_text":"#fff0db","label":"Pastel Peach"}'),
  (11, '{"style":"pastel","c1":"#110a1a","c2":"#d3b3ff","c3":"#07040d","glow":"#d3b3ff","frame":"#ecdcff","tier_text":"#ecdcff","label":"Pastel Lavender"}'),
  (12, '{"style":"pastel","c1":"#07111a","c2":"#a8d8ff","c3":"#03070d","glow":"#a8d8ff","frame":"#d8edff","tier_text":"#d8edff","label":"Pastel Sky"}'),
  (13, '{"style":"pastel","c1":"#1a1808","c2":"#ffe9a3","c3":"#0d0c04","glow":"#ffe9a3","frame":"#fff5cf","tier_text":"#fff5cf","label":"Pastel Butter"}'),
  (14, '{"style":"pastel","c1":"#1a0d08","c2":"#ffaa99","c3":"#0d0604","glow":"#ffaa99","frame":"#ffd9cf","tier_text":"#ffd9cf","label":"Pastel Coral"}'),
  (15, '{"style":"pastel","c1":"#0f1410","c2":"#b8dcb1","c3":"#060a07","glow":"#b8dcb1","frame":"#dceedb","tier_text":"#dceedb","label":"Pastel Sage"}'),
  -- Metallic
  (16, '{"style":"metallic","c1":"#5a4a3a","c2":"#d4a05c","c3":"#1a120c","glow":"#d4a05c","frame":"#f0c987","tier_text":"#f0c987","label":"Metallic Bronze"}'),
  (17, '{"style":"metallic","c1":"#2b3858","c2":"#98abdd","c3":"#0b1224","glow":"#98abdd","frame":"#c6d4ef","tier_text":"#c6d4ef","label":"Metallic Silver"}'),
  (18, '{"style":"metallic","c1":"#5e3f0a","c2":"#ffd34a","c3":"#1a1206","glow":"#ffd34a","frame":"#ffe27a","tier_text":"#ffe27a","label":"Metallic Gold"}'),
  (19, '{"style":"metallic","c1":"#0f4032","c2":"#2af0b1","c3":"#021510","glow":"#2af0b1","frame":"#7df3cb","tier_text":"#7df3cb","label":"Metallic Emerald"}'),
  (20, '{"style":"metallic","c1":"#2d0e60","c2":"#e066f0","c3":"#07041a","glow":"#e066f0","frame":"#f4a8f9","tier_text":"#f4a8f9","label":"Metallic Amethyst"}'),
  (21, '{"style":"metallic","c1":"#4a2a18","c2":"#e07a3a","c3":"#1a0d06","glow":"#e07a3a","frame":"#f4b890","tier_text":"#f4b890","label":"Metallic Copper"}'),
  (22, '{"style":"metallic","c1":"#303035","c2":"#d6d6e0","c3":"#0e0e12","glow":"#d6d6e0","frame":"#f0f0f5","tier_text":"#f0f0f5","label":"Metallic Platinum"}'),
  (23, '{"style":"metallic","c1":"#1a1f2a","c2":"#6f7d96","c3":"#0a0d12","glow":"#6f7d96","frame":"#aab4c5","tier_text":"#aab4c5","label":"Metallic Gunmetal"}'),
  -- Mix
  (24, '{"style":"mix","c1":"#1c1408","c2":"#00ffe5","c3":"#1a120c","glow":"#00ffe5","frame":"#f0c987","tier_text":"#f0c987","label":"Mix Cyan+Bronze"}'),
  (25, '{"style":"mix","c1":"#1c0a14","c2":"#ff2bd6","c3":"#1a1206","glow":"#ff2bd6","frame":"#ffe27a","tier_text":"#ffe27a","label":"Mix Magenta+Gold"}'),
  (26, '{"style":"mix","c1":"#0c1408","c2":"#b6ff1f","c3":"#0b1224","glow":"#b6ff1f","frame":"#c6d4ef","tier_text":"#c6d4ef","label":"Mix Lime+Silver"}'),
  (27, '{"style":"mix","c1":"#1c0a08","c2":"#ff7a1a","c3":"#07041a","glow":"#ff7a1a","frame":"#f4a8f9","tier_text":"#f4a8f9","label":"Mix Orange+Amethyst"}'),
  (28, '{"style":"mix","c1":"#1c0a14","c2":"#ffb3c8","c3":"#1a1206","glow":"#ffb3c8","frame":"#ffe27a","tier_text":"#ffe27a","label":"Mix Pastel Rose+Gold"}'),
  (29, '{"style":"mix","c1":"#0c1408","c2":"#b3ffd4","c3":"#1a120c","glow":"#b3ffd4","frame":"#f0c987","tier_text":"#f0c987","label":"Mix Pastel Mint+Bronze"}'),
  (30, '{"style":"mix","c1":"#100020","c2":"#9b3aff","c3":"#0e0e12","glow":"#9b3aff","frame":"#f0f0f5","tier_text":"#f0f0f5","label":"Mix Fluor Violet+Platinum"}'),
  (31, '{"style":"mix","c1":"#001a18","c2":"#1affc6","c3":"#1a0d06","glow":"#1affc6","frame":"#f4b890","tier_text":"#f4b890","label":"Mix Fluor Teal+Copper"}')
ON CONFLICT (catalog_index) DO NOTHING;

-- Backfill: assign theme_id to existing tournaments in chronological order.
-- Tournaments without a theme after this run (because the catalog is exhausted)
-- will be served theme_id NULL until an admin extends the catalog.
WITH legacy AS (
  SELECT t.id,
         ROW_NUMBER() OVER (ORDER BY COALESCE(t.date, t.created_at::TEXT), t.created_at) - 1 AS rn
  FROM public.tournaments t
  WHERE t.theme_id IS NULL AND t.deleted_at IS NULL
), candidates AS (
  SELECT l.id AS tournament_id, th.id AS theme_id
  FROM legacy l
  JOIN public.tournament_themes th ON th.catalog_index = l.rn
  -- Exclude themes already linked to another tournament (UNIQUE constraint).
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tournaments t2 WHERE t2.theme_id = th.id
  )
)
UPDATE public.tournaments t
   SET theme_id = c.theme_id
  FROM candidates c
 WHERE t.id = c.tournament_id;
