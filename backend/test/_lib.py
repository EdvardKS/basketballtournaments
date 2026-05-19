"""Shared helpers for the E2E tests.

Designed to run inside the backend container against http://localhost:4000.
Strips the Secure cookie flag after login so plain-HTTP loopback works even
when the prod stack has COOKIE_SECURE=true.
"""

from __future__ import annotations

import csv
import os
import random
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Iterable

import requests

API = os.environ.get("API_BASE", "http://localhost:4000/api")
ADMIN_USER = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "tester")
ADMIN_PASS = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "test1234")
CSV_DIR = Path(os.environ.get("CSV_BACKUP_DIR", "/app/data/csv"))

# Mobile prefix unique per process so re-runs in the same DB don't collide.
RUN_PREFIX = str(int(time.time()))[-6:]

GREEN = "\033[32m"
RED = "\033[31m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
DIM = "\033[2m"
RESET = "\033[0m"


def step(msg: str) -> None:
    print(f"{CYAN}▶ {msg}{RESET}", flush=True)


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET} {msg}", flush=True)


def info(msg: str) -> None:
    print(f"  {DIM}{msg}{RESET}", flush=True)


def warn(msg: str) -> None:
    print(f"{YELLOW}!  {msg}{RESET}", flush=True)


def die(msg: str) -> None:
    print(f"{RED}✗ {msg}{RESET}", flush=True)
    sys.exit(1)


class ApiClient:
    """Tiny session wrapper with consistent error handling + Secure-cookie strip."""

    def __init__(self) -> None:
        self.s = requests.Session()
        self._logged_in = False

    def call(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        url = f"{API}{path}"
        r = self.s.request(method, url, timeout=30, **kwargs)
        if not r.ok:
            body: Any = r.text
            try:
                body = r.json()
            except Exception:
                pass
            die(f"{method} {path} → {r.status_code}: {body}")
        return r

    def get(self, path: str) -> Any:
        return self.call("GET", path).json()

    def post(self, path: str, body: dict | None = None) -> Any:
        return self.call("POST", path, json=body or {}).json()

    def patch(self, path: str, body: dict) -> Any:
        return self.call("PATCH", path, json=body).json()

    def delete(self, path: str) -> Any:
        return self.call("DELETE", path).json()

    def wait_backend(self, timeout_s: int = 60) -> None:
        """Block until /api/health responds 200, up to `timeout_s` seconds.
        Useful when the test-runner container starts before backend's HTTP
        server is actually listening."""
        deadline = time.time() + timeout_s
        last_err: str | None = None
        while time.time() < deadline:
            try:
                r = self.s.get(f"{API}/health", timeout=2)
                if r.ok:
                    return
                last_err = f"HTTP {r.status_code}"
            except Exception as e:
                last_err = str(e)
            time.sleep(1)
        die(f"backend no responde tras {timeout_s}s · last_err={last_err}")

    def login_admin(self) -> None:
        self.wait_backend()
        step(f"login admin · {ADMIN_USER}")
        r = self.call(
            "POST", "/auth/login",
            json={"identifier": ADMIN_USER, "password": ADMIN_PASS},
        )
        player = r.json()["player"]
        if player["role"] != "admin":
            die(f"expected admin role, got {player['role']}")
        # Prod COOKIE_SECURE=true would block reuse over plain HTTP loopback.
        stripped = 0
        for c in self.s.cookies:
            if c.secure:
                c.secure = False
                stripped += 1
        ok(f"login OK · playerId={player['id']} · cookies_secure_stripped={stripped}")
        self._logged_in = True


# --- domain helpers --------------------------------------------------------

_mobile_counter = 0

def seed_player(api: ApiClient, label: str, idx: int) -> dict:
    global _mobile_counter
    _mobile_counter += 1
    mobile = f"9{RUN_PREFIX}{_mobile_counter:05d}"
    return api.post("/players", {
        "name": f"{label} Jugador {idx:03d}",
        "mobile": mobile,
        "password": "x123456",
        "gdprAccepted": True,
        "position": random.choice(["base", "escolta", "alero", "ala-pivot", "pivot"]),
        "age": random.randint(18, 38),
    })


def add_to_tournament(api: ApiClient, tid: str, pid: str) -> None:
    api.post(f"/tournaments/{tid}/add-player", {"playerId": pid})


def make_captain(api: ApiClient, tid: str, pid: str, team_name: str) -> None:
    api.post(f"/tournaments/{tid}/captains",
             {"playerId": pid, "isCaptain": True, "teamName": team_name})


def create_tournament(
    api: ApiClient,
    name: str,
    match_date: date,
    bracket_format: str = "top2_per_group",
    bracket_size: int | None = None,
    court_count: int = 1,
    half_court: bool = True,
) -> dict:
    today = date.today()
    body = {
        "name": name,
        "location": "Polideportivo E2E",
        "description": f"E2E · {name}",
        "matchDate": match_date.isoformat(),
        "inscriptionStart": (today - timedelta(days=2)).isoformat(),
        "inscriptionEnd": (today + timedelta(days=10)).isoformat(),
        "draftStart": (today + timedelta(days=10)).isoformat(),
        "draftEnd":   (today + timedelta(days=11)).isoformat(),
        "status": "open",
        "bracketFormat": bracket_format,
        "courtCount": court_count,
        "halfCourt": half_court,
    }
    if bracket_size is not None:
        body["bracketSize"] = bracket_size
    return api.post("/tournaments", body)


def patch_tournament(api: ApiClient, tid: str, **fields: Any) -> dict:
    return api.patch(f"/tournaments/{tid}", fields)


def get_tournament(api: ApiClient, tid: str) -> dict:
    return api.get(f"/tournaments/{tid}")


def assert_status(api: ApiClient, tid: str, expected: str) -> dict:
    t = get_tournament(api, tid)["tournament"]
    if t["status"] != expected:
        die(f"status={t['status']} (esperado {expected})")
    ok(f"status={expected}")
    return t


def get_draft_state(api: ApiClient, tid: str) -> dict:
    return api.get(f"/draft/{tid}/state")


def pick(api: ApiClient, tid: str, team_id: str, player_id: str) -> dict:
    return api.post(f"/draft/{tid}/pick",
                    {"teamId": team_id, "playerId": player_id})


def list_matches(api: ApiClient, tid: str) -> list:
    return api.get(f"/matches/tournament/{tid}")


def list_groups(api: ApiClient, tid: str) -> list:
    return api.get(f"/matches/tournament/{tid}/groups")


def start_match(api: ApiClient, mid: str) -> dict:
    return api.post(f"/matches/{mid}/start", {})


def score_match(api: ApiClient, mid: str, home: int, away: int) -> dict:
    return api.post(f"/matches/{mid}/score", {"homeScore": home, "awayScore": away})


def complete_match(api: ApiClient, mid: str) -> dict:
    return api.post(f"/matches/{mid}/complete", {})


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


def random_basketball_score() -> tuple[int, int]:
    """Plausible 3x3 final score. Winner ≥ 11 (or 21 if cap reached)."""
    winner = random.choice([11, 12, 14, 15, 16, 17, 18, 19, 20, 21])
    loser = random.randint(2, winner - 1)
    return winner, loser
