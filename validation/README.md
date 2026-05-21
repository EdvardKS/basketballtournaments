# Validation Suite

Autonomous, hourly, end-to-end validation of the VBL core flow. Everything in this folder is meant to be **boring and self-explanatory** so an agent waking up after several hours can pick up exactly where the previous one left off.

## What's here

```
validation/
├── README.md           ← this file
├── ROADMAP.md          ← chronological description of every step the runner takes
├── STATUS.md           ← live state: pending issues, last green run, etc.
├── AUTONOMOUS_LOG.md   ← append-only narrative of each hourly wake-up
├── run.mjs             ← Node 20+ runner (uses native fetch)
├── run.sh              ← thin wrapper for cron / manual use
├── dashboard.html      ← interactive viewer — open in a browser
└── runs/
    ├── index.json      ← list of newest-first run files
    └── run-*.json      ← one file per execution (steps, tokens, timing)
```

## Manual run

```bash
# default → http://localhost:4000
node validation/run.mjs

# against a custom backend (staging, prod, etc.)
BASE=https://api.example.com node validation/run.mjs
```

Exit codes: `0` = all steps OK, `1` = at least one step failed, `2` = runner itself crashed (e.g. backend unreachable).

## Reading the dashboard

```bash
# Astro dev server serves the file as a static asset:
cd frontend && pnpm dev
# then open http://localhost:4321/../validation/dashboard.html (use file://)

# or just open the file directly in a browser:
xdg-open validation/dashboard.html
# or on Windows:
start validation\dashboard.html
```

The page reads `runs/index.json` and renders KPIs, a sparkline of recent runs, a runs table, and a per-step success-rate breakdown. Auto-refreshes every 30 s.

## Agent contract (the autonomous loop)

When the hourly cron fires, the agent is expected to:

1. `bash validation/run.sh`
2. Open the newest file in `validation/runs/`.
3. If `allOk: true` and the previous run was also OK → append a one-line entry to `AUTONOMOUS_LOG.md` and exit.
4. If any step failed → fix the underlying bug, re-run, repeat until green or until the time budget is exhausted.
5. Update `STATUS.md` — add the run to the log, document any pending issue in detail, edit `Targets` if a column flipped.
6. `git add -A && git commit -m "validation: <what changed>" && git push origin main`.

## Why this lives outside `test/`

`test/` is partially gitignored. Everything in `validation/` is tracked so the work survives across sessions, hosts, and agents.
