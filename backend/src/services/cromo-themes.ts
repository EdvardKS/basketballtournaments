// SPEC-013: per-tournament theme palettes.
//
// A theme is a curated palette identified by `catalog_index`. Each tournament
// links to exactly one theme via `tournaments.theme_id`, and each theme is
// used by exactly one tournament (UNIQUE index on tournaments.theme_id).
//
// Assignment is lazy and idempotent: the first time a caller asks for a
// tournament's theme, we pick the lowest free `catalog_index`, ensure the
// row exists in `tournament_themes` (it does, seeded by migration 18), and
// CAS-update the tournament. Concurrent requests for the same tournament
// converge — the loser observes a NULL → non-NULL transition done by the
// winner.

import { z } from "zod";
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

export const paletteSchema = z.object({
  style:     z.enum(["fluor", "pastel", "metallic", "mix"]),
  c1:        z.string().regex(/^#[0-9a-fA-F]{6}$/),
  c2:        z.string().regex(/^#[0-9a-fA-F]{6}$/),
  c3:        z.string().regex(/^#[0-9a-fA-F]{6}$/),
  glow:      z.string().regex(/^#[0-9a-fA-F]{6}$/),
  frame:     z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tier_text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  label:     z.string().min(1).max(80),
});
export type Palette = z.infer<typeof paletteSchema>;

export interface TournamentTheme {
  id:            string;
  catalog_index: number;
  palette:       Palette;
  created_at:    string;
}

const rowToTheme = (r: Record<string, unknown>): TournamentTheme => ({
  id:            r.id as string,
  catalog_index: Number(r.catalog_index),
  palette:       r.palette as Palette,
  created_at:    r.created_at instanceof Date
    ? (r.created_at as Date).toISOString()
    : String(r.created_at),
});

export const getThemeById = async (themeId: string): Promise<TournamentTheme | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT id, catalog_index, palette, created_at FROM tournament_themes WHERE id=$1",
    [themeId],
  );
  return row ? rowToTheme(row) : null;
};

// Read the theme bound to a tournament. Returns null if `theme_id IS NULL`.
export const getTournamentTheme = async (tournamentId: string): Promise<TournamentTheme | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT th.id, th.catalog_index, th.palette, th.created_at
       FROM tournaments t
       JOIN tournament_themes th ON th.id = t.theme_id
      WHERE t.id = $1`,
    [tournamentId],
  );
  return row ? rowToTheme(row) : null;
};

// Resolve the theme for a tournament. Lazily assigns the lowest free
// catalog_index if the tournament has no theme yet. Idempotent + race-safe.
export const resolveTournamentTheme = async (
  tournamentId: string,
): Promise<TournamentTheme> => {
  const existing = await getTournamentTheme(tournamentId);
  if (existing) return existing;

  // The tournament has no theme yet. Find the lowest catalog_index whose
  // theme is not assigned to any tournament.
  return tx(async (q) => {
    // Re-check inside the transaction.
    const refreshed = await q<{ theme_id: string | null }>(
      "SELECT theme_id FROM tournaments WHERE id=$1 FOR UPDATE",
      [tournamentId],
    );
    if (refreshed.length === 0) throw new HttpError(404, "TOURNAMENT_NOT_FOUND");
    if (refreshed[0].theme_id) {
      const theme = await getThemeById(refreshed[0].theme_id);
      if (theme) return theme;
    }

    const free = await q<{ id: string; catalog_index: number; palette: unknown; created_at: unknown }>(
      `SELECT th.id, th.catalog_index, th.palette, th.created_at
         FROM tournament_themes th
        WHERE NOT EXISTS (
          SELECT 1 FROM tournaments t WHERE t.theme_id = th.id
        )
        ORDER BY th.catalog_index ASC
        LIMIT 1`,
    );
    if (free.length === 0) {
      throw new HttpError(409, "THEME_CATALOG_EXHAUSTED",
        "El catálogo de paletas está agotado. Un admin debe ampliarlo vía POST /admin/tournament-themes/seed.");
    }

    const claim = await q<{ id: string }>(
      "UPDATE tournaments SET theme_id=$1 WHERE id=$2 AND theme_id IS NULL RETURNING id",
      [free[0].id, tournamentId],
    );
    if (claim.length === 0) {
      // Lost the race. Read whatever the winner assigned.
      const winner = await getTournamentTheme(tournamentId);
      if (!winner) throw new HttpError(500, "THEME_RACE_LOST");
      return winner;
    }
    return rowToTheme(free[0] as Record<string, unknown>);
  });
};

// Admin: add extra palettes to the catalog. Idempotent — duplicates by
// catalog_index are skipped (DO NOTHING).
export const seedExtraPalettes = async (extras: Palette[]): Promise<{ inserted: number; total: number }> => {
  let inserted = 0;
  await tx(async (q) => {
    const max = await q<{ max: number | null }>(
      "SELECT MAX(catalog_index) AS max FROM tournament_themes",
    );
    let next = (max[0].max ?? -1) + 1;
    for (const p of extras) {
      paletteSchema.parse(p);
      const r = await q<{ id: string }>(
        `INSERT INTO tournament_themes (catalog_index, palette)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (catalog_index) DO NOTHING
         RETURNING id`,
        [next, JSON.stringify(p)],
      );
      if (r.length > 0) inserted += 1;
      next += 1;
    }
  });
  const total = await query<{ n: string }>("SELECT COUNT(*)::TEXT AS n FROM tournament_themes");
  return { inserted, total: Number(total[0].n) };
};

export const listAllThemes = async (): Promise<TournamentTheme[]> => {
  const rows = await query<Record<string, unknown>>(
    "SELECT id, catalog_index, palette, created_at FROM tournament_themes ORDER BY catalog_index ASC",
  );
  return rows.map(rowToTheme);
};
