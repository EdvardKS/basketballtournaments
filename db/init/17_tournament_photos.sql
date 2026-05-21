-- Tournament gallery: per-tournament photo uploads visible in the public gallery.
-- Photos stored as data URIs (base64) to match the existing avatar/logo
-- approach in this codebase. A future migration can move them to object
-- storage without touching the API shape.

CREATE TABLE IF NOT EXISTS public.tournament_photos (
  id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id VARCHAR NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  image         TEXT    NOT NULL,
  caption       TEXT    NULL,
  uploaded_by   VARCHAR NULL REFERENCES public.players(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tp_tournament ON public.tournament_photos(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_uploaded_at ON public.tournament_photos(uploaded_at DESC);
