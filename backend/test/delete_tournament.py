#!/usr/bin/env python3
"""E2E: soft-delete a tournament with double confirmation.

Asserts:
  - DELETE /tournaments/:id without body  → 400
  - DELETE with wrong confirm string      → 400
  - DELETE with wrong tournament name     → 400
  - DELETE with correct {confirm,name}    → 200
  - GET /tournaments  → deleted not listed
  - GET /tournaments/:id → 404
  - Players seeded for the tournament still exist via GET /players

Run inside the backend container:
    docker exec basket_backend python3 /app/test/delete_tournament.py
"""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    API, ApiClient, GREEN, RED, RESET,
    ok, step, info, die,
    seed_player, add_to_tournament, create_tournament,
)


def expect_status(api: ApiClient, method: str, path: str, status: int,
                  body: dict | None = None) -> None:
    """Issue request and assert HTTP status WITHOUT die-ing on error."""
    kw = {"json": body} if body is not None else {}
    r = api.s.request(method, f"{API}{path}", timeout=30, **kw)
    if r.status_code != status:
        try:
            payload = r.json()
        except Exception:
            payload = r.text
        die(f"{method} {path} → {r.status_code} (esperado {status}): {payload}")


def cleanup_live(api: ApiClient) -> None:
    """Close any in-flight tournament so we can create a fresh one."""
    LIVE = {"upcoming", "open", "draft", "setup", "scheduled", "active"}
    for t in api.get("/tournaments"):
        if t["status"] in LIVE:
            api.patch(f"/tournaments/{t['id']}", {"status": "completed"})


def main() -> int:
    api = ApiClient()
    api.login_admin()
    cleanup_live(api)

    today = date.today()
    label = f"DEL-{int(time.time()) % 100000}"
    step(f"crear torneo descartable · {label}")
    t = create_tournament(api, label, today + timedelta(days=30))
    tid, tname = t["id"], t["name"]
    ok(f"id={tid} name={tname}")

    step("inscribir 2 jugadores")
    p1 = seed_player(api, "DEL", 1)
    p2 = seed_player(api, "DEL", 2)
    add_to_tournament(api, tid, p1["id"])
    add_to_tournament(api, tid, p2["id"])
    ok(f"jugadores: {p1['id']} {p2['id']}")

    step("DELETE sin confirmación → 400")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400)
    ok("400 sin body")

    step("DELETE con confirm incorrecto → 400")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400,
                  body={"confirm": "yes", "name": tname})
    ok("400 confirm!=DELETE")

    step("DELETE con name incorrecto → 400")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400,
                  body={"confirm": "DELETE", "name": tname + "-wrong"})
    ok("400 name no coincide")

    step("DELETE con body correcto → 200")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 200,
                  body={"confirm": "DELETE", "name": tname})
    ok("200 soft-delete")

    step("listado público no contiene el torneo")
    listed = api.get("/tournaments")
    if any(x["id"] == tid for x in listed):
        die(f"torneo {tid} sigue en /tournaments")
    ok(f"no listado · {len(listed)} torneos visibles")

    step("GET /tournaments/:id → 404")
    expect_status(api, "GET", f"/tournaments/{tid}", 404)
    ok("404 confirmado")

    step("jugadores siguen existiendo")
    players = api.get("/players")
    ids = {p["id"] for p in players}
    for pid in (p1["id"], p2["id"]):
        if pid not in ids:
            die(f"jugador {pid} ya no existe tras soft-delete")
    ok("ambos jugadores conservados")

    print(f"\n{GREEN}✓ soft-delete OK{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
