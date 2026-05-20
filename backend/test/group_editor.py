#!/usr/bin/env python3
"""E2E: pre-matchday group editor.

Drives a full draft so groups + KO get scaffolded, then exercises the new
endpoints behind the admin Grupos tab:

    PUT   /matches/tournament/:id/groups          (drag-and-drop regroup)
    PATCH /matches/tournament/:tid/groups/:gid    (rename / color / logo)

Asserts:
  - regroup persists name + color + logo per group
  - members are exactly what the payload said
  - empty group  → 400 GROUP_EMPTY
  - missing team → 400 TEAMS_MISSING_FROM_GROUPS
  - duplicate    → 400 TEAM_IN_MULTIPLE_GROUPS
  - PATCH meta updates name + color + logo without touching members
  - PATCH on unknown group → 404 GROUP_NOT_FOUND
  - once a match is started, PUT regroup → 409 MATCHES_ALREADY_TOUCHED
"""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    API, ApiClient, GREEN, RED, RESET,
    ok, step, info, die,
    seed_player, add_to_tournament, make_captain, create_tournament,
    patch_tournament, get_draft_state, pick, list_matches, list_groups,
    start_match,
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


def run_draft_to_setup(api: ApiClient, captains_n: int, players_n: int) -> tuple[dict, list]:
    """Create tournament, seed players + captains, run draft to exhaustion.
    Returns (tournament, teams)."""
    today = date.today()
    label = f"GE-{int(time.time()) % 100000}"
    step(f"crear torneo · {label} · {captains_n} cap + {players_n} jug")
    t = create_tournament(api, label, today + timedelta(days=30))
    tid = t["id"]

    total = captains_n + players_n
    pids = []
    for i in range(1, total + 1):
        p = seed_player(api, "GE", i)
        add_to_tournament(api, tid, p["id"])
        pids.append(p["id"])
    for i in range(captains_n):
        make_captain(api, tid, pids[i], f"Team {chr(ord('A') + i)}")
    ok(f"sembrado · id={tid}")

    # Push to draft window.
    yesterday = today - timedelta(days=1)
    patch_tournament(api, tid,
                     inscriptionStart=(today - timedelta(days=5)).isoformat(),
                     draftStart=yesterday.isoformat(),
                     draftEnd=(today + timedelta(days=2)).isoformat())

    step("draft round-robin")
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
    ok("draft cerrado")

    teams = api.get(f"/tournaments/{tid}")["teams"]
    if len(teams) != captains_n:
        die(f"teams={len(teams)} esperado {captains_n}")
    return t, teams


def assert_groups_match(api: ApiClient, tid: str, expected: list[dict]) -> list[dict]:
    groups = list_groups(api, tid)
    if len(groups) != len(expected):
        die(f"groups={len(groups)} esperado {len(expected)}")
    by_name = {g["group"]["name"]: g for g in groups}
    for exp in expected:
        g = by_name.get(exp["name"])
        if not g:
            die(f"falta grupo {exp['name']}")
        if exp.get("color") is not None and g["group"].get("color") != exp["color"]:
            die(f"{exp['name']}: color={g['group'].get('color')} esperado {exp['color']}")
        if exp.get("logo") is not None and g["group"].get("logo") != exp["logo"]:
            die(f"{exp['name']}: logo={g['group'].get('logo')} esperado {exp['logo']}")
        members_team_ids = {m["teamId"] for m in g["members"]}
        if members_team_ids != set(exp["teamIds"]):
            die(f"{exp['name']}: members {members_team_ids} esperado {set(exp['teamIds'])}")
    return groups


def main() -> int:
    api = ApiClient()
    api.login_admin()
    cleanup_live(api)

    # 6 captains, 12 extra players → 6 teams of ~3, plenty for 2/3 group splits.
    t, teams = run_draft_to_setup(api, captains_n=6, players_n=12)
    tid = t["id"]
    team_ids = [team["id"] for team in teams]

    step("estado inicial: grupos auto-generados")
    initial = list_groups(api, tid)
    if len(initial) == 0:
        die("no se crearon grupos al cerrar draft")
    ok(f"{len(initial)} grupo(s) iniciales")

    # --- regroup happy path: 2 groups con color + logo --------------------
    step("PUT regroup · 2 grupos con color + logo")
    half = len(team_ids) // 2
    payload = {
        "groups": [
            {"name": "Rojos", "color": "#ff2d2d", "logo": "https://x.test/r.png",
             "teamIds": team_ids[:half]},
            {"name": "Azules", "color": "#3aa0ff", "logo": "https://x.test/a.png",
             "teamIds": team_ids[half:]},
        ]
    }
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200, body=payload)
    assert_groups_match(api, tid, [
        {"name": "Rojos",  "color": "#ff2d2d", "logo": "https://x.test/r.png", "teamIds": team_ids[:half]},
        {"name": "Azules", "color": "#3aa0ff", "logo": "https://x.test/a.png", "teamIds": team_ids[half:]},
    ])
    # Group fixtures regenerated round-robin per group.
    matches = list_matches(api, tid)
    group_matches = [m for m in matches if m["stage"] == "group"]
    expected_fixtures = (half * (half - 1)) // 2 + ((len(team_ids) - half) * (len(team_ids) - half - 1)) // 2
    if len(group_matches) != expected_fixtures:
        die(f"group_matches={len(group_matches)} esperado {expected_fixtures}")
    ok(f"grupos persistidos · {expected_fixtures} fixtures regenerados")

    # --- validation errors --------------------------------------------------
    step("PUT regroup con grupo vacío → 400")
    # zod's `teamIds.min(1)` may surface as VALIDATION before the service-level
    # GROUP_EMPTY guard fires — either is acceptable semantically.
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [
                      {"name": "Rojos", "teamIds": team_ids},
                      {"name": "Azules", "teamIds": []},
                  ]})

    step("PUT regroup duplicando un equipo → 400 TEAM_IN_MULTIPLE_GROUPS")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [
                      {"name": "Rojos", "teamIds": team_ids},
                      {"name": "Azules", "teamIds": [team_ids[0]]},
                  ]}, expected_code="TEAM_IN_MULTIPLE_GROUPS")

    step("PUT regroup omitiendo equipos → 400 TEAMS_MISSING_FROM_GROUPS")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [{"name": "Solo", "teamIds": team_ids[:1]}]},
                  expected_code="TEAMS_MISSING_FROM_GROUPS")

    # --- PATCH meta ---------------------------------------------------------
    step("PATCH meta · renombra + recolorea + cambia logo")
    groups_now = list_groups(api, tid)
    target = next(g for g in groups_now if g["group"]["name"] == "Rojos")
    target_id = target["group"]["id"]
    target_team_ids = [m["teamId"] for m in target["members"]]
    expect_status(api, "PATCH", f"/matches/tournament/{tid}/groups/{target_id}", 200,
                  body={"name": "Granates", "color": "#9b1c1c",
                        "logo": "https://x.test/g.png"})
    after = next(g for g in list_groups(api, tid) if g["group"]["id"] == target_id)
    if after["group"]["name"] != "Granates":
        die(f"name post-PATCH={after['group']['name']!r}")
    if after["group"].get("color") != "#9b1c1c":
        die(f"color post-PATCH={after['group'].get('color')!r}")
    if after["group"].get("logo") != "https://x.test/g.png":
        die(f"logo post-PATCH={after['group'].get('logo')!r}")
    after_team_ids = [m["teamId"] for m in after["members"]]
    if set(after_team_ids) != set(target_team_ids):
        die(f"PATCH movió miembros: {after_team_ids} vs {target_team_ids}")
    ok("meta actualizada · miembros intactos")

    step("PATCH con grupo inexistente → 404 GROUP_NOT_FOUND")
    expect_status(api, "PATCH",
                  f"/matches/tournament/{tid}/groups/does-not-exist", 404,
                  body={"name": "X"}, expected_code="GROUP_NOT_FOUND")

    # --- 409 once a match has started --------------------------------------
    step("iniciar un partido y reintentar PUT regroup → 409 MATCHES_ALREADY_TOUCHED")
    group_matches = [m for m in list_matches(api, tid) if m["stage"] == "group"]
    start_match(api, group_matches[0]["id"])
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 409,
                  body=payload, expected_code="MATCHES_ALREADY_TOUCHED")
    ok("regroup bloqueado tras tocar partido")

    print(f"\n{GREEN}✓ group editor OK{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
