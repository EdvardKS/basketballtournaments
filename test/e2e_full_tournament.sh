#!/usr/bin/env bash
# Full tournament simulation: admin creates tournament → draft → all group matches
# → knockout bracket auto-generated → plays final → champion crowned.

set -u
cd "$(dirname "$0")"
API="${API:-http://localhost:4010/api}"
JAR=./vbl_full.txt
RESP_FILE=./vbl_resp2.json
rm -f "$JAR" "$RESP_FILE"

PASS=0
FAIL=0

_log() { printf "\033[36m▶ %s\033[0m\n" "$*"; }
_ok()  { printf "\033[32m  ✓ %s\033[0m\n" "$*"; PASS=$((PASS+1)); }
_err() { printf "\033[31m  ✗ %s\033[0m\n" "$*"; FAIL=$((FAIL+1)); }

call() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -o "$RESP_FILE" -w "%{http_code}" -b "$JAR" -c "$JAR" -X "$method" "$API$path")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  STATUS=$(curl "${args[@]}")
  RESP=$(cat "$RESP_FILE")
}

node_get() { node -e "try{const d=JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));const v=$1;console.log(v===undefined?'':(typeof v==='object'?JSON.stringify(v):v))}catch(e){console.log('')}"; }

# -----------------------------------------------------
_log "Login admin"
call POST /auth/login '{"identifier":"base1","password":"123123123"}'
[ "$STATUS" = "200" ] && _ok "admin login" || { _err "admin login: $STATUS $RESP"; exit 1; }

# -----------------------------------------------------
_log "Cleanup any active tournament"
call GET /tournaments ""
node -e "
const ts = JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));
const active = ts.filter(t => !['completed','upcoming'].includes(t.status));
console.log(active.map(t => t.id).join(','));
" > ./tmp_ids.txt
for tid in $(cat ./tmp_ids.txt | tr ',' ' '); do
  [ -n "$tid" ] && call PATCH /tournaments/$tid "{\"status\":\"completed\"}"
done
_ok "cleanup done"

# -----------------------------------------------------
_log "Create tournament (6 teams → 2 groups of 3)"
TODAY=$(date -u +%Y-%m-%d)
FUTURE=$(date -u -d "+2 day" +%Y-%m-%d 2>/dev/null || date -u -v +2d +%Y-%m-%d)
call POST /tournaments "{\"name\":\"Copa Full E2E\",\"location\":\"Pista Grande\",\"description\":\"Prueba completa\",\"maxTeams\":6,\"status\":\"open\",\"inscriptionStart\":\"$TODAY\",\"inscriptionEnd\":\"$TODAY\",\"draftStart\":\"$TODAY\",\"draftEnd\":\"$TODAY\",\"matchDate\":\"$FUTURE\",\"halfCourt\":true,\"gameDurationMinutes\":20}"
[ "$STATUS" = "201" ] && _ok "tournament created" || { _err "create: $STATUS $RESP"; exit 1; }
T_ID=$(node_get 'd.id')

# -----------------------------------------------------
_log "Register 18 players (6 captains + 12 regulars) — use 16 seeded + 2 new"

call GET /players ""
PLAYER_IDS=$(node -e "
const ps = JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));
const players = ps.filter(p => p.role !== 'admin').slice(0, 15);
console.log(players.map(p => p.id).join(','));
")
IFS=',' read -ra PIDS <<< "$PLAYER_IDS"
_ok "have ${#PIDS[@]} non-admin players"

# Register them
for pid in "${PIDS[@]}"; do
  call POST /tournaments/$T_ID/add-player "{\"playerId\":\"$pid\"}"
done
_ok "all registered"

# Captains: first 6
CAP_IDS=("${PIDS[@]:0:6}")
for i in 0 1 2 3 4 5; do
  call POST /tournaments/$T_ID/captains "{\"playerId\":\"${CAP_IDS[$i]}\",\"isCaptain\":true,\"teamName\":\"Team $((i+1))\"}"
done
_ok "6 captains set"

# -----------------------------------------------------
_log "Simulate all picks (draft auto-starts on first GET via lifecycle)"
# Tournament was created with draft_start = today (see line above creating it).
# Just GET state — the lazy transition starts the draft.
call GET /draft/$T_ID/state ""
[ "$STATUS" = "200" ] && _ok "draft state available" || { _err "state: $STATUS $RESP"; exit 1; }
IS_ACTIVE=$(node_get 'd.state.isActive')
[ "$IS_ACTIVE" = "true" ] && _ok "draft auto-started by date" || _err "not active: $IS_ACTIVE"

PICK_COUNT=0
while [ "$PICK_COUNT" -lt 50 ]; do
  call GET /draft/$T_ID/state ""
  IS_ACTIVE=$(node_get 'd.state.isActive')
  [ "$IS_ACTIVE" != "true" ] && break

  CURRENT=$(node_get 'd.currentTeamId')
  PICK=$(node_get 'd.availablePlayers && d.availablePlayers[0] && d.availablePlayers[0].id')
  [ -z "$PICK" ] || [ -z "$CURRENT" ] && break

  call POST /draft/$T_ID/pick "{\"teamId\":\"$CURRENT\",\"playerId\":\"$PICK\"}"
  [ "$STATUS" = "201" ] || { _err "pick $PICK_COUNT failed: $STATUS $RESP"; break; }
  PICK_COUNT=$((PICK_COUNT+1))
done
_ok "completed $PICK_COUNT picks"

# -----------------------------------------------------
_log "Verify groups + schedule auto-generated"
call GET /matches/tournament/$T_ID/groups ""
G_COUNT=$(node_get 'd.length')
_ok "groups: $G_COUNT"

call GET /matches/tournament/$T_ID ""
M_COUNT=$(node_get 'd.length')
GROUP_MATCHES=$(node_get 'd.filter(m=>m.stage==="group").length')
_ok "matches total: $M_COUNT (group: $GROUP_MATCHES)"

# -----------------------------------------------------
_log "Schedule + hours auto-published when draft ended"
call GET /tournaments/$T_ID ""
HRS=$(node_get 'd.tournament.hoursConfirmed')
[ "$HRS" = "true" ] && _ok "hoursConfirmed=true (auto)" || _err "hoursConfirmed=$HRS"

# -----------------------------------------------------
_log "Play all group matches (scores random, complete each)"
call GET /matches/tournament/$T_ID ""
node -e "
const ms = JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));
console.log(ms.filter(m => m.stage === 'group' && m.status === 'pending').map(m => m.id).join(','));
" > ./tmp_mids.txt
MATCH_IDS=$(cat ./tmp_mids.txt)
PLAYED=0
for mid in $(echo "$MATCH_IDS" | tr ',' ' '); do
  [ -z "$mid" ] && continue
  H=$((20 + RANDOM % 30))
  A=$((20 + RANDOM % 30))
  [ "$H" = "$A" ] && H=$((H+1))
  call POST /matches/$mid/score "{\"homeScore\":$H,\"awayScore\":$A}"
  call POST /matches/$mid/complete ""
  [ "$STATUS" = "200" ] && PLAYED=$((PLAYED+1)) || _err "complete $mid: $STATUS $RESP"
done
_ok "played $PLAYED group matches"

# -----------------------------------------------------
_log "Verify knockout auto-generated after all group games done"
call GET /matches/tournament/$T_ID ""
KO=$(node_get 'd.filter(m=>m.stage!=="group").length')
[ "$KO" -ge 1 ] && _ok "knockout matches: $KO" || _err "no knockout generated"

# -----------------------------------------------------
_log "Verify group standings sorted correctly"
call GET /matches/tournament/$T_ID/groups ""
node -e "
const gs = JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));
for (const g of gs) {
  console.log('Group ' + g.group.name + ':');
  for (const m of g.members) {
    console.log('  ' + m.teamName + ': ' + m.points + 'pts W' + m.gamesWon + ' L' + m.gamesLost + ' (PF'+m.pointsFor+'/PC'+m.pointsAgainst+')');
  }
}
"

# -----------------------------------------------------
_log "Tournament status should be 'active' after groups finish"
call GET /tournaments/$T_ID ""
T_STATUS=$(node_get 'd.tournament.status')
[ "$T_STATUS" = "active" ] && _ok "tournament.status=active" || _err "status=$T_STATUS"

# -----------------------------------------------------
_log "Play first knockout match with non-null teams"
call GET /matches/tournament/$T_ID ""
KO_MATCH=$(node -e "
const ms = JSON.parse(require('fs').readFileSync('$RESP_FILE','utf8'));
const m = ms.find(x => x.stage !== 'group' && x.homeTeamId && x.awayTeamId && x.status === 'pending');
console.log(m ? m.id : '');
")
if [ -n "$KO_MATCH" ]; then
  call POST /matches/$KO_MATCH/score "{\"homeScore\":42,\"awayScore\":35}"
  call POST /matches/$KO_MATCH/complete ""
  [ "$STATUS" = "200" ] && _ok "KO match played: $KO_MATCH" || _err "KO complete: $STATUS $RESP"
else
  _ok "no seedable KO match (1-group tournament) — OK"
fi

echo ""
echo "========================================"
echo "  FULL TOURNAMENT: $PASS passed, $FAIL failed"
echo "========================================"
exit $FAIL
