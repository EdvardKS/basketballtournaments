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
  // Force the session to flush before we respond. Without this, the response
  // can race the async store write and the very next request from the client
  // (e.g. an immediate /auth/me) may see an empty session.
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => err ? reject(err) : resolve());
  });
  console.log(`[auth] login OK identifier=${identifier} → playerId=${player.id} role=${player.role} sid=${req.session.id}`);
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
  // Same race-prevention as login — the immediately-following request has to
  // see the freshly written sid in pgSession.
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => err ? reject(err) : resolve());
  });
  console.log(`[auth] register OK playerId=${player.id} role=${player.role} sid=${req.session.id}`);
  res.status(201).json({ player });
}));

authRouter.get("/me", asyncRoute(async (req, res) => {
  if (!req.session?.playerId) throw new HttpError(401, "UNAUTHENTICATED");
  const player = await currentPlayer(req);
  res.json({ player });
}));

// Public diagnostic endpoint: returns exactly what the backend sees about the
// caller's session vs. the persisted DB record. No auth required so the admin
// can curl it from devtools to compare. Safe to expose: only fields about the
// caller's own row, no listings.
authRouter.get("/whoami", asyncRoute(async (req, res) => {
  const sessionInfo = {
    id:        req.session?.id ?? null,
    playerId:  req.session?.playerId ?? null,
    role:      req.session?.role ?? null,
    cookieReceived: Boolean(req.headers.cookie),
  };
  let dbPlayer: { id: string; role: string; mobile: string; username: string | null } | null = null;
  if (req.session?.playerId) {
    const { queryOne } = await import("../db/query.js");
    const row = await queryOne(
      "SELECT id, role, mobile, username FROM players WHERE id=$1",
      [req.session.playerId],
    );
    if (row) dbPlayer = {
      id: row.id as string,
      role: row.role as string,
      mobile: row.mobile as string,
      username: (row.username as string | null) ?? null,
    };
  }
  console.log(`[auth] whoami session=${JSON.stringify(sessionInfo)} dbPlayer=${JSON.stringify(dbPlayer)}`);
  res.json({ session: sessionInfo, dbPlayer });
}));
