// Thin VBL API client. Mirrors backend/test/full_flow.py paths so the contract
// stays in lockstep with the Python E2E. Uses Playwright APIRequestContext so
// the same suite can also drive the browser later.
//
// Source of truth for routes: backend/src/routes/*.ts
// Source of truth for payload shapes: backend/test/full_flow.py
//
// NOTE: Playwright's APIRequestContext handles Set-Cookie with the Secure flag
// on plain HTTP loopback correctly (unlike Python requests). No cookie stripping
// needed — see backend/test/README.md "Cookie Secure en producción".

import type { APIRequestContext, APIResponse, TestInfo } from "@playwright/test";

export const API_BASE = process.env.VBL_API_BASE ?? "http://localhost:4010";
export const ADMIN_USER = process.env.BOOTSTRAP_ADMIN_USERNAME ?? "tester";
export const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "test1234";

export interface LatencySample {
  method: string;
  urlPattern: string;
  durationMs: number;
  status: number;
}

// Reduces concrete URL to a pattern for p95 aggregation.
//   /api/tournaments/abc-123      -> GET /api/tournaments/:id
//   /api/tournaments              -> GET /api/tournaments
//   /api/auth/login               -> POST /api/auth/login
export function patternOf(method: string, url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  const normalized = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:id")
    .replace(/\?.*$/, "");
  return `${method.toUpperCase()} ${normalized}`;
}

// Captures latency for the current test via testInfo attachments. The custom
// reporter (support/latency-reporter.ts) reads these attachments and computes
// p95 per urlPattern across the whole run.
async function timed<T extends APIResponse>(
  testInfo: TestInfo | null,
  method: string,
  url: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  const res = await fn();
  const durationMs = Date.now() - start;
  const sample: LatencySample = {
    method: method.toUpperCase(),
    urlPattern: patternOf(method, url),
    durationMs,
    status: res.status(),
  };
  if (testInfo) {
    await testInfo.attach(`latency.${sample.urlPattern.replace(/[^a-z0-9]+/gi, "_")}.${start}`, {
      body: Buffer.from(JSON.stringify(sample)),
      contentType: "application/json",
    });
  }
  return res;
}

export interface ApiClient {
  request: APIRequestContext;
  testInfo: TestInfo | null;
  get(path: string): Promise<APIResponse>;
  post(path: string, body?: unknown): Promise<APIResponse>;
  patch(path: string, body?: unknown): Promise<APIResponse>;
  del(path: string, body?: unknown): Promise<APIResponse>;
}

export function makeClient(request: APIRequestContext, testInfo: TestInfo | null = null): ApiClient {
  const url = (p: string) => `${API_BASE}/api${p}`;
  return {
    request,
    testInfo,
    get: (p) => timed(testInfo, "GET", url(p), () => request.get(url(p))),
    post: (p, body) => timed(testInfo, "POST", url(p), () =>
      request.post(url(p), body !== undefined ? { data: body } : undefined)),
    patch: (p, body) => timed(testInfo, "PATCH", url(p), () =>
      request.patch(url(p), body !== undefined ? { data: body } : undefined)),
    del: (p, body) => timed(testInfo, "DELETE", url(p), () =>
      request.delete(url(p), body !== undefined ? { data: body } : undefined)),
  };
}

// --- High-level helpers (ported from backend/test/full_flow.py) -----------

export async function loginAdmin(api: ApiClient): Promise<{ id: string; role: string }> {
  const res = await api.post("/auth/login", { identifier: ADMIN_USER, password: ADMIN_PASS });
  if (!res.ok()) {
    throw new Error(`login admin failed ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.player;
}

export async function logout(api: ApiClient): Promise<APIResponse> {
  return api.post("/auth/logout");
}

export async function whoami(api: ApiClient): Promise<APIResponse> {
  return api.get("/auth/whoami");
}

// Tournament payload matches full_flow.py:create_tournament.
export interface CreateTournamentInput {
  name: string;
  matchDate: string;        // YYYY-MM-DD
  inscriptionStart: string;
  inscriptionEnd: string;
  draftStart: string;
  draftEnd: string;
  location?: string;
  description?: string;
  status?: string;
}

export async function createTournament(api: ApiClient, input: CreateTournamentInput): Promise<APIResponse> {
  const payload = {
    location: "Polideportivo E2E",
    description: `Playwright E2E · ${input.name}`,
    status: "open",
    ...input,
  };
  return api.post("/tournaments", payload);
}

// Soft-delete requires double confirmation per backend/src/routes/tournaments.ts:58.
export async function softDeleteTournament(api: ApiClient, id: string, exactName: string): Promise<APIResponse> {
  return api.del(`/tournaments/${id}`, { confirm: "DELETE", name: exactName });
}

// Tournament statuses considered "live" per sdd/constitution/tournaments.md
// (anything in the active flow before `completed`). Used by cleanup helpers
// to know what to soft-delete between tests.
export const LIVE_STATUSES = new Set([
  "upcoming", "open", "draft", "setup", "scheduled", "active",
]);

// Removes every live tournament. Used in globalSetup + per-spec beforeAll to
// guarantee `assertSingleLive` isn't tripped by leftover state from a prior
// run / spec. Always logs in as admin via the provided client.
export async function cleanupLiveTournaments(api: ApiClient): Promise<number> {
  const res = await api.get("/tournaments");
  if (!res.ok()) return 0;
  const list = await res.json() as Array<{ id: string; status: string; name: string }>;
  const live = list.filter((t) => LIVE_STATUSES.has(t.status));
  for (const t of live) {
    await softDeleteTournament(api, t.id, t.name);
  }
  return live.length;
}

// Useful for tests that need a unique suffix so re-runs don't collide.
export function runSuffix(): string {
  return String(Date.now()).slice(-8);
}
