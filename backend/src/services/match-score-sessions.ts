// SPEC-015 — Match score sessions.
//
// Wraps the lifecycle of a temporary scoring session on top of a match.
// The session owns the running clock + provisional scoreboard; the actual
// match close (status='completed' + standings + bracket propagation + tourney
// close) still happens through services/matches.ts updateScore + completeMatch.
//
// Tokens: 32 random bytes (base64url). DB only stores sha256(token) so a
// leaked dump cannot grant scoring access. The cleartext token is returned
// exactly once at creation time.
//
// Concurrency: submitScoreSession runs inside a transaction that takes row
// locks on both the session and the match — see comments there. Other writes
// rely on the partial UNIQUE index on (match_id) WHERE status='active' to
// prevent two simultaneous active sessions for the same match.

import crypto from "node:crypto";
import { query, queryOne, tx } from "../db/query.js";
import { HttpError } from "../middleware/error.js";
import { toMatch } from "../db/mappers.js";
import type { Match, MatchStatus } from "../types.js";
import { completeMatch } from "./matches.js";

export type MatchScoreSessionStatus = "active" | "submitted" | "revoked" | "expired";

export interface MatchScoreSessionRow {
  id: string;
  matchId: string;
  status: MatchScoreSessionStatus;
  homeScore: number;
  awayScore: number;
  durationSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  elapsedSeconds: number;
  createdBy: string | null;
  createdAt: string;
  submittedAt: string | null;
  revokedAt: string | null;
  expiredAt: string | null;
}

export interface PublicMatchPayload {
  id: string;
  status: MatchStatus;
  stage: Match["stage"];
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface PublicScoreSessionState {
  editable: boolean;
  closedReason: "submitted" | "revoked" | "expired" | "match_completed" | null;
  session: {
    id: string;
    status: MatchScoreSessionStatus;
    homeScore: number;
    awayScore: number;
    durationSeconds: number;
    elapsedSeconds: number;
    startedAt: string | null;
    pausedAt: string | null;
  };
  match: PublicMatchPayload;
}

const SESSION_FALLBACK_DURATION_SECONDS = 20 * 60;

const toIso = (v: unknown): string | null => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const sha256 = (s: string): string =>
  crypto.createHash("sha256").update(s).digest("hex");

const generateToken = (): string =>
  crypto.randomBytes(32).toString("base64url");

const rowToSession = (r: Record<string, unknown>): MatchScoreSessionRow => ({
  id: r.id as string,
  matchId: r.match_id as string,
  status: r.status as MatchScoreSessionStatus,
  homeScore: Number(r.home_score),
  awayScore: Number(r.away_score),
  durationSeconds: Number(r.duration_seconds),
  startedAt: toIso(r.started_at),
  pausedAt: toIso(r.paused_at),
  elapsedSeconds: Number(r.elapsed_seconds),
  createdBy: (r.created_by as string | null) ?? null,
  createdAt: toIso(r.created_at) ?? "",
  submittedAt: toIso(r.submitted_at),
  revokedAt: toIso(r.revoked_at),
  expiredAt: toIso(r.expired_at),
});

const resolveDuration = async (match: Match): Promise<number> => {
  if (match.durationMinutes && match.durationMinutes > 0) {
    return match.durationMinutes * 60;
  }
  const t = await queryOne<{ game_duration_minutes: number }>(
    "SELECT game_duration_minutes FROM tournaments WHERE id=$1",
    [match.tournamentId],
  );
  const minutes = Number(t?.game_duration_minutes ?? 0);
  return minutes > 0 ? minutes * 60 : SESSION_FALLBACK_DURATION_SECONDS;
};

const closedReasonFromStatus = (
  status: MatchScoreSessionStatus,
): PublicScoreSessionState["closedReason"] => {
  if (status === "submitted") return "submitted";
  if (status === "revoked")   return "revoked";
  if (status === "expired")   return "expired";
  return null;
};

const publicStateFromRow = async (
  session: MatchScoreSessionRow,
): Promise<PublicScoreSessionState> => {
  const matchRow = await queryOne<Record<string, unknown> & {
    home_team_name: string | null; away_team_name: string | null;
  }>(
    `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name
     FROM matches m
     LEFT JOIN teams ht ON ht.id = m.home_team_id
     LEFT JOIN teams at ON at.id = m.away_team_id
     WHERE m.id=$1`,
    [session.matchId],
  );
  if (!matchRow) throw new HttpError(404, "MATCH_NOT_FOUND");
  const m = toMatch(matchRow);

  const matchCompleted = m.status === "completed";
  let status: MatchScoreSessionStatus = session.status;
  let closedReason = closedReasonFromStatus(status);
  if (status === "active" && matchCompleted) {
    closedReason = "match_completed";
  }
  const editable = status === "active" && !matchCompleted;

  return {
    editable,
    closedReason,
    session: {
      id: session.id,
      status,
      homeScore: session.homeScore,
      awayScore: session.awayScore,
      durationSeconds: session.durationSeconds,
      elapsedSeconds: session.elapsedSeconds,
      startedAt: session.startedAt,
      pausedAt: session.pausedAt,
    },
    match: {
      id: m.id,
      status: m.status,
      stage: m.stage,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: matchRow.home_team_name,
      awayTeamName: matchRow.away_team_name,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    },
  };
};

// Admin: create a new active session for a match. Revokes any previous active
// session for the same match in the same transaction so the partial UNIQUE
// index never trips.
export const createScoreSession = async (
  matchId: string,
  adminPlayerId: string | null,
): Promise<{ token: string; url: string; session: MatchScoreSessionRow }> => {
  const token = generateToken();
  const hash  = sha256(token);

  const session = await tx<MatchScoreSessionRow>(async (q) => {
    const matchRows = await q<Record<string, unknown>>(
      "SELECT * FROM matches WHERE id=$1 FOR UPDATE",
      [matchId],
    );
    if (matchRows.length === 0) throw new HttpError(404, "MATCH_NOT_FOUND");
    const match = toMatch(matchRows[0]);
    if (match.status === "completed") {
      throw new HttpError(409, "MATCH_ALREADY_COMPLETED");
    }

    // Revoke previous active sessions for the same match (partial UNIQUE
    // index allows at most one — but we still revoke proactively to set
    // revoked_at and to be explicit about the side effect).
    await q(
      `UPDATE match_score_sessions
         SET status='revoked', revoked_at=NOW()
       WHERE match_id=$1 AND status='active'`,
      [matchId],
    );

    const durationSeconds = await resolveDuration(match);
    const inserted = await q<Record<string, unknown>>(
      `INSERT INTO match_score_sessions
         (match_id, token_hash, status, home_score, away_score,
          duration_seconds, elapsed_seconds, created_by)
       VALUES ($1,$2,'active',$3,$4,$5,0,$6)
       RETURNING *`,
      [
        matchId, hash,
        match.homeScore ?? 0,
        match.awayScore ?? 0,
        durationSeconds,
        adminPlayerId,
      ],
    );
    return rowToSession(inserted[0]);
  });

  return { token, url: `/score/${token}`, session };
};

// Admin: revoke the currently active session for a match if any. Idempotent.
export const revokeScoreSession = async (matchId: string): Promise<{ revoked: number }> => {
  const rows = await query(
    `UPDATE match_score_sessions
       SET status='revoked', revoked_at=NOW()
     WHERE match_id=$1 AND status='active'
     RETURNING id`,
    [matchId],
  );
  return { revoked: rows.length };
};

// Public: resolve the cleartext token to a session row. Returns null when
// nothing matches. Does NOT lazily expire — callers decide whether the
// result is mutable via the public state helper.
const lookupSessionByToken = async (token: string): Promise<MatchScoreSessionRow | null> => {
  const hash = sha256(token);
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM match_score_sessions WHERE token_hash=$1",
    [hash],
  );
  return row ? rowToSession(row) : null;
};

export const getPublicScoreSession = async (
  token: string,
): Promise<PublicScoreSessionState> => {
  const session = await lookupSessionByToken(token);
  if (!session) throw new HttpError(404, "SCORE_SESSION_NOT_FOUND");
  return publicStateFromRow(session);
};

// Returns the row only if the caller may still mutate it. Anything else
// throws 410 (closed) / 404 (not found). Use before any state-changing
// public endpoint.
const assertMutableSessionByToken = async (token: string): Promise<MatchScoreSessionRow> => {
  const session = await lookupSessionByToken(token);
  if (!session) throw new HttpError(404, "SCORE_SESSION_NOT_FOUND");
  if (session.status !== "active") {
    throw new HttpError(410, "SCORE_SESSION_CLOSED");
  }
  const match = await queryOne<{ status: MatchStatus }>(
    "SELECT status FROM matches WHERE id=$1",
    [session.matchId],
  );
  if (!match) throw new HttpError(404, "MATCH_NOT_FOUND");
  if (match.status === "completed") {
    // Lazy-expire so future GETs see the right reason.
    await query(
      "UPDATE match_score_sessions SET status='expired', expired_at=NOW() WHERE id=$1 AND status='active'",
      [session.id],
    );
    throw new HttpError(410, "MATCH_ALREADY_COMPLETED");
  }
  return session;
};

// Public: start or resume the clock. Idempotent for an already-running clock.
// If the match was still pending, transitions it to in_progress as well.
export const startScoreSession = async (token: string): Promise<PublicScoreSessionState> => {
  const session = await assertMutableSessionByToken(token);
  await tx(async (q) => {
    // Promote match to in_progress if still pending — same transition as
    // admin /matches/:id/start. Skip silently otherwise.
    await q(
      `UPDATE matches SET status='in_progress', started_at=NOW()
       WHERE id=$1 AND status='pending'`,
      [session.matchId],
    );
    if (session.startedAt && !session.pausedAt) return; // already running
    await q(
      `UPDATE match_score_sessions
         SET started_at = NOW(), paused_at = NULL
       WHERE id=$1`,
      [session.id],
    );
  });
  return getPublicScoreSession(token);
};

// Public: pause the clock. Accumulates `NOW() - started_at` into
// elapsed_seconds. Idempotent if already paused.
export const pauseScoreSession = async (token: string): Promise<PublicScoreSessionState> => {
  const session = await assertMutableSessionByToken(token);
  if (session.startedAt && !session.pausedAt) {
    await query(
      `UPDATE match_score_sessions
         SET elapsed_seconds = elapsed_seconds + GREATEST(0,
               EXTRACT(EPOCH FROM (NOW() - started_at))::int),
             started_at = NULL,
             paused_at  = NOW()
       WHERE id=$1`,
      [session.id],
    );
  }
  return getPublicScoreSession(token);
};

export type ScoreSide = "home" | "away";
export type ScoreDelta = -1 | 1 | 2;

export interface ScorePayloadDelta { side: ScoreSide; delta: ScoreDelta }
export interface ScorePayloadAbsolute { homeScore: number; awayScore: number }
export type ScorePayload = ScorePayloadDelta | ScorePayloadAbsolute;

const ALLOWED_DELTAS: ScoreDelta[] = [-1, 1, 2];

export const applyScoreUpdate = async (
  token: string,
  payload: ScorePayload,
): Promise<PublicScoreSessionState> => {
  const session = await assertMutableSessionByToken(token);
  if ("delta" in payload) {
    if (!ALLOWED_DELTAS.includes(payload.delta)) {
      throw new HttpError(400, "VALIDATION", "delta must be -1, 1 or 2");
    }
    if (payload.side !== "home" && payload.side !== "away") {
      throw new HttpError(400, "VALIDATION", "side must be home or away");
    }
    const column = payload.side === "home" ? "home_score" : "away_score";
    await query(
      `UPDATE match_score_sessions
         SET ${column} = GREATEST(0, ${column} + $2)
       WHERE id=$1`,
      [session.id, payload.delta],
    );
  } else {
    const { homeScore, awayScore } = payload;
    if (!Number.isInteger(homeScore) || homeScore < 0
     || !Number.isInteger(awayScore) || awayScore < 0) {
      throw new HttpError(400, "VALIDATION", "scores must be non-negative integers");
    }
    await query(
      "UPDATE match_score_sessions SET home_score=$2, away_score=$3 WHERE id=$1",
      [session.id, homeScore, awayScore],
    );
  }
  return getPublicScoreSession(token);
};

// Public: persist provisional score on `matches` then call completeMatch.
// Locks the session row + match row, so a concurrent admin-side complete or
// a second submit can't double-fire standings.
export const submitScoreSession = async (
  token: string,
): Promise<{ match: Match; session: MatchScoreSessionRow; alreadyCompleted: boolean }> => {
  const hash = sha256(token);

  const inTx = await tx(async (q) => {
    const sessionRows = await q<Record<string, unknown>>(
      "SELECT * FROM match_score_sessions WHERE token_hash=$1 FOR UPDATE",
      [hash],
    );
    if (sessionRows.length === 0) throw new HttpError(404, "SCORE_SESSION_NOT_FOUND");
    const session = rowToSession(sessionRows[0]);
    if (session.status !== "active") {
      throw new HttpError(410, "SCORE_SESSION_CLOSED");
    }
    const matchRows = await q<Record<string, unknown>>(
      "SELECT * FROM matches WHERE id=$1 FOR UPDATE",
      [session.matchId],
    );
    if (matchRows.length === 0) throw new HttpError(404, "MATCH_NOT_FOUND");
    const match = toMatch(matchRows[0]);

    // If admin (or another path) already completed the match, expire the
    // session without re-running standings. Idempotent no-op for the caller.
    if (match.status === "completed") {
      await q(
        "UPDATE match_score_sessions SET status='expired', expired_at=NOW() WHERE id=$1",
        [session.id],
      );
      return { matchId: session.matchId, sessionId: session.id, alreadyCompleted: true };
    }

    // Persist provisional score on `matches` directly (inside this tx) so the
    // downstream completeMatch() in services/matches.ts reads the right value.
    await q(
      "UPDATE matches SET home_score=$2, away_score=$3 WHERE id=$1",
      [session.matchId, session.homeScore, session.awayScore],
    );
    await q(
      "UPDATE match_score_sessions SET status='submitted', submitted_at=NOW() WHERE id=$1",
      [session.id],
    );
    return { matchId: session.matchId, sessionId: session.id, alreadyCompleted: false };
  });

  // completeMatch opens its own transaction (bracket propagation + tourney
  // close + achievements). Outside the lock window above; the session is
  // already 'submitted', so a concurrent retry hits the 410 branch.
  if (!inTx.alreadyCompleted) {
    await completeMatch(inTx.matchId);
  }

  const matchRow = await queryOne<Record<string, unknown>>(
    "SELECT * FROM matches WHERE id=$1",
    [inTx.matchId],
  );
  const sessionRow = await queryOne<Record<string, unknown>>(
    "SELECT * FROM match_score_sessions WHERE id=$1",
    [inTx.sessionId],
  );
  return {
    match: toMatch(matchRow!),
    session: rowToSession(sessionRow!),
    alreadyCompleted: inTx.alreadyCompleted,
  };
};

// Helper for admin UI: surface whether a match currently has an active session
// (so the admin can copy/revoke). Includes the session id only, never the token.
export const getActiveSessionForMatch = async (
  matchId: string,
): Promise<MatchScoreSessionRow | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM match_score_sessions WHERE match_id=$1 AND status='active'",
    [matchId],
  );
  return row ? rowToSession(row) : null;
};

