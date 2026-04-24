// Players routes: list, detail, update, history.
import { Router } from "express";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { listPlayers, getPlayer } from "../services/players.js";
import { updatePlayer, playerHistory } from "../services/player-update.js";

export const playersRouter = Router();

playersRouter.get("/", requireAuth, asyncRoute(async (_req, res) => {
  res.json(await listPlayers());
}));

playersRouter.get("/:id", requireAuth, asyncRoute(async (req, res) => {
  res.json(await getPlayer(req.params.id));
}));

playersRouter.patch("/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  if (role !== "admin" && id !== selfId) {
    throw new HttpError(403, "FORBIDDEN");
  }
  res.json(await updatePlayer(id, req.body, role));
}));

playersRouter.get("/:id/history", requireAuth, asyncRoute(async (req, res) => {
  res.json(await playerHistory(req.params.id));
}));
