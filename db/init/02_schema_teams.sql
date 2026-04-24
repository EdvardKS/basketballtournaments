-- Teams, team players, draft state & history
CREATE TABLE IF NOT EXISTS public.teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  captain_id varchar NOT NULL REFERENCES public.players(id),
  name text NOT NULL,
  name_confirmed boolean NOT NULL DEFAULT false,
  whatsapp_group_name text,
  whatsapp_group_link text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_players (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id varchar NOT NULL REFERENCES public.players(id),
  drafted_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (team_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.draft_state (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_order text NOT NULL,
  current_team_index integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  max_rounds integer NOT NULL DEFAULT 5,
  is_active text NOT NULL DEFAULT 'true',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.draft_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id varchar NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id varchar NOT NULL REFERENCES public.players(id),
  round integer NOT NULL,
  pick_order integer NOT NULL,
  picked_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trade_offers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  requesting_team_id varchar NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  target_team_id varchar NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  target_player_id varchar NOT NULL REFERENCES public.players(id),
  offered_player_ids text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp,
  resolved_by varchar REFERENCES public.players(id)
);
