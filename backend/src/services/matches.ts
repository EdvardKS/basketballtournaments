// Match CRUD: fetch, score updates, group standings, bracket trigger.
import { query, queryOne, tx } from "../db/query.js";
import { toMatch, toGroup, toGroupMember } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { generateKnockout } from "./bracket.js";

export const matchesForTournament = async (tournamentId: string) => {
  const rows = await query(
    `SELECT m.*,
       ht.name AS home_team_name, ht.logo AS home_team_logo,
       at.name AS away_team_name, at.logo AS away_team_logo
     FROM matches m
     LEFT JOIN teams ht ON ht.id = m.home_team_id
     LEFT JOIN teams at ON at.id = m.away_team_id
     WHERE m.tournament_id=$1
     ORDER BY m.scheduled_at NULLS LAST, m.created_at`, [tournamentId],
  );
  return rows.map((r) => ({ ...toMatch(r), homeTeamName: r.home_team_name, awayTeamName: r.away_team_name, homeTeamLogo: r.home_team_logo, awayTeamLogo: r.away_team_logo }));
};

export const groupsForTournament = async (tournamentId: string) => {
  const groups = await query(
    "SELECT * FROM tournament_groups WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  const result = [];
  for (const g of groups) {
    const members = await query(
      `SELECT gm.*, t.name AS team_name, t.logo AS team_logo
       FROM group_members gm JOIN teams t ON t.id=gm.team_id
       WHERE gm.group_id=$1
       ORDER BY gm.points DESC, (gm.points_for - gm.points_against) DESC`, [(g as { id: string }).id],
    );
    result.push({ group: toGroup(g), members: members.map((m) => ({ ...toGroupMember(m), teamName: m.team_name, teamLogo: m.team_logo })) });
  }
  return result;
};

export const startMatch = async (matchId: string, _body: unknown) => {
  const row = await queryOne(
    "UPDATE matches SET status='in_progress', started_at=NOW() WHERE id=$1 AND status='pending' RETURNING *",
    [matchId],
  );
  if (!row) throw new HttpError(404, "MATCH_NOT_FOUND_OR_WRONG_STATUS");
  return toMatch(row);
};

const updateStandings = async (
  q: typeof query, groupId: string, homeId: string, awayId: string,
  homeScore: number, awayScore: number,
) => {
  const homeWin = homeScore > awayScore;
  await q(
    `UPDATE group_members SET
       games_played = games_played + 1,
       games_won    = games_won    + $2,
       games_lost   = games_lost   + $3,
       points       = points       + $4,
       points_for   = points_for   + $5,
       points_against = points_against + $6
     WHERE group_id=$1 AND team_id=$7`,
    [groupId, homeWin ? 1 : 0, homeWin ? 0 : 1, homeWin ? 2 : 0, homeScore, awayScore, homeId],
  );
  await q(
    `UPDATE group_members SET
       games_played = games_played + 1,
       games_won    = games_won    + $2,
       games_lost   = games_lost   + $3,
       points       = points       + $4,
       points_for   = points_for   + $5,
       points_against = points_against + $6
     WHERE group_id=$1 AND team_id=$7`,
    [groupId, homeWin ? 0 : 1, homeWin ? 1 : 0, homeWin ? 0 : 2, awayScore, homeScore, awayId],
  );
};

export const updateScore = async (matchId: string, body: unknown) => {
  const { homeScore, awayScore } = body as { homeScore: number; awayScore: number };
  const match = await queryOne("SELECT * FROM matches WHERE id=$1", [matchId]);
  if (!match) throw new HttpError(404, "MATCH_NOT_FOUND");
  const m = toMatch(match);
  const row = await queryOne(
    "UPDATE matches SET home_score=$2, away_score=$3 WHERE id=$1 RETURNING *",
    [matchId, homeScore, awayScore],
  );
  return toMatch(row!);
};

export const completeMatch = async (matchId: string) => {
  return tx(async (q) => {
    const rows = await q("SELECT * FROM matches WHERE id=$1", [matchId]);
    if (rows.length === 0) throw new HttpError(404, "MATCH_NOT_FOUND");
    const m = toMatch(rows[0]);
    if (m.homeScore == null || m.awayScore == null) throw new HttpError(400, "NO_SCORE");

    const winnerId = m.homeScore >= m.awayScore ? m.homeTeamId : m.awayTeamId;
    const updated = await q(
      "UPDATE matches SET status='completed', winner_id=$2, completed_at=NOW() WHERE id=$1 RETURNING *",
      [matchId, winnerId],
    );

    if (m.groupId && m.homeTeamId && m.awayTeamId) {
      await updateStandings(q, m.groupId, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore);
    }

    // If all group matches completed, auto-generate knockout
    const pending = await q(
      "SELECT id FROM matches WHERE tournament_id=$1 AND stage='group' AND status!='completed'",
      [m.tournamentId],
    );
    if (pending.length === 0 && m.stage === "group") {
      await generateKnockout(m.tournamentId);
      await q("UPDATE tournaments SET status='active' WHERE id=$1", [m.tournamentId]);
    }
    return toMatch(updated[0]);
  });
};
