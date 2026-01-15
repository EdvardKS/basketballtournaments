-- Migration: add player position
ALTER TABLE players ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT 'base';
