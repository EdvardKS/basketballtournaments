// Group-stage helpers: generation + standings recompute.
import { query, tx } from "../db/query.js";
import { shuffleArray } from "./draft-state.js";

export const generateGroups = async (tournamentId: string) => tx(async (q) => {
  const existing = await q("SELECT id FROM tournament_groups WHERE tournament_id=$1", [tournamentId]);
  if (existing.length > 0) return existing;

  const teams = await q("SELECT id FROM teams WHERE tournament_id=$1", [tournamentId]);
  if (teams.length < 2) return [];

  const shuffled = shuffleArray(teams.map((r) => r.id as string));
  const groupCount = Math.max(1, Math.floor(shuffled.length / 4));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((teamId, i) => groups[i % groupCount].push(teamId));

  const created: unknown[] = [];
  for (let i = 0; i < groups.length; i += 1) {
    const g = await q<Record<string, unknown>>(
      "INSERT INTO tournament_groups (tournament_id, name) VALUES ($1,$2) RETURNING *",
      [tournamentId, `Grupo ${String.fromCharCode(65 + i)}`]);
    created.push(g[0]);
    for (const teamId of groups[i]) {
      await q("INSERT INTO group_members (group_id, team_id) VALUES ($1,$2)",
        [g[0].id, teamId]);
    }
    // create round-robin matches
    for (let a = 0; a < groups[i].length; a += 1) {
      for (let b = a + 1; b < groups[i].length; b += 1) {
        await q(`INSERT INTO matches (tournament_id, group_id, stage, home_team_id, away_team_id)
                 VALUES ($1,$2,'group',$3,$4)`,
                [tournamentId, g[0].id, groups[i][a], groups[i][b]]);
      }
    }
  }
  return created;
});

interface Stat { points: number; gp: number; gw: number; gl: number; pf: number; pa: number; }

export const recomputeGroup = async (groupId: string) => tx(async (q) => {
  const members = await q<Record<string, unknown>>(
    "SELECT id, team_id FROM group_members WHERE group_id=$1", [groupId]);
  const stats = new Map<string, Stat>();
  members.forEach((m) => stats.set(m.team_id as string,
    { points: 0, gp: 0, gw: 0, gl: 0, pf: 0, pa: 0 }));

  const matches = await q<Record<string, unknown>>(
    "SELECT * FROM matches WHERE group_id=$1 AND status='completed'", [groupId]);
  for (const m of matches) {
    const h = stats.get(m.home_team_id as string);
    const a = stats.get(m.away_team_id as string);
    if (!h || !a) continue;
    const hs = Number(m.home_score ?? 0); const as = Number(m.away_score ?? 0);
    h.gp += 1; a.gp += 1; h.pf += hs; h.pa += as; a.pf += as; a.pa += hs;
    if (hs > as) { h.gw += 1; h.points += 2; a.gl += 1; }
    else if (as > hs) { a.gw += 1; a.points += 2; h.gl += 1; }
    else { h.points += 1; a.points += 1; }
  }

  for (const m of members) {
    const s = stats.get(m.team_id as string)!;
    await q(`UPDATE group_members SET
      points=$2, games_played=$3, games_won=$4, games_lost=$5,
      points_for=$6, points_against=$7 WHERE id=$1`,
      [m.id, s.points, s.gp, s.gw, s.gl, s.pf, s.pa]);
  }
});
