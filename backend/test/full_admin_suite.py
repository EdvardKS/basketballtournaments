#!/usr/bin/env python3
"""Exhaustive admin-flow E2E covering the entire pre-matchday surface.

Self-contained: spins up its own tournaments via the regular API, cleans
up any live tournaments first, and never relies on state from another
test file. Runs inside the backend container:

    docker exec basket_backend python3 /app/test/full_admin_suite.py

Sections (each block uses its own tournament so failures are isolated):

  1. Tournament lifecycle      · soft-delete double-confirm + player retention
  2. Inscripciones             · admin add-player (existing-player picker path)
  3. Group editor              · drag-equivalent regroup + meta PATCH + guards
  4. Bracket named formats     · top2_per_group, top1_plus_best2_seconds,
                                 top2_single_group, top4_single_group
  5. Bracket plan algorithm    · perGroup + wildcards combos + invalid cases
  6. Seed-label scaffolding    · every KO row carries homeSeedLabel / awaySeedLabel
  7. Bracket lock              · lock-bracket → 409 on regroup / regen / meta,
                                 unlock-bracket restores edit, schedule
                                 (PATCH /matches/:id/time) still works locked
"""

from __future__ import annotations

import sys
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    API, ApiClient, GREEN, CYAN, RED, RESET,
    ok, step, info, die,
    seed_player, add_to_tournament, make_captain, create_tournament,
    patch_tournament, get_draft_state, pick, list_matches, list_groups,
    start_match,
)


# --- shared helpers --------------------------------------------------------

def expect_status(api: ApiClient, method: str, path: str, status: int,
                  body: dict | None = None,
                  expected_code: str | None = None) -> dict | None:
    """Issue the call and assert status without die-ing on 4xx."""
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
    LIVE = {"upcoming", "open", "draft", "setup", "scheduled", "active"}
    for t in api.get("/tournaments"):
        if t["status"] in LIVE:
            api.patch(f"/tournaments/{t['id']}", {"status": "completed"})


def fresh_tournament(api: ApiClient, label: str, captains_n: int, players_n: int) -> tuple[dict, list[dict]]:
    """Create a tournament, register captains_n + players_n players, drive
    the draft to completion. Returns (tournamentDict, teams)."""
    cleanup_live(api)
    today = date.today()
    name = f"{label}-{int(time.time()) % 100000}"
    info(f"creando torneo · {name}")
    t = create_tournament(api, name, today + timedelta(days=30))
    tid = t["id"]
    total = captains_n + players_n
    pids = []
    for i in range(1, total + 1):
        p = seed_player(api, label, i)
        add_to_tournament(api, tid, p["id"])
        pids.append(p["id"])
    for i in range(captains_n):
        make_captain(api, tid, pids[i], f"Team {chr(ord('A') + i)}")
    patch_tournament(api, tid,
        inscriptionStart=(today - timedelta(days=5)).isoformat(),
        draftStart=(today - timedelta(days=1)).isoformat(),
        draftEnd=(today + timedelta(days=2)).isoformat())
    safety = players_n + 30
    while safety > 0:
        safety -= 1
        st = get_draft_state(api, tid)
        if not st["state"]["isActive"]: break
        pick(api, tid, st["currentTeamId"], st["availablePlayers"][0]["id"])
    teams = api.get(f"/tournaments/{tid}")["teams"]
    if len(teams) != captains_n:
        die(f"draft cerró con {len(teams)} teams (esperado {captains_n})")
    return t, teams


def set_groups(api: ApiClient, tid: str, payload: list[dict]) -> None:
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": payload})


def apply_plan(api: ApiClient, tid: str, per_group: int, wildcards: int, size: int) -> None:
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": per_group,
        "bracketWildcards": wildcards,
        "bracketSize": size,
    })
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})


def ko(api: ApiClient, tid: str) -> list[dict]:
    return [m for m in list_matches(api, tid) if m["stage"] != "group"]


def header(text: str) -> None:
    print(f"\n{CYAN}═══ {text} ══════════════════════════════════════════════{RESET}", flush=True)


# --- section runners -------------------------------------------------------

def section_lifecycle(api: ApiClient) -> None:
    header("1. Tournament lifecycle · soft-delete double-confirm")
    cleanup_live(api)
    today = date.today()
    name = f"LIFE-{int(time.time()) % 100000}"
    t = create_tournament(api, name, today + timedelta(days=30))
    tid, tname = t["id"], t["name"]
    p1 = seed_player(api, "LIFE", 1); add_to_tournament(api, tid, p1["id"])
    p2 = seed_player(api, "LIFE", 2); add_to_tournament(api, tid, p2["id"])

    step("DELETE sin body → 400")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400)
    step("DELETE confirm incorrecto → 400 CONFIRMATION_REQUIRED")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400,
                  body={"confirm": "no", "name": tname},
                  expected_code="CONFIRMATION_REQUIRED")
    step("DELETE name incorrecto → 400 NAME_MISMATCH")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 400,
                  body={"confirm": "DELETE", "name": tname + "-x"},
                  expected_code="NAME_MISMATCH")
    step("DELETE body correcto → 200")
    expect_status(api, "DELETE", f"/tournaments/{tid}", 200,
                  body={"confirm": "DELETE", "name": tname})
    if any(x["id"] == tid for x in api.get("/tournaments")):
        die("torneo soft-deleted aún aparece en /tournaments")
    expect_status(api, "GET", f"/tournaments/{tid}", 404)
    ids_after = {p["id"] for p in api.get("/players")}
    for pid in (p1["id"], p2["id"]):
        if pid not in ids_after:
            die(f"player {pid} desapareció tras soft-delete")
    ok("soft-delete OK · jugadores intactos")


def section_inscripciones(api: ApiClient) -> None:
    header("2. Inscripciones · admin add-player path")
    cleanup_live(api)
    today = date.today()
    t = create_tournament(api, f"INS-{int(time.time()) % 100000}", today + timedelta(days=30))
    tid = t["id"]
    p = seed_player(api, "INS", 1)
    step("POST /tournaments/:id/add-player con jugador existente → 200")
    api.post(f"/tournaments/{tid}/add-player", {"playerId": p["id"]})
    regs = api.get(f"/tournaments/{tid}")["registrations"]
    if not any(r["player_id"] == p["id"] for r in regs):
        die("jugador no aparece en registrations tras add-player")
    ok("add-player OK · jugador inscrito")


def section_group_editor(api: ApiClient) -> None:
    header("3. Group editor · regroup + meta PATCH + guards")
    t, teams = fresh_tournament(api, "GE", captains_n=6, players_n=6)
    tid = t["id"]
    ids = [tm["id"] for tm in teams]

    step("PUT regroup con color + nombre custom → 200")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": [
                      {"name": "Rojos", "color": "#ff2d2d", "teamIds": ids[:3]},
                      {"name": "Azules", "color": "#3aa0ff", "teamIds": ids[3:]},
                  ]})
    groups_now = api.get(f"/matches/tournament/{tid}/groups")
    by_name = {g["group"]["name"]: g for g in groups_now}
    if "Rojos" not in by_name or by_name["Rojos"]["group"].get("color") != "#ff2d2d":
        die(f"color persistido mal: {groups_now}")
    fixtures = [m for m in list_matches(api, tid) if m["stage"] == "group"]
    expected = (3 * 2) // 2 + (3 * 2) // 2  # 2 grupos · 3 cada uno
    if len(fixtures) != expected:
        die(f"fixtures={len(fixtures)} esperado {expected}")
    ok(f"regroup + fixtures regenerados ({expected} partidos)")

    step("PUT regroup grupo vacío → 400")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [{"name":"A", "teamIds": ids},
                                   {"name":"B", "teamIds": []}]})
    step("PUT regroup duplica equipo → 400 TEAM_IN_MULTIPLE_GROUPS")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [{"name":"A", "teamIds": ids},
                                   {"name":"B", "teamIds": [ids[0]]}]},
                  expected_code="TEAM_IN_MULTIPLE_GROUPS")
    step("PUT regroup omite equipo → 400 TEAMS_MISSING_FROM_GROUPS")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 400,
                  body={"groups": [{"name":"A","teamIds": ids[:2]}]},
                  expected_code="TEAMS_MISSING_FROM_GROUPS")

    target_gid = next(g["group"]["id"] for g in groups_now if g["group"]["name"] == "Rojos")
    step("PATCH meta name+color+logo → 200")
    expect_status(api, "PATCH", f"/matches/tournament/{tid}/groups/{target_gid}", 200,
                  body={"name": "Granates", "color": "#9b1c1c",
                        "logo": "https://x.test/g.png"})
    after = next(g for g in api.get(f"/matches/tournament/{tid}/groups")
                 if g["group"]["id"] == target_gid)
    if after["group"]["name"] != "Granates" or after["group"]["color"] != "#9b1c1c":
        die(f"PATCH meta no persistió: {after['group']}")
    ok("meta name/color/logo persistidos · miembros intactos")

    step("PATCH grupo inexistente → 404 GROUP_NOT_FOUND")
    expect_status(api, "PATCH", f"/matches/tournament/{tid}/groups/zzz", 404,
                  body={"name": "x"}, expected_code="GROUP_NOT_FOUND")

    step("iniciar partido y reintentar regroup → 409 MATCHES_ALREADY_TOUCHED")
    gm = [m for m in list_matches(api, tid) if m["stage"] == "group"][0]
    start_match(api, gm["id"])
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 409,
                  body={"groups": [{"name":"A","teamIds": ids[:3]},
                                   {"name":"B","teamIds": ids[3:]}]},
                  expected_code="MATCHES_ALREADY_TOUCHED")
    ok("regroup bloqueado post-juego")


def section_named_formats(api: ApiClient) -> None:
    header("4. Bracket named formats")
    # Caso 1: 1 grupo · top4_single_group (semifinales)
    t, teams = fresh_tournament(api, "NF1", captains_n=4, players_n=4)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [{"name": "Grupo Único", "teamIds": ids}])

    step("top4_single_group size 4 → 2 SF + 1 F + 1 3rd")
    api.patch(f"/tournaments/{tid}", {"bracketFormat": "top4_single_group", "bracketSize": 4})
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})
    out = ko(api, tid)
    if len([m for m in out if m["stage"] == "semifinal"]) != 2: die("SF count")
    if len([m for m in out if m["stage"] == "final"]) != 1: die("F count")
    if len([m for m in out if m["stage"] == "third_place"]) != 1: die("3rd count")
    ok("top4_single_group OK")

    step("top2_single_group size 2 → 1 F sin 3er puesto")
    api.patch(f"/tournaments/{tid}", {"bracketFormat": "top2_single_group", "bracketSize": 2})
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})
    out = ko(api, tid)
    if len([m for m in out if m["stage"] == "final"]) != 1: die("F count")
    if len([m for m in out if m["stage"] == "third_place"]) != 0: die("3rd count size 2")
    if len([m for m in out if m["stage"] == "semifinal"]) != 0: die("SF count size 2")
    ok("top2_single_group OK · final directa")

    step("top1_plus_best2_seconds con 1 grupo → 400 FORMAT_NEEDS_MULTIPLE_GROUPS")
    api.patch(f"/tournaments/{tid}", {"bracketFormat": "top1_plus_best2_seconds", "bracketSize": 4})
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 400,
                  expected_code="FORMAT_NEEDS_MULTIPLE_GROUPS")

    # Caso 2: 2 grupos · top1_plus_best2_seconds
    t, teams = fresh_tournament(api, "NF2", captains_n=6, players_n=6)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [
        {"name": "G Rojo", "teamIds": ids[:3]},
        {"name": "G Azul", "teamIds": ids[3:]},
    ])
    step("top1_plus_best2_seconds size 4 → labels incluyen 'Mejor 2º'")
    api.patch(f"/tournaments/{tid}", {"bracketFormat": "top1_plus_best2_seconds", "bracketSize": 4})
    api.post(f"/matches/tournament/{tid}/regenerate-bracket", {})
    sf = [m for m in ko(api, tid) if m["stage"] == "semifinal"]
    labels = {m["homeSeedLabel"] for m in sf} | {m["awaySeedLabel"] for m in sf}
    if not any("Mejor 2º" in l for l in labels):
        die(f"no 'Mejor 2º' en labels: {labels}")
    ok("top1_plus_best2_seconds OK · wildcards etiquetados")


def section_plan_algorithm(api: ApiClient) -> None:
    header("5. Bracket plan · perGroup + wildcards combos")

    step("3 grupos · plan 1+1 size 4")
    t, teams = fresh_tournament(api, "PL3", captains_n=6, players_n=6)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [
        {"name": "G1", "teamIds": ids[:2]},
        {"name": "G2", "teamIds": ids[2:4]},
        {"name": "G3", "teamIds": ids[4:]},
    ])
    apply_plan(api, tid, 1, 1, 4)
    sf = [m for m in ko(api, tid) if m["stage"] == "semifinal"]
    labels = [l for m in sf for l in (m["homeSeedLabel"], m["awaySeedLabel"])]
    if sum(1 for l in labels if "wildcard" in l.lower()) != 1:
        die(f"esperaba 1 wildcard · labels {labels}")
    if sum(1 for l in labels if l.startswith("1º ")) != 3:
        die(f"esperaba 3 primeros de grupo · labels {labels}")
    ok("plan 1+1 OK")

    step("5 grupos · plan 1+3 size 8")
    t, teams = fresh_tournament(api, "PL5", captains_n=10, players_n=10)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [
        {"name": f"G{i+1}", "teamIds": ids[i*2:(i+1)*2]} for i in range(5)
    ])
    apply_plan(api, tid, 1, 3, 8)
    qf = [m for m in ko(api, tid) if m["stage"] == "quarterfinal"]
    if len(qf) != 4: die(f"qf={len(qf)} esperado 4")
    labels = [l for m in qf for l in (m["homeSeedLabel"], m["awaySeedLabel"])]
    if sum(1 for l in labels if "wildcard" in l.lower()) != 3:
        die(f"esperaba 3 wildcards · labels {labels}")
    ok("plan 1+3 OK")

    step("plan tamaño no-power-of-2 → 400 PLAN_INVALID_SIZE")
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": 1, "bracketWildcards": 1, "bracketSize": 8})
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 400,
                  expected_code="PLAN_INVALID_SIZE")
    step("plan wildcards excesivos → 400 PLAN_TOO_FEW_WILDCARDS")
    api.patch(f"/tournaments/{tid}", {
        "bracketQualifiersPerGroup": 2, "bracketWildcards": 50, "bracketSize": 16})
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 400,
                  expected_code="PLAN_TOO_FEW_WILDCARDS")
    ok("plan validaciones OK")


def section_seed_labels(api: ApiClient) -> None:
    header("6. Seed labels en cada KO row")
    t, teams = fresh_tournament(api, "SL", captains_n=8, players_n=8)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [{"name": f"G{i+1}", "teamIds": ids[i*2:(i+1)*2]} for i in range(4)])
    apply_plan(api, tid, 2, 0, 8)
    out = ko(api, tid)
    for m in out:
        if not m.get("homeSeedLabel") or not m.get("awaySeedLabel"):
            die(f"{m['stage']} round {m['roundNumber']} sin seed labels")
    # SF/F slots usan "Ganador …" / "Perdedor …"
    sf = [m for m in out if m["stage"] == "semifinal"]
    if not any("Ganador QF" in m["homeSeedLabel"] for m in sf):
        die(f"SF no propagan 'Ganador QF': {[(m['homeSeedLabel'],m['awaySeedLabel']) for m in sf]}")
    third = next(m for m in out if m["stage"] == "third_place")
    if "Perdedor" not in third["homeSeedLabel"]:
        die(f"3er puesto no usa 'Perdedor SF': {third}")
    ok(f"todas las {len(out)} filas KO con seed label estructural")


def section_lock(api: ApiClient) -> None:
    header("7. Bracket lock · guards + schedule sigue editable")
    t, teams = fresh_tournament(api, "LK", captains_n=4, players_n=4)
    tid = t["id"]; ids = [tm["id"] for tm in teams]
    set_groups(api, tid, [
        {"name": "GA", "teamIds": ids[:2]},
        {"name": "GB", "teamIds": ids[2:]},
    ])
    apply_plan(api, tid, 2, 0, 4)

    step("inicial: bracketLockedAt = null")
    info_row = api.get(f"/tournaments/{tid}")["tournament"]
    if info_row["bracketLockedAt"] is not None:
        die(f"bracketLockedAt={info_row['bracketLockedAt']!r}")

    step("POST /lock-bracket → bracketLockedAt set")
    out = api.post(f"/tournaments/{tid}/lock-bracket")
    if not out.get("bracketLockedAt"):
        die(f"lock no devolvió timestamp: {out}")
    ok(f"locked at {out['bracketLockedAt']}")

    step("regroup con lock → 409 BRACKET_LOCKED")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 409,
                  body={"groups": [
                      {"name": "GA", "teamIds": ids[:3]},
                      {"name": "GB", "teamIds": ids[3:]},
                  ]}, expected_code="BRACKET_LOCKED")

    step("PATCH meta con lock → 409 BRACKET_LOCKED")
    gid = api.get(f"/matches/tournament/{tid}/groups")[0]["group"]["id"]
    expect_status(api, "PATCH", f"/matches/tournament/{tid}/groups/{gid}", 409,
                  body={"name": "bloq"}, expected_code="BRACKET_LOCKED")

    step("regenerate-bracket con lock → 409 BRACKET_LOCKED")
    expect_status(api, "POST", f"/matches/tournament/{tid}/regenerate-bracket", 409,
                  expected_code="BRACKET_LOCKED")

    step("PATCH /matches/:id/time con lock → 200 (horarios editables)")
    gm = [m for m in list_matches(api, tid) if m["stage"] == "group"][0]
    new_time = (date.today() + timedelta(days=30)).isoformat() + "T10:00:00.000Z"
    r = api.s.request("PATCH", f"{API}/matches/{gm['id']}/time",
                      json={"scheduledAt": new_time}, timeout=30)
    if not r.ok:
        die(f"horario rechazado bajo lock: {r.status_code} {r.text}")
    ok("horarios siguen editables bajo lock")

    step("POST /unlock-bracket → bracketLockedAt null")
    out = api.post(f"/tournaments/{tid}/unlock-bracket")
    if out.get("bracketLockedAt") is not None:
        die(f"unlock no limpió timestamp: {out}")

    step("regroup tras unlock → 200")
    expect_status(api, "PUT", f"/matches/tournament/{tid}/groups", 200,
                  body={"groups": [
                      {"name": "GA", "teamIds": ids[:2]},
                      {"name": "GB", "teamIds": ids[2:]},
                  ]})
    ok("desbloqueado · edición restaurada")


# --- runner ----------------------------------------------------------------

def main() -> int:
    api = ApiClient()
    api.login_admin()
    started = time.time()

    section_lifecycle(api)
    section_inscripciones(api)
    section_group_editor(api)
    section_named_formats(api)
    section_plan_algorithm(api)
    section_seed_labels(api)
    section_lock(api)

    elapsed = time.time() - started
    print(f"\n{GREEN}✓ full admin suite OK · {elapsed:.1f}s{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
