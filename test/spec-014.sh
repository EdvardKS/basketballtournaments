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

echo
echo "== summary =="
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
