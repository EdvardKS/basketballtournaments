#!/usr/bin/env python3
"""Randomized orchestrator for the E2E full cycle.

Runs `full_cycle.py` repeatedly with varying parameters. Each iteration:

1. Picks a random captain / player count + bracket format.
2. Spawns full_cycle.py as a subprocess with those params via env vars.
3. Logs stdout + stderr to /app/data/test-runs/run-<ts>.log.
4. Updates /app/data/test-runs/findings.md with PASS / FAIL summary.

Modes:

    python3 runner.py --once          # 1 iteration then exit
    python3 runner.py --iterations N  # N iterations back-to-back
    python3 runner.py --loop          # never stop, sleep CYCLE_INTERVAL sec
                                      # (default 3600 = 1h) between runs

Run inside the backend container. Designed so I can `docker exec -d`
launch the loop overnight and have a chronological diary of pass/fail
plus failure logs on disk.
"""

from __future__ import annotations

import argparse
import os
import random
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path("/app/data/test-runs")
ROOT.mkdir(parents=True, exist_ok=True)
LOG_DIR = ROOT
FINDINGS = ROOT / "findings.md"

GREEN = "\033[32m"
RED = "\033[31m"
CYAN = "\033[36m"
RESET = "\033[0m"


# -- Parameter generation ---------------------------------------------------

FORMATS = ["top2_per_group", "top1_plus_best2_seconds"]


def qualified_count(captains_n: int, fmt: str) -> int:
    """Mirror of services/bracket.collectQualified() for sizing."""
    groups = max(1, -(-captains_n // 4))  # ceil(captains/4)
    if fmt == "top2_per_group":
        return 4 if groups == 1 else groups * 2
    # top1_plus_best2_seconds requires ≥2 groups; treat 1 group as 0 qualified.
    if groups < 2:
        return 0
    return groups + 2


def fit_sizes(qualified: int) -> list[int | None]:
    """Bracket sizes that can be backed by `qualified` teams. `None` = let
    the backend infer the largest fitting size."""
    out: list[int | None] = [None]
    if qualified >= 4:
        out.append(4)
    if qualified >= 8:
        out.append(8)
    if qualified >= 16:
        out.append(16)
    return out


def gen_params() -> dict[str, str]:
    """Random but sensible: ensure team counts work with bracket size."""
    bracket_format = random.choice(FORMATS)
    # Need at least 4 teams to build any bracket. top1_plus_best2_seconds
    # also needs ≥2 groups → ≥5 captains in practice.
    if bracket_format == "top1_plus_best2_seconds":
        captains_n = random.choice([5, 6, 7, 8, 9, 10, 12])
    else:
        captains_n = random.choice([4, 5, 6, 7, 8, 9, 10, 12, 16])

    qualified = qualified_count(captains_n, bracket_format)
    if qualified < 4:
        # Avoid a known-bad combo; fall back to a single big-group setup.
        bracket_format = "top2_per_group"
        captains_n = max(captains_n, 4)
        qualified = qualified_count(captains_n, bracket_format)

    bracket_size = random.choice(fit_sizes(qualified))

    # Players per team avg 2-6 + small jitter.
    avg_per_team = random.randint(2, 6)
    players_n = captains_n * avg_per_team + random.randint(0, captains_n)

    params: dict[str, str] = {
        "CAPTAINS_N": str(captains_n),
        "PLAYERS_N": str(players_n),
        "BRACKET_FORMAT": bracket_format,
    }
    if bracket_size is not None:
        params["BRACKET_SIZE"] = str(bracket_size)
    sz_tag = bracket_size if bracket_size else "auto"
    params["LABEL"] = (
        f"R-{datetime.now().strftime('%H%M%S')}-{captains_n}c-{players_n}p-"
        f"{bracket_format[:4]}-{sz_tag}"
    )
    return params


# -- Running a single iteration --------------------------------------------

def append_findings(line: str) -> None:
    with FINDINGS.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def run_once(seq: int) -> bool:
    params = gen_params()
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = LOG_DIR / f"run-{ts}-{seq:04d}.log"
    print(f"{CYAN}=== iter {seq} · {ts} ==={RESET}")
    print(f"  params: { {k: params[k] for k in sorted(params)} }")
    print(f"  log:    {log_path}")

    env = {**os.environ, **params}
    started = time.time()
    with log_path.open("w", encoding="utf-8") as logfh:
        logfh.write(f"# {ts} · iter {seq}\n# params: {params}\n\n")
        logfh.flush()
        rc = subprocess.run(
            [sys.executable, "/app/test/full_cycle.py"],
            env=env, stdout=logfh, stderr=subprocess.STDOUT, cwd="/app/test",
        ).returncode
    elapsed = time.time() - started
    ok = rc == 0
    marker = "✅" if ok else "❌"
    print(f"  {marker} rc={rc} · {elapsed:.1f}s")
    append_findings(
        f"- [{ts}] iter={seq} rc={rc} elapsed={elapsed:.1f}s "
        f"params={ {k: params[k] for k in sorted(params)} } "
        f"log={log_path.name}"
    )
    if not ok:
        # Append tail of failing log to findings for quick scan.
        tail = log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-30:]
        append_findings("  ```")
        for line in tail:
            append_findings(f"  {line}")
        append_findings("  ```")
    return ok


def header_findings() -> None:
    if FINDINGS.exists():
        return
    FINDINGS.write_text(
        "# Test runner findings\n\n"
        "Cada línea es una iteración del orquestador "
        "(`backend/test/runner.py`). Si falla, abajo va el tail del log.\n\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Una iteración y salir.")
    parser.add_argument("--iterations", type=int, default=0,
                        help="N iteraciones consecutivas y salir.")
    parser.add_argument("--loop", action="store_true",
                        help="Bucle infinito sleeping CYCLE_INTERVAL (default 3600s).")
    parser.add_argument("--interval", type=int,
                        default=int(os.environ.get("CYCLE_INTERVAL", "3600")),
                        help="Segundos entre iteraciones en modo --loop.")
    args = parser.parse_args()

    header_findings()
    print(f"runner · log dir = {LOG_DIR}")

    if args.once or args.iterations <= 0 and not args.loop:
        run_once(1)
        return 0

    if args.iterations > 0:
        ok_total = 0
        for i in range(1, args.iterations + 1):
            if run_once(i):
                ok_total += 1
        print(f"\n{GREEN}done · {ok_total}/{args.iterations} OK{RESET}")
        return 0 if ok_total == args.iterations else 1

    # loop forever
    seq = 0
    while True:
        seq += 1
        run_once(seq)
        print(f"sleeping {args.interval}s …")
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
