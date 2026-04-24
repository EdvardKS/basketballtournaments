// Draft routes.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getDraftState, listDraftHistory } from "../services/draft-state.js";
import { startDraft, endDraft, pickPlayer } from "../services/draft.js";

export const draftRouter = Router();

draftRouter.post("/:tournamentId/start", requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await startDraft(req.params.tournamentId));
  }));

draftRouter.post("/:tournamentId/end", requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await endDraft(req.params.tournamentId));
  }));

draftRouter.get("/:tournamentId/state", requireAuth,
  asyncRoute(async (req, res) => {
    const data = await getDraftState(req.params.tournamentId);
    const history = await listDraftHistory(req.params.tournamentId);
    res.json({ ...data, history });
  }));

const pickSchema = z.object({
  teamId: z.string().min(1),
  playerId: z.string().min(1),
});

draftRouter.post("/:tournamentId/pick", requireAuth,
  asyncRoute(async (req, res) => {
    const role = req.session!.role!;
    if (!["captain","admin"].includes(role)) throw new HttpError(403, "FORBIDDEN");
    const data = pickSchema.parse(req.body);
    res.status(201).json(await pickPlayer(
      req.params.tournamentId, data.teamId, data.playerId, role === "admin"));
  }));
