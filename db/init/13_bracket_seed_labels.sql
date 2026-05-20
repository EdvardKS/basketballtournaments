-- Bracket slots carry a structural label (e.g. "1º Grupo A", "Mejor 2º",
-- "Ganador SF 1") next to the optional team binding. Used by the preview
-- before any group game is played so we don't display arbitrary team names
-- from a zero-ranked pool.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_seed_label TEXT NULL,
  ADD COLUMN IF NOT EXISTS away_seed_label TEXT NULL;

-- New bracket formats: single-group flavours (top 2 → direct final, top 4 →
-- semifinals from the same group). New supported size 2 for a stand-alone
-- final. Drop and recreate the constraints so the four format strings and
-- the new size are all valid.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_bracket_format_chk'
  ) THEN
    ALTER TABLE tournaments DROP CONSTRAINT tournaments_bracket_format_chk;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_bracket_size_chk'
  ) THEN
    ALTER TABLE tournaments DROP CONSTRAINT tournaments_bracket_size_chk;
  END IF;
  ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_bracket_format_chk
      CHECK (bracket_format IN (
        'top2_per_group',
        'top1_plus_best2_seconds',
        'top2_single_group',
        'top4_single_group'
      ));
  ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_bracket_size_chk
      CHECK (bracket_size IS NULL OR bracket_size IN (2, 4, 8, 16));
END $$;
