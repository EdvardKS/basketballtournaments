// Authentication routes: login/logout/register/me + password recovery.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import {
  authenticate, createRecoveryChallenge,
  recoverCheckIdentity, recoverResetPassword,
} from "../services/auth.js";
import { changePassword } from "../services/auth-password.js";
import { createPlayer } from "../services/players.js";
import { currentPlayer, requireAuth } from "../middleware/auth.js";

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

// --- Password recovery -----------------------------------------------------
// The flow is split in three steps so a bot has to actually parse and reply
// to a server-issued arithmetic challenge before it can probe identities.

authRouter.get("/recover/challenge", asyncRoute(async (_req, res) => {
  res.json(createRecoveryChallenge());
}));

const recoverCheckSchema = z.object({
  challengeId: z.string().min(1),
  challengeAnswer: z.string().min(1).max(10),
  mobile: z.string().min(1).max(30),
  email: z.string().email().max(120),
  username: z.string().min(1).max(80),
});

authRouter.post("/recover/check", asyncRoute(async (req, res) => {
  const d = recoverCheckSchema.parse(req.body);
  const r = await recoverCheckIdentity(
    d.challengeId, d.challengeAnswer, d.mobile, d.email, d.username,
  );
  res.json(r);
}));

const recoverResetSchema = z.object({
  recoveryToken: z.string().min(1),
  password: z.string().min(6).max(100),
});

authRouter.post("/recover/reset", asyncRoute(async (req, res) => {
  const d = recoverResetSchema.parse(req.body);
  res.json(await recoverResetPassword(d.recoveryToken, d.password));
}));

authRouter.post("/password", requireAuth, asyncRoute(async (req, res) => {
  await changePassword(req.session!.playerId!, req.body);
  res.status(204).end();
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
