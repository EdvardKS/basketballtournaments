// Team routes: detail with roster, update, admin-move player.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getTeamDetail, patchTeam, movePlayer, getTeam } from "../services/teams.js";

export const teamsRouter = Router();

teamsRouter.get("/:id", requireAuth, asyncRoute(async (req, res) => {
  res.json(await getTeamDetail(req.params.id));
}));

teamsRouter.patch("/:id", requireAuth, asyncRoute(async (req, res) => {
  const team = await getTeam(req.params.id);
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  if (role !== "admin" && team.captainId !== selfId) {
    throw new HttpError(403, "FORBIDDEN");
  }
  res.json(await patchTeam(req.params.id, req.body));
}));

const moveSchema = z.object({
  playerId: z.string().min(1),
  fromTeamId: z.string().optional().nullable(),
});

teamsRouter.post("/:id/move-player", requireRole("admin"),
  asyncRoute(async (req, res) => {
    const data = moveSchema.parse(req.body);
    res.json(await movePlayer(data.fromTeamId ?? null,
      req.params.id, data.playerId));
  }));
