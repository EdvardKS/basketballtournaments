// Player achievements: derived from completed tournaments + matches, plus
// admin-granted custom awards (MVP / labeled). Auto-derived medals are not
// persisted — they're a function of tournament_registrations + matches +
// tournaments.winner_id and recomputed on every read.
import { query } from "../db/query.js";
import type { Achievement, AchievementKind } from "../types.js";

interface DerivedRow {
  tournament_id: string;
  tournament_name: string;
  match_date: string | null;
  created_at: string;
  is_champion: boolean;
  is_runner_up: boolean;
  is_third: boolean;
  status: string;
}

const yearOf = (matchDate: string | null, createdAt: string): number => {
  const src = matchDate ?? createdAt;
  const d = new Date(src);
  return Number.isFinite(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear();
};

export const getAchievements = async (playerId: string): Promise<Achievement[]> => {
  // For each completed tournament the player participated in (registration OR
  // drafted into a team), derive whether their team won the final, lost the
  // final, or won the third-place match.
  const derived = await query<DerivedRow>(
    `SELECT DISTINCT
       t.id   AS tournament_id,
       t.name AS tournament_name,
       t.match_date,
       t.created_at,
       t.status,
       BOOL_OR(tm.id = t.winner_id) AS is_champion,
       BOOL_OR(fm.winner_id IS NOT NULL
               AND fm.winner_id <> tm.id
               AND (tm.id = fm.home_team_id OR tm.id = fm.away_team_id)) AS is_runner_up,
       BOOL_OR(tp3.winner_id = tm.id) AS is_third
     FROM tournament_registrations r
     JOIN tournaments t ON t.id = r.tournament_id
     LEFT JOIN team_players tp ON tp.player_id = r.player_id
     LEFT JOIN teams tm ON tm.id = tp.team_id AND tm.tournament_id = t.id
     LEFT JOIN matches fm ON fm.tournament_id = t.id AND fm.stage = 'final'
     LEFT JOIN matches tp3 ON tp3.tournament_id = t.id AND tp3.stage = 'third_place'
     WHERE r.player_id = $1 AND t.status = 'completed'
     GROUP BY t.id, t.name, t.match_date, t.created_at, t.status
     ORDER BY t.match_date DESC NULLS LAST`,
    [playerId],
  );

  const auto: Achievement[] = [];
  for (const d of derived) {
    const year = yearOf(d.match_date, d.created_at);
    const base = {
      tournamentId: d.tournament_id, tournamentName: d.tournament_name,
      year, label: null, note: null, awardedAt: null, id: null,
    };
    auto.push({ ...base, kind: "participated" });
    if (d.is_champion) auto.push({ ...base, kind: "champion" });
    if (d.is_runner_up) auto.push({ ...base, kind: "runner_up" });
    if (d.is_third) auto.push({ ...base, kind: "third_place" });
  }

  const custom = await query<{
    id: string; tournament_id: string; tournament_name: string;
    match_date: string | null; tournament_created_at: string;
    kind: string; label: string | null; note: string | null; awarded_at: string;
  }>(
    `SELECT a.id, a.tournament_id, t.name AS tournament_name,
            t.match_date, t.created_at AS tournament_created_at,
            a.kind, a.label, a.note, a.awarded_at
     FROM player_achievements_custom a
     JOIN tournaments t ON t.id = a.tournament_id
     WHERE a.player_id = $1
     ORDER BY a.awarded_at DESC`,
    [playerId],
  );
  const customMapped: Achievement[] = custom.map((c) => ({
    id: c.id,
    kind: c.kind as AchievementKind,
    tournamentId: c.tournament_id,
    tournamentName: c.tournament_name,
    year: yearOf(c.match_date, c.tournament_created_at),
    label: c.label, note: c.note,
    awardedAt: new Date(c.awarded_at).toISOString(),
  }));

  return [...auto, ...customMapped];
};
