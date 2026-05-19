// Match lifecycle: start, update score, complete (→ triggers group recompute).
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { toMatch } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { recomputeGroup } from "./groups.js";

export const matchesForTournament = async (tournamentId: string) => {
  const rows = await query(
    "SELECT * FROM matches WHERE tournament_id=$1 ORDER BY stage, round_number NULLS LAST, created_at",
    [tournamentId]);
  return rows.map(toMatch);
};

export const groupsForTournament = async (tournamentId: string) => {
  return query(
    `SELECT g.*, json_agg(jsonb_build_object(
        'teamId', gm.team_id, 'points', gm.points,
        'gamesPlayed', gm.games_played, 'gamesWon', gm.games_won,
        'gamesLost', gm.games_lost, 'pointsFor', gm.points_for,
        'pointsAgainst', gm.points_against,
        'teamName', t.name) ORDER BY gm.points DESC, gm.points_for DESC
      ) FILTER (WHERE gm.id IS NOT NULL) AS table
     FROM tournament_groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN teams t ON t.id = gm.team_id
     WHERE g.tournament_id=$1
     GROUP BY g.id ORDER BY g.name`, [tournamentId]);
};

export const startSchema = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(240),
});

export const startMatch = async (id: string, raw: unknown) => {
  const data = startSchema.parse(raw);
  const row = await queryOne(
    `UPDATE matches SET status='in_progress',
       started_at=now(), duration_minutes=$2
     WHERE id=$1 AND status='pending' RETURNING *`, [id, data.durationMinutes]);
  if (!row) throw new HttpError(409, "MATCH_NOT_PENDING");
  return toMatch(row);
};

export const scoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

export const updateScore = async (id: string, raw: unknown) => {
  const data = scoreSchema.parse(raw);
  const row = await queryOne(
    `UPDATE matches SET home_score=$2, away_score=$3 WHERE id=$1 RETURNING *`,
    [id, data.homeScore, data.awayScore]);
  if (!row) throw new HttpError(404, "MATCH_NOT_FOUND");
  return toMatch(row);
};

export const completeMatch = async (id: string) => {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE matches SET status='completed', completed_at=now(),
       winner_id = CASE WHEN home_score > away_score THEN home_team_id
                        WHEN away_score > home_score THEN away_team_id
                        ELSE NULL END
     WHERE id=$1 AND home_score IS NOT NULL AND away_score IS NOT NULL
     RETURNING *`, [id]);
  if (!row) throw new HttpError(409, "MATCH_NEEDS_SCORE");
  if (row.group_id) await recomputeGroup(row.group_id as string);
  return toMatch(row);
};
