// Health endpoint — used by compose healthchecks and smoke tests.
import { Router } from "express";
import { pool } from "../db/pool.js";
import { asyncRoute } from "../middleware/error.js";

export const healthRouter = Router();

healthRouter.get("/health", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT 1 as ok");
  res.json({ status: "ok", db: rows[0].ok === 1 });
}));
