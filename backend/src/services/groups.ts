// Group generation: divide teams into balanced groups, seed fixtures.
import { query, queryOne, tx } from "../db/query.js";
import { toGroup } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

const GROUP_NAMES = ["Grupo A","Grupo B","Grupo C","Grupo D","Grupo E","Grupo F","Grupo G","Grupo H"];

export const generateGroups = async (tournamentId: string) => {
  const existing = await query(
    "SELECT id FROM tournament_groups WHERE tournament_id=$1", [tournamentId],
  );
  if (existing.length > 0) throw new HttpError(409, "GROUPS_ALREADY_EXIST");

  const teams = await query(
    "SELECT id FROM teams WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  if (teams.length < 2) throw new HttpError(400, "NOT_ENOUGH_TEAMS");

  const teamIds = teams.map((t) => (t as { id: string }).id);
  // Balanced split: prefer groups of 4, then 3
  const groupCount = Math.max(1, Math.ceil(teamIds.length / 4));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  teamIds.forEach((id, i) => groups[i % groupCount].push(id));

  return tx(async (q) => {
    const created = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const groupTeams = groups[gi];
      if (groupTeams.length === 0) continue;
      const grp = await q<Record<string, unknown>>(
        "INSERT INTO tournament_groups (tournament_id, name) VALUES ($1,$2) RETURNING *",
        [tournamentId, GROUP_NAMES[gi] ?? `Grupo ${gi + 1}`],
      );
      const groupId = (grp[0] as { id: string }).id;

      for (const tid of groupTeams) {
        await q(
          "INSERT INTO group_members (group_id, team_id) VALUES ($1,$2)",
          [groupId, tid],
        );
      }

      // Round-robin fixtures within the group
      for (let a = 0; a < groupTeams.length; a++) {
        for (let b = a + 1; b < groupTeams.length; b++) {
          await q(
            `INSERT INTO matches (tournament_id, group_id, stage, home_team_id, away_team_id, status)
             VALUES ($1,$2,'group',$3,$4,'pending')`,
            [tournamentId, groupId, groupTeams[a], groupTeams[b]],
          );
        }
      }
      created.push(toGroup(grp[0]));
    }
    return created;
  });
};

export const deleteGroups = async (tournamentId: string) => {
  await query("DELETE FROM tournament_groups WHERE tournament_id=$1", [tournamentId]);
  return { ok: true };
};
