// Tournament routes + nested registration/captain endpoints.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listTournaments, getTournament, createTournament, patchTournament,
} from "../services/tournaments.js";
import {
  listRegistrations, registerForTournament,
  unregisterFromTournament, setCaptain,
} from "../services/registrations.js";
import { listTeamsForTournament } from "../services/teams.js";

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
