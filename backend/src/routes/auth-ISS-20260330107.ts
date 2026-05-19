// Authentication routes: login/logout/register/me.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { authenticate } from "../services/auth.js";
import { createPlayer } from "../services/players.js";
import { currentPlayer } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(2).max(80),
  password: z.string().min(1).max(100),
});

authRouter.post("/login", asyncRoute(async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const player = await authenticate(identifier, password);
  req.session.playerId = player.id;
  req.session.role = player.role;
  res.json({ player });
}));

authRouter.post("/logout", asyncRoute(async (req, res) => {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => err ? reject(err) : resolve());
  });
  res.clearCookie("basket_sid");
  res.json({ ok: true });
}));

authRouter.post("/register", asyncRoute(async (req, res) => {
  const player = await createPlayer(req.body);
  req.session.playerId = player.id;
  req.session.role = player.role;
  res.status(201).json({ player });
}));

authRouter.get("/me", asyncRoute(async (req, res) => {
  if (!req.session?.playerId) throw new HttpError(401, "UNAUTHENTICATED");
  const player = await currentPlayer(req);
  res.json({ player });
}));
