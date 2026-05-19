-- Bracket format + size, chosen by admin.
-- format: how qualifiers are picked from group standings.
-- size  : how many teams enter the bracket (4 / 8 / 16). NULL = auto-pick
--         the largest power of two that fits the qualified pool.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_format TEXT
    NOT NULL DEFAULT 'top2_per_group',
  ADD COLUMN IF NOT EXISTS bracket_size INTEGER NULL;

-- Constrain the enum at the DB layer too.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_bracket_format_chk'
  ) THEN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_bracket_format_chk
        CHECK (bracket_format IN ('top2_per_group','top1_plus_best2_seconds'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_bracket_size_chk'
  ) THEN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_bracket_size_chk
        CHECK (bracket_size IS NULL OR bracket_size IN (4, 8, 16));
  END IF;
END $$;
