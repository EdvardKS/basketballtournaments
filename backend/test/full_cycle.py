#!/usr/bin/env python3
"""Full E2E cycle: tournament creation → champion.

Goes way past `full_flow.py`: after reaching match day it scores every
group match, asserts the bracket is generated, scores every knockout
match, and verifies the tournament gets a winner.

Params via env vars (each defaults to sensible random fallback):

    CAPTAINS_N           # default 4
    PLAYERS_N            # default 16 (must be >= 4 * captains)
    BRACKET_FORMAT       # top2_per_group | top1_plus_best2_seconds
    BRACKET_SIZE         # 4 | 8 | 16 (optional — server picks if missing)
    LABEL                # tournament name suffix (default = timestamp)

Run inside the backend container:

    docker exec basket_backend python3 /app/test/full_cycle.py
"""

from __future__ import annotations

import os
import random
import time
from datetime import date, timedelta

from _lib import (  # type: ignore
    ApiClient, ok, step, info, warn, die,
    seed_player, add_to_tournament, make_captain,
    create_tournament, patch_tournament, get_tournament,
    assert_status, get_draft_state, pick,
    list_matches, list_groups,
    start_match, score_match, complete_match,
    assert_csv, random_basketball_score,
)


def env_int(name: str, default: int) -> int:
    v = os.environ.get(name)
    try:
        return int(v) if v not in (None, "") else default
    except ValueError:
        return default


def env_str(name: str, default: str) -> str:
    v = os.environ.get(name)
    return v if v else default


LIVE_STATUSES = {"upcoming", "open", "draft", "setup", "scheduled", "active"}


def cleanup_live_tournaments(api: ApiClient) -> None:
    """Mark any in-flight tournament as completed so a new one can be created
    (the backend enforces ONE_ACTIVE_ONLY). Best-effort: ignores errors so a
    half-broken previous run doesn't block today's iteration."""
    all_t = api.get("/tournaments")
    closed = 0
    for t in all_t:
        if t["status"] in LIVE_STATUSES:
            try:
                api.patch(f"/tournaments/{t['id']}", {"status": "completed"})
                closed += 1
            except SystemExit:
                # api.call exits on error; we want best-effort. Let the
                # subsequent create_tournament surface the real issue.
                pass
    if closed:
        ok(f"cleanup · cerrados {closed} torneos previos")


def run_full_cycle() -> None:
    api = ApiClient()
    api.login_admin()
    cleanup_live_tournaments(api)

    captains_n = env_int("CAPTAINS_N", 4)
    players_n = env_int("PLAYERS_N", 16)
    bracket_format = env_str("BRACKET_FORMAT", "top2_per_group")
    bracket_size_raw = os.environ.get("BRACKET_SIZE")
    bracket_size = int(bracket_size_raw) if bracket_size_raw else None
    label = env_str("LABEL", f"E2E-{int(time.time())}")
    total = captains_n + players_n

    print(f"\n=== {label} ===")
    print(f"  captains={captains_n}  players={players_n}  total={total}")
    print(f"  bracket_format={bracket_format}  bracket_size={bracket_size}")

    today = date.today()
    match_date = today + timedelta(days=30)

    # 1. create
    step(f"crear torneo · matchDate={match_date}")
    t = create_tournament(
        api, label, match_date,
        bracket_format=bracket_format,
        bracket_size=bracket_size,
    )
    tid = t["id"]
    ok(f"id={tid}")

    # 2. mass-create players
    step(f"alta e inscripción de {total} jugadores")
    pids: list[str] = []
    for i in range(1, total + 1):
        p = seed_player(api, label[:6], i)
        add_to_tournament(api, tid, p["id"])
        pids.append(p["id"])
        if i % 25 == 0 or i == total:
            info(f"  {i}/{total}")

    # 3. promote captains
    step(f"promover {captains_n} capitanes")
    for i in range(captains_n):
        make_captain(api, tid, pids[i], f"Team {chr(ord('A') + i)}")
    assert_csv(match_date, total, captains_n)

    # 4. push to draft
    step("PATCH fechas → ventana de draft")
    yesterday = today - timedelta(days=1)
    patch_tournament(
        api, tid,
        inscriptionStart=(today - timedelta(days=5)).isoformat(),
        draftStart=yesterday.isoformat(),
        draftEnd=(today + timedelta(days=2)).isoformat(),
    )
    assert_status(api, tid, "draft")
    state = get_draft_state(api, tid)
    ok(f"draft activo · teamOrder n={len(state['state']['teamOrder'])}")

    # 5. picks
    step(f"draft loop · {players_n} picks")
    safety = players_n + 30
    while safety > 0:
        safety -= 1
        st = get_draft_state(api, tid)
        if not st["state"]["isActive"]:
            ok("draft auto-cerrado · pool vacía")
            break
        current = st["currentTeamId"]
        avail = st["availablePlayers"]
        if not avail or not current:
            die("draft activo sin team o sin jugadores disponibles")
        pick(api, tid, current, avail[0]["id"])
    else:
        die("loop de picks excedió safety")

    # 6. setup → matches generated
    step("verificar setup (grupos + calendario)")
    tt = assert_status(api, tid, "setup")
    if not tt["hoursConfirmed"]:
        die("hoursConfirmed=false")
    matches = list_matches(api, tid)
    if not matches:
        die("no se generaron partidos")
    ok(f"{len(matches)} partidos generados")

    # 7. push to active (match day)
    step("PATCH matchDate=ayer → status active")
    patch_tournament(api, tid, matchDate=yesterday.isoformat())
    assert_status(api, tid, "active")

    # 8. score every group match
    matches = list_matches(api, tid)
    group_matches = [m for m in matches if m["stage"] == "group"]
    step(f"jugar fase de grupos ({len(group_matches)} partidos)")
    for i, m in enumerate(group_matches):
        start_match(api, m["id"])
        h, a = random_basketball_score()
        if random.random() < 0.5:
            h, a = a, h  # randomize who wins
        score_match(api, m["id"], h, a)
        complete_match(api, m["id"])
        if (i + 1) % 10 == 0 or (i + 1) == len(group_matches):
            info(f"  {i+1}/{len(group_matches)}  último: {h}-{a}")

    # 9. verify standings reflect updates
    groups = list_groups(api, tid)
    for g in groups:
        members = g["members"]
        played_total = sum(m["gamesPlayed"] for m in members)
        # cada partido suma 2 a games_played (uno por equipo)
        info(f"  grupo {g['group']['name']}: gp_sum={played_total}, líder={members[0]['teamName']} pts={members[0]['points']}")
    ok("standings consultados")

    # 10. bracket auto-generated → check it
    matches = list_matches(api, tid)
    ko_matches = [m for m in matches if m["stage"] != "group"]
    if not ko_matches:
        die("bracket no generado tras último grupo")
    stages = sorted({m["stage"] for m in ko_matches})
    ok(f"bracket generado · stages={stages} · matches={len(ko_matches)}")

    # 11. play KO in stage order
    stage_order = ["eighth", "quarterfinal", "semifinal", "final", "third_place"]
    for stage in stage_order:
        st_matches = [m for m in ko_matches if m["stage"] == stage]
        if not st_matches:
            continue
        step(f"jugar {stage} ({len(st_matches)} partidos)")
        for m in st_matches:
            # refresh: propagation may have filled teams
            current = next((x for x in list_matches(api, tid) if x["id"] == m["id"]), None)
            if not current:
                die(f"match {m['id']} desapareció")
            if not current["homeTeamId"] or not current["awayTeamId"]:
                warn(f"  match {stage} sin team asignado (home={current['homeTeamId']} away={current['awayTeamId']})")
                continue
            start_match(api, m["id"])
            h, a = random_basketball_score()
            if random.random() < 0.5:
                h, a = a, h
            score_match(api, m["id"], h, a)
            complete_match(api, m["id"])
            info(f"  {stage}: {h}-{a}")
        # rebuild ko_matches reference so we see propagated teams
        ko_matches = [m for m in list_matches(api, tid) if m["stage"] != "group"]

    # 12. final assertions
    step("verificar campeón")
    final = next((m for m in list_matches(api, tid) if m["stage"] == "final"), None)
    if not final:
        die("no se encontró final")
    if final["status"] != "completed":
        die(f"final no completed: {final['status']}")
    if not final["winnerId"]:
        die("final sin winnerId")
    t_after = get_tournament(api, tid)["tournament"]
    if t_after["status"] != "completed":
        die(f"tournament status={t_after['status']} (esperado completed)")
    if t_after["winnerId"] != final["winnerId"]:
        die(f"tournament.winnerId={t_after['winnerId']} != final.winnerId={final['winnerId']}")
    ok(f"campeón = teamId {final['winnerId']} · status=completed")

    print(f"\n✓ ciclo completo · tournament={tid}")


if __name__ == "__main__":
    run_full_cycle()
