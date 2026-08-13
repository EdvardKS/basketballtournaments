// Authentication: verify credentials and return the player record.
import { randomBytes, createHash } from "node:crypto";
import { queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";
import { verifyPassword, hashPassword, isHashed } from "./password.js";

// Any of mobile / username / email works as the login identifier.
// Password is verified in JS (bcrypt, with legacy plaintext fallback) instead
// of in SQL, so old plaintext rows migrate to bcrypt transparently on login.
export const authenticate = async (identifier: string, password: string) => {
  const id = identifier.trim();
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM players
     WHERE (mobile = $1 OR username = $1 OR LOWER(email) = LOWER($1))`,
    [id],
  );
  if (!row) throw new HttpError(401, "INVALID_CREDENTIALS");
  const stored = (row.password as string | null) ?? null;
  if (!(await verifyPassword(password, stored))) {
    throw new HttpError(401, "INVALID_CREDENTIALS");
  }
  // Opportunistic upgrade: re-hash legacy plaintext passwords on login.
  if (!isHashed(stored)) {
    try {
      await queryOne("UPDATE players SET password=$1 WHERE id=$2 RETURNING id", [
        await hashPassword(password),
        row.id as string,
      ]);
    } catch {
      /* non-fatal: login already succeeded */
    }
  }
  return toPlayer(row);
};

// ---------------------------------------------------------------------------
// Password recovery. In-memory challenge + recovery-token stores keep the
// flow simple (no Redis); they tolerate backend restarts at the cost of
// invalidating any open recovery sessions.

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 10 * 60 * 1000;

interface Challenge { answer: number; expiresAt: number }
const challenges = new Map<string, Challenge>();
const recoveryTokens = new Map<string, { playerId: string; expiresAt: number }>();

const purge = () => {
  const now = Date.now();
  for (const [k, v] of challenges) if (v.expiresAt < now) challenges.delete(k);
  for (const [k, v] of recoveryTokens) if (v.expiresAt < now) recoveryTokens.delete(k);
};

const randomId = (bytes = 16) => randomBytes(bytes).toString("hex");

export const createRecoveryChallenge = () => {
  purge();
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const challengeId = randomId(12);
  challenges.set(challengeId, {
    answer: a + b,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { challengeId, question: `¿Cuánto es ${a} + ${b}?` };
};

const consumeChallenge = (challengeId: string, raw: string) => {
  const ch = challenges.get(challengeId);
  if (!ch) throw new HttpError(400, "CHALLENGE_INVALID");
  challenges.delete(challengeId);
  if (ch.expiresAt < Date.now()) throw new HttpError(400, "CHALLENGE_EXPIRED");
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n !== ch.answer) {
    throw new HttpError(400, "CHALLENGE_FAILED");
  }
};

export const recoverCheckIdentity = async (
  challengeId: string, challengeAnswer: string,
  mobile: string, email: string, username: string,
) => {
  consumeChallenge(challengeId, challengeAnswer);
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM players
     WHERE mobile = $1
       AND LOWER(email) = LOWER($2)
       AND LOWER(username) = LOWER($3)`,
    [mobile.trim(), email.trim(), username.trim()],
  );
  if (!row) throw new HttpError(404, "IDENTITY_MISMATCH");
  purge();
  const recoveryToken = randomId(24);
  recoveryTokens.set(recoveryToken, {
    playerId: row.id,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return { recoveryToken };
};

export const recoverResetPassword = async (
  recoveryToken: string, newPassword: string,
) => {
  purge();
  const entry = recoveryTokens.get(recoveryToken);
  if (!entry) throw new HttpError(400, "TOKEN_INVALID");
  if (entry.expiresAt < Date.now()) {
    recoveryTokens.delete(recoveryToken);
    throw new HttpError(400, "TOKEN_EXPIRED");
  }
  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 100) {
    throw new HttpError(400, "PASSWORD_INVALID");
  }
  await queryOne(
    "UPDATE players SET password=$1 WHERE id=$2 RETURNING id",
    [await hashPassword(newPassword), entry.playerId],
  );
  recoveryTokens.delete(recoveryToken);
  return { ok: true };
};

// ---------------------------------------------------------------------------
// Email-based password recovery (DB-backed tokens). Complements the in-memory
// arithmetic-challenge flow above: here the proof of identity is owning the
// email inbox, so we email a single-use link instead of asking for the
// mobile+email+username triple.

const sha256hex = (s: string) =>
  createHash("sha256").update(s).digest("hex");

export const requestEmailPasswordReset = async (email: string) => {
  const clean = email.trim();
  if (!clean) return null;
  const row = await queryOne<{ id: string; name: string | null; email: string | null }>(
    "SELECT id, name, email FROM players WHERE LOWER(email) = LOWER($1)",
    [clean],
  );
  if (!row?.email) return null;
  const token = randomId(24);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await queryOne(
    `INSERT INTO password_reset_tokens (token_hash, player_id, expires_at)
     VALUES ($1, $2, $3) RETURNING token_hash`,
    [sha256hex(token), row.id, expiresAt],
  );
  return { token, player: { id: row.id, name: row.name, email: row.email } };
};

export const resetPasswordWithEmailToken = async (
  token: string, newPassword: string,
) => {
  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 100) {
    throw new HttpError(400, "PASSWORD_INVALID");
  }
  const tokenHash = sha256hex(String(token));
  const entry = await queryOne<{ player_id: string; expires_at: string; used_at: string | null }>(
    "SELECT player_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash=$1",
    [tokenHash],
  );
  if (!entry || entry.used_at || new Date(entry.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, "TOKEN_INVALID");
  }
  await queryOne(
    "UPDATE players SET password=$1 WHERE id=$2 RETURNING id",
    [await hashPassword(newPassword), entry.player_id],
  );
  await queryOne(
    "UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=$1 RETURNING token_hash",
    [tokenHash],
  );
  const player = await queryOne<{ name: string | null; email: string | null }>(
    "SELECT name, email FROM players WHERE id=$1",
    [entry.player_id],
  );
  return { ok: true, player };
};
