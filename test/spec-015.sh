#!/usr/bin/env bash
# SPEC-015 — Matchday scoring sessions: admin endpoints, public-token flow,
# clock persistence, double-submit idempotency, match-completed expiry.
set -u
BASE="${BASE:-http://localhost:4010}"
JAR="$(mktemp)"
trap 'rm -f "$JAR" /tmp/_spec015_*' EXIT
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "[OK]   $*"; }
ko()  { FAIL=$((FAIL+1)); echo "[FAIL] $*"; }
login() {
  rm -f "$JAR"; touch "$JAR"
  curl -s -o /dev/null -c "$JAR" -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    --data "{\"identifier\":\"$1\",\"password\":\"$2\"}"
}

SIM_TID="spec015-sim"
GID="spec015-g1"

setup() {
  docker exec basket_db psql -U postgres -d basket -v ON_ERROR_STOP=1 -c "
INSERT INTO tournaments (id, name, date, status, location, description, max_teams, court_count, half_court, game_duration_minutes)
VALUES ('${SIM_TID}', 'SPEC015 sim', '2026-06-01', 'active', 'X', 'X', 99, 1, true, 20)
ON CONFLICT (id) DO UPDATE SET status='active', match_date=NULL;
INSERT INTO teams (id, tournament_id, captain_id, name)
VALUES ('spec015-tA', '${SIM_TID}', 'player-01', 'Spec015 A'),
       ('spec015-tB', '${SIM_TID}', 'player-02', 'Spec015 B'),
       ('spec015-tC', '${SIM_TID}', 'player-03', 'Spec015 C'),
       ('spec015-tD', '${SIM_TID}', 'player-04', 'Spec015 D')
ON CONFLICT (id) DO NOTHING;
INSERT INTO tournament_groups (id, tournament_id, name) VALUES ('${GID}', '${SIM_TID}', 'A')
ON CONFLICT (id) DO NOTHING;
INSERT INTO group_members (group_id, team_id) VALUES
  ('${GID}', 'spec015-tA'),
  ('${GID}', 'spec015-tB'),
  ('${GID}', 'spec015-tC'),
  ('${GID}', 'spec015-tD')
ON CONFLICT DO NOTHING;
DELETE FROM matches WHERE tournament_id='${SIM_TID}';
INSERT INTO matches (id, tournament_id, group_id, stage, home_team_id, away_team_id, status)
VALUES
 ('spec015-m1','${SIM_TID}','${GID}','group','spec015-tA','spec015-tB','pending'),
 ('spec015-m2','${SIM_TID}','${GID}','group','spec015-tC','spec015-tD','pending'),
 ('spec015-m3','${SIM_TID}','${GID}','group','spec015-tA','spec015-tC','pending');
DELETE FROM match_score_sessions WHERE match_id IN ('spec015-m1','spec015-m2','spec015-m3');
UPDATE group_members SET points=0, games_played=0, games_won=0, games_lost=0, points_for=0, points_against=0
  WHERE group_id='${GID}';
" > /dev/null
}

cleanup() {
  docker exec basket_db psql -U postgres -d basket -c "
DELETE FROM match_score_sessions WHERE match_id IN ('spec015-m1','spec015-m2','spec015-m3');
DELETE FROM matches WHERE tournament_id='${SIM_TID}';
DELETE FROM group_members WHERE group_id='${GID}';
DELETE FROM tournament_groups WHERE id='${GID}';
DELETE FROM teams WHERE tournament_id='${SIM_TID}';
DELETE FROM tournaments WHERE id='${SIM_TID}';
" > /dev/null 2>&1
}

extract_field() { # $1 json, $2 key
  printf '%s' "$1" | grep -oE "\"$2\":\"[^\"]+\"" | head -n1 | sed -E 's/.*:"([^"]+)"/\1/'
}
extract_num() {
  printf '%s' "$1" | grep -oE "\"$2\":-?[0-9]+" | head -n1 | sed -E 's/.*://'
}

echo "== spec-015: matchday scoring sessions =="
setup

login "tester" "test1234" || true

# --- Admin can create + list + revoke a session.
RES=$(curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m1/score-session")
TOKEN=$(extract_field "$RES" "token")
[ -n "$TOKEN" ] && ok "T1 admin creates session, returns cleartext token" || { ko "no token in $RES"; cleanup; exit 1; }
SESSION_ID=$(extract_field "$RES" "id")

ACTIVE=$(curl -s -b "$JAR" "$BASE/api/matches/spec015-m1/score-session")
echo "$ACTIVE" | grep -q '"active":true' && ok "T2 admin GET reports active=true" || ko "expected active true, got $ACTIVE"

# Second create revokes the previous one — but on the same row the partial
# UNIQUE index lets the new one slot in. The first token must stop working.
RES2=$(curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m1/score-session")
TOKEN2=$(extract_field "$RES2" "token")
[ "$TOKEN" != "$TOKEN2" ] && ok "T3 creating a new session yields a fresh token" || ko "token did not rotate"

R=$(curl -s -o /tmp/_spec015_old -w "%{http_code}" "$BASE/api/match-score/$TOKEN/score" \
   -H 'content-type: application/json' --data '{"side":"home","delta":1}')
[ "$R" = "410" ] && ok "T4 old token is closed (410)" || ko "expected 410 on old token, got $R: $(cat /tmp/_spec015_old)"

# Replace token2 with a fresh, clean session so subsequent flow is deterministic.
RES3=$(curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m1/score-session")
TOKEN=$(extract_field "$RES3" "token")

# --- Public token works without any cookie. We use a brand-new jarless curl.
PUB=$(curl -s "$BASE/api/match-score/$TOKEN")
echo "$PUB" | grep -q '"editable":true' && ok "T5 public GET without cookie returns editable" || ko "not editable: $PUB"

# --- Start, score, pause, resume, score, submit.
curl -s -X POST "$BASE/api/match-score/$TOKEN/start" > /dev/null
sleep 1
curl -s -X POST "$BASE/api/match-score/$TOKEN/score" -H 'content-type: application/json' --data '{"side":"home","delta":2}' > /dev/null
curl -s -X POST "$BASE/api/match-score/$TOKEN/score" -H 'content-type: application/json' --data '{"side":"home","delta":1}' > /dev/null
curl -s -X POST "$BASE/api/match-score/$TOKEN/score" -H 'content-type: application/json' --data '{"side":"home","delta":-1}' > /dev/null
curl -s -X POST "$BASE/api/match-score/$TOKEN/score" -H 'content-type: application/json' --data '{"side":"away","delta":2}' > /dev/null

PAUSED=$(curl -s -X POST "$BASE/api/match-score/$TOKEN/pause")
ELAPSED=$(extract_num "$PAUSED" "elapsedSeconds")
[ "${ELAPSED:-0}" -ge 1 ] && ok "T6 pause accumulates elapsed seconds ($ELAPSED)" || ko "expected elapsed >=1, got $ELAPSED"

# Scoreboard sanity.
HS=$(extract_num "$PAUSED" "homeScore")
AS=$(extract_num "$PAUSED" "awayScore")
[ "$HS" = "2" ] && ok "T7 home score 2 (+2,+1,-1)" || ko "home expected 2, got $HS"
[ "$AS" = "2" ] && ok "T8 away score 2 (+2)" || ko "away expected 2, got $AS"

# --- delta validation.
BAD=$(curl -s -o /tmp/_spec015_bad -w "%{http_code}" "$BASE/api/match-score/$TOKEN/score" \
  -H 'content-type: application/json' --data '{"side":"home","delta":7}')
[ "$BAD" = "400" ] && ok "T9 invalid delta rejected (400)" || ko "expected 400, got $BAD"

# --- Submit. Expect 'match.status'=completed and idempotent second submit.
SUB=$(curl -s -X POST "$BASE/api/match-score/$TOKEN/submit")
echo "$SUB" | grep -q '"status":"completed"' && ok "T10 submit completes the match" || ko "match not completed: $SUB"

# Group standings: each team played exactly once.
PJ=$(docker exec basket_db psql -U postgres -d basket -t -c "
  SELECT COALESCE(SUM(games_played),0) FROM group_members WHERE group_id='${GID}';
" 2>/dev/null | tr -d ' \r\n')
[ "$PJ" = "2" ] && ok "T11 group_members credited exactly once per team (sum=2)" || ko "expected sum=2, got '$PJ'"

# Second submit must be a 410, not double-credit.
R=$(curl -s -o /tmp/_spec015_dbl -w "%{http_code}" -X POST "$BASE/api/match-score/$TOKEN/submit")
[ "$R" = "410" ] && ok "T12 second submit is closed (410), not a doubled win" || ko "expected 410, got $R"
PJ=$(docker exec basket_db psql -U postgres -d basket -t -c "
  SELECT COALESCE(SUM(games_played),0) FROM group_members WHERE group_id='${GID}';
" 2>/dev/null | tr -d ' \r\n')
[ "$PJ" = "2" ] && ok "T13 standings unchanged after double submit (sum still 2)" || ko "double-counted standings: '$PJ'"

# --- Match-completed expiry via admin path.
RES=$(curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m2/score-session")
TOK_M2=$(extract_field "$RES" "token")
# Admin completes the match directly through the existing endpoints.
curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m2/score" -H 'content-type: application/json' --data '{"homeScore":9,"awayScore":3}' > /dev/null
curl -s -b "$JAR" -X POST "$BASE/api/matches/spec015-m2/complete" > /dev/null

R=$(curl -s -o /tmp/_spec015_m2 -w "%{http_code}" "$BASE/api/match-score/$TOK_M2/score" \
  -H 'content-type: application/json' --data '{"side":"home","delta":1}')
[ "$R" = "410" ] && ok "T14 token cannot mutate a match closed by admin (410)" || ko "expected 410, got $R: $(cat /tmp/_spec015_m2)"
GET_M2=$(curl -s "$BASE/api/match-score/$TOK_M2")
echo "$GET_M2" | grep -q '"editable":false' && ok "T15 public GET surfaces editable=false for closed match" || ko "expected editable=false: $GET_M2"

# --- Unknown token.
R=$(curl -s -o /tmp/_spec015_404 -w "%{http_code}" "$BASE/api/match-score/this-is-not-a-real-token")
[ "$R" = "404" ] && ok "T16 unknown token returns 404" || ko "expected 404, got $R"

cleanup
echo
echo "== summary =="
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
