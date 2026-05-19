// Tournament registrations (player ↔ tournament many-to-many).
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { getTournament } from "./tournaments.js";
import { exportTournamentRegistrationsCsv } from "./registration-backup.js";

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
  await exportTournamentRegistrationsCsv(tournamentId);
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
  await exportTournamentRegistrationsCsv(tournamentId);
  return { ok: true };
};

// Tournament statuses where admin can still wire captains around. Once the
// draft is live everything is frozen — the only way to change a captain at
// that point is the captain's own transfer-captain action.
const CAPTAIN_EDIT_STATUSES = new Set(["upcoming", "open"]);

export const setCaptain = async (
  tournamentId: string, playerId: string, isCaptain: boolean, teamName?: string,
) => {
  const t = await getTournament(tournamentId);
  if (!CAPTAIN_EDIT_STATUSES.has(t.status)) {
    throw new HttpError(409, "CAPTAIN_EDIT_LOCKED",
      "Una vez comenzado el draft, el capitán solo puede traspasar su rol a un jugador de su plantilla.");
  }
  return tx(async (q) => {
    const reg = await q<Record<string, unknown>>(
      `UPDATE tournament_registrations SET is_captain=$1, team_name=$2
       WHERE tournament_id=$3 AND player_id=$4 RETURNING *`,
      [isCaptain, teamName ?? null, tournamentId, playerId]);
    if (reg.length === 0) throw new HttpError(404, "NOT_REGISTERED");
    if (isCaptain) {
      await q(
        "UPDATE players SET role='captain' WHERE id=$1 AND role='player'",
        [playerId]);
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
    } else {
      // Demoting in pre-draft: drop the team entirely (logo, name, whatsapp,
      // roster — everything). Admin-side UI is expected to double-confirm
      // before calling this; the warning lives there, not here.
      const teams = await q<{ id: string }>(
        "SELECT id FROM teams WHERE tournament_id=$1 AND captain_id=$2",
        [tournamentId, playerId]);
      for (const team of teams) {
        await q("DELETE FROM team_players WHERE team_id=$1", [team.id]);
        await q("DELETE FROM teams WHERE id=$1", [team.id]);
      }
      // Demote the player role only if they aren't captaining anywhere else.
      const other = await q<{ id: string }>(
        "SELECT id FROM tournament_registrations WHERE player_id=$1 AND is_captain=true",
        [playerId]);
      if (other.length === 0) {
        await q(
          "UPDATE players SET role='player' WHERE id=$1 AND role='captain'",
          [playerId]);
      }
    }
    return reg[0];
  }).then(async (result) => {
    await exportTournamentRegistrationsCsv(tournamentId);
    return result;
  });
};

// Captain hands the captaincy to a player they've already picked. Only the
// current captain (or admin) can call it; the target must be on the team's
// roster. Roles and registration flags swap; the team row keeps its id,
// logo, name, whatsapp, description — only captain_id changes.
export const transferCaptaincy = async (
  teamId: string, newCaptainPlayerId: string, callerId: string, callerRole: string,
) => {
  const result = await tx(async (q) => {
    const teamRows = await q<{
      id: string; tournament_id: string; captain_id: string; name: string;
    }>("SELECT * FROM teams WHERE id=$1", [teamId]);
    if (teamRows.length === 0) throw new HttpError(404, "TEAM_NOT_FOUND");
    const team = teamRows[0];
    if (callerRole !== "admin" && team.captain_id !== callerId) {
      throw new HttpError(403, "FORBIDDEN");
    }
    if (team.captain_id === newCaptainPlayerId) {
      throw new HttpError(409, "ALREADY_CAPTAIN");
    }
    const roster = await q<{ player_id: string }>(
      "SELECT player_id FROM team_players WHERE team_id=$1",
      [teamId]);
    if (!roster.some((r) => r.player_id === newCaptainPlayerId)) {
      throw new HttpError(409, "NOT_IN_TEAM");
    }
    // Captain transfer is only useful once the captain has actually drafted
    // someone — i.e. the roster has at least 2 entries (old captain + pick).
    if (roster.length < 2) {
      throw new HttpError(409, "NO_PICKS_YET");
    }
    const oldCaptainId = team.captain_id;

    await q("UPDATE teams SET captain_id=$1 WHERE id=$2",
      [newCaptainPlayerId, teamId]);
    await q(
      `UPDATE tournament_registrations SET is_captain=false
       WHERE tournament_id=$1 AND player_id=$2`,
      [team.tournament_id, oldCaptainId]);
    await q(
      `UPDATE tournament_registrations SET is_captain=true
       WHERE tournament_id=$1 AND player_id=$2`,
      [team.tournament_id, newCaptainPlayerId]);
    await q(
      "UPDATE players SET role='captain' WHERE id=$1 AND role='player'",
      [newCaptainPlayerId]);
    // Demote the old captain only if they hold no other captaincies.
    const other = await q<{ id: string }>(
      "SELECT id FROM tournament_registrations WHERE player_id=$1 AND is_captain=true",
      [oldCaptainId]);
    if (other.length === 0) {
      await q(
        "UPDATE players SET role='player' WHERE id=$1 AND role='captain'",
        [oldCaptainId]);
    }
    return { tournamentId: team.tournament_id, oldCaptainId, newCaptainId: newCaptainPlayerId };
  });
  await exportTournamentRegistrationsCsv(result.tournamentId);
  return result;
};
