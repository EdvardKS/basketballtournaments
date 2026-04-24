// Placeholder — real implementation in Sprint 4.
import { Router } from "express";
export const authRouter = Router();
authRouter.post("/login", (_req, res) => res.status(501).json({ error: "NOT_IMPLEMENTED" }));
authRouter.post("/logout", (_req, res) => res.status(501).json({ error: "NOT_IMPLEMENTED" }));
authRouter.post("/register", (_req, res) => res.status(501).json({ error: "NOT_IMPLEMENTED" }));
authRouter.get("/me", (_req, res) => res.status(501).json({ error: "NOT_IMPLEMENTED" }));
