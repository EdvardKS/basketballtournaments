-- Once the admin "fija" the configuration, group regroup + bracket regen
-- are refused server-side until they unlock. NULL = unlocked.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_locked_at TIMESTAMP NULL;
