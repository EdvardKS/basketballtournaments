#!/usr/bin/env python3
"""E2E: generic bracket plan (qualifiersPerGroup + wildcards).

Covers the plan path that replaces the named-format picker:

  - 3 grupos · plan {perGroup=1, wildcards=1, size=4} → 1º+1º+1º+1 wildcard
  - 4 grupos · plan {perGroup=2, wildcards=0, size=8} → cuartos
  - 5 grupos · plan {perGroup=1, wildcards=3, size=8} → cuartos con wildcards
  - plan inválido (suma != 2/4/8/16) → 400 PLAN_INVALID_SIZE
  - plan que pide más wildcards que disponibles → 400 PLAN_TOO_FEW_WILDCARDS
"""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    API, ApiClient, GREEN, RESET,
    ok, step, die,
    seed_player, add_to_tournament, make_captain, create_tournament,
    patch_tournament, get_draft_state, pick, list_matches, list_groups,
)


def expect_status(api: ApiClient, method: str, path: str, status: int,
                  body: dict | None = None,
                  expected_code: str | None = None) -> dict | None:
    kw = {"json": body} if body is not None else {}
    r = api.s.request(method, f"{API}{path}", timeout=30, **kw)
    if r.status_code != status:
        try:
            payload = r.json()
        except Exception:
            payload = r.text
        die(f"{method} {path} → {r.status_code} (esperado {status}): {payload}")
    if expected_code is not None:
        try:
            body_json = r.json()
        except Exception:
            body_json = None
        code = (body_json or {}).get("error") or (body_json or {}).get("code")
        if code != expected_code:
            die(f"{method} {path} code={code!r} (esperado {expected_code!r})")
    try:
        return r.json()
    except Exception:
        return None


def cleanup_live(api: ApiClient) -> None:
    LIVE = {"upcoming", "open", "draft", "setup", "scheduled", "active"}
    for t in api.get("/tournaments"):
        if t["status"] in LIVE:
            api.patch(f"/tournaments/{t['id']}", {"status": "completed"})


def drive_draft(api: ApiClient, captains_n: int, players_n: int) -> tuple[str, list[dict]]:
    today = date.today()
    label = f"BP-{int(time.time()) % 100000}"
    step(f"crear torneo · {label} · {captains_n} cap + {players_n} jug")
    t = create_tournament(api, label, today + timedelta(days=30))
    tid = t["id"]
    total = captains_n + players_n
    pids = []
    for i in range(1, total + 1):
        p = seed_player(api, "BP", i)
        add_to_tournament(api, tid, p["id"])
        pids.append(p["id"])
    for i in range(captains_n):
        make_captain(api, tid, pids[i], f"Team {chr(ord('A') + i)}")
    today_d = date.today()
    patch_tournament(
        api, tid,
        inscriptionStart=(today_d - timedelta(days=5)).isoformat(),
        draftStart=(today_d - timedelta(days=1)).isoformat(),
        draftEnd=(today_d + timedelta(days=2)).isoformat(),
    )
    safety = players_n + 30
    while safety > 0:
        safety -= 1
        st = get_draft_state(api, tid)
        if not st["state"]["isActive"]:
            break
        cur = st["currentTeamId"]
        if not cur or not st["availablePlayers"]:
            die("draft state inconsistente")
        pick(api, tid, cur, st["availablePlayers"][0]["id"])
    teams = api.get(f"/tournaments/{tid}")["teams"]
    ok(f"tournament={tid} · teams={len(teams)}")
    return tid, teams


def set_groups(api: ApiClient, tid: str, groups_payload: list[dict]) -> None:
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": groups_payload})


def apply_plan(api: ApiClient, tid: str, perGroup: int, wildcards: int, size: int) -> None:
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": perGroup,
        "bracketWildcards": wildcards,
        "bracketSize": size,
    })
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})


def ko_matches(api: ApiClient, tid: str) -> list[dict]:
    return [m for m in list_matches(api, tid) if m["stage"] != "group"]


def main() -> int:
    api = ApiClient()
    api.login_admin()
    cleanup_live(api)

    # --- 3 groups, perGroup=1 wildcards=1 size=4 -------------------------
    tid, teams = drive_draft(api, captains_n=6, players_n=6)
    ids = [t["id"] for t in teams]
    set_groups(api, tid, [
        {"name": "Grupo Alfa", "teamIds": ids[:2]},
        {"name": "Grupo Beta", "teamIds": ids[2:4]},
        {"name": "Grupo Gamma", "teamIds": ids[4:]},
    ])

    step("plan: 3 grupos · 1 por grupo + 1 wildcard → cuadro 4")
    apply_plan(api, tid, perGroup=1, wildcards=1, size=4)
    ko = ko_matches(api, tid)
    semis = [m for m in ko if m["stage"] == "semifinal"]
    if len(semis) != 2:
        die(f"semis={len(semis)} esperado 2")
    labels = sorted({m["homeSeedLabel"] for m in semis} | {m["awaySeedLabel"] for m in semis})
    if sum(1 for l in labels if "wildcard" in l.lower()) < 1:
        die(f"esperaba al menos 1 wildcard en labels: {labels}")
    if sum(1 for l in labels if l.startswith("1º ")) < 3:
        die(f"esperaba 3 primeros de grupo: {labels}")
    ok(f"plan 1+1 OK · labels: {labels}")

    # --- 4 groups, perGroup=2 wildcards=0 size=8 -------------------------
    cleanup_live(api)
    tid, teams = drive_draft(api, captains_n=8, players_n=8)
    ids = [t["id"] for t in teams]
    set_groups(api, tid, [
        {"name": "Grupo 1", "teamIds": ids[:2]},
        {"name": "Grupo 2", "teamIds": ids[2:4]},
        {"name": "Grupo 3", "teamIds": ids[4:6]},
        {"name": "Grupo 4", "teamIds": ids[6:]},
    ])
    step("plan: 4 grupos · top 2 + 0 wildcards → cuadro 8")
    apply_plan(api, tid, perGroup=2, wildcards=0, size=8)
    ko = ko_matches(api, tid)
    qf = [m for m in ko if m["stage"] == "quarterfinal"]
    if len(qf) != 4:
        die(f"quarterfinals={len(qf)} esperado 4")
    labels = sorted({m["homeSeedLabel"] for m in qf} | {m["awaySeedLabel"] for m in qf})
    if any("wildcard" in l.lower() for l in labels):
        die(f"no debería haber wildcards: {labels}")
    ok(f"plan 2+0 OK · {len(qf)} cuartos · labels {labels[:4]}…")

    # --- 5 groups, perGroup=1 wildcards=3 size=8 -------------------------
    cleanup_live(api)
    tid, teams = drive_draft(api, captains_n=10, players_n=10)
    ids = [t["id"] for t in teams]
    set_groups(api, tid, [
        {"name": "G1", "teamIds": ids[:2]},
        {"name": "G2", "teamIds": ids[2:4]},
        {"name": "G3", "teamIds": ids[4:6]},
        {"name": "G4", "teamIds": ids[6:8]},
        {"name": "G5", "teamIds": ids[8:]},
    ])
    step("plan: 5 grupos · top 1 + 3 wildcards → cuadro 8")
    apply_plan(api, tid, perGroup=1, wildcards=3, size=8)
    ko = ko_matches(api, tid)
    qf = [m for m in ko if m["stage"] == "quarterfinal"]
    if len(qf) != 4:
        die(f"quarterfinals={len(qf)} esperado 4")
    labels = [l for m in qf for l in (m["homeSeedLabel"], m["awaySeedLabel"])]
    if sum(1 for l in labels if "wildcard" in l.lower()) != 3:
        die(f"esperaba 3 wildcards · labels {labels}")
    ok("plan 1+3 OK")

    # --- invalid: 4 groups · perGroup=1 wildcards=0 → 4 qualifiers OK ---
    # We test invalid by requesting wildcards > available.
    step("plan inválido: 2 grupos · perGroup=2 wildcards=10 → 400")
    cleanup_live(api)
    tid, teams = drive_draft(api, captains_n=4, players_n=4)
    ids = [t["id"] for t in teams]
    set_groups(api, tid, [
        {"name": "GA", "teamIds": ids[:2]},
        {"name": "GB", "teamIds": ids[2:]},
    ])
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": 2, "bracketWildcards": 10, "bracketSize": 16,
    })
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 400,
                  expected_code="PLAN_TOO_FEW_WILDCARDS")
    ok("plan rechazado · wildcards no disponibles")

    step("plan inválido: total = 6 (no power of 2) → 400 PLAN_INVALID_SIZE")
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": 1, "bracketWildcards": 5, "bracketSize": 8,
    })
    # That asks 1*2 + 5 = 7 qualifiers, but only 4 teams total → wildcards
    # check fires first. Use a config that has enough teams but odd total.
    cleanup_live(api)
    tid, teams = drive_draft(api, captains_n=6, players_n=6)
    ids = [t["id"] for t in teams]
    set_groups(api, tid, [
        {"name": "GA", "teamIds": ids[:3]},
        {"name": "GB", "teamIds": ids[3:]},
    ])
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": 1, "bracketWildcards": 4, "bracketSize": 8,
    })  # 1*2 + 4 = 6 → not 2/4/8/16
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 400,
                  expected_code="PLAN_INVALID_SIZE")
    ok("plan rechazado · tamaño no es potencia de 2")

    print(f"\n{GREEN}✓ bracket plan OK{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
