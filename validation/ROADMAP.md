# Validation Roadmap — Core Flow (Chronological)

Each autonomous run replays the **complete tournament lifecycle** from creation to public-surface verification. Order matters: every step depends on the previous one having succeeded. A failure stops the run and is logged with the offending HTTP response.

## 1. Bootstrap

| Step | Endpoint | Expected |
|------|----------|----------|
| `admin/login` | `POST /api/auth/login` | 200, role = `admin` |

## 2. Player pool

| Step | Endpoint | Expected |
|------|----------|----------|
| `players/create` × N | `POST /api/players` (admin only) | 201 per player |

`N = PLAYER_COUNT` (default 8). Each player has a unique mobile derived from the run seed so successive runs never clash with the live DB.

## 3. Tournament creation

| Step | Endpoint | Expected |
|------|----------|----------|
| `tournament/create` | `POST /api/tournaments` | 201, status starts at `open` |

Tournament name is timestamped (`AutoE2E-<ISO>`) so every run is a fresh edition. Dates: today − 2 to today + 1 for inscription, − 1 to + 2 for draft, + 7 for match day.

## 4. Registrations + captains

| Step | Endpoint | Expected |
|------|----------|----------|
| `registrations/add+promote` | `POST /api/tournaments/:id/add-player` × N then `POST /api/tournaments/:id/captains` × C | 200 each |

`C = CAPTAIN_COUNT` (default 2). The first players in the pool become captains; the rest are draftable.

## 5. Draft

| Step | Endpoint | Expected |
|------|----------|----------|
| `draft/run` | `POST /api/draft/tournament/:id/start` → loop `pick` until exhausted → `POST /finalize` | draft completes, status moves to `setup` |

The runner reads `GET /api/draft/tournament/:id` to see the current team, picks a random available player, repeats until the draft state reports `isActive: false` or no players remain.

## 6. Groups stage

| Step | Endpoint | Expected |
|------|----------|----------|
| `matches/groups` | `PATCH /api/matches/:id` × every `stage=group` | every group match completed with a random score |

When the last group match closes, the backend auto-generates the bracket and flips tournament status to `active`.

## 7. Knockouts

| Step | Endpoint | Expected |
|------|----------|----------|
| `matches/knockouts` | `PATCH /api/matches/:id` for stage `semifinal`, `third_place`, `final` | each completed with a random score; when `final` closes, tournament flips to `completed` and `tournaments.winner_id` is set |

The runner walks the stages in the order the bracket expects so seed propagation can fill the next round before we try to score it.

## 8. Public verification

| Step | Endpoint | Expected |
|------|----------|----------|
| `public/verify` | `GET /api/tournaments/:id` (no cookie) | 200, includes tournament + teams + registrations |

We deliberately drop the admin session for this slice — the public surface must be reachable anonymously.

---

## Failure modes the runner has to be resilient to

- **409 MOBILE_TAKEN** during `players/create` — retry with a different mobile.
- **Idempotent re-runs** if a step is retried (live env may already have some state). `allowFail: true` is used for promotion/registration calls.
- **Draft pick exhaustion** — break out cleanly when the state reports no players left.
- **Backend not reachable** — fatal, runner exits with code 2.
- **Match without paired teams** — skip (some KO seeds need propagation from earlier rounds before they can be scored).

## Acceptance criteria per run

- All 8 named steps land on `ok: true`.
- `tournaments/<id>` (public) returns the tournament with `status: "completed"`.
- `tournaments/<id>` returns `winnerId` non-null.
- Duration < 60s on a warm backend.

## Variation between runs

- Seed differs every run (wall-clock or `SEED=`).
- Player counts and stats vary via seed-driven RNG.
- Match scores vary too — public history is visibly different each run.
