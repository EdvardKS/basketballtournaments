// Authentication: verify credentials and return the player record.
import { randomBytes } from "node:crypto";
import { queryOne } from "../db/query.js";
import { toPlayer } from "../db/mappers.js";
import { HttpError } from "../middleware/error.js";

// Any of mobile / username / email works as the login identifier.
export const authenticate = async (identifier: string, password: string) => {
  const id = identifier.trim();
  const row = await queryOne(
    `SELECT * FROM players
     WHERE (mobile = $1 OR username = $1 OR LOWER(email) = LOWER($1)) AND password = $2`,
    [id, password],
  );
  if (!row) throw new HttpError(401, "INVALID_CREDENTIALS");
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
    [newPassword, entry.playerId],
  );
  recoveryTokens.delete(recoveryToken);
  return { ok: true };
};
