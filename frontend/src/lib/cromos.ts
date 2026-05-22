// SPEC-013: per-tournament cromo types + fetch helper.
//
// A Cromo bundles everything the CromoCard needs to render: the tournament
// (id, name, year, status), the palette (resolved server-side, persisted per
// tournament), the player stats (frozen snapshot for completed tournaments,
// live row otherwise) and the ordinal versionLabel ("v1", "v2", ...).

import { api } from "./api.js";

export interface TournamentPalette {
  style: "fluor" | "pastel" | "metallic" | "mix";
  c1: string;
  c2: string;
  c3: string;
  glow: string;
  frame: string;
  tier_text: string;
  label: string;
}

export interface CromoPlayer {
  id: string;
  name: string;
  position: string;
  avatar: string | null;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
}

export interface Cromo {
  tournamentId:   string;
  tournamentName: string;
  tournamentYear: number;
  status:         string;
  theme:          TournamentPalette;
  themeId:        string;
  themeIndex:     number;
  player:         CromoPlayer;
  versionLabel:   string;
  frozen:         boolean;
}

export const fetchPlayerCromos = async (playerId: string, cookie?: string): Promise<Cromo[]> => {
  const res = await api<{ cromos: Cromo[] }>(`/players/${playerId}/cromos`, {}, cookie);
  return res.cromos;
};

// Build the inline `style` attribute that applies a palette as CSS custom
// properties. CromoCard reads `--cromo-c1`, `--cromo-c2`, ... from this.
export const paletteToStyle = (theme: TournamentPalette): string =>
  [
    `--cromo-c1:${theme.c1}`,
    `--cromo-c2:${theme.c2}`,
    `--cromo-c3:${theme.c3}`,
    `--cromo-glow:${theme.glow}`,
    `--cromo-frame-2:${theme.frame}`,
    `--cromo-tier-text:${theme.tier_text}`,
  ].join(";");
