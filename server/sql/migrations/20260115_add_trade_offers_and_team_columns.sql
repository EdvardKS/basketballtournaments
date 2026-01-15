-- Migration: add missing team columns and trade_offers table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS whatsapp_group_name text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS whatsapp_group_link text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS trade_offers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL,
  requesting_team_id varchar NOT NULL,
  target_team_id varchar NOT NULL,
  target_player_id varchar NOT NULL,
  offered_player_ids text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp,
  resolved_by varchar
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_offers_tournament') THEN
    ALTER TABLE trade_offers
      ADD CONSTRAINT fk_trade_offers_tournament
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_offers_requesting_team') THEN
    ALTER TABLE trade_offers
      ADD CONSTRAINT fk_trade_offers_requesting_team
      FOREIGN KEY (requesting_team_id) REFERENCES teams(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_offers_target_team') THEN
    ALTER TABLE trade_offers
      ADD CONSTRAINT fk_trade_offers_target_team
      FOREIGN KEY (target_team_id) REFERENCES teams(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_offers_target_player') THEN
    ALTER TABLE trade_offers
      ADD CONSTRAINT fk_trade_offers_target_player
      FOREIGN KEY (target_player_id) REFERENCES players(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_offers_resolved_by') THEN
    ALTER TABLE trade_offers
      ADD CONSTRAINT fk_trade_offers_resolved_by
      FOREIGN KEY (resolved_by) REFERENCES players(id);
  END IF;
END $$;
