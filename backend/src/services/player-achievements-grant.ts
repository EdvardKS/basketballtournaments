// Admin-granted custom awards (MVP / labeled). Auto-derived achievements
// (participated/champion/runner_up/third_place) are NOT stored here — they're
// computed by player-achievements.ts on read. The autoGrant* hooks below are
// kept as logging seams so we can later flip to persisted derived rows
// without changing call sites.
import { z } from "zod";
import { query, queryOne } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

export const grantCustomSchema = z.object({
  kind: z.enum(["mvp", "custom"]),
  tournamentId: z.string().min(1),
  label: z.string().max(80).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
}).refine((d) => d.kind !== "custom" || (d.label != null && d.label.length >= 2), {
  message: "LABEL_REQUIRED", path: ["label"],
});

export const grantCustom = async (
  playerId: string, awardedBy: string, raw: unknown,
) => {
  const data = grantCustomSchema.parse(raw);
  try {
    const row = await queryOne(
      `INSERT INTO player_achievements_custom
         (player_id, tournament_id, kind, label, note, awarded_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, player_id, tournament_id, kind, label, note, awarded_at`,
      [playerId, data.tournamentId, data.kind,
       data.label ?? null, data.note ?? null, awardedBy],
    );
    return row;
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "23505") throw new HttpError(409, "ACHIEVEMENT_DUPLICATE");
    if (code === "23503") throw new HttpError(404, "PLAYER_OR_TOURNAMENT_NOT_FOUND");
    throw e;
  }
};

export const revokeCustom = async (playerId: string, achievementId: string) => {
  const row = await queryOne(
    "DELETE FROM player_achievements_custom WHERE id=$1 AND player_id=$2 RETURNING id",
    [achievementId, playerId],
  );
  if (!row) throw new HttpError(404, "ACHIEVEMENT_NOT_FOUND");
};

export const listGrantableTournaments = async (playerId: string) => {
  return query<{ id: string; name: string; status: string; match_date: string | null }>(
    `SELECT t.id, t.name, t.status, t.match_date
     FROM tournament_registrations r
     JOIN tournaments t ON t.id = r.tournament_id
     WHERE r.player_id = $1
     ORDER BY t.match_date DESC NULLS LAST`,
    [playerId],
  );
};

// Hook called after final completes. Auto-derived achievements are computed
// at read time, so this is just an audit log for now.
export const autoGrantOnFinal = async (
  tournamentId: string, winnerTeamId: string, loserTeamId: string | null,
) => {
  console.log(`[achievements] final completed: tournament=${tournamentId} ` +
    `champion=${winnerTeamId} runner_up=${loserTeamId ?? "(n/a)"}`);
};

export const autoGrantOnThirdPlace = async (
  tournamentId: string, winnerTeamId: string,
) => {
  console.log(`[achievements] third_place completed: tournament=${tournamentId} ` +
    `winner=${winnerTeamId}`);
};
