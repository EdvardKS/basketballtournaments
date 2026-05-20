#!/usr/bin/env python3
"""E2E: bracket format/size matrix + seed-label scaffolding.

Drives a draft so groups exist, then exercises every supported bracket
combination plus the validation guards:

    PATCH /tournaments/:id { bracketFormat, bracketSize }
    POST  /matches/tournament/:id/regenerate-bracket
    GET   /matches/tournament/:id  (asserts KO seed labels)

Combos covered:
  - 1 group / 4 teams · top4_single_group  (size 4 → semifinals)
  - 1 group / 4 teams · top2_single_group  (size 2 → direct final, no 3rd place)
  - 2 groups / 6 teams · top2_per_group size 4   (semifinals)
  - 2 groups / 6 teams · top1_plus_best2_seconds size 4
  - 1 group · top1_plus_best2_seconds → backend refuses (FORMAT_NEEDS_MULTIPLE_GROUPS)
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
    label = f"BR-{int(time.time()) % 100000}"
    step(f"crear torneo · {label} · {captains_n} cap + {players_n} jug")
    t = create_tournament(api, label, today + timedelta(days=30))
    tid = t["id"]
    total = captains_n + players_n
    pids = []
    for i in range(1, total + 1):
        p = seed_player(api, "BR", i)
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
    if len(teams) != captains_n:
        die(f"teams={len(teams)} esperado {captains_n}")
    ok(f"tournament={tid} · teams={len(teams)}")
    return tid, teams


def set_groups(api: ApiClient, tid: str, groups_payload: list[dict]) -> None:
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": groups_payload})


def apply_bracket(api: ApiClient, tid: str, fmt: str, size: int) -> None:
    api.patch(f"/tournaments/{tid}",
              {"bracketFormat": fmt, "bracketSize": size})
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})


def ko_matches(api: ApiClient, tid: str) -> list[dict]:
    return [m for m in list_matches(api, tid) if m["stage"] != "group"]


def assert_all_have_labels(matches: list[dict]) -> None:
    for m in matches:
        if not m.get("homeSeedLabel") or not m.get("awaySeedLabel"):
            die(f"match {m['id']} ({m['stage']}) sin seed label: {m.get('homeSeedLabel')!r} / {m.get('awaySeedLabel')!r}")


def main() -> int:
    api = ApiClient()
    api.login_admin()
    cleanup_live(api)

    # --- Case 1+2: single group, 4 teams ----------------------------------
    tid_a, teams_a = drive_draft(api, captains_n=4, players_n=8)
    ids_a = [t["id"] for t in teams_a]

    step("1 grupo · 4 equipos")
    set_groups(api, tid_a, [{"name": "Grupo A", "teamIds": ids_a}])
    if len(list_groups(api, tid_a)) != 1:
        die("se esperaba 1 grupo")

    step("top4_single_group · size 4 → semifinales")
    apply_bracket(api, tid_a, "top4_single_group", 4)
    ko = ko_matches(api, tid_a)
    semis = [m for m in ko if m["stage"] == "semifinal"]
    finals = [m for m in ko if m["stage"] == "final"]
    thirds = [m for m in ko if m["stage"] == "third_place"]
    if len(semis) != 2: die(f"semis={len(semis)} esperado 2")
    if len(finals) != 1: die(f"finals={len(finals)} esperado 1")
    if len(thirds) != 1: die(f"thirds={len(thirds)} esperado 1")
    assert_all_have_labels(ko)
    # SF labels should reference group ranks ("1º Grupo A", etc.)
    sf_labels = sorted({m["homeSeedLabel"] for m in semis} | {m["awaySeedLabel"] for m in semis})
    if not all("Grupo A" in label for label in sf_labels):
        die(f"SF labels no referencian Grupo A: {sf_labels}")
    ok(f"top4_single_group OK · {len(ko)} KO · labels: {sf_labels}")

    step("top2_single_group · size 2 → final directa")
    apply_bracket(api, tid_a, "top2_single_group", 2)
    ko = ko_matches(api, tid_a)
    semis = [m for m in ko if m["stage"] == "semifinal"]
    finals = [m for m in ko if m["stage"] == "final"]
    thirds = [m for m in ko if m["stage"] == "third_place"]
    if len(semis) != 0: die(f"semis={len(semis)} esperado 0")
    if len(finals) != 1: die(f"finals={len(finals)} esperado 1")
    if len(thirds) != 0: die(f"thirds={len(thirds)} esperado 0 (size=2 no tiene 3er puesto)")
    assert_all_have_labels(finals)
    if "Grupo A" not in finals[0]["homeSeedLabel"] or "Grupo A" not in finals[0]["awaySeedLabel"]:
        die(f"final labels no referencian Grupo A: {finals[0]}")
    ok(f"top2_single_group OK · final {finals[0]['homeSeedLabel']} vs {finals[0]['awaySeedLabel']}")

    step("top1_plus_best2_seconds con 1 solo grupo → 400 FORMAT_NEEDS_MULTIPLE_GROUPS")
    # PATCH succeeds (no validation against group state); regenerate fails.
    api.patch(f"/tournaments/{tid_a}",
              {"bracketFormat": "top1_plus_best2_seconds", "bracketSize": 4})
    expect_status(api, "POST", f"/matches/tournament/{tid_a}/regenerate-bracket", 400,
                  expected_code="FORMAT_NEEDS_MULTIPLE_GROUPS")
    ok("formato rechazado con 1 grupo")

    # --- Case 3+4: two groups, 6 teams ------------------------------------
    cleanup_live(api)
    tid_b, teams_b = drive_draft(api, captains_n=6, players_n=12)
    ids_b = [t["id"] for t in teams_b]
    set_groups(api, tid_b, [
        {"name": "Grupo Rojo", "teamIds": ids_b[:3]},
        {"name": "Grupo Azul", "teamIds": ids_b[3:]},
    ])

    step("2 grupos · top2_per_group · size 4")
    apply_bracket(api, tid_b, "top2_per_group", 4)
    ko = ko_matches(api, tid_b)
    semis = [m for m in ko if m["stage"] == "semifinal"]
    if len(semis) != 2: die(f"semis={len(semis)} esperado 2")
    assert_all_have_labels(ko)
    sf_labels = sorted({m["homeSeedLabel"] for m in semis} | {m["awaySeedLabel"] for m in semis})
    if not any("Grupo Rojo" in l for l in sf_labels) or not any("Grupo Azul" in l for l in sf_labels):
        die(f"SF labels no cubren ambos grupos: {sf_labels}")
    ok(f"top2_per_group/4 OK · labels: {sf_labels}")

    step("2 grupos · top1_plus_best2_seconds · size 4")
    apply_bracket(api, tid_b, "top1_plus_best2_seconds", 4)
    ko = ko_matches(api, tid_b)
    semis = [m for m in ko if m["stage"] == "semifinal"]
    if len(semis) != 2: die(f"semis={len(semis)} esperado 2")
    assert_all_have_labels(ko)
    sf_labels = sorted({m["homeSeedLabel"] for m in semis} | {m["awaySeedLabel"] for m in semis})
    if not any("Mejor 2º" in l for l in sf_labels):
        die(f"esperaba al menos un 'Mejor 2º' en labels: {sf_labels}")
    ok(f"top1_plus_best2_seconds/4 OK · labels: {sf_labels}")

    print(f"\n{GREEN}✓ bracket options OK{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
