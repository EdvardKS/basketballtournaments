// SPEC-013: cromo resolver.
//
// A cromo is the visual coleccionable of a (tournament, player) pair. It
// only exists if the player is registered in the tournament. Stats come
// from `player_skill_snapshots` when the tournament is `completed` (frozen),
// otherwise from the live `players` row.

import { query } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { resolveTournamentTheme, type TournamentTheme } from "./cromo-themes.js";

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
  theme:          TournamentTheme["palette"];
  themeId:        string;
  themeIndex:     number;
  player:         CromoPlayer;
  versionLabel:   string;     // "v1" | "v2" | ...
  frozen:         boolean;
}

const yearOf = (date: string | null, createdAt: string | Date): number => {
  if (date && /^\d{4}/.test(date)) return Number(date.slice(0, 4));
  if (createdAt instanceof Date)   return createdAt.getUTCFullYear();
  const m = String(createdAt).match(/^(\d{4})/);
  return m ? Number(m[1]) : new Date().getUTCFullYear();
};

interface RegRow {
  tournament_id:   string;
  tournament_name: string;
  date:            string | null;
  created_at:      string | Date;
  status:          string;
  theme_id:        string | null;
  registered_at:   string | Date;
}

interface SnapshotRow {
  tournament_id: string;
  pace:          number;
  shooting:      number;
  passing:       number;
  dribbling:     number;
  defense:       number;
  physical:      number;
  overall:       number;
}

interface PlayerRow {
  id:        string;
  name:      string;
  position:  string;
  avatar:    string | null;
  overall:   number;
  pace:      number;
  shooting:  number;
  passing:   number;
  dribbling: number;
  defense:   number;
  physical:  number;
}

export const listCromosForPlayer = async (playerId: string): Promise<Cromo[]> => {
  const player = await query<PlayerRow>(
    `SELECT id, name, position, avatar, overall, pace, shooting, passing,
            dribbling, defense, physical
       FROM players WHERE id=$1`, [playerId]);
  if (player.length === 0) throw new HttpError(404, "PLAYER_NOT_FOUND");
  const p = player[0];

  const regs = await query<RegRow>(
    `SELECT t.id    AS tournament_id,
            t.name  AS tournament_name,
            t.date,
            t.created_at,
            t.status,
            t.theme_id,
            tr.registered_at
       FROM tournament_registrations tr
       JOIN tournaments t ON t.id = tr.tournament_id
      WHERE tr.player_id = $1
        AND t.deleted_at IS NULL
      ORDER BY COALESCE(t.date, t.created_at::TEXT) ASC, t.created_at ASC`,
    [playerId],
  );
  if (regs.length === 0) return [];

  const snapshots = await query<SnapshotRow>(
    `SELECT tournament_id, pace, shooting, passing, dribbling, defense, physical, overall
       FROM player_skill_snapshots
      WHERE player_id = $1`,
    [playerId],
  );
  const byTournament = new Map<string, SnapshotRow>();
  for (const s of snapshots) byTournament.set(s.tournament_id, s);

  const cromos: Cromo[] = [];
  for (let i = 0; i < regs.length; i += 1) {
    const r = regs[i];
    const theme = await resolveTournamentTheme(r.tournament_id).catch((err: unknown) => {
      // Catalog exhausted: render the cromo without theme rather than
      // failing the whole list. The UI will render a neutral palette.
      if (err instanceof HttpError && err.code === "THEME_CATALOG_EXHAUSTED") return null;
      throw err;
    });
    if (!theme) continue;

    const snap = byTournament.get(r.tournament_id);
    const frozen = r.status === "completed" && Boolean(snap);
    const stats: CromoPlayer = frozen && snap
      ? {
          id: p.id, name: p.name, position: p.position, avatar: p.avatar,
          overall: snap.overall, pace: snap.pace, shooting: snap.shooting,
          passing: snap.passing, dribbling: snap.dribbling,
          defense: snap.defense, physical: snap.physical,
        }
      : { ...p };

    cromos.push({
      tournamentId:   r.tournament_id,
      tournamentName: r.tournament_name,
      tournamentYear: yearOf(r.date, r.created_at),
      status:         r.status,
      theme:          theme.palette,
      themeId:        theme.id,
      themeIndex:     theme.catalog_index,
      player:         stats,
      versionLabel:   `v${i + 1}`,
      frozen,
    });
  }

  // Return newest-first (the UI default-active is the most recent).
  return cromos.reverse();
};
