#!/usr/bin/env bash
# SPEC-014 — Tournament lifecycle: status='completed' requires every match
# closed; historial = completed OR match_date passed.
set -u
BASE="${BASE:-http://localhost:4010}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "[OK]   $*"; }
ko()  { FAIL=$((FAIL+1)); echo "[FAIL] $*"; }
login() {
  rm -f "$JAR"; touch "$JAR"
  curl -s -o /dev/null -c "$JAR" -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    --data "{\"identifier\":\"$1\",\"password\":\"$2\"}"
}

echo "== spec-014: backend acceptance =="

# AC7 — historical endpoint exists and returns JSON array.
RES=$(curl -s "$BASE/api/tournaments/historical")
echo "$RES" | head -c 1 | grep -q '\[' && ok "GET /tournaments/historical returns array" || ko "not array: $RES"
COUNT=$(echo "$RES" | grep -oE '"id":"' | wc -l)
[ "$COUNT" -ge 1 ] && ok "historical has $COUNT entries" || ko "empty historical"

# Mark a tournament as active with past match_date to exercise AC1/AC6.
TID="tournament-active-1"
docker exec basket_db psql -U postgres -d basket -c "
UPDATE tournaments SET status='active', match_date='2026-05-15' WHERE id='${TID}';
" > /dev/null 2>&1

RES=$(curl -s "$BASE/api/tournaments/historical")
PENDING=$(echo "$RES" | grep -oE '"name":"[^"]+","[^,]+","match_date":"2026-05-15"|pendingClose":true' | wc -l)
echo "$RES" | grep -q '"pendingClose":true' && ok "AC1: at least one historical entry has pendingClose=true" || ko "no pendingClose=true entry"

# AC5 — assertSingleLive blocks new tournament while there's a live one.
login "tester" "test1234"
CODE=$(curl -s -o /tmp/_b -w "%{http_code}" -b "$JAR" -X POST "$BASE/api/tournaments" \
  -H 'content-type: application/json' \
  --data '{"name":"SPEC-014 test","date":"2026-12-01","location":"Test","description":"e2e","status":"open"}')
[ "$CODE" = "409" ] && ok "AC5 (negative): cannot create while live exists (409)" || ko "expected 409, got $CODE"

# Close the live one, then a new tournament should be creatable.
docker exec basket_db psql -U postgres -d basket -c "
UPDATE tournaments SET status='completed' WHERE status<>'completed' AND deleted_at IS NULL;
" > /dev/null 2>&1
CODE=$(curl -s -o /tmp/_b -w "%{http_code}" -b "$JAR" -X POST "$BASE/api/tournaments" \
  -H 'content-type: application/json' \
  --data '{"name":"SPEC-014 new","date":"2026-12-01","location":"Test","description":"e2e","status":"open"}')
[ "$CODE" = "201" ] && ok "AC5 (positive): create allowed when no live (201)" || ko "expected 201, got $CODE; body: $(cat /tmp/_b)"

# Cleanup the freshly-created test tournament so the env is clean.
docker exec basket_db psql -U postgres -d basket -c "
DELETE FROM tournaments WHERE name LIKE 'SPEC-014%';
" > /dev/null 2>&1

# AC4 (db-level) — simulate two pending matches; closing one should NOT
# flip the tournament status, closing the second one should.
echo "== AC4 db simulation =="
SIM_TID="spec014-sim"
docker exec basket_db psql -U postgres -d basket -v ON_ERROR_STOP=1 -c "
INSERT INTO tournaments (id, name, date, status, location, description, max_teams, court_count, half_court, game_duration_minutes)
VALUES ('${SIM_TID}', 'SPEC014 sim', '2026-06-01', 'active', 'X', 'X', 99, 1, true, 20)
ON CONFLICT (id) DO UPDATE SET status='active';
INSERT INTO teams (id, tournament_id, captain_id, name)
VALUES ('spec014-tA', '${SIM_TID}', 'player-01', 'Team A'),
       ('spec014-tB', '${SIM_TID}', 'player-02', 'Team B')
ON CONFLICT (id) DO NOTHING;
DELETE FROM matches WHERE tournament_id='${SIM_TID}';
INSERT INTO matches (id, tournament_id, stage, round_number, home_team_id, away_team_id, home_score, away_score, status)
VALUES
 ('spec014-m1','${SIM_TID}','quarterfinal',1,'spec014-tA','spec014-tB',null,null,'pending'),
 ('spec014-m2','${SIM_TID}','final',1,'spec014-tA','spec014-tB',null,null,'pending');
" > /dev/null 2>&1

# Score m1 (not final) — status should remain 'active'.
docker exec basket_db psql -U postgres -d basket -c "
UPDATE matches SET home_score=10, away_score=5 WHERE id='spec014-m1';
" > /dev/null 2>&1
login "tester" "test1234"
curl -s -o /dev/null -b "$JAR" -X POST "$BASE/api/matches/spec014-m1/complete" -H 'content-type: application/json' --data '{}'
STATUS=$(docker exec basket_db psql -U postgres -d basket -t -c "SELECT status FROM tournaments WHERE id='${SIM_TID}';" 2>/dev/null | tr -d ' \r\n')
[ "$STATUS" = "active" ] && ok "AC4a: one pending → status stays active" || ko "expected active, got '$STATUS'"

# Score m2 (the final) — now all matches completed → status flips to 'completed'.
docker exec basket_db psql -U postgres -d basket -c "
UPDATE matches SET home_score=10, away_score=5 WHERE id='spec014-m2';
" > /dev/null 2>&1
curl -s -o /dev/null -b "$JAR" -X POST "$BASE/api/matches/spec014-m2/complete" -H 'content-type: application/json' --data '{}'
STATUS=$(docker exec basket_db psql -U postgres -d basket -t -c "SELECT status FROM tournaments WHERE id='${SIM_TID}';" 2>/dev/null | tr -d ' \r\n')
[ "$STATUS" = "completed" ] && ok "AC4b: all matches done → status flips to completed" || ko "expected completed, got '$STATUS'"

# Cleanup sim.
docker exec basket_db psql -U postgres -d basket -c "
DELETE FROM matches WHERE tournament_id='${SIM_TID}';
DELETE FROM teams WHERE tournament_id='${SIM_TID}';
DELETE FROM tournaments WHERE id='${SIM_TID}';
" > /dev/null 2>&1

echo
echo "== summary =="
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
