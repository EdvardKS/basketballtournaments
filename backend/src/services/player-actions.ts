// Self-service stats redistribution + admin sanctions.
// Kept separate from player-update.ts (admin schema) so the player-side
// surface stays small and auditable.
import { query, queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { computeOverall } from "./players.js";
import { playerStatsSchema } from "./player-update.js";
import { exportTournamentRegistrationsCsv } from "./registration-backup.js";
import type { Role } from "../types.js";

export const updatePlayerStats = async (
  id: string, raw: unknown, requesterId: string, requesterRole: Role,
) => {
  const data = playerStatsSchema.parse(raw);
  const current = await queryOne<{ can_edit_stats: boolean }>(
    "SELECT can_edit_stats FROM players WHERE id=$1", [id],
  );
  if (!current) throw new HttpError(404, "PLAYER_NOT_FOUND");
  if (requesterRole !== "admin") {
    if (requesterId !== id) throw new HttpError(403, "FORBIDDEN");
    if (!current.can_edit_stats) throw new HttpError(403, "STATS_LOCKED");
  }
  const overall = computeOverall(data);
  const row = await queryOne(
    `UPDATE players SET
       pace=$2, shooting=$3, passing=$4,
       dribbling=$5, defense=$6, physical=$7, overall=$8
     WHERE id=$1 RETURNING *`,
    [id, data.pace, data.shooting, data.passing,
     data.dribbling, data.defense, data.physical, overall],
  );
  const regs = await query<{ tournament_id: string }>(
    "SELECT tournament_id FROM tournament_registrations WHERE player_id=$1", [id],
  );
  for (const r of regs) await exportTournamentRegistrationsCsv(r.tournament_id);
  return toPlayer(row!);
};

export const sanctionPlayer = async (
  id: string, canEditStats: boolean,
) => {
  const row = await queryOne(
    "UPDATE players SET can_edit_stats=$2 WHERE id=$1 RETURNING *",
    [id, canEditStats],
  );
  if (!row) throw new HttpError(404, "PLAYER_NOT_FOUND");
  return toPlayer(row);
};

