// Draft logic: start, pick, end. Pick advances the turn and auto-closes
// when there are no more eligible players.
import { tx, query } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { getTournament, patchTournament } from "./tournaments.js";
import { shuffleArray, requireActiveDraft, getDraftState } from "./draft-state.js";

export const startDraft = async (tournamentId: string) => {
  const t = await getTournament(tournamentId);
  if (t.status !== "draft") throw new HttpError(400, "INVALID_STATUS");
  const existing = await getDraftState(tournamentId);
  if (existing?.isActive) throw new HttpError(409, "DRAFT_ALREADY_ACTIVE");

  const teams = await query("SELECT id FROM teams WHERE tournament_id=$1", [tournamentId]);
  if (teams.length < 2) throw new HttpError(400, "NEED_TWO_CAPTAINS");

  const order = shuffleArray(teams.map((r) => r.id as string));
  const inserted = await query(
    `INSERT INTO draft_state (tournament_id, team_order, current_team_index, current_round, max_rounds, is_active)
     VALUES ($1,$2,0,1,5,'true') RETURNING *`,
    [tournamentId, JSON.stringify(order)]);
  return inserted[0];
};

export const endDraft = async (tournamentId: string) => {
  await query("UPDATE draft_state SET is_active='false' WHERE tournament_id=$1", [tournamentId]);
  return patchTournament(tournamentId, { status: "setup" });
};

const eligiblePlayerIds = async (tournamentId: string, teamIds: string[]) => {
  const regs = await query(
    `SELECT r.player_id FROM tournament_registrations r
     WHERE r.tournament_id=$1 AND r.is_captain=false
       AND r.player_id NOT IN (
         SELECT tp.player_id FROM team_players tp
         WHERE tp.team_id = ANY($2::text[])
       )`, [tournamentId, teamIds]);
  return regs.map((r) => r.player_id as string);
};

export const pickPlayer = async (
  tournamentId: string, actingTeamId: string, playerId: string, byAdmin: boolean,
) => tx(async (q) => {
  const state = await requireActiveDraft(tournamentId);
  if (!byAdmin && state.teamOrder[state.currentTeamIndex] !== actingTeamId) {
    throw new HttpError(409, "NOT_YOUR_TURN");
  }
  const dup = await q("SELECT id FROM team_players WHERE player_id=$1 AND team_id = ANY($2::text[])",
    [playerId, state.teamOrder]);
  if (dup.length) throw new HttpError(409, "PLAYER_ALREADY_PICKED");

  const pickNumber = ((await q("SELECT count(*)::int AS c FROM draft_history WHERE tournament_id=$1",
    [tournamentId]))[0].c as number) + 1;

  await q(
    `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2)`,
    [actingTeamId, playerId]);
  await q(
    `INSERT INTO draft_history (tournament_id, team_id, player_id, round, pick_order)
     VALUES ($1,$2,$3,$4,$5)`,
    [tournamentId, actingTeamId, playerId, state.currentRound, pickNumber]);

  let nextIndex = state.currentTeamIndex + 1;
  let nextRound = state.currentRound;
  if (nextIndex >= state.teamOrder.length) {
    nextIndex = 0; nextRound += 1;
  }

  const remaining = await eligiblePlayerIds(tournamentId, state.teamOrder);
  const isActive = remaining.length > 0 && nextRound <= state.maxRounds ? "true" : "false";

  await q(
    `UPDATE draft_state SET current_team_index=$2, current_round=$3, is_active=$4
     WHERE id=$1`, [state.id, nextIndex, nextRound, isActive]);

  return { pickOrder: pickNumber, nextIndex, nextRound, isActive: isActive === "true" };
});
