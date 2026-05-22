// Match CRUD: fetch, score updates, group standings, bracket trigger.
import { query, queryOne, tx } from "../db/query.js";
import { toMatch, toGroup, toGroupMember } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { generateKnockout, propagateBracketWinner } from "./bracket.js";
import { transitionTournament } from "./lifecycle.js";
import {
  autoGrantOnFinal, autoGrantOnThirdPlace,
} from "./player-achievements-grant.js";

export const matchesForTournament = async (tournamentId: string) => {
  await transitionTournament(tournamentId);
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
  await transitionTournament(tournamentId);
  const groups = await query(
    "SELECT * FROM tournament_groups WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  const result = [];
  for (const g of groups) {
    const members = await query(
      `SELECT gm.*, t.name AS team_name, t.logo AS team_logo
       FROM group_members gm JOIN teams t ON t.id=gm.team_id
       WHERE gm.group_id=$1
       ORDER BY
         gm.points DESC,
         (gm.points_for - gm.points_against) DESC,
         gm.points_for DESC,
         gm.games_won DESC`, [(g as { id: string }).id],
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

// Re-derives `group_members` from scratch by replaying every completed
// group match. Useful after admin-side scoring drift (matches with score
// saved but never finalized, or any historical inconsistency that left
// the running totals out of sync).
export const recomputeStandings = async (tournamentId: string) => {
  return tx(async (q) => {
    // 1) Reset every member of every group of this tournament.
    await q(
      `UPDATE group_members SET
         points         = 0,
         games_played   = 0,
         games_won      = 0,
         games_lost     = 0,
         points_for     = 0,
         points_against = 0
       WHERE group_id IN (SELECT id FROM tournament_groups WHERE tournament_id = $1)`,
      [tournamentId],
    );

    // 2) Replay every completed group match through updateStandings.
    const rows = await q(
      `SELECT id, group_id, home_team_id, away_team_id, home_score, away_score
       FROM matches
       WHERE tournament_id = $1
         AND stage = 'group'
         AND status = 'completed'
         AND home_score IS NOT NULL AND away_score IS NOT NULL
         AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL
         AND group_id IS NOT NULL
       ORDER BY completed_at NULLS LAST, created_at`,
      [tournamentId],
    );
    for (const r of rows as Array<{ group_id: string; home_team_id: string; away_team_id: string; home_score: number; away_score: number }>) {
      await updateStandings(q, r.group_id, r.home_team_id, r.away_team_id, r.home_score, r.away_score);
    }

    return { replayed: rows.length };
  });
};

export const completeMatch = async (matchId: string) => {
  return tx(async (q) => {
    const rows = await q("SELECT * FROM matches WHERE id=$1", [matchId]);
    if (rows.length === 0) throw new HttpError(404, "MATCH_NOT_FOUND");
    const m = toMatch(rows[0]);
    if (m.homeScore == null || m.awayScore == null) throw new HttpError(400, "NO_SCORE");
    // Guard: re-completing the same match would double-credit standings via
    // updateStandings()'s incremental UPDATEs. Bail out idempotently.
    if (m.status === "completed") return m;

    const winnerId = m.homeScore >= m.awayScore ? m.homeTeamId : m.awayTeamId;
    const updated = await q(
      "UPDATE matches SET status='completed', winner_id=$2, completed_at=NOW() WHERE id=$1 RETURNING *",
      [matchId, winnerId],
    );

    if (m.groupId && m.homeTeamId && m.awayTeamId) {
      await updateStandings(q, m.groupId, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore);
    }

    // Propagate KO winner to the next round's slot (no-op for group matches
    // and for final / third_place). Idempotent — safe on re-completes.
    if (m.stage !== "group") {
      const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      await propagateBracketWinner(q, m.tournamentId, m.stage, m.roundNumber, winnerId, loserId);
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

    // If the final just closed, pin the winning TEAM as winner_id. The FK
    // fk_tournaments_winner references teams(id) — earlier code wrote the
    // captain's player id, which crashed with a 23503 foreign-key violation.
    //
    // SPEC-014: the tournament status only flips to 'completed' when EVERY
    // match in the tournament is completed — including the third_place and
    // any lingering group/quarter matches. The previous behaviour marked
    // the tournament completed as soon as the final closed, which made the
    // admin panel offer "Crear nuevo torneo" while half the bracket still
    // had pending scores.
    if (m.stage === "final" && winnerId) {
      await q(
        "UPDATE tournaments SET winner_id=$1 WHERE id=$2",
        [winnerId, m.tournamentId],
      );
      const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      await autoGrantOnFinal(m.tournamentId, winnerId, loserId);
    }
    if (m.stage === "third_place" && winnerId) {
      await autoGrantOnThirdPlace(m.tournamentId, winnerId);
    }

    // SPEC-014: try to close the tournament now. Idempotent — only flips
    // status when no matches remain pending.
    await closeIfAllMatchesCompleted(q, m.tournamentId);

    return toMatch(updated[0]);
  });
};

// SPEC-014: close a tournament iff every match has status 'completed' and
// the tournament is not already in a terminal state. Forward-only.
const closeIfAllMatchesCompleted = async (
  q: <R = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<R[]>,
  tournamentId: string,
): Promise<void> => {
  const pending = await q<{ id: string }>(
    "SELECT id FROM matches WHERE tournament_id=$1 AND status<>'completed' LIMIT 1",
    [tournamentId],
  );
  if (pending.length > 0) return;
  await q(
    "UPDATE tournaments SET status='completed' WHERE id=$1 AND status<>'completed'",
    [tournamentId],
  );
};
