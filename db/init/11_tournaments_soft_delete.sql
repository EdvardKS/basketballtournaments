-- Soft-delete column for tournaments. NULL = live; non-NULL = deleted.
-- Registrations/players remain intact because no row is removed.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS tournaments_deleted_at_idx
  ON tournaments (deleted_at);
