// Group generation: divide teams into balanced groups, seed fixtures.
import { query, queryOne, tx } from "../db/query.js";
import { toGroup } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { generateKnockout } from "./bracket.js";
import { assertBracketUnlocked } from "./tournaments.js";

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

// Admin-driven regroup: wipe existing groups + every match scaffolded from
// them (group fixtures AND knockout placeholders) and rebuild from the
// caller's payload. Refuses if any match has already been touched (started
// or completed) — the lifecycle services own the data from then on.
export interface RegroupGroupInput {
  name: string;
  teamIds: string[];
  color?: string | null;
  logo?: string | null;
}

export const regroupTeams = async (
  tournamentId: string, input: RegroupGroupInput[],
) => {
  await assertBracketUnlocked(tournamentId);
  if (!Array.isArray(input) || input.length === 0) {
    throw new HttpError(400, "GROUPS_REQUIRED", "Debes enviar al menos un grupo.");
  }
  for (const g of input) {
    if (!g || typeof g.name !== "string" || g.name.trim().length === 0) {
      throw new HttpError(400, "GROUP_NAME_REQUIRED", "Cada grupo necesita un nombre.");
    }
    if (!Array.isArray(g.teamIds) || g.teamIds.length === 0) {
      throw new HttpError(400, "GROUP_EMPTY",
        `El grupo ${g.name} no tiene equipos.`);
    }
  }

  // Every team must belong to exactly one group, and every team in the
  // payload must already exist in the tournament.
  const tournamentTeams = await query(
    "SELECT id FROM teams WHERE tournament_id=$1", [tournamentId]);
  const knownTeamIds = new Set(
    tournamentTeams.map((t) => (t as { id: string }).id));

  const seen = new Set<string>();
  for (const g of input) {
    for (const tid of g.teamIds) {
      if (!knownTeamIds.has(tid)) {
        throw new HttpError(400, "TEAM_NOT_IN_TOURNAMENT",
          `El equipo ${tid} no pertenece a este torneo.`);
      }
      if (seen.has(tid)) {
        throw new HttpError(400, "TEAM_IN_MULTIPLE_GROUPS",
          "Un equipo no puede estar en dos grupos.");
      }
      seen.add(tid);
    }
  }
  if (seen.size !== knownTeamIds.size) {
    throw new HttpError(400, "TEAMS_MISSING_FROM_GROUPS",
      `Faltan ${knownTeamIds.size - seen.size} equipos por asignar.`);
  }

  // Refuse the wipe if any match has been touched — admin should not be
  // restructuring groups once the matchday has started.
  const touched = await query(
    "SELECT 1 FROM matches WHERE tournament_id=$1 AND status <> 'pending' LIMIT 1",
    [tournamentId]);
  if (touched.length > 0) {
    throw new HttpError(409, "MATCHES_ALREADY_TOUCHED",
      "Hay partidos en juego o finalizados; los grupos no se pueden reasignar.");
  }

  return tx(async (q) => {
    // Wipe all matches and groups for the tournament. group_members
    // cascades from tournament_groups; matches drop on their own.
    await q("DELETE FROM matches WHERE tournament_id=$1", [tournamentId]);
    await q("DELETE FROM tournament_groups WHERE tournament_id=$1", [tournamentId]);

    const created = [];
    for (const g of input) {
      const grp = await q<Record<string, unknown>>(
        `INSERT INTO tournament_groups (tournament_id, name, color, logo)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [tournamentId, g.name.trim(), g.color ?? null, g.logo ?? null]);
      const groupId = (grp[0] as { id: string }).id;
      for (const tid of g.teamIds) {
        await q(
          "INSERT INTO group_members (group_id, team_id) VALUES ($1,$2)",
          [groupId, tid]);
      }
      // Round-robin fixtures inside this group.
      for (let a = 0; a < g.teamIds.length; a++) {
        for (let b = a + 1; b < g.teamIds.length; b++) {
          await q(
            `INSERT INTO matches (tournament_id, group_id, stage, home_team_id, away_team_id, status)
             VALUES ($1,$2,'group',$3,$4,'pending')`,
            [tournamentId, groupId, g.teamIds[a], g.teamIds[b]]);
        }
      }
      created.push(toGroup(grp[0]));
    }
    return { ok: true, groups: created };
  }).then(async (out) => {
    // Re-scaffold the knockout bracket using the new group layout so the
    // preview shows seed labels matching the new structure. Failures here
    // are non-fatal (e.g. format unsupported for current group count); the
    // admin will see them when picking a format in the Eliminatorias tab.
    try { await generateKnockout(tournamentId); }
    catch (_e) { /* swallow */ }
    return out;
  });
};

// Cosmetic-only update for a single group: name, color, logo. Does not touch
// fixtures or membership, so safe to call repeatedly while the admin tweaks
// the visual identity. The tournament guard mirrors regroupTeams: refuse if
// any match has already been played, so we don't rewrite history.
export const updateGroupMeta = async (
  tournamentId: string, groupId: string,
  patch: { name?: string; color?: string | null; logo?: string | null },
) => {
  await assertBracketUnlocked(tournamentId);
  const owner = await queryOne(
    "SELECT id FROM tournament_groups WHERE id=$1 AND tournament_id=$2",
    [groupId, tournamentId]);
  if (!owner) throw new HttpError(404, "GROUP_NOT_FOUND");

  const sets: string[] = [];
  const args: unknown[] = [];
  let i = 1;
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (n.length === 0) throw new HttpError(400, "GROUP_NAME_REQUIRED");
    sets.push(`name=$${i++}`); args.push(n);
  }
  if (patch.color !== undefined) { sets.push(`color=$${i++}`); args.push(patch.color); }
  if (patch.logo  !== undefined) { sets.push(`logo=$${i++}`);  args.push(patch.logo);  }
  if (sets.length === 0) return { ok: true };

  args.push(groupId);
  const row = await queryOne(
    `UPDATE tournament_groups SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`,
    args);
  return { ok: true, group: row ? toGroup(row) : null };
};
