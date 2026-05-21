# Validation Status

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
| Backend reachable at `$BASE` | TODO |
| Migration `16_player_extras.sql` applied | unknown |
| Migration `17_tournament_photos.sql` applied | unknown |
| `0 fail` runs in a row | 0 |

## Pending issues

_None yet. Populate this list as failures appear._

## Run log

_Each hourly self-run appends here. Newest first._
