#!/usr/bin/env python3
"""Linear end-to-end test: tournament creation -> match day.

Runs inside the backend container against the local API on port 4000.
No mocks, no parallelism, no surprises. Two consecutive tournaments
exercise the full lifecycle:

    tournament A   6 captains + 53 players  -> finishes in `completed`
    tournament B   9 captains + 65 players  -> stops in `active` (matches pending)

Reset the stack first so the DB is clean and the bootstrap admin is in
place — see backend/test/README.md for the exact reset sequence.
"""

from __future__ import annotations

import csv
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests

API = os.environ.get("API_BASE", "http://localhost:4000/api")
ADMIN_USER = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "tester")
ADMIN_PASS = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "test1234")
CSV_DIR = Path(os.environ.get("CSV_BACKUP_DIR", "/app/data/csv"))

# Mobile numbers must be unique. Build a per-run prefix so re-runs against
# the same DB don't collide.
RUN_PREFIX = str(int(time.time()))[-6:]   # 6 digits, current epoch tail

GREEN = "\033[32m"
RED = "\033[31m"
CYAN = "\033[36m"
DIM = "\033[2m"
RESET = "\033[0m"


def step(msg: str) -> None:
    print(f"{CYAN}▶ {msg}{RESET}", flush=True)


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET} {msg}", flush=True)


def info(msg: str) -> None:
    print(f"  {DIM}{msg}{RESET}", flush=True)


def die(msg: str) -> None:
    print(f"{RED}✗ {msg}{RESET}", flush=True)
    sys.exit(1)


session = requests.Session()


def call(method: str, path: str, **kwargs) -> requests.Response:
    url = f"{API}{path}"
    r = session.request(method, url, timeout=30, **kwargs)
    if not r.ok:
        body = ""
        try:
            body = r.json()
        except Exception:
            body = r.text
        die(f"{method} {path} → {r.status_code}: {body}")
    return r


# --- atomic API helpers -----------------------------------------------------

def login_admin() -> None:
    step(f"login admin · {ADMIN_USER}")
    r = call("POST", "/auth/login", json={"identifier": ADMIN_USER, "password": ADMIN_PASS})
    player = r.json()["player"]
    if player["role"] != "admin":
        die(f"expected admin role, got {player['role']}")
    # Prod sets COOKIE_SECURE=true, but the test runs INSIDE the container
    # against http://localhost:4000 (plain HTTP). `requests` honours the
    # Secure flag and would silently drop the cookie on every subsequent
    # call. Strip it so the session cookie is reused on plain-HTTP loopback.
    cookies_stripped = 0
    for c in session.cookies:
        if c.secure:
            c.secure = False
            cookies_stripped += 1
    ok(f"sesión iniciada · playerId={player['id']} · cookies_secure_off={cookies_stripped}")


def create_tournament(label: str, match_date: date,
                      inscription_start: date, draft_start: date, draft_end: date) -> dict:
    body = {
        "name": label,
        "location": "Polideportivo E2E",
        "description": f"E2E lineal · {label}",
        "matchDate": match_date.isoformat(),
        "inscriptionStart": inscription_start.isoformat(),
        "inscriptionEnd": draft_start.isoformat(),
        "draftStart": draft_start.isoformat(),
        "draftEnd": draft_end.isoformat(),
        "status": "open",
    }
    return call("POST", "/tournaments", json=body).json()


# Per-tag monotonic counter so mobiles never collide, even across re-runs
# in the same DB.
_mobile_counter = 0

def seed_player(tag: str, idx: int) -> dict:
    global _mobile_counter
    _mobile_counter += 1
    # 11-digit mobile: 9 + run prefix (6) + counter (4) — globally unique
    # within a single test run and unlikely to collide between runs.
    mobile = f"9{RUN_PREFIX}{_mobile_counter:04d}"
    body = {
        "name": f"{tag} Jugador {idx:03d}",
        "mobile": mobile,
        "password": "x123456",
        "gdprAccepted": True,
        "position": "base",
    }
    return call("POST", "/players", json=body).json()


def add_to_tournament(tid: str, pid: str) -> None:
    call("POST", f"/tournaments/{tid}/add-player", json={"playerId": pid})


def make_captain(tid: str, pid: str, team_name: str) -> None:
    call("POST", f"/tournaments/{tid}/captains",
         json={"playerId": pid, "isCaptain": True, "teamName": team_name})


def patch_tournament(tid: str, **fields) -> dict:
    return call("PATCH", f"/tournaments/{tid}", json=fields).json()


def get_tournament(tid: str) -> dict:
    # This GET also triggers lifecycle.transitionTournament server-side.
    return call("GET", f"/tournaments/{tid}").json()


def get_draft_state(tid: str) -> dict:
    return call("GET", f"/draft/{tid}/state").json()


def list_matches(tid: str) -> list:
    return call("GET", f"/matches/tournament/{tid}").json()


def pick(tid: str, team_id: str, player_id: str) -> dict:
    return call("POST", f"/draft/{tid}/pick",
                json={"teamId": team_id, "playerId": player_id}).json()


# --- assertions -------------------------------------------------------------

def assert_status(tid: str, expected: str) -> dict:
    t = get_tournament(tid)["tournament"]
    if t["status"] != expected:
        die(f"status={t['status']} (esperado {expected})")
    ok(f"status={expected}")
    return t


def assert_csv(match_date: date, rows_expected: int, captains_expected: int) -> None:
    csv_path = CSV_DIR / f"{match_date.isoformat()}.csv"
    if not csv_path.exists():
        die(f"CSV no existe: {csv_path}")
    with csv_path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if len(rows) != rows_expected:
        die(f"CSV {csv_path.name}: {len(rows)} filas (esperaba {rows_expected})")
    caps = sum(1 for r in rows if r["is_captain"] == "yes")
    if caps != captains_expected:
        die(f"CSV capitanes={caps} (esperaba {captains_expected})")
    ok(f"CSV {csv_path.name} · {rows_expected} filas · {captains_expected} capitanes")


# --- linear flow ------------------------------------------------------------

def run_flow(label: str, captains_n: int, players_n: int, match_offset_days: int) -> dict:
    print()
    step(f"=== {label} · {captains_n} cap + {players_n} jug ===")
    today = date.today()
    inscription_start = today - timedelta(days=2)
    draft_start = today + timedelta(days=10)   # will be moved later
    draft_end = today + timedelta(days=11)
    match_date = today + timedelta(days=match_offset_days)

    # 1. create
    step(f"crear torneo · matchDate={match_date}")
    t = create_tournament(label, match_date, inscription_start, draft_start, draft_end)
    tid = t["id"]
    ok(f"id={tid}")

    # 2. seed players + add to tournament
    total = captains_n + players_n
    step(f"crear {total} jugadores + inscribir")
    pids: list[str] = []
    for i in range(1, total + 1):
        p = seed_player(label[:8], i)
        add_to_tournament(tid, p["id"])
        pids.append(p["id"])
        if i % 25 == 0 or i == total:
            info(f"  {i}/{total} inscritos")

    # 3. promote first N captains
    step(f"promover {captains_n} capitanes")
    for i in range(captains_n):
        make_captain(tid, pids[i], f"Team {chr(ord('A') + i)}")
    ok(f"{captains_n} capitanes promovidos")

    # 4. CSV sanity
    assert_csv(match_date, total, captains_n)

    # 5. push to draft window: backdate inscription + draft_start
    step("mover fechas → ventana de draft")
    yesterday = today - timedelta(days=1)
    patch_tournament(tid,
                     inscriptionStart=(today - timedelta(days=5)).isoformat(),
                     draftStart=yesterday.isoformat(),
                     draftEnd=(today + timedelta(days=2)).isoformat())
    assert_status(tid, "draft")
    state = get_draft_state(tid)
    if not state["state"]["isActive"]:
        die("draft_state.isActive=false tras transición a draft")
    ok(f"draft_state.isActive=true · teamOrder n={len(state['state']['teamOrder'])}")

    # 6. draft picks until pool empty
    step(f"draft: {players_n} picks round-robin")
    safety = players_n + 20
    while safety > 0:
        safety -= 1
        st = get_draft_state(tid)
        if not st["state"]["isActive"]:
            ok("draft auto-cerrado · pool vacía")
            break
        current = st["currentTeamId"]
        avail = st["availablePlayers"]
        if not avail:
            die("availablePlayers vacío pero draft sigue activo")
        if not current:
            die("currentTeamId=null en pleno draft")
        pick(tid, current, avail[0]["id"])
    else:
        die("loop de picks excedió safety limit")

    # 7. setup expected
    step("verificar setup (grupos + calendario)")
    t = assert_status(tid, "setup")
    if not t["hoursConfirmed"]:
        die("hoursConfirmed=false tras cerrar draft")
    matches = list_matches(tid)
    if not matches:
        die("no se generaron partidos")
    pending = [m for m in matches if m["status"] == "pending"]
    if len(pending) != len(matches):
        die(f"partidos no pendientes: {len(matches) - len(pending)} ya iniciados")
    ok(f"{len(matches)} partidos generados · todos pending · hoursConfirmed=true")

    # 8. push to match day
    step("mover matchDate a ayer → status active")
    patch_tournament(tid, matchDate=yesterday.isoformat())
    assert_status(tid, "active")

    # 9. final assertions on match list
    matches_after = list_matches(tid)
    no_schedule = [m for m in matches_after if not m.get("scheduledAt")]
    if no_schedule:
        die(f"{len(no_schedule)} partidos sin scheduledAt")
    ok(f"todos los partidos con scheduledAt · matchDay listo · n={len(matches_after)}")

    return {"id": tid, "matchDate": match_date, "matches": len(matches_after)}


def main() -> None:
    print(f"API={API} · CSV_DIR={CSV_DIR}")
    print(f"RUN_PREFIX={RUN_PREFIX}")
    login_admin()

    # --- Torneo A: pequeño, lo dejamos cerrado para liberar ONE_ACTIVE_ONLY
    a = run_flow("E2E Torneo A 6/53", captains_n=6, players_n=53, match_offset_days=30)
    step("cerrar torneo A → status completed")
    patch_tournament(a["id"], status="completed")
    assert_status(a["id"], "completed")

    # --- Torneo B: grande, lo dejamos en active (matchDay)
    b = run_flow("E2E Torneo B 9/65", captains_n=9, players_n=65, match_offset_days=60)

    print()
    print(f"{GREEN}✓ E2E completo{RESET}")
    print(f"  · Torneo A = {a['id']} · status=completed · matches={a['matches']}")
    print(f"  · Torneo B = {b['id']} · status=active   · matches={b['matches']}")
    print(f"  abre el frontend en http://localhost:4322/ para ver el resultado")


if __name__ == "__main__":
    main()
