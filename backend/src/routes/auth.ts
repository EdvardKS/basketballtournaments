// Authentication routes: login/logout/register/me + password recovery.
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/error.js";
import {
  authenticate, createRecoveryChallenge,
  recoverCheckIdentity, recoverResetPassword,
  requestEmailPasswordReset, resetPasswordWithEmailToken,
} from "../services/auth.js";
import { changePassword } from "../services/auth-password.js";
import { createPlayer } from "../services/players.js";
import { currentPlayer, requireAuth } from "../middleware/auth.js";
import { sendMail } from "../lib/mailer.js";
import { passwordResetEmail, passwordChangedEmail } from "../lib/emails.js";

const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL ?? "https://basket.edvardks.com";
const BRAND = process.env.BRAND_NAME ?? "Basket Edvardks";

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

// --- Email-based password recovery -----------------------------------------
// Request a reset link by email. Generic response avoids user enumeration.
const forgotSchema = z.object({ email: z.string().email().max(120) });

authRouter.post("/forgot", asyncRoute(async (req, res) => {
  const generic = { message: "Si el email existe, te hemos enviado instrucciones." };
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.json(generic);
  const result = await requestEmailPasswordReset(parsed.data.email);
  if (result) {
    const resetUrl = `${APP_PUBLIC_URL}/api/auth/reset?token=${result.token}`;
    await sendMail({ to: result.player.email!, ...passwordResetEmail(result.player.name, resetUrl) });
  }
  res.json(generic);
}));

function resetPage(token: string, error?: string): string {
  const safeToken = String(token).replace(/[^a-f0-9]/gi, "");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restablecer contraseña — ${BRAND}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif">
<div style="max-width:420px;margin:48px auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
<h1 style="font-size:20px;color:#ea580c;margin:0 0 16px">${BRAND}</h1>
<h2 style="font-size:16px;margin:0 0 16px">Restablecer contraseña</h2>
${error ? `<p style="color:#dc2626">${error}</p>` : ""}
<form method="POST" action="/api/auth/reset">
<input type="hidden" name="token" value="${safeToken}">
<label style="display:block;font-size:13px;color:#555;margin-bottom:6px">Nueva contraseña (mínimo 6 caracteres)</label>
<input type="password" name="newPassword" minlength="6" required style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:16px">
<button type="submit" style="width:100%;background:#ea580c;color:#fff;border:0;padding:12px;border-radius:8px;font-size:15px;cursor:pointer">Guardar contraseña</button>
</form></div></body></html>`;
}

authRouter.get("/reset", (req, res) => {
  res.type("html").send(resetPage(String(req.query.token ?? "")));
});

authRouter.post("/reset", asyncRoute(async (req, res) => {
  const isForm = (req.headers["content-type"] ?? "").includes("application/x-www-form-urlencoded");
  const token = String(req.body?.token ?? "");
  const newPassword = String(req.body?.newPassword ?? "");
  if (newPassword.length < 6) {
    if (isForm) return res.status(400).type("html").send(resetPage(token, "La contraseña debe tener al menos 6 caracteres."));
    throw new HttpError(400, "PASSWORD_INVALID");
  }
  try {
    const result = await resetPasswordWithEmailToken(token, newPassword);
    if (result.player?.email) {
      sendMail({ to: result.player.email, ...passwordChangedEmail(result.player.name) }).catch(() => {});
    }
    if (isForm) {
      return res.type("html").send(`<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;text-align:center;padding:48px"><h2>Contraseña actualizada</h2><p>Ya puedes iniciar sesión con tu nueva contraseña.</p><p><a href="${APP_PUBLIC_URL}">Ir a ${BRAND}</a></p></body></html>`);
    }
    return res.json({ ok: true });
  } catch (err) {
    if (isForm) return res.status(400).type("html").send(resetPage(token, "El enlace no es válido o ha caducado. Solicita uno nuevo."));
    throw err;
  }
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
