// Draft orchestration: start, pick, end. Implements no-repeat round ordering.
import { query, queryOne, tx } from "../db/query.js";
import { toDraftState } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { generateGroups } from "./groups.js";
import { generateSchedule } from "./schedule.js";

// Fisher-Yates shuffle
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Next round order: no captain can occupy the same position as any previous round in the cycle.
export const nextRoundOrder = (
  teams: string[],
  history: { round: number; order: string[] }[],
): string[] => {
  const n = teams.length;
  // Build forbidden[position] = Set of teamIds that have been there
  const forbidden: Set<string>[] = Array.from({ length: n }, () => new Set<string>());
  for (const h of history) {
    h.order.forEach((tid, pos) => forbidden[pos].add(tid));
  }
  // Check if all positions are saturated for all teams → reset cycle
  const allFull = teams.every((t) => forbidden.some((f) => !f.has(t)));
  if (!allFull) return shuffle(teams); // Reset: allow any permutation

  // Try up to 200 random shuffles that satisfy constraints
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = shuffle(teams);
    if (candidate.every((t, pos) => !forbidden[pos].has(t))) return candidate;
  }
  // Fallback: backtracking (works for small N)
  const result: string[] = new Array(n);
  const used = new Set<string>();
  const backtrack = (pos: number): boolean => {
    if (pos === n) return true;
    for (const t of teams) {
      if (used.has(t) || forbidden[pos].has(t)) continue;
      result[pos] = t; used.add(t);
      if (backtrack(pos + 1)) return true;
      used.delete(t);
    }
    return false;
  };
  if (backtrack(0)) return result;
  return shuffle(teams); // ultimate fallback: ignore constraint
};

export const startDraft = async (tournamentId: string) => {
  const existing = await queryOne(
    "SELECT id FROM draft_state WHERE tournament_id=$1 AND is_active='true'",
    [tournamentId],
  );
  if (existing) throw new HttpError(409, "DRAFT_ALREADY_ACTIVE");

  const teams = await query(
    "SELECT id FROM teams WHERE tournament_id=$1 ORDER BY name", [tournamentId],
  );
  if (teams.length < 2) throw new HttpError(400, "NOT_ENOUGH_TEAMS");

  const teamIds = shuffle(teams.map((t) => (t as { id: string }).id));
  const initialHistory = JSON.stringify([{ round: 1, order: teamIds }]);
  const row = await queryOne(
    `INSERT INTO draft_state
       (tournament_id, team_order, current_team_index, current_round, max_rounds, is_active, round_order_history)
     VALUES ($1,$2,0,1,99,'true',$3)
     RETURNING *`,
    [tournamentId, JSON.stringify(teamIds), initialHistory],
  );
  await queryOne(
    "UPDATE tournaments SET status='draft' WHERE id=$1", [tournamentId],
  );
  return toDraftState(row!);
};

export const pickPlayer = async (
  tournamentId: string, teamId: string, playerId: string, isAdmin: boolean,
) => {
  return tx(async (q) => {
    const stateRow = await q(
      "SELECT * FROM draft_state WHERE tournament_id=$1 AND is_active='true'", [tournamentId],
    );
    if (stateRow.length === 0) throw new HttpError(404, "DRAFT_NOT_ACTIVE");
    const state = toDraftState(stateRow[0]);
    const currentTeamId = state.teamOrder[state.currentTeamIndex];
    if (!isAdmin && currentTeamId !== teamId) throw new HttpError(403, "NOT_YOUR_TURN");

    // Validate player is available
    const available = await q(
      `SELECT p.id FROM tournament_registrations r
       JOIN players p ON p.id = r.player_id
       WHERE r.tournament_id=$1 AND p.id=$2
         AND p.id NOT IN (SELECT tp.player_id FROM team_players tp JOIN teams t ON t.id=tp.team_id WHERE t.tournament_id=$1)`,
      [tournamentId, playerId],
    );
    if (available.length === 0) throw new HttpError(409, "PLAYER_NOT_AVAILABLE");

    const pickOrder = (state.currentRound - 1) * state.teamOrder.length + state.currentTeamIndex + 1;
    await q(
      "INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [currentTeamId, playerId],
    );
    await q(
      "INSERT INTO draft_history (tournament_id, team_id, player_id, round, pick_order) VALUES ($1,$2,$3,$4,$5)",
      [tournamentId, currentTeamId, playerId, state.currentRound, pickOrder],
    );

    // Advance index / round
    let nextIndex = state.currentTeamIndex + 1;
    let nextRound = state.currentRound;
    let history = state.roundOrderHistory;
    let order = state.teamOrder;
    if (nextIndex >= state.teamOrder.length) {
      nextIndex = 0; nextRound++;
      order = nextRoundOrder(state.teamOrder, history);
      history = [...history, { round: nextRound, order }];
    }

    // Check if all players are drafted
    const remaining = await q(
      `SELECT p.id FROM tournament_registrations r JOIN players p ON p.id=r.player_id
       WHERE r.tournament_id=$1 AND p.role!='admin'
         AND p.id NOT IN (SELECT tp.player_id FROM team_players tp JOIN teams t ON t.id=tp.team_id WHERE t.tournament_id=$1)`,
      [tournamentId],
    );
    if (remaining.length === 0) {
      await q("UPDATE draft_state SET is_active='false' WHERE tournament_id=$1 AND is_active='true'", [tournamentId]);
      await endDraftInternal(tournamentId);
    } else {
      await q(
        `UPDATE draft_state SET current_team_index=$2, current_round=$3,
           team_order=$4, round_order_history=$5
         WHERE tournament_id=$1 AND is_active='true'`,
        [tournamentId, nextIndex, nextRound, JSON.stringify(order), JSON.stringify(history)],
      );
    }
    const updated = await q("SELECT * FROM draft_state WHERE tournament_id=$1 ORDER BY created_at DESC LIMIT 1", [tournamentId]);
    return toDraftState(updated[0]);
  });
};

const endDraftInternal = async (tournamentId: string) => {
  await generateGroups(tournamentId);
  await generateSchedule(tournamentId);
  // Status → setup AND hours auto-published (no separate "publicar horas" step).
  await queryOne(
    "UPDATE tournaments SET status='setup', hours_confirmed=true WHERE id=$1",
    [tournamentId],
  );
};

export const endDraft = async (tournamentId: string) => {
  await queryOne(
    "UPDATE draft_state SET is_active='false' WHERE tournament_id=$1 AND is_active='true'",
    [tournamentId],
  );
  await endDraftInternal(tournamentId);
  return { ok: true };
};
