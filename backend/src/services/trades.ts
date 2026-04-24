// Trade offers between captains. At most 2 pending offers per target.
import { z } from "zod";
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { getTournament } from "./tournaments.js";

export const offerSchema = z.object({
  tournamentId: z.string().min(1),
  targetPlayerId: z.string().min(1),
  offeredPlayerIds: z.array(z.string().min(1)).min(1).max(3),
});

export const listTrades = async (tournamentId: string) => {
  return query(
    `SELECT * FROM trade_offers WHERE tournament_id=$1
     ORDER BY created_at DESC`, [tournamentId]);
};

const findTeamOfCaptain = async (tournamentId: string, captainId: string) => {
  const row = await queryOne(
    "SELECT * FROM teams WHERE tournament_id=$1 AND captain_id=$2",
    [tournamentId, captainId]);
  if (!row) throw new HttpError(404, "TEAM_NOT_FOUND");
  return row as Record<string, unknown>;
};

const findTeamOfPlayer = async (tournamentId: string, playerId: string) => {
  const row = await queryOne(
    `SELECT t.* FROM teams t
     JOIN team_players tp ON tp.team_id = t.id
     WHERE t.tournament_id=$1 AND tp.player_id=$2`, [tournamentId, playerId]);
  if (!row) throw new HttpError(404, "PLAYER_HAS_NO_TEAM");
  return row as Record<string, unknown>;
};

export const createTrade = async (captainId: string, raw: unknown) => {
  const data = offerSchema.parse(raw);
  const tournament = await getTournament(data.tournamentId);
  const start = new Date(`${tournament.date}T00:00:00`);
  if (!isNaN(start.getTime()) && Date.now() >= start.getTime()) {
    throw new HttpError(400, "TRADE_WINDOW_CLOSED");
  }
  const requestingTeam = await findTeamOfCaptain(data.tournamentId, captainId);
  if (data.offeredPlayerIds.includes(captainId)) {
    throw new HttpError(400, "CANNOT_OFFER_CAPTAIN");
  }
  const targetTeam = await findTeamOfPlayer(data.tournamentId, data.targetPlayerId);
  if (targetTeam.id === requestingTeam.id) throw new HttpError(400, "SAME_TEAM");
  if (targetTeam.captain_id === data.targetPlayerId) throw new HttpError(400, "TARGET_IS_CAPTAIN");

  const pending = await query(
    `SELECT id FROM trade_offers WHERE target_player_id=$1 AND status='pending'
       AND tournament_id=$2`, [data.targetPlayerId, data.tournamentId]);
  if (pending.length >= 2) throw new HttpError(409, "TOO_MANY_OFFERS");

  const row = await queryOne(
    `INSERT INTO trade_offers
       (tournament_id, requesting_team_id, target_team_id, target_player_id, offered_player_ids)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.tournamentId, requestingTeam.id, targetTeam.id,
     data.targetPlayerId, JSON.stringify(data.offeredPlayerIds)]);
  return row;
};

export const resolveTrade = async (
  offerId: string, actingPlayerId: string, role: string, action: "accept"|"reject",
) => tx(async (q) => {
  const rows = await q<Record<string, unknown>>("SELECT * FROM trade_offers WHERE id=$1", [offerId]);
  const offer = rows[0];
  if (!offer) throw new HttpError(404, "OFFER_NOT_FOUND");
  if (offer.status !== "pending") throw new HttpError(409, "OFFER_CLOSED");

  const targetTeam = (await q<Record<string, unknown>>(
    "SELECT * FROM teams WHERE id=$1", [offer.target_team_id]))[0];
  if (role !== "admin" && targetTeam.captain_id !== actingPlayerId) {
    throw new HttpError(403, "FORBIDDEN");
  }

  if (action === "reject") {
    await q(`UPDATE trade_offers SET status='rejected', resolved_at=now(), resolved_by=$2 WHERE id=$1`,
      [offerId, actingPlayerId]);
    return { ok: true };
  }

  const offered: string[] = JSON.parse(offer.offered_player_ids as string);
  const pickedOffered = offered[0];
  await q(`DELETE FROM team_players WHERE team_id=$1 AND player_id=$2`,
    [offer.requesting_team_id, pickedOffered]);
  await q(`DELETE FROM team_players WHERE team_id=$1 AND player_id=$2`,
    [offer.target_team_id, offer.target_player_id]);
  await q(`INSERT INTO team_players (team_id, player_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING`, [offer.target_team_id, pickedOffered]);
  await q(`INSERT INTO team_players (team_id, player_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING`, [offer.requesting_team_id, offer.target_player_id]);
  await q(`UPDATE trade_offers SET status='accepted', resolved_at=now(), resolved_by=$2 WHERE id=$1`,
    [offerId, actingPlayerId]);
  await q(`UPDATE trade_offers SET status='cancelled', resolved_at=now()
           WHERE target_player_id=$1 AND tournament_id=$2 AND status='pending' AND id<>$3`,
    [offer.target_player_id, offer.tournament_id, offerId]);
  return { ok: true };
});
