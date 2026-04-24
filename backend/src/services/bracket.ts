// Knockout bracket generator: reads group standings, seeds elimination rounds.
import { query, queryOne } from "../db/query.js";
import { toMatch } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import type { MatchStage } from "../types.js";

interface Standing {
  teamId: string;
  points: number;
  diff: number;
}

const getTopFromGroup = async (groupId: string, n: number): Promise<string[]> => {
  const rows = await query(
    `SELECT gm.team_id, gm.points, (gm.points_for - gm.points_against) AS diff
     FROM group_members gm
     WHERE gm.group_id=$1
     ORDER BY gm.points DESC, diff DESC`, [groupId],
  );
  return rows.slice(0, n).map((r) => (r as { team_id: string }).team_id);
};

export const generateKnockout = async (tournamentId: string) => {
  const existingKo = await query(
    "SELECT id FROM matches WHERE tournament_id=$1 AND stage!='group'", [tournamentId],
  );
  if (existingKo.length > 0) return; // already generated

  const groups = await query(
    "SELECT id FROM tournament_groups WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  if (groups.length === 0) throw new HttpError(400, "NO_GROUPS");

  // Gather qualified teams: top 2 per group, or top 1 if only 1 group
  const topN = groups.length === 1 ? 4 : 2;
  const qualified: string[] = [];
  for (const g of groups) {
    const tops = await getTopFromGroup((g as { id: string }).id, topN);
    qualified.push(...tops);
  }

  const stage = (n: number): MatchStage => {
    if (n >= 8) return "quarterfinal";
    if (n >= 4) return "semifinal";
    return "final";
  };

  const createMatches = async (teams: string[], currentStage: MatchStage) => {
    const created = [];
    for (let i = 0; i < teams.length - 1; i += 2) {
      const row = await queryOne(
        `INSERT INTO matches (tournament_id, stage, home_team_id, away_team_id, status, round_number)
         VALUES ($1,$2,$3,$4,'pending',$5) RETURNING *`,
        [tournamentId, currentStage, teams[i], teams[i + 1], Math.floor(i / 2) + 1],
      );
      created.push(toMatch(row!));
    }
    return created;
  };

  const initialStage = stage(qualified.length);
  await createMatches(qualified, initialStage);

  // If 8 teams: create empty semis + final placeholders
  if (qualified.length >= 8) {
    for (let i = 0; i < 2; i++) {
      await queryOne(
        "INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'semifinal','pending',$2)",
        [tournamentId, i + 1],
      );
    }
    await queryOne(
      "INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)",
      [tournamentId],
    );
    await queryOne(
      "INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)",
      [tournamentId],
    );
  } else if (qualified.length >= 4) {
    await queryOne(
      "INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'final','pending',1)",
      [tournamentId],
    );
    await queryOne(
      "INSERT INTO matches (tournament_id, stage, status, round_number) VALUES ($1,'third_place','pending',1)",
      [tournamentId],
    );
  }

  return { ok: true };
};
