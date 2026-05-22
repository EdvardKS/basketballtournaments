-- SPEC-015: temporary scoring sessions for in-match clock + external scorer URL.
-- See sdd/specs/spec-015-jornada-marcador/spec.md (data model section).
--
-- One row per match-scoring "session". The admin creates one to either drive
-- the scorer themselves (in the admin panel) or to share a public /score/:token
-- URL with another person. The session persists the scoreboard, the running
-- clock, and provisional home/away scores until someone presses "submit",
-- which then funnels through the existing updateScore + completeMatch path.
--
-- token_hash stores sha256(token) — the cleartext token is NEVER persisted.
-- A partial UNIQUE index enforces at most one 'active' session per match.

CREATE TABLE IF NOT EXISTS public.match_score_sessions (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         VARCHAR NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  token_hash       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  home_score       INTEGER NOT NULL DEFAULT 0,
  away_score       INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 1200,
  started_at       TIMESTAMPTZ,
  paused_at        TIMESTAMPTZ,
  elapsed_seconds  INTEGER NOT NULL DEFAULT 0,
  created_by       VARCHAR REFERENCES public.players(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  expired_at       TIMESTAMPTZ,
  CONSTRAINT mss_status_chk         CHECK (status IN ('active','submitted','revoked','expired')),
  CONSTRAINT mss_home_score_chk     CHECK (home_score >= 0),
  CONSTRAINT mss_away_score_chk     CHECK (away_score >= 0),
  CONSTRAINT mss_duration_chk       CHECK (duration_seconds > 0),
  CONSTRAINT mss_elapsed_chk        CHECK (elapsed_seconds >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_score_sessions_token_hash
  ON public.match_score_sessions (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_score_sessions_active_match
  ON public.match_score_sessions (match_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_match_score_sessions_match
  ON public.match_score_sessions (match_id);
