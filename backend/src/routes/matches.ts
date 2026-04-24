// Match + group routes.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../middleware/error.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  matchesForTournament, groupsForTournament,
  startMatch, updateScore, completeMatch,
} from "../services/matches.js";
import { generateGroups } from "../services/groups.js";
import { generateSchedule, confirmSchedule, updateMatchTime } from "../services/schedule.js";

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

matchesRouter.post("/tournament/:id/schedule", requireRole("admin"),
  asyncRoute(async (req, res) => {
    await generateSchedule(req.params.id);
    res.json({ ok: true });
  }));

matchesRouter.post("/tournament/:id/confirm-schedule", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await confirmSchedule(req.params.id))));

const timeSchema = z.object({ scheduledAt: z.string().min(1) });

matchesRouter.patch("/:id/time", requireRole("admin"),
  asyncRoute(async (req, res) => {
    const { scheduledAt } = timeSchema.parse(req.body);
    res.json(await updateMatchTime(req.params.id, scheduledAt));
  }));

matchesRouter.post("/:id/start", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await startMatch(req.params.id, req.body))));

const scoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

matchesRouter.post("/:id/score", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await updateScore(req.params.id, scoreSchema.parse(req.body)))));

matchesRouter.post("/:id/complete", requireRole("admin"),
  asyncRoute(async (req, res) => res.json(await completeMatch(req.params.id))));
