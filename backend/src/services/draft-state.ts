// Draft state reads: current turn, history, available players.
import { query, queryOne } from "../db/query.js";
import { toDraftState, toDraftHistory, toPlayer, toTeam } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { transitionTournament } from "./lifecycle.js";

export const getDraftState = async (tournamentId: string) => {
  // Date-based: opening the draft view may be enough to start it.
  await transitionTournament(tournamentId);
  const row = await queryOne(
    "SELECT * FROM draft_state WHERE tournament_id=$1 ORDER BY created_at DESC LIMIT 1",
    [tournamentId],
  );
  if (!row) throw new HttpError(404, "DRAFT_NOT_STARTED");
  const state = toDraftState(row);

  // Available players: registered but not yet drafted
  const available = await query(
    `SELECT p.* FROM tournament_registrations r
     JOIN players p ON p.id = r.player_id
     WHERE r.tournament_id = $1
       AND p.role != 'admin'
       AND p.id NOT IN (
         SELECT tp.player_id FROM team_players tp
         JOIN teams t ON t.id = tp.team_id
         WHERE t.tournament_id = $1
       )
     ORDER BY p.overall DESC`, [tournamentId],
  );

  // Teams with their current rosters
  const teams = await query(
    `SELECT t.*, json_agg(
        jsonb_build_object('id', p.id, 'name', p.name, 'overall', p.overall, 'position', p.position, 'avatar', p.avatar)
        ORDER BY tp.drafted_at
      ) FILTER (WHERE p.id IS NOT NULL) AS players
     FROM teams t
     LEFT JOIN team_players tp ON tp.team_id = t.id
     LEFT JOIN players p ON p.id = tp.player_id
     WHERE t.tournament_id = $1
     GROUP BY t.id ORDER BY t.name`, [tournamentId],
  );

  return {
    state,
    availablePlayers: available.map(toPlayer),
    teams: teams.map((r) => ({
      ...toTeam(r),
      players: (r as { players: unknown[] | null }).players ?? [],
    })),
    currentTeamId: state.isActive ? state.teamOrder[state.currentTeamIndex] ?? null : null,
  };
};

export const listDraftHistory = async (tournamentId: string) => {
  const rows = await query(
    `SELECT dh.*, p.name AS player_name, p.position AS player_position, p.overall AS player_overall,
            t.name AS team_name
     FROM draft_history dh
     JOIN players p ON p.id = dh.player_id
     JOIN teams t ON t.id = dh.team_id
     WHERE dh.tournament_id = $1
     ORDER BY dh.round, dh.pick_order`, [tournamentId],
  );
  return rows.map(toDraftHistory);
};
