// Match + group routes.
import { Router } from "express";
import { asyncRoute } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  matchesForTournament, groupsForTournament,
  startMatch, updateScore, completeMatch,
} from "../services/matches.js";
import { generateGroups } from "../services/groups.js";

export const matchesRouter = Router();

matchesRouter.get("/tournament/:id", asyncRoute(async (req, res) => {
  res.json(await matchesForTournament(req.params.id));
}));

matchesRouter.get("/tournament/:id/groups", asyncRoute(async (req, res) => {
  res.json(await groupsForTournament(req.params.id));
}));

matchesRouter.post("/tournament/:id/generate-groups", requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await generateGroups(req.params.id));
  }));

matchesRouter.post("/:id/start", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await startMatch(req.params.id, req.body))));

matchesRouter.post("/:id/score", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await updateScore(req.params.id, req.body))));

matchesRouter.post("/:id/complete", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await completeMatch(req.params.id))));
