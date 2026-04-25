// Match + group routes. Schedule generation and hour publishing happen
// automatically when the lifecycle service ends the draft — no admin action
// required. The remaining write endpoints are per-match (admin can tweak a
// time, start a match on the day, enter scores, complete it).
import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../middleware/error.js";
import { requireRole } from "../middleware/auth.js";
import {
  matchesForTournament, groupsForTournament,
  startMatch, updateScore, completeMatch, recomputeStandings,
} from "../services/matches.js";
import { updateMatchTime } from "../services/schedule.js";

export const matchesRouter = Router();

// Trace mutating match endpoints so we can see — in docker logs — whether
// the request actually reached Express, whose session it carried, and what
// status went back. Pairs with the [proxy] log on the frontend container.
matchesRouter.use((req, _res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    console.log(`[matches] ${req.method} ${req.originalUrl} session.role=${req.session?.role ?? "none"} playerId=${req.session?.playerId ?? "none"} sid=${req.session?.id ?? "none"}`);
  }
  next();
});

matchesRouter.get("/tournament/:id", asyncRoute(async (req, res) => {
  res.json(await matchesForTournament(req.params.id));
}));

matchesRouter.get("/tournament/:id/groups", asyncRoute(async (req, res) => {
  res.json(await groupsForTournament(req.params.id));
}));

// Admin-only: rebuild group standings from scratch by replaying every
// completed group match. Safe to call repeatedly — idempotent.
matchesRouter.post("/tournament/:id/recompute-standings", requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await recomputeStandings(req.params.id));
  }));

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
