// Trade offer routes.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { listTrades, createTrade, resolveTrade } from "../services/trades.js";

export const tradesRouter = Router();

tradesRouter.get("/", requireAuth, asyncRoute(async (req, res) => {
  const tid = typeof req.query.tournamentId === "string" ? req.query.tournamentId : "";
  if (!tid) throw new HttpError(400, "MISSING_TOURNAMENT");
  res.json(await listTrades(tid));
}));

tradesRouter.post("/", requireAuth, asyncRoute(async (req, res) => {
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  if (!["captain","admin"].includes(role)) throw new HttpError(403, "FORBIDDEN");
  res.status(201).json(await createTrade(selfId, req.body));
}));

const resolveSchema = z.object({ action: z.enum(["accept","reject"]) });

tradesRouter.post("/:id/resolve", requireAuth, asyncRoute(async (req, res) => {
  const selfId = req.session!.playerId!;
  const role = req.session!.role!;
  const { action } = resolveSchema.parse(req.body);
  res.json(await resolveTrade(req.params.id, selfId, role, action));
}));
