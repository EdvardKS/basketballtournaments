// SPEC-015 — Public scorer endpoints (no auth, token-only).
//
// The router is mounted at /api/match-score. Anything that mutates state goes
// through the service, which enforces session 'active' + match not completed.
// Errors follow the SPEC-015 contract: 404 SCORE_SESSION_NOT_FOUND for an
// unknown token, 410 SCORE_SESSION_CLOSED for a known but no-longer-mutable
// session, 410 MATCH_ALREADY_COMPLETED when the underlying match closed by
// another path, 400 VALIDATION on bad payloads.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../middleware/error.js";
import {
  getPublicScoreSession,
  startScoreSession,
  pauseScoreSession,
  applyScoreUpdate,
  submitScoreSession,
} from "../services/match-score-sessions.js";

export const matchScoreRouter = Router();

matchScoreRouter.get("/:token", asyncRoute(async (req, res) => {
  res.json(await getPublicScoreSession(req.params.token));
}));

matchScoreRouter.post("/:token/start", asyncRoute(async (req, res) => {
  res.json(await startScoreSession(req.params.token));
}));

matchScoreRouter.post("/:token/pause", asyncRoute(async (req, res) => {
  res.json(await pauseScoreSession(req.params.token));
}));

const scoreSchema = z.union([
  z.object({
    side:  z.enum(["home", "away"]),
    delta: z.union([z.literal(-1), z.literal(1), z.literal(2)]),
  }),
  z.object({
    homeScore: z.coerce.number().int().min(0),
    awayScore: z.coerce.number().int().min(0),
  }),
]);

matchScoreRouter.post("/:token/score", asyncRoute(async (req, res) => {
  const payload = scoreSchema.parse(req.body);
  res.json(await applyScoreUpdate(req.params.token, payload));
}));

matchScoreRouter.post("/:token/submit", asyncRoute(async (req, res) => {
  res.json(await submitScoreSession(req.params.token));
}));
