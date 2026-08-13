-- Email-based password recovery tokens. The token itself is never stored; only
-- its SHA-256 hash. Single-use (used_at) with a short TTL (expires_at).
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token_hash text PRIMARY KEY,
  player_id  varchar NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_player ON public.password_reset_tokens(player_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON public.password_reset_tokens(expires_at);
