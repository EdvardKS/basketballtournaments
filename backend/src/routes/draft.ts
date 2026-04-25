// Draft routes. Start/end are NOT exposed — the lifecycle service auto-starts
// when today ≥ draft_start and auto-ends when today > draft_end (or when all
// players are drafted, whichever comes first).
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { getDraftState, listDraftHistory } from "../services/draft-state.js";
import { pickPlayer } from "../services/draft.js";

export const draftRouter = Router();

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
