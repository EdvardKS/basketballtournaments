# Validation Status

> **Cron job id**: `5f8cc742` · fires every hour at `:17` local time. Created
> 2026-05-21 evening. Session-only (the Claude REPL must stay open for it to
> fire). Auto-expires 7 days from creation.

> **Backend reachable**: `http://127.0.0.1:4010` (Docker maps the container's
> `:4000` → host `:4010`). `localhost` resolves to IPv6 first on this host
> and Node's fetch returns "fetch failed"; always use the IPv4 literal.
> The runner defaults to that URL now (`validation/run.sh`).

Single source of truth across hourly self-runs. **Always read this file first**, then act, then update it.

## How to use this file (for the agent on every wake-up)

1. `bash validation/run.sh` (or `node validation/run.mjs`) against the configured backend.
2. Open the newest file in `validation/runs/` — it has step-by-step pass/fail.
3. For every `FAIL` step:
   - Determine root cause from `info.error`, `info.status`, `info.body`.
   - Fix the underlying code (backend, frontend, schema, env config).
   - Re-run the suite.
   - When everything passes, append a `## Run <ts>` block below and commit.
4. If you can't fix something inside the time budget, document the issue in **Pending issues** below with as much context as possible so the next agent picks it up.
5. Always commit + push at the end. Other agents need to see your changes.

## Targets

| Surface | Status |
|---------|--------|
| Backend reachable at `$BASE` | OK (127.0.0.1:4010) |
| Migration `16_player_extras.sql` applied | OK (admin login OK, player creation OK) |
| Migration `17_tournament_photos.sql` applied | unknown (not yet exercised) |
| `0 fail` runs in a row | 0 |

## Pending issues

### #1 · Real tournament `LK-46251` blocks fresh tournament creation

- **Symptom**: every run fails at the new `slot/ensure` step with
  `BLOCKED_BY_LIVE_TOURNAMENT id=e0363f21-b8c5-4557-bb59-1835ff933461 name=LK-46251 status=setup`.
- **Cause**: backend enforces `ONE_ACTIVE_ONLY`. A real, user-created tournament
  (`LK-46251`) is parked in `status=setup`. Per the contract, the validator
  refuses to touch tournaments it didn't create.
- **Required action (manual / user)**: complete the live tournament
  `LK-46251` — either run it to its natural end through the admin panel
  (draft + groups + final → status flips to `completed`) or use the admin
  panel "Eliminar torneo" flow to soft-delete it. Once it's no longer in
  a non-terminal state, the autonomous loop will start passing again.
- **What the validator does until then**: stops at `slot/ensure` and
  records the block. It will NOT auto-finish or auto-delete `LK-46251`,
  because that would violate the "core flow is sacred" rule.
- **What the validator does for ITS OWN past runs**: any leftover
  tournament whose name starts with `AutoE2E-` is auto-completed before
  the new tournament is created (see `completeStaleAutoTournament` in
  `validation/run.mjs`).

## Run log

### 2026-05-22 05:28 Z — Wake-up #14

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-22T05-28-39-859Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-22 03:28 Z — Wake-up #13

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-22T03-28-24-339Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-22 02:28 Z — Wake-up #12

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-22T02-28-23-646Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-22 01:28 Z — Wake-up #11

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-22T01-28-24-512Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-22 00:28 Z — Wake-up #10

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-22T00-28-24-205Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 23:28 Z — Wake-up #9

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T23-28-26-762Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 22:28 Z — Wake-up #8

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T22-28-25-039Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 21:28 Z — Wake-up #7

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T21-28-25-328Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 20:28 Z — Wake-up #6

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T20-28-23-856Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 19:28 Z — Wake-up #5

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T19-28-24-062Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 18:28 Z — Wake-up #4

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T18-28-39-427Z.json`.
- **Action taken**: none. `LK-46251` still `setup`.

### 2026-05-21 17:28 Z — Wake-up #3

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T17-28-32-902Z.json`.
- **Action taken**: none beyond logging. `LK-46251` still in `setup`.

### 2026-05-21 16:30 Z — Wake-up #2

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3.
- **Latest JSON**: `validation/runs/run-2026-05-21T16-30-03-166Z.json`.
- **Action taken**: `validation/run.sh` was not exporting `BASE`, so `node`
  fell back to `http://localhost:4000` and failed at login. Added `export`.
  Re-ran; same `LK-46251` blocker. Did not touch anything else.

### 2026-05-21 15:30 Z — Wake-up #1

- **Reached step**: `slot/ensure` (blocked).
- **All OK**: ❌
- **Steps OK / total**: 2 / 3 (admin/login, players/create).
- **Latest JSON**: `validation/runs/run-2026-05-21T15-30-43-502Z.json`.
- **Action taken**: patched runner to detect ONE_ACTIVE_ONLY, auto-complete
  own (`AutoE2E-*`) tournaments, abort cleanly on real ones; switched
  default BASE to `127.0.0.1:4010` because IPv6-`localhost` returns
  `fetch failed` on Windows Node 24.
- **Commit**: see `git log -1`.
