// Player card tier + theme derived from years of seniority.
// One version per registered year: v1 (year 0) → v2 (year 1) → ...
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export const cromoTier = (createdAt: string): number => {
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return 1;
  const years = (Date.now() - t) / YEAR_MS;
  return Math.max(1, Math.floor(years) + 1);
};

const FRAMES = [
  "frame-v1",  // year 0
  "frame-v2",  // year 1
  "frame-v3",  // year 2
  "frame-v4",  // year 3
  "frame-v5+", // year 4+
] as const;

export interface TierTheme {
  frameClass: string;
  haloIntensity: number;
  particleCount: number;
  tierLabel: string;
}

export const tierTheme = (tier: number): TierTheme => ({
  frameClass: FRAMES[Math.min(tier - 1, FRAMES.length - 1)],
  haloIntensity: Math.min(tier * 0.2, 1),
  particleCount: Math.min(tier * 3, 20),
  tierLabel: `v${tier}`,
});

export const kindLabel: Record<string, { emoji: string; text: string }> = {
  participated: { emoji: "🎟", text: "Participé" },
  champion:     { emoji: "🥇", text: "Campeón" },
  runner_up:    { emoji: "🥈", text: "Subcampeón" },
  third_place:  { emoji: "🥉", text: "Tercer puesto" },
  mvp:          { emoji: "⭐", text: "MVP" },
  custom:       { emoji: "🏅", text: "Premio" },
};

export const POSITION_ABBR: Record<string, string> = {
  base: "BA", escolta: "ES", alero: "AL",
  "ala-pivot": "AP", pivot: "PI",
};

export const STAT_ABBR = ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"] as const;
