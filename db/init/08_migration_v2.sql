-- v2 migration: new columns for full tournament lifecycle + team identity.
-- All ALTER TABLE statements are idempotent (IF NOT EXISTS).

-- players: age + GDPR consent tracking
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS gdpr_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS gdpr_accepted_at TIMESTAMPTZ;

-- tournaments: replace single date with lifecycle date range + court config
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS inscription_start DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS inscription_end DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS draft_start DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS draft_end DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS court_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS half_court BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER NOT NULL DEFAULT 20;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS hours_confirmed BOOLEAN NOT NULL DEFAULT false;

-- teams: brand identity (logo, description) + captain WhatsApp contact
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

-- draft_state: track which position each captain has occupied per round
ALTER TABLE public.draft_state ADD COLUMN IF NOT EXISTS round_order_history JSONB NOT NULL DEFAULT '[]';

-- Back-fill seed tournament date ranges based on their existing date field.
-- Active tournament: Liga Otono (match_date 2026-04-15)
UPDATE public.tournaments SET
  inscription_start = '2026-02-01', inscription_end = '2026-03-31',
  draft_start       = '2026-04-01', draft_end       = '2026-04-14',
  match_date        = '2026-04-15'
WHERE id = 'tournament-active-1' AND match_date IS NULL;

-- Copa Invierno 2026 (completed, 2026-02-20)
UPDATE public.tournaments SET
  inscription_start = '2025-12-01', inscription_end = '2026-01-31',
  draft_start       = '2026-02-01', draft_end       = '2026-02-19',
  match_date        = '2026-02-20'
WHERE id = 'tournament-completed-1' AND match_date IS NULL;

-- Torneo Navidad 2025 (2025-12-22)
UPDATE public.tournaments SET
  inscription_start = '2025-11-01', inscription_end = '2025-12-15',
  draft_start       = '2025-12-16', draft_end       = '2025-12-21',
  match_date        = '2025-12-22'
WHERE id = 'tournament-completed-2' AND match_date IS NULL;

-- Liga Verano 2025 (2025-07-10)
UPDATE public.tournaments SET
  inscription_start = '2025-05-01', inscription_end = '2025-06-30',
  draft_start       = '2025-07-01', draft_end       = '2025-07-09',
  match_date        = '2025-07-10'
WHERE id = 'tournament-completed-3' AND match_date IS NULL;

-- Copa Primavera 2025 (2025-04-05)
UPDATE public.tournaments SET
  inscription_start = '2025-02-01', inscription_end = '2025-03-31',
  draft_start       = '2025-04-01', draft_end       = '2025-04-04',
  match_date        = '2025-04-05'
WHERE id = 'tournament-completed-4' AND match_date IS NULL;
