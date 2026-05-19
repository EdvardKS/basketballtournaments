// Read/write helpers for the draft_state row of a tournament.
import { query, queryOne } from "../db/query.js";
import { HttpError } from "../middleware/error.js";

export interface DraftStateRow {
  id: string; tournamentId: string;
  teamOrder: string[]; currentTeamIndex: number;
  currentRound: number; maxRounds: number;
  isActive: boolean;
}

export const shuffleArray = <T>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const getDraftState = async (
  tournamentId: string,
): Promise<DraftStateRow | null> => {
  const row = await queryOne(
    "SELECT * FROM draft_state WHERE tournament_id=$1 ORDER BY created_at DESC LIMIT 1",
    [tournamentId]);
  if (!row) return null;
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    teamOrder: JSON.parse(row.team_order as string),
    currentTeamIndex: Number(row.current_team_index),
    currentRound: Number(row.current_round),
    maxRounds: Number(row.max_rounds),
    isActive: row.is_active === "true",
  };
};

export const listDraftHistory = async (tournamentId: string) => {
  return query(
    `SELECT h.*, p.name AS player_name, t.name AS team_name
     FROM draft_history h
     JOIN players p ON p.id = h.player_id
     JOIN teams t ON t.id = h.team_id
     WHERE h.tournament_id=$1
     ORDER BY h.pick_order ASC`, [tournamentId]);
};

export const requireActiveDraft = async (tournamentId: string) => {
  const s = await getDraftState(tournamentId);
  if (!s || !s.isActive) throw new HttpError(400, "DRAFT_NOT_ACTIVE");
  return s;
};
