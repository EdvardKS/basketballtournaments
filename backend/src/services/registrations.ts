// Tournament registrations (player ↔ tournament many-to-many).
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { getTournament } from "./tournaments.js";

export const listRegistrations = async (tournamentId: string) => {
  return query(
    `SELECT r.*, p.name, p.mobile, p.role AS player_role, p.position,
            p.pace, p.shooting, p.passing, p.dribbling, p.defense, p.physical, p.overall,
            p.is_public, p.avatar
     FROM tournament_registrations r
     JOIN players p ON p.id = r.player_id
     WHERE r.tournament_id = $1
     ORDER BY r.registered_at ASC`, [tournamentId]);
};

export const registerForTournament = async (
  tournamentId: string, playerId: string,
) => {
  const t = await getTournament(tournamentId);
  if (!["open","draft"].includes(t.status)) {
    throw new HttpError(400, "TOURNAMENT_CLOSED");
  }
  const dup = await queryOne(
    "SELECT id FROM tournament_registrations WHERE tournament_id=$1 AND player_id=$2",
    [tournamentId, playerId],
  );
  if (dup) throw new HttpError(409, "ALREADY_REGISTERED");
  const row = await queryOne(
    `INSERT INTO tournament_registrations (tournament_id, player_id)
     VALUES ($1,$2) RETURNING *`, [tournamentId, playerId]);
  return row;
};

export const unregisterFromTournament = async (
  tournamentId: string, playerId: string,
) => {
  const reg = await queryOne(
    "SELECT * FROM tournament_registrations WHERE tournament_id=$1 AND player_id=$2",
    [tournamentId, playerId]);
  if (!reg) throw new HttpError(404, "NOT_REGISTERED");
  if ((reg as { is_captain: boolean }).is_captain) {
    throw new HttpError(409, "CAPTAIN_CANNOT_UNREGISTER");
  }
  await query(
    "DELETE FROM tournament_registrations WHERE tournament_id=$1 AND player_id=$2",
    [tournamentId, playerId]);
  return { ok: true };
};

export const setCaptain = async (
  tournamentId: string, playerId: string, isCaptain: boolean, teamName?: string,
) => {
  return tx(async (q) => {
    const reg = await q<Record<string, unknown>>(
      `UPDATE tournament_registrations SET is_captain=$1, team_name=$2
       WHERE tournament_id=$3 AND player_id=$4 RETURNING *`,
      [isCaptain, teamName ?? null, tournamentId, playerId]);
    if (reg.length === 0) throw new HttpError(404, "NOT_REGISTERED");
    if (isCaptain) {
      const existing = await q(
        "SELECT id FROM teams WHERE tournament_id=$1 AND captain_id=$2",
        [tournamentId, playerId]);
      if (existing.length === 0) {
        const team = await q<Record<string, unknown>>(
          `INSERT INTO teams (tournament_id, captain_id, name)
           VALUES ($1,$2,$3) RETURNING *`,
          [tournamentId, playerId, teamName ?? "Equipo sin nombre"]);
        await q(
          `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING`, [team[0].id, playerId]);
      }
    }
    return reg[0];
  });
};
