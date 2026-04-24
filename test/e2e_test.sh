#!/usr/bin/env bash
# End-to-end test script for VBL. Tests all endpoints + full draft workflow.
# Uses 3 cookie jars: admin, captain, anonymous.

set -u
cd "$(dirname "$0")"
API="${API:-http://localhost:4010/api}"
JAR_ADMIN="./vbl_admin.txt"
JAR_CAP1="./vbl_cap1.txt"
JAR_CAP2="./vbl_cap2.txt"
JAR_ANON="./vbl_anon.txt"
rm -f "$JAR_ADMIN" "$JAR_CAP1" "$JAR_CAP2" "$JAR_ANON"

PASS=0
FAIL=0
declare -a FAILURES=()

# --- helpers ---
_log() { printf "\033[36m▶ %s\033[0m\n" "$*"; }
_ok()  { printf "\033[32m  ✓ %s\033[0m\n" "$*"; PASS=$((PASS+1)); }
_err() { printf "\033[31m  ✗ %s\033[0m\n" "$*"; FAIL=$((FAIL+1)); FAILURES+=("$*"); }

# curl wrapper: $1=method $2=path $3=jar $4=body(optional); sets RESP & STATUS
call() {
  local method="$1" path="$2" jar="$3" body="${4:-}"
  local args=(-s -o ./vbl_resp.json -w "%{http_code}" -b "$jar" -c "$jar" -X "$method" "$API$path")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  STATUS=$(curl "${args[@]}")
  RESP=$(cat ./vbl_resp.json)
}

expect_status() {
  local want="$1" label="$2"
  if [ "$STATUS" = "$want" ]; then _ok "$label ($STATUS)";
  else _err "$label: expected $want got $STATUS. Body: $RESP"; fi
}

expect_json_field() {
  local field="$1" label="$2"
  local val
  val=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));const v=d.$field;console.log(v===undefined?'':JSON.stringify(v))}catch(e){console.log('')}")
  if [ -n "$val" ] && [ "$val" != "null" ]; then
    _ok "$label (got $val)"
    echo "$val" | sed 's/^"//;s/"$//'
  else
    _err "$label: missing .$field in $RESP"
    echo ""
  fi
}

json_field() {
  node -e "try{const d=JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));const v=d.$1;console.log(v===undefined?'':(typeof v==='object'?JSON.stringify(v):v))}catch(e){console.log('')}"
}

# =====================================================
_log "1. Health check"
call GET /health "$JAR_ANON"
expect_status 200 "GET /health"

# =====================================================
_log "2. Authentication"

# 2.1 - Login admin (seeded: admin1 / admin123)
call POST /auth/login "$JAR_ADMIN" '{"identifier":"base1","password":"123123123"}'
expect_status 200 "admin login with username"

# 2.2 - /auth/me after admin login
call GET /auth/me "$JAR_ADMIN"
expect_status 200 "admin /auth/me"
ADMIN_ROLE=$(json_field 'player.role')
[ "$ADMIN_ROLE" = "admin" ] && _ok "admin role=admin" || _err "admin role wrong: $ADMIN_ROLE"

# 2.3 - Wrong password
call POST /auth/login "$JAR_ANON" '{"identifier":"base1","password":"wrong"}'
expect_status 401 "wrong password → 401"

# 2.4 - /auth/me without auth
rm -f "$JAR_ANON"
call GET /auth/me "$JAR_ANON"
expect_status 401 "anonymous /auth/me → 401"

# 2.5 - Register a new player
REG_MOBILE="999000$(date +%s | tail -c 5)"
call POST /auth/register "$JAR_ANON" "{\"name\":\"Test Player\",\"mobile\":\"$REG_MOBILE\",\"password\":\"password123\",\"age\":25,\"gdprAccepted\":true}"
expect_status 201 "register new player"
NEWPLAYER_ID=$(json_field 'player.id')
[ -n "$NEWPLAYER_ID" ] && _ok "new player id=$NEWPLAYER_ID" || _err "no player id returned"

# 2.6 - Register without GDPR fails
call POST /auth/register "$JAR_ANON" "{\"name\":\"No GDPR\",\"mobile\":\"600000001\",\"password\":\"password123\",\"age\":25,\"gdprAccepted\":false}"
expect_status 400 "register without GDPR → 400"

# 2.7 - Register duplicate mobile fails
call POST /auth/register "$JAR_ANON" "{\"name\":\"Dup\",\"mobile\":\"$REG_MOBILE\",\"password\":\"password123\",\"age\":25,\"gdprAccepted\":true}"
expect_status 409 "duplicate mobile → 409"

# 2.8 - Logout new player
call POST /auth/logout "$JAR_ANON"
expect_status 200 "new player logout"

# =====================================================
_log "3. Tournament lifecycle"

# 3.1 - Anonymous can list tournaments
rm -f "$JAR_ANON"
call GET /tournaments "$JAR_ANON"
expect_status 200 "anon GET /tournaments"

# 3.2 - Non-admin cannot create tournament
call POST /tournaments "$JAR_ANON" '{"name":"Hack","location":"x","description":"y"}'
expect_status 401 "anon POST /tournaments → 401"

# Find and clean any active seeded tournament → mark it completed so we can create a new one
call GET /tournaments "$JAR_ADMIN"
ACTIVE_SEED_ID=$(node -e "
const ts = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
const a = ts.find(t => !['completed','upcoming'].includes(t.status));
console.log(a ? a.id : '');
")
if [ -n "$ACTIVE_SEED_ID" ]; then
  call PATCH /tournaments/$ACTIVE_SEED_ID "$JAR_ADMIN" '{"status":"completed"}'
  expect_status 200 "admin cleanup seeded active tournament ($ACTIVE_SEED_ID)"
else
  _ok "no seeded active tournament to clean up"
fi

# 3.3 - Admin creates new tournament
TODAY=$(date -u +%Y-%m-%d)
TOMORROW=$(date -u -d "+1 day" +%Y-%m-%d 2>/dev/null || date -u -v +1d +%Y-%m-%d)
MATCH_DATE=$(date -u -d "+2 day" +%Y-%m-%d 2>/dev/null || date -u -v +2d +%Y-%m-%d)
call POST /tournaments "$JAR_ADMIN" "{\"name\":\"E2E Test Cup\",\"location\":\"Polideportivo Test\",\"description\":\"E2E test tournament\",\"maxTeams\":4,\"status\":\"open\",\"inscriptionStart\":\"$TODAY\",\"inscriptionEnd\":\"$TODAY\",\"draftStart\":\"$TOMORROW\",\"draftEnd\":\"$TOMORROW\",\"matchDate\":\"$MATCH_DATE\",\"halfCourt\":true,\"gameDurationMinutes\":20}"
expect_status 201 "admin POST /tournaments"
T_ID=$(json_field 'id')
[ -n "$T_ID" ] && _ok "tournament id=$T_ID" || _err "no tournament id"

# 3.4 - ONE_ACTIVE_ONLY rule: try creating second live tournament
call POST /tournaments "$JAR_ADMIN" "{\"name\":\"Second Cup\",\"location\":\"Pista Segunda\",\"description\":\"Segundo torneo\",\"status\":\"open\",\"maxTeams\":4}"
expect_status 409 "second active tournament → 409"

# 3.5 - Tournament detail (anonymous)
call GET /tournaments/$T_ID "$JAR_ANON"
expect_status 200 "anon GET /tournaments/:id"

# =====================================================
_log "4. Player registration + captain assignment"

# 4.1 - List seeded players (admin)
call GET /players "$JAR_ADMIN"
expect_status 200 "admin GET /players"
PLAYERS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).length)")
_log "  found $PLAYERS_COUNT seeded players"

# Grab 4 player IDs (non-admin) to use as captains/roster
PLAYER_IDS=$(node -e "
const ps = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
const players = ps.filter(p => p.role !== 'admin').slice(0, 12);
console.log(players.map(p => p.id).join(','))
")
IFS=',' read -ra PIDS <<< "$PLAYER_IDS"
[ "${#PIDS[@]}" -ge 12 ] && _ok "got 12 player ids" || _err "not enough players: ${#PIDS[@]}"

# 4.2 - Register those 12 players in the tournament
for pid in "${PIDS[@]}"; do
  call POST /tournaments/$T_ID/add-player "$JAR_ADMIN" "{\"playerId\":\"$pid\"}"
  [ "$STATUS" = "200" ] || _err "add-player $pid failed: $STATUS $RESP"
done
_ok "added 12 players to tournament"

# 4.3 - Promote first 4 to captains
CAP_IDS=("${PIDS[0]}" "${PIDS[1]}" "${PIDS[2]}" "${PIDS[3]}")
for i in 0 1 2 3; do
  call POST /tournaments/$T_ID/captains "$JAR_ADMIN" "{\"playerId\":\"${CAP_IDS[$i]}\",\"isCaptain\":true,\"teamName\":\"Equipo $((i+1))\"}"
  [ "$STATUS" = "200" ] || _err "set-captain ${CAP_IDS[$i]} failed: $STATUS $RESP"
done
_ok "promoted 4 captains"

# 4.4 - Verify teams are created
call GET /tournaments/$T_ID "$JAR_ADMIN"
TEAMS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).teams.length)")
[ "$TEAMS_COUNT" = "4" ] && _ok "4 teams created" || _err "expected 4 teams, got $TEAMS_COUNT"

# 4.5 - Get team IDs
TEAM_IDS=$(node -e "
const d = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
console.log(d.teams.map(t => t.id + ':' + t.captainId).join(','));
")
# TEAM_IDS format: teamId1:capId1,teamId2:capId2,...

# =====================================================
_log "5. Captain login + team update"

# 5.1 - Login first captain (need to know their mobile)
call GET /players "$JAR_ADMIN"
CAP1_MOBILE=$(node -e "
const ps = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
const cap = ps.find(p => p.id === '${CAP_IDS[0]}');
console.log(cap ? cap.mobile : '');
")
[ -n "$CAP1_MOBILE" ] && _ok "cap1 mobile=$CAP1_MOBILE" || _err "no cap1 mobile"

# Seeded players have password '123123123' (check seed file)
call POST /auth/login "$JAR_CAP1" "{\"identifier\":\"$CAP1_MOBILE\",\"password\":\"123123123\"}"
expect_status 200 "captain1 login"
CAP1_ROLE=$(json_field 'player.role')
[ "$CAP1_ROLE" = "captain" ] && _ok "cap1 role=captain" || _err "cap1 role=$CAP1_ROLE"

# 5.2 - Captain can update team (before draft-end - 24h lock)
TEAM1_ID=$(echo "$TEAM_IDS" | tr ',' '\n' | grep ":${CAP_IDS[0]}" | cut -d: -f1)
[ -n "$TEAM1_ID" ] && _ok "team1 id=$TEAM1_ID" || _err "no team1 id"

call PATCH /teams/$TEAM1_ID "$JAR_CAP1" '{"name":"Los Lobos","description":"El mejor equipo","whatsappLink":"https://wa.me/600000000"}'
expect_status 200 "captain PATCH own team"

# 5.3 - Captain cannot patch another team
OTHER_TEAM=$(echo "$TEAM_IDS" | tr ',' '\n' | grep ":${CAP_IDS[1]}" | cut -d: -f1)
call PATCH /teams/$OTHER_TEAM "$JAR_CAP1" '{"name":"Hack"}'
expect_status 403 "captain PATCH other team → 403"

# =====================================================
_log "6. Draft workflow simulation"

# 6.1 - Non-admin cannot start draft
call POST /draft/$T_ID/start "$JAR_CAP1"
expect_status 403 "captain start draft → 403"

# 6.2 - Admin starts draft
call POST /draft/$T_ID/start "$JAR_ADMIN"
expect_status 201 "admin start draft"

# 6.3 - Cannot start twice
call POST /draft/$T_ID/start "$JAR_ADMIN"
expect_status 409 "double start draft → 409"

# 6.4 - Get draft state (captain)
call GET /draft/$T_ID/state "$JAR_CAP1"
expect_status 200 "captain get draft state"

# 6.5 - Anonymous cannot see draft state
call GET /draft/$T_ID/state "$JAR_ANON"
expect_status 401 "anon draft state → 401"

# 6.6 - Simulate full draft: pick all 8 remaining players (4 teams × 2 picks)
# Expected: 12 total players - 4 captains already in teams = 8 remaining
# Loop: get state → determine current team → pick a player → repeat until draft ends

_log "  Starting draft loop..."
PICK_COUNT=0
MAX_PICKS=20

while [ "$PICK_COUNT" -lt "$MAX_PICKS" ]; do
  call GET /draft/$T_ID/state "$JAR_ADMIN"
  [ "$STATUS" = "200" ] || { _err "draft state failed at pick $PICK_COUNT: $STATUS $RESP"; break; }

  IS_ACTIVE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).state.isActive)")
  if [ "$IS_ACTIVE" != "true" ]; then
    _ok "draft auto-ended after $PICK_COUNT picks"
    break
  fi

  CURRENT_TEAM=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).currentTeamId)")
  FIRST_AVAIL=$(node -e "
  const d = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
  console.log(d.availablePlayers && d.availablePlayers.length > 0 ? d.availablePlayers[0].id : '');
  ")
  if [ -z "$FIRST_AVAIL" ] || [ -z "$CURRENT_TEAM" ]; then
    _ok "draft finished (no more picks): $PICK_COUNT"
    break
  fi

  call POST /draft/$T_ID/pick "$JAR_ADMIN" "{\"teamId\":\"$CURRENT_TEAM\",\"playerId\":\"$FIRST_AVAIL\"}"
  if [ "$STATUS" != "201" ]; then
    _err "pick $PICK_COUNT failed: $STATUS $RESP"
    break
  fi
  PICK_COUNT=$((PICK_COUNT+1))
done

_log "  Total picks made: $PICK_COUNT"
[ "$PICK_COUNT" -ge 8 ] && _ok "simulated ≥8 picks" || _err "too few picks: $PICK_COUNT"

# 6.7 - After draft ended, groups should exist
call GET /matches/tournament/$T_ID/groups "$JAR_ANON"
expect_status 200 "anon GET groups after draft"
GROUPS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).length)")
[ "$GROUPS_COUNT" -ge 1 ] && _ok "groups generated: $GROUPS_COUNT" || _err "no groups: $RESP"

# 6.8 - Matches should exist
call GET /matches/tournament/$T_ID "$JAR_ANON"
expect_status 200 "anon GET matches"
MATCH_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).length)")
[ "$MATCH_COUNT" -ge 1 ] && _ok "matches generated: $MATCH_COUNT" || _err "no matches"

# 6.9 - Schedule should have scheduled_at populated
SCHEDULED_MATCHES=$(node -e "
const ms = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
console.log(ms.filter(m => m.scheduledAt).length);
")
[ "$SCHEDULED_MATCHES" -ge 1 ] && _ok "matches scheduled: $SCHEDULED_MATCHES" || _err "no scheduled matches"

# 6.10 - hours_confirmed should be false initially
call GET /tournaments/$T_ID "$JAR_ANON"
HRS_CONFIRMED=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).tournament.hoursConfirmed)")
[ "$HRS_CONFIRMED" = "false" ] && _ok "hoursConfirmed=false initially" || _err "hoursConfirmed=$HRS_CONFIRMED"

# 6.11 - Admin confirms schedule
call POST /matches/tournament/$T_ID/confirm-schedule "$JAR_ADMIN"
expect_status 200 "admin confirm schedule"

call GET /tournaments/$T_ID "$JAR_ANON"
HRS_CONFIRMED2=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8')).tournament.hoursConfirmed)")
[ "$HRS_CONFIRMED2" = "true" ] && _ok "hoursConfirmed=true after confirm" || _err "hoursConfirmed not updated"

# =====================================================
_log "7. Match scoring + group standings"

# 7.1 - Get first group match
FIRST_MATCH=$(node -e "
const ms = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
" 2>/dev/null || echo "")

call GET /matches/tournament/$T_ID "$JAR_ADMIN"
FIRST_MATCH_ID=$(node -e "
const ms = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
const gm = ms.find(m => m.stage === 'group' && m.homeTeamId && m.awayTeamId);
console.log(gm ? gm.id : '');
")
[ -n "$FIRST_MATCH_ID" ] && _ok "first match id=$FIRST_MATCH_ID" || _err "no group match"

# 7.2 - Admin sets score
call POST /matches/$FIRST_MATCH_ID/score "$JAR_ADMIN" '{"homeScore":21,"awayScore":15}'
expect_status 200 "admin set score"

# 7.3 - Captain cannot set score
call POST /matches/$FIRST_MATCH_ID/score "$JAR_CAP1" '{"homeScore":99,"awayScore":0}'
expect_status 403 "captain set score → 403"

# 7.4 - Complete match
call POST /matches/$FIRST_MATCH_ID/complete "$JAR_ADMIN"
expect_status 200 "admin complete match"

# 7.5 - Group standings should reflect
call GET /matches/tournament/$T_ID/groups "$JAR_ANON"
UPDATED=$(node -e "
const gs = JSON.parse(require('fs').readFileSync('./vbl_resp.json','utf8'));
let hasWin = false;
for (const g of gs) for (const m of g.members) if (m.gamesWon > 0 || m.gamesLost > 0) hasWin = true;
console.log(hasWin ? 'yes' : 'no');
")
[ "$UPDATED" = "yes" ] && _ok "standings updated after complete" || _err "standings NOT updated"

# =====================================================
_log "8. Privacy / visibility restrictions"

# 8.1 - Anonymous cannot list players
call GET /players "$JAR_ANON"
expect_status 401 "anon GET /players → 401"

# 8.2 - Anonymous cannot get player detail
call GET /players/${CAP_IDS[0]} "$JAR_ANON"
expect_status 401 "anon GET /players/:id → 401"

# 8.3 - Anonymous CAN see tournament (but backend returns all data — frontend filters)
call GET /tournaments/$T_ID "$JAR_ANON"
expect_status 200 "anon GET tournament detail"

# =====================================================
_log "9. Edge cases"

# 9.1 - Register for tournament that doesn't exist
call POST /tournaments/nonexistent/register "$JAR_CAP1"
[ "$STATUS" = "404" ] || [ "$STATUS" = "400" ] && _ok "register invalid tournament → $STATUS" || _err "got $STATUS"

# 9.2 - Pick after draft ended
call POST /draft/$T_ID/pick "$JAR_ADMIN" "{\"teamId\":\"$TEAM1_ID\",\"playerId\":\"${PIDS[0]}\"}"
[ "$STATUS" = "404" ] || [ "$STATUS" = "409" ] && _ok "pick after draft ends → $STATUS" || _err "got $STATUS"

# 9.3 - End draft idempotent
call POST /draft/$T_ID/end "$JAR_ADMIN"
_log "  end-after-ended status: $STATUS (not critical if 200)"

# =====================================================
echo ""
echo "========================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "========================================"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "All green ✓"
exit 0
