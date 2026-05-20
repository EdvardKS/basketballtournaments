-- Visual identity per group (admin can paint groups with a color + logo so
-- the bracket preview reads at a glance). Both columns are optional so
-- existing groups keep working with sensible defaults from the UI.
ALTER TABLE tournament_groups
  ADD COLUMN IF NOT EXISTS color TEXT NULL,
  ADD COLUMN IF NOT EXISTS logo  TEXT NULL;
