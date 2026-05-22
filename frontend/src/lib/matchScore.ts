// SPEC-015 — frontend client for the temporary scoring URL + the admin
// endpoints that create/list/revoke those sessions. Public endpoints are
// called WITHOUT cookies — the admin happening to have a session in the
// same browser must not leak into the public scorer flow.
import { api } from "./api.js";
import type {
  AdminScoreSessionResponse, AdminScoreSessionStatus,
  PublicScoreSessionState, ScoreDelta, ScoreSide,
} from "./types.js";

// -- Public (no cookie) --------------------------------------------------

const publicFetch = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "omit",
  });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const err = body as { error?: string; code?: string };
    const code = err?.code ?? err?.error ?? "UNKNOWN_ERROR";
    throw Object.assign(new Error(code), { status: res.status, code, body });
  }
  return body as T;
};

export const getPublicScoreState = (token: string) =>
  publicFetch<PublicScoreSessionState>(`/match-score/${encodeURIComponent(token)}`);

export const startPublicScore = (token: string) =>
  publicFetch<PublicScoreSessionState>(`/match-score/${encodeURIComponent(token)}/start`, { method: "POST" });

export const pausePublicScore = (token: string) =>
  publicFetch<PublicScoreSessionState>(`/match-score/${encodeURIComponent(token)}/pause`, { method: "POST" });

export const adjustPublicScore = (
  token: string,
  payload: { side: ScoreSide; delta: ScoreDelta } | { homeScore: number; awayScore: number },
) => publicFetch<PublicScoreSessionState>(
  `/match-score/${encodeURIComponent(token)}/score`,
  { method: "POST", body: JSON.stringify(payload) },
);

export const submitPublicScore = (token: string) =>
  publicFetch<{
    match: { status: string; homeScore: number | null; awayScore: number | null };
    session: { status: string };
    alreadyCompleted: boolean;
  }>(`/match-score/${encodeURIComponent(token)}/submit`, { method: "POST" });

// -- Admin --------------------------------------------------------------

export const createMatchScoreSession = (matchId: string) =>
  api<AdminScoreSessionResponse>(`/matches/${encodeURIComponent(matchId)}/score-session`, { method: "POST" });

export const getMatchScoreSessionStatus = (matchId: string) =>
  api<AdminScoreSessionStatus>(`/matches/${encodeURIComponent(matchId)}/score-session`);

export const revokeMatchScoreSession = (matchId: string) =>
  api<{ revoked: number }>(`/matches/${encodeURIComponent(matchId)}/score-session`, { method: "DELETE" });

// -- Pure helper: visual elapsed seconds for a running clock. Server-authoritative
// elapsed_seconds + (now - started_at). Caller passes the latest server state
// and a 'now' tick — no networking inside.
export const computeElapsedSeconds = (
  state: PublicScoreSessionState["session"],
  nowMs: number,
): number => {
  const base = state.elapsedSeconds;
  if (!state.startedAt || state.pausedAt) return base;
  const startedMs = Date.parse(state.startedAt);
  if (Number.isNaN(startedMs)) return base;
  return Math.max(0, base + Math.floor((nowMs - startedMs) / 1000));
};

// -- Pure helper: matchday detection. Compares the tournament matchDate
// (YYYY-MM-DD) against today in Europe/Madrid as a STRING — never parse
// matchDate with new Date() because the resulting UTC value can land on the
// previous calendar day in Europe/Madrid.
const MADRID_TODAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric", month: "2-digit", day: "2-digit",
});

export const todayInMadrid = (now: Date = new Date()): string =>
  MADRID_TODAY_FORMATTER.format(now); // en-CA → YYYY-MM-DD

export const isMatchday = (matchDate: string | null, now: Date = new Date()): boolean => {
  if (!matchDate) return false;
  return matchDate.slice(0, 10) === todayInMadrid(now);
};
