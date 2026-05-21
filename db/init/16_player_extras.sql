-- Player self-service extras: stats lock (sanction) + soft delete + custom achievements.
-- Auto-derived achievements (participated/champion/runner_up/third_place) are NOT
-- persisted — they're computed on read from tournament_registrations + matches.
-- This table only stores admin-granted awards (MVP, custom labels).

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS can_edit_stats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS public.player_achievements_custom (
  id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     VARCHAR NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tournament_id VARCHAR NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  kind          TEXT    NOT NULL CHECK (kind IN ('mvp','custom')),
  label         TEXT    NULL,
  note          TEXT    NULL,
  awarded_by    VARCHAR NULL REFERENCES public.players(id) ON DELETE SET NULL,
  awarded_at    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (player_id, tournament_id, kind, label)
);

CREATE INDEX IF NOT EXISTS idx_pac_player ON public.player_achievements_custom(player_id);
CREATE INDEX IF NOT EXISTS idx_pac_tour   ON public.player_achievements_custom(tournament_id);
