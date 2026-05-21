// Player removal. Soft-delete by default (sets archived_at) so historical
// tournaments keep their team rosters intact. Hard delete only when the
// admin explicitly opts in and the player has no active captain duty.
import { queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

const isActiveCaptain = async (id: string): Promise<boolean> => {
  const r = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM teams tm
       JOIN tournaments t ON t.id = tm.tournament_id
      WHERE tm.captain_id = $1
        AND t.status IN ('draft','setup','active','scheduled')`,
    [id],
  );
  return r != null && Number(r.n) > 0;
};

export const deletePlayer = async (id: string, hard: boolean) => {
  const exists = await queryOne("SELECT id FROM players WHERE id=$1", [id]);
  if (!exists) throw new HttpError(404, "PLAYER_NOT_FOUND");
  if (await isActiveCaptain(id)) {
    throw new HttpError(409, "PLAYER_IS_ACTIVE_CAPTAIN");
  }
  if (!hard) {
    await queryOne(
      "UPDATE players SET archived_at = COALESCE(archived_at, NOW()) WHERE id=$1 RETURNING id",
      [id],
    );
    return { mode: "soft" as const };
  }
  // Hard delete is only allowed for players who never captained a team —
  // teams.captain_id is NOT NULL and has no FK ON DELETE policy that would
  // make rewriting historical rosters safe.
  const cap = await queryOne<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM teams WHERE captain_id=$1", [id],
  );
  if (cap && Number(cap.n) > 0) {
    throw new HttpError(409, "PLAYER_HAS_CAPTAIN_HISTORY");
  }
  await tx(async (q) => {
    await q("DELETE FROM player_achievements_custom WHERE player_id=$1", [id]);
    await q("DELETE FROM team_players WHERE player_id=$1", [id]);
    await q("DELETE FROM tournament_registrations WHERE player_id=$1", [id]);
    await q("DELETE FROM player_skill_snapshots WHERE player_id=$1", [id]);
    await q("DELETE FROM players WHERE id=$1", [id]);
  });
  return { mode: "hard" as const };
};
