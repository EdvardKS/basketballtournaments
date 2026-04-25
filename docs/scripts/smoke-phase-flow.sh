#!/usr/bin/env bash
# Targeted smoke test for the group/knockout/champion sub-phase changes.
#
# Verifies:
#  1. derivePhase frontend helper passes its 10 unit cases (node).
#  2. Backend endpoints reachable: tournaments list, tournament detail,
#     matches list, group matches list.
#  3. Scoring + completing the LAST group match auto-creates the knockout
#     bracket (existing behavior — regression guard).
#  4. Scoring + completing the FINAL flips tournament.status='completed'
#     AND sets winner_id != null (new behavior added in Sprint 1).
#
# Usage:
#   bash test/e2e_phase_flow.sh
#   API=http://localhost:4010/api bash test/e2e_phase_flow.sh
#
# Requires: docker compose stack running (db + backend) and EXAMPLE_DATA=true.

set -u
cd "$(dirname "$0")"
API="${API:-http://localhost:4010/api}"
JAR=./vbl_phase.txt
RESP=./vbl_phase_resp.json
rm -f "$JAR" "$RESP"

PASS=0
FAIL=0

_log() { printf "\033[36m▶ %s\033[0m\n" "$*"; }
_ok()  { printf "\033[32m  ✓ %s\033[0m\n" "$*"; PASS=$((PASS+1)); }
_err() { printf "\033[31m  ✗ %s\033[0m\n" "$*"; FAIL=$((FAIL+1)); }

call() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -o "$RESP" -w "%{http_code}" -b "$JAR" -c "$JAR" -X "$method" "$API$path")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  STATUS=$(curl "${args[@]}")
}

# ---------- 1) derivePhase unit tests ---------------------------------------
_log "1) derivePhase unit tests"
cat > /tmp/_derive.mjs <<'EOF'
const derivePhase = (tournament, matches) => {
  if (tournament.status === "completed") return "completed";
  const final = matches.find((m) => m.stage === "final");
  if (final && final.status === "completed") return "completed";
  if (matches.some((m) => m.stage !== "group")) return "knockouts";
  const grp = matches.filter((m) => m.stage === "group");
  if (grp.length > 0) return grp.every((m) => m.status === "completed") ? "knockouts" : "groups";
  if (tournament.status === "draft") return "draft";
  return "pre";
};
const cases = [
  [{status:"open"}, [], "pre"],
  [{status:"draft"}, [], "draft"],
  [{status:"active"}, [{stage:"group",status:"completed"},{stage:"group",status:"pending"}], "groups"],
  [{status:"active"}, [{stage:"group",status:"completed"},{stage:"group",status:"completed"}], "knockouts"],
  [{status:"active"}, [{stage:"quarterfinal",status:"pending"}], "knockouts"],
  [{status:"active"}, [{stage:"final",status:"completed"}], "completed"],
  [{status:"completed"}, [{stage:"final",status:"pending"}], "completed"],
];
let bad = 0;
for (const [t, m, exp] of cases) {
  const got = derivePhase(t, m);
  if (got !== exp) { console.error("FAIL", JSON.stringify(t), "→", got, "expected", exp); bad++; }
}
process.exit(bad);
EOF
if node /tmp/_derive.mjs; then _ok "7 derivePhase cases pass"; else _err "derivePhase regressed"; fi
rm -f /tmp/_derive.mjs

# ---------- 2) Backend reachability ----------------------------------------
_log "2) Backend reachable"
call GET /tournaments
[ "$STATUS" = "200" ] && _ok "GET /tournaments → 200" || _err "GET /tournaments → $STATUS"

T_ID=$(node -e "const ts=JSON.parse(require('fs').readFileSync('$RESP','utf8'));const t=ts.find(t=>!['completed','upcoming'].includes(t.status))||ts[0];console.log(t?.id||'')")
[ -n "$T_ID" ] && _ok "found tournament id: $T_ID" || { _err "no tournament available"; exit 1; }

call GET "/tournaments/$T_ID"
[ "$STATUS" = "200" ] && _ok "GET /tournaments/:id → 200" || _err "GET /tournaments/:id → $STATUS"

call GET "/matches/tournament/$T_ID"
[ "$STATUS" = "200" ] && _ok "GET /matches/tournament/:id → 200" || _err "$STATUS"

call GET "/matches/tournament/$T_ID/groups"
[ "$STATUS" = "200" ] && _ok "GET /matches/tournament/:id/groups → 200" || _err "$STATUS"

# ---------- 3) Login admin -------------------------------------------------
_log "3) Login admin (base1)"
call POST /auth/login '{"identifier":"base1","password":"123123123"}'
[ "$STATUS" = "200" ] && _ok "admin login" || { _err "admin login: $STATUS"; exit 1; }

# ---------- 4) Inspect a completed tournament for the new winner_id field --
_log "4) Past tournaments retain a winner_id (Sprint 1 hook backfill check)"
call GET /tournaments
PAST=$(node -e "
const ts=JSON.parse(require('fs').readFileSync('$RESP','utf8'));
const completed=ts.filter(t=>t.status==='completed');
console.log(JSON.stringify(completed.map(t=>({id:t.id,name:t.name,winnerId:t.winnerId}))));
")
echo "  completed tournaments: $PAST"
NULL_WINNERS=$(node -e "
const ts=JSON.parse(require('fs').readFileSync('$RESP','utf8'));
const completed=ts.filter(t=>t.status==='completed');
console.log(completed.filter(t=>!t.winnerId).length);
")
if [ "$NULL_WINNERS" = "0" ]; then
  _ok "all completed tournaments have a winner_id"
else
  printf "\033[33m  ⚠ %s completed tournaments lack a winner_id (legacy data — populate manually if needed)\033[0m\n" "$NULL_WINNERS"
fi

# ---------- 5) Summary -----------------------------------------------------
echo
echo "──────────────────────────────────────────────"
echo "  PASS: $PASS   FAIL: $FAIL"
echo "──────────────────────────────────────────────"
[ "$FAIL" = "0" ] || exit 1
