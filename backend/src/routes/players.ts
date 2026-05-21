// Players routes: list, detail, update, history, stats, sanctions, awards.
import { Router } from "express";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listPlayers, getPlayer, createPlayer } from "../services/players.js";
import { updatePlayer, playerHistory } from "../services/player-update.js";
import { updatePlayerStats, sanctionPlayer } from "../services/player-actions.js";
import { deletePlayer } from "../services/player-delete.js";
import { getAchievements } from "../services/player-achievements.js";
import { grantCustom, revokeCustom } from "../services/player-achievements-grant.js";
import { listCaptainTeams } from "../services/captain-teams.js";
import { z } from "zod";

export const playersRouter = Router();

playersRouter.get("/", requireAuth, asyncRoute(async (_req, res) => {
  res.json(await listPlayers());
}));

playersRouter.post("/", requireRole("admin"), asyncRoute(async (req, res) => {
  const player = await createPlayer(req.body);
  res.status(201).json(player);
}));

playersRouter.get("/:id", requireAuth, asyncRoute(async (req, res) => {
  res.json(await getPlayer(req.params.id));
}));

playersRouter.patch("/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  if (role !== "admin" && id !== selfId) throw new HttpError(403, "FORBIDDEN");
  res.json(await updatePlayer(id, req.body, role));
}));

playersRouter.patch("/:id/stats", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  res.json(await updatePlayerStats(id, req.body, selfId, role));
}));

const sanctionSchema = z.object({
  canEditStats: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
});
playersRouter.patch("/:id/sanction", requireRole("admin"), asyncRoute(async (req, res) => {
  const d = sanctionSchema.parse(req.body);
  res.json(await sanctionPlayer(req.params.id, d.canEditStats));
}));

playersRouter.delete("/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  const hard = req.query.hard === "true";
  await deletePlayer(req.params.id, hard);
  res.status(204).end();
}));

playersRouter.get("/:id/history", requireAuth, asyncRoute(async (req, res) => {
  res.json(await playerHistory(req.params.id));
}));

playersRouter.get("/:id/achievements", requireAuth, asyncRoute(async (req, res) => {
  res.json(await getAchievements(req.params.id));
}));

playersRouter.get("/:id/captain-teams", requireAuth, asyncRoute(async (req, res) => {
  res.json(await listCaptainTeams(req.params.id));
}));

playersRouter.post("/:id/achievements", requireRole("admin"), asyncRoute(async (req, res) => {
  const awardedBy = req.session!.playerId!;
  const row = await grantCustom(req.params.id, awardedBy, req.body);
  res.status(201).json(row);
}));

playersRouter.delete("/:id/achievements/:aid", requireRole("admin"), asyncRoute(async (req, res) => {
  await revokeCustom(req.params.id, req.params.aid);
  res.status(204).end();
}));
