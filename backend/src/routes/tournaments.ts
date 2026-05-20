// Tournament routes + nested registration/captain endpoints.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listTournaments, getTournament, createTournament, patchTournament,
  softDeleteTournament,
} from "../services/tournaments.js";
import {
  listRegistrations, registerForTournament,
  unregisterFromTournament, setCaptain,
} from "../services/registrations.js";
import { listTeamsForTournament } from "../services/teams.js";
import { exportTournamentRegistrationsCsv } from "../services/registration-backup.js";

export const tournamentsRouter = Router();

tournamentsRouter.get("/", asyncRoute(async (_req, res) => {
  res.json(await listTournaments());
}));

tournamentsRouter.get("/:id", asyncRoute(async (req, res) => {
  const t = await getTournament(req.params.id);
  const [regs, teams] = await Promise.all([
    listRegistrations(req.params.id),
    listTeamsForTournament(req.params.id),
  ]);
  res.json({ tournament: t, registrations: regs, teams });
}));

tournamentsRouter.post("/", requireRole("admin"), asyncRoute(async (req, res) => {
  res.status(201).json(await createTournament(req.body));
}));

tournamentsRouter.patch("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  res.json(await patchTournament(req.params.id, req.body));
}));

// Soft-delete with double confirmation. Body must include
// { confirm: "DELETE", name: "<exact tournament name>" }.
tournamentsRouter.delete("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  res.json(await softDeleteTournament(req.params.id, req.body));
}));

tournamentsRouter.post("/:id/register", requireAuth, asyncRoute(async (req, res) => {
  const playerId = req.session!.playerId!;
  res.status(201).json(await registerForTournament(req.params.id, playerId));
}));

tournamentsRouter.delete("/:id/register", requireAuth, asyncRoute(async (req, res) => {
  const playerId = req.session!.playerId!;
  res.json(await unregisterFromTournament(req.params.id, playerId));
}));

const captainSchema = z.object({
  playerId: z.string().min(1),
  isCaptain: z.boolean(),
  teamName: z.string().min(1).max(60).optional(),
});

tournamentsRouter.post("/:id/captains", requireRole("admin"),
  asyncRoute(async (req, res) => {
    const data = captainSchema.parse(req.body);
    res.json(await setCaptain(req.params.id, data.playerId,
      data.isCaptain, data.teamName));
  }));

const addPlayerSchema = z.object({ playerId: z.string().min(1) });

// Admin: register any player to tournament without self-registration
tournamentsRouter.post("/:id/add-player", requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { playerId } = addPlayerSchema.parse(req.body);
    const existing = await import("../db/query.js").then(({ queryOne }) =>
      queryOne(
        "SELECT id FROM tournament_registrations WHERE tournament_id=$1 AND player_id=$2",
        [req.params.id, playerId],
      ));
    if (!existing) {
      await import("../db/query.js").then(({ queryOne }) =>
        queryOne(
          "INSERT INTO tournament_registrations (tournament_id, player_id) VALUES ($1,$2)",
          [req.params.id, playerId],
        ));
    }
    await exportTournamentRegistrationsCsv(req.params.id);
    res.json({ ok: true });
  }));

// Admin: remove player from tournament (and any team)
tournamentsRouter.delete("/:id/players/:playerId", requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { queryOne: qo, query: q } = await import("../db/query.js");
    await q(
      "DELETE FROM team_players WHERE player_id=$1 AND team_id IN (SELECT id FROM teams WHERE tournament_id=$2)",
      [req.params.playerId, req.params.id],
    );
    await qo(
      "DELETE FROM tournament_registrations WHERE tournament_id=$1 AND player_id=$2",
      [req.params.id, req.params.playerId],
    );
    await exportTournamentRegistrationsCsv(req.params.id);
    res.json({ ok: true });
  }));
