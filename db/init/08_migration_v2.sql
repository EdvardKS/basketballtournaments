-- v2 migration: new columns for full tournament lifecycle + team identity + 3x3 default.
-- All ALTER statements are idempotent (IF NOT EXISTS / conditional blocks).

-- players: age + GDPR consent tracking
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS gdpr_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS gdpr_accepted_at TIMESTAMPTZ;

-- tournaments: lifecycle dates + court/format config + team size
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS inscription_start DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS inscription_end   DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS draft_start       DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS draft_end         DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS match_date        DATE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS court_count       INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS half_court        BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER NOT NULL DEFAULT 20;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS hours_confirmed   BOOLEAN NOT NULL DEFAULT false;
-- Default tournament format is now 3x3 (was implicit 5v5).
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS team_size         INTEGER NOT NULL DEFAULT 3;

-- teams: brand identity + captain WhatsApp contact
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo          TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

-- draft_state: round-order history for no-repeat-position algorithm
ALTER TABLE public.draft_state ADD COLUMN IF NOT EXISTS round_order_history JSONB NOT NULL DEFAULT '[]';
