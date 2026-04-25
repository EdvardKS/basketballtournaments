-- Session storage for express-session via connect-pg-simple.
-- Schema mirrors connect-pg-simple's built-in `node_modules/connect-pg-simple/table.sql`,
-- so the runtime store can read/write without auto-creating anything (which races
-- with the first request after boot and silently swallows session writes).
-- Idempotent: safe to re-apply.

CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar      NOT NULL COLLATE "default",
  "sess"   json         NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS = FALSE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session"
      ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
