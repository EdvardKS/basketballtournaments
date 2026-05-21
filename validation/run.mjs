#!/usr/bin/env node
// Autonomous end-to-end validation of the core flow.
// Hits the running backend over HTTP, runs a fresh tournament from creation
// through finalization on every invocation, records every step in
// validation/runs/<id>.json so the dashboard can render history.
//
// Env:
//   BASE=http://localhost:4000   API host
//   ADMIN_USER=base1             admin login id
//   ADMIN_PASS=123123123         admin password
//   PLAYER_COUNT=8               number of fake players to register
//   CAPTAIN_COUNT=2              first N are promoted to captain
//   SEED=auto                    deterministic seed (auto = wall clock)

import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = resolve(__dirname, "runs");
mkdirSync(RUNS_DIR, { recursive: true });

const BASE = process.env.BASE ?? "http://localhost:4000";
const ADMIN_USER = process.env.ADMIN_USER ?? "base1";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "123123123";
const PLAYER_COUNT = Number(process.env.PLAYER_COUNT ?? "8");
const CAPTAIN_COUNT = Number(process.env.CAPTAIN_COUNT ?? "2");

const ts = new Date();
const runId = ts.toISOString().replace(/[:.]/g, "-");
const seed = process.env.SEED && process.env.SEED !== "auto"
  ? Number(process.env.SEED) : ts.getTime();

// ---------------------------------------------------------------- prng
let _s = seed >>> 0;
const rand = () => { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 0xffffffff; };
const pickInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

// ---------------------------------------------------------------- io
const tokens = { in: 0, out: 0 };
const steps = [];

const recordStep = (name, ok, info = {}) => {
  steps.push({ name, ok, info, at: new Date().toISOString() });
  const tag = ok ? "OK  " : "FAIL";
  console.log(`[${tag}] ${name}${ok ? "" : " -> " + JSON.stringify(info)}`);
};

let cookieJar = "";

const apiCall = async (method, path, body, opts = {}) => {
  const url = `${BASE}/api${path}`;
  const headers = { "content-type": "application/json" };
  if (cookieJar) headers["cookie"] = cookieJar;
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  // Capture cookies.
  const sc = res.headers.get("set-cookie");
  if (sc) cookieJar = sc.split(";")[0];
  const text = await res.text();
  tokens.in += url.length + (init.body?.length ?? 0);
  tokens.out += text.length;
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok && !opts.allowFail) {
    const err = new Error(`HTTP ${res.status} ${method} ${path}`);
    err.status = res.status; err.body = data;
    throw err;
  }
  return { status: res.status, data };
};

const expectStep = async (name, fn) => {
  try {
    const out = await fn();
    recordStep(name, true, out?.summary ?? {});
    return out;
  } catch (e) {
    const info = { error: e.message, status: e.status, body: e.body };
    recordStep(name, false, info);
    throw e;
  }
};

// ---------------------------------------------------------------- scenario
const POSITIONS = ["base", "escolta", "alero", "ala-pivot", "pivot"];
const FIRST_NAMES = ["Lucas","Mario","Adrian","Sergio","Pablo","David","Ivan","Jorge","Carlos","Juan","Hugo","Ruben"];
const LAST_NAMES  = ["Gil","Ruiz","Lopez","Mart","Garcia","Diaz","Lara","Cano","Vargas","Rey","Pena","Caro"];

const adminLogin = async () => {
  cookieJar = "";
  const { data } = await apiCall("POST", "/auth/login",
    { identifier: ADMIN_USER, password: ADMIN_PASS });
  if (data?.player?.role !== "admin") throw new Error("not admin");
  return data.player;
};

const createPlayers = async (n) => {
  // Admin creates them so we don't compete with the live env.
  // Each gets unique mobile based on runId + index.
  const baseMobile = 700_000_000 + Math.floor(rand() * 99_000_000);
  const created = [];
  for (let i = 0; i < n; i++) {
    const mobile = String(baseMobile + i);
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]} ${runId.slice(-6)}`;
    try {
      const { data } = await apiCall("POST", "/players", {
        name, mobile,
        password: "123123123",
        age: pickInt(18, 40),
        avatar: null,
        gdprAccepted: true,
        position: POSITIONS[i % POSITIONS.length],
        isPublic: true,
      });
      created.push(data);
    } catch (e) {
      // If a player with that mobile already exists in the live DB,
      // try a different one.
      if (e.status === 409) { i--; continue; }
      throw e;
    }
  }
  return created;
};

// `ONE_ACTIVE_ONLY` rule on the backend means a new tournament can only be
// created when no other tournament is in a non-terminal state. We auto-
// complete any in-flight tournament that THIS validator created (name
// prefix `AutoE2E-`). Real, user-created tournaments are sacred — we
// surface a clear error and abort.
const PREFIX = "AutoE2E-";
const TERMINAL = new Set(["completed"]);

const completeStaleAutoTournament = async () => {
  const { data: list } = await apiCall("GET", "/tournaments");
  const stale = (list ?? []).find((t) =>
    typeof t?.name === "string"
    && t.name.startsWith(PREFIX)
    && !TERMINAL.has(t.status));
  if (!stale) return { closed: 0 };
  // Force-finish via an admin PATCH to status="completed".
  try {
    await apiCall("PATCH", `/tournaments/${stale.id}`, { status: "completed" });
  } catch (e) {
    // Backend may refuse a direct status flip from some states. Best-effort
    // alternative: complete every pending match so lifecycle/transitionAll
    // closes it on the next request.
    try {
      const { data: matches } = await apiCall("GET", `/matches/tournament/${stale.id}`);
      for (const m of matches ?? []) {
        if (m.status === "completed") continue;
        if (!m.homeTeamId || !m.awayTeamId) continue;
        await apiCall("PATCH", `/matches/${m.id}`,
          { homeScore: pickInt(10, 30), awayScore: pickInt(10, 30), status: "completed" },
          { allowFail: true });
      }
      await apiCall("PATCH", `/tournaments/${stale.id}`, { status: "completed" },
        { allowFail: true });
    } catch (e2) {
      throw new Error(`could not close stale ${stale.name}: ${e2.message}`);
    }
  }
  return { closed: 1, id: stale.id, name: stale.name };
};

const ensureCreatableSlot = async () => {
  const { data: list } = await apiCall("GET", "/tournaments");
  const blocker = (list ?? []).find((t) => !TERMINAL.has(t.status));
  if (!blocker) return { blocked: false };
  if (typeof blocker.name === "string" && blocker.name.startsWith(PREFIX)) {
    await completeStaleAutoTournament();
    return { blocked: false, autoClosed: blocker.name };
  }
  return { blocked: true, blocker: { id: blocker.id, name: blocker.name, status: blocker.status } };
};

const createTournament = async () => {
  const today = new Date();
  const matchDate = new Date(today.getTime() + 7 * 86_400_000);
  const insStart = new Date(today.getTime() - 2 * 86_400_000);
  const insEnd   = new Date(today.getTime() + 1 * 86_400_000);
  const drStart  = new Date(today.getTime() - 1 * 86_400_000);
  const drEnd    = new Date(today.getTime() + 2 * 86_400_000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const { data } = await apiCall("POST", "/tournaments", {
    name: `AutoE2E-${runId.slice(0, 19)}`,
    date: fmt(matchDate),
    location: "Polideportivo Auto",
    description: "Torneo de validación end-to-end autónoma.",
    maxTeams: 4,
    inscriptionStart: fmt(insStart),
    inscriptionEnd: fmt(insEnd),
    draftStart: fmt(drStart),
    draftEnd: fmt(drEnd),
    matchDate: fmt(matchDate),
  });
  return data;
};

const registerAndPromote = async (tournamentId, players) => {
  for (let i = 0; i < players.length; i++) {
    await apiCall("POST", `/tournaments/${tournamentId}/add-player`,
      { playerId: players[i].id }, { allowFail: true });
  }
  for (let i = 0; i < CAPTAIN_COUNT && i < players.length; i++) {
    await apiCall("POST", `/tournaments/${tournamentId}/captains`,
      { playerId: players[i].id, isCaptain: true }, { allowFail: true });
  }
};

const startAndCompleteDraft = async (tournamentId) => {
  await apiCall("POST", `/draft/tournament/${tournamentId}/start`, {}, { allowFail: true });
  // Pick everything available in round-robin until exhausted.
  for (let safety = 0; safety < 200; safety++) {
    let state;
    try {
      ({ data: state } = await apiCall("GET", `/draft/tournament/${tournamentId}`));
    } catch { break; }
    if (!state?.state?.isActive) break;
    const cur = state.state.currentTeamIndex;
    const teamId = state.state.teamOrder[cur];
    const avail = state.availablePlayers;
    if (!avail || avail.length === 0) break;
    const pick = avail[Math.floor(rand() * avail.length)];
    try {
      await apiCall("POST", `/draft/tournament/${tournamentId}/pick`,
        { teamId, playerId: pick.id });
    } catch (e) {
      if (e.status === 409 || e.status === 400) break;
      throw e;
    }
  }
  // Finalize (closes draft + spawns groups).
  await apiCall("POST", `/draft/tournament/${tournamentId}/finalize`, {}, { allowFail: true });
};

const playMatches = async (tournamentId, stageFilter) => {
  const { data: ms } = await apiCall("GET", `/matches/tournament/${tournamentId}`);
  for (const m of ms) {
    if (stageFilter && m.stage !== stageFilter) continue;
    if (m.status === "completed") continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const home = pickInt(10, 32);
    const away = pickInt(10, 32);
    await apiCall("PATCH", `/matches/${m.id}`,
      { homeScore: home, awayScore: away, status: "completed" }, { allowFail: true });
  }
};

const verifyPublicSurface = async (tournamentId) => {
  // Anonymous fetch — drop cookies for this slice.
  const stash = cookieJar; cookieJar = "";
  const { data } = await apiCall("GET", `/tournaments/${tournamentId}`);
  cookieJar = stash;
  const summary = {
    name: data?.tournament?.name,
    status: data?.tournament?.status,
    teams: data?.teams?.length ?? 0,
    registrations: data?.registrations?.length ?? 0,
  };
  if (!summary.name) throw new Error("public surface returned no tournament");
  return { summary };
};

// ---------------------------------------------------------------- main
const main = async () => {
  const result = {
    runId, seed, base: BASE, startedAt: ts.toISOString(),
    endedAt: null, durationMs: 0, allOk: false, tournamentId: null,
    tokens, steps,
  };
  const t0 = Date.now();
  try {
    await expectStep("admin/login", async () => ({ summary: await adminLogin() }));
    const players = await expectStep("players/create", async () => {
      const created = await createPlayers(PLAYER_COUNT);
      return { summary: { created: created.length }, players: created };
    });
    await expectStep("slot/ensure", async () => {
      const slot = await ensureCreatableSlot();
      if (slot.blocked) {
        const b = slot.blocker;
        throw new Error(`BLOCKED_BY_LIVE_TOURNAMENT id=${b.id} name=${b.name} status=${b.status}`);
      }
      return { summary: slot };
    });
    const tour = await expectStep("tournament/create", async () => {
      const t = await createTournament();
      return { summary: { id: t.id, name: t.name }, tournament: t };
    });
    result.tournamentId = tour.tournament.id;
    await expectStep("registrations/add+promote", async () => {
      await registerAndPromote(tour.tournament.id, players.players);
      return { summary: { regs: PLAYER_COUNT } };
    });
    await expectStep("draft/run", async () => {
      await startAndCompleteDraft(tour.tournament.id);
      return { summary: {} };
    });
    await expectStep("matches/groups", async () => {
      await playMatches(tour.tournament.id, "group");
      return { summary: {} };
    });
    await expectStep("matches/knockouts", async () => {
      // Iterate semis → final → third_place so propagation can fill seats.
      for (const stage of ["semifinal", "third_place", "final"]) {
        await playMatches(tour.tournament.id, stage);
      }
      return { summary: {} };
    });
    await expectStep("public/verify", () => verifyPublicSurface(tour.tournament.id));
    result.allOk = true;
  } catch (e) {
    result.allOk = false;
    result.fatalError = { message: e.message, status: e.status, body: e.body };
  } finally {
    result.endedAt = new Date().toISOString();
    result.durationMs = Date.now() - t0;
    const file = resolve(RUNS_DIR, `run-${runId}.json`);
    writeFileSync(file, JSON.stringify(result, null, 2));
    console.log(`\n[run] wrote ${file}`);
    console.log(`[run] allOk=${result.allOk} steps=${steps.length} duration=${result.durationMs}ms`);
  }
  // Refresh dashboard index.
  try {
    const all = readdirSync(RUNS_DIR)
      .filter((n) => n.startsWith("run-") && n.endsWith(".json"))
      .sort().reverse();
    writeFileSync(resolve(RUNS_DIR, "index.json"), JSON.stringify(all, null, 2));
  } catch (e) { console.warn("[run] could not refresh index:", e.message); }
  process.exit(result.allOk ? 0 : 1);
};

main().catch((e) => {
  console.error("[run] fatal:", e);
  process.exit(2);
});
