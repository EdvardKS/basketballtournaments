#!/usr/bin/env python3
"""E2E: bracket lock toggle blocks regroup + regenerate + meta updates."""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    API, ApiClient, GREEN, RESET,
    ok, step, die,
    seed_player, add_to_tournament, make_captain, create_tournament,
    patch_tournament, get_draft_state, pick, list_groups,
)


def expect_status(api: ApiClient, method: str, path: str, status: int,
                  body: dict | None = None,
                  expected_code: str | None = None) -> dict | None:
    kw = {"json": body} if body is not None else {}
    r = api.s.request(method, f"{API}{path}", timeout=30, **kw)
    if r.status_code != status:
        try: payload = r.json()
        except Exception: payload = r.text
        die(f"{method} {path} → {r.status_code} (esperado {status}): {payload}")
    if expected_code is not None:
        try: body_json = r.json()
        except Exception: body_json = None
        code = (body_json or {}).get("error") or (body_json or {}).get("code")
        if code != expected_code:
            die(f"{method} {path} code={code!r} (esperado {expected_code!r})")
    try: return r.json()
    except Exception: return None


def cleanup_live(api: ApiClient) -> None:
    LIVE = {"upcoming","open","draft","setup","scheduled","active"}
    for t in api.get("/tournaments"):
        if t["status"] in LIVE:
            api.patch(f"/tournaments/{t['id']}", {"status": "completed"})


def main() -> int:
    api = ApiClient()
    api.login_admin()
    cleanup_live(api)

    today = date.today()
    label = f"LK-{int(time.time()) % 100000}"
    step(f"crear torneo · {label}")
    t = create_tournament(api, label, today + timedelta(days=30))
    tid = t["id"]
    for i in range(1, 9):
        p = seed_player(api, "LK", i)
        add_to_tournament(api, tid, p["id"])
    teams_raw = api.get(f"/tournaments/{tid}")["registrations"]
    pids = [r["player_id"] for r in teams_raw]
    for i in range(4):
        make_captain(api, tid, pids[i], f"Team {chr(ord('A') + i)}")
    patch_tournament(api, tid,
        inscriptionStart=(today - timedelta(days=5)).isoformat(),
        draftStart=(today - timedelta(days=1)).isoformat(),
        draftEnd=(today + timedelta(days=2)).isoformat())
    safety = 30
    while safety > 0:
        safety -= 1
        st = get_draft_state(api, tid)
        if not st["state"]["isActive"]: break
        pick(api, tid, st["currentTeamId"], st["availablePlayers"][0]["id"])
    teams = api.get(f"/tournaments/{tid}")["teams"]
    ids = [tm["id"] for tm in teams]
    ok(f"draft cerrado · {len(teams)} teams")

    step("estado inicial: bracketLockedAt = null")
    info = api.get(f"/tournaments/{tid}")["tournament"]
    if info["bracketLockedAt"] is not None:
        die(f"bracketLockedAt={info['bracketLockedAt']!r} esperado null")
    ok("desbloqueado")

    step("PUT regroup OK con bracket desbloqueado")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": [
                      {"name": "G1", "teamIds": ids[:2]},
                      {"name": "G2", "teamIds": ids[2:]},
                  ]})
    ok("regroup OK")

    step("POST /lock-bracket → 200, bracketLockedAt no nulo")
    out = api.post(f"/tournaments/{tid}/lock-bracket")
    if not out.get("bracketLockedAt"):
        die(f"bracketLockedAt vacío tras lock: {out}")
    ok(f"lockedAt={out['bracketLockedAt']}")

    step("PUT regroup con bracket fijado → 409 BRACKET_LOCKED")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 409,
                  body={"groups": [
                      {"name": "G1", "teamIds": ids[:3]},
                      {"name": "G2", "teamIds": ids[3:]},
                  ]}, expected_code="BRACKET_LOCKED")

    groups_now = api.get(f"/matches/tournament/{tid}/groups")
    gid = groups_now[0]["group"]["id"]
    step("PATCH meta con bracket fijado → 409 BRACKET_LOCKED")
    expect_status(api, "PATCH", f"/matches/tournament/{tid}/groups/{gid}", 409,
                  body={"name": "Bloqueado"}, expected_code="BRACKET_LOCKED")

    step("POST regenerate-bracket con bracket fijado → 409 BRACKET_LOCKED")
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 409,
                  expected_code="BRACKET_LOCKED")

    step("POST /unlock-bracket → bracketLockedAt null")
    out = api.post(f"/tournaments/{tid}/unlock-bracket")
    if out.get("bracketLockedAt") is not None:
        die(f"bracketLockedAt={out['bracketLockedAt']!r} esperado null tras unlock")
    ok("desbloqueado")

    step("PUT regroup tras desbloquear → 200")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": [
                      {"name": "G1", "teamIds": ids[:2]},
                      {"name": "G2", "teamIds": ids[2:]},
                  ]})
    ok("regroup OK tras unlock")

    print(f"\n{GREEN}✓ bracket lock OK{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
