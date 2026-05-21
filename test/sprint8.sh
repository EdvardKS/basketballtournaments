#!/usr/bin/env bash
# sprint8: self-service profile + stats redistribution + sanctions + custom awards.
# Requires the backend running at http://localhost:4000 (or BASE override).
# Uses only curl + grep so it works on minimal CI images.
set -u

BASE="${BASE:-http://localhost:4000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
PASS=0; FAIL=0

ok()  { PASS=$((PASS+1)); echo "[OK]   $*"; }
ko()  { FAIL=$((FAIL+1)); echo "[FAIL] $*"; }
note(){ echo "       $*"; }

# Helper: $1 expected status, $2 method, $3 path, [$4 body]
req() {
  local exp="$1" m="$2" p="$3" body="${4:-}"
  if [ -n "$body" ]; then
    code=$(curl -s -o /tmp/_b -w "%{http_code}" -b "$JAR" -c "$JAR" \
      -X "$m" "$BASE$p" -H 'content-type: application/json' --data "$body")
  else
    code=$(curl -s -o /tmp/_b -w "%{http_code}" -b "$JAR" -c "$JAR" \
      -X "$m" "$BASE$p")
  fi
  echo "$code"
}

login() {
  rm -f "$JAR"; touch "$JAR"
  curl -s -o /dev/null -c "$JAR" \
    -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    --data "{\"identifier\":\"$1\",\"password\":\"$2\"}"
}

# ---------- player self-service ---------------------------------------------
echo "== sprint8: player self-service =="
login "600000004" "123123123"
PID=$(curl -s -b "$JAR" "$BASE/api/auth/me" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && ok "player session" || ko "no session"

c=$(req 400 PATCH "/api/players/$PID/stats" '{"pace":99,"shooting":99,"passing":99,"dribbling":99,"defense":99,"physical":99}')
[ "$c" = "400" ] && ok "PATCH /stats sum 594 → 400" || ko "expected 400, got $c"

c=$(req 200 PATCH "/api/players/$PID/stats" '{"pace":40,"shooting":40,"passing":40,"dribbling":40,"defense":40,"physical":40}')
[ "$c" = "200" ] && ok "PATCH /stats sum 240 → 200" || ko "expected 200, got $c"

c=$(req 200 POST "/api/auth/password" '{"currentPassword":"123123123","newPassword":"secret66","confirmPassword":"secret66"}')
# 204 No Content
[ "$c" = "204" ] && ok "POST /auth/password ok → 204" || ko "expected 204, got $c"

# wrong current pwd
c=$(req 403 POST "/api/auth/password" '{"currentPassword":"WRONG","newPassword":"abcdef","confirmPassword":"abcdef"}')
[ "$c" = "403" ] && ok "wrong current password → 403" || ko "expected 403, got $c"

# revert password
curl -s -b "$JAR" -o /dev/null -X POST "$BASE/api/auth/password" \
  -H 'content-type: application/json' \
  --data '{"currentPassword":"secret66","newPassword":"123123123","confirmPassword":"123123123"}'

c=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/api/players/$PID/achievements")
[ "$c" = "200" ] && ok "GET /achievements → 200" || ko "expected 200, got $c"

# ---------- admin sanctions + awards ----------------------------------------
echo "== sprint8: admin =="
login "base1" "123123123"

# pick a tournament id
TID=$(curl -s -b "$JAR" "$BASE/api/tournaments" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$TID" ] && ok "got tournament id" || note "no tournament — skipping award test"

# block stats
c=$(req 200 PATCH "/api/players/$PID/sanction" '{"canEditStats":false,"reason":"prueba"}')
[ "$c" = "200" ] && ok "sanction lock → 200" || ko "expected 200, got $c"

# self-edit blocked
login "600000004" "123123123"
c=$(req 403 PATCH "/api/players/$PID/stats" '{"pace":40,"shooting":40,"passing":40,"dribbling":40,"defense":40,"physical":40}')
[ "$c" = "403" ] && ok "self-edit while locked → 403" || ko "expected 403, got $c"

# unlock
login "base1" "123123123"
req 200 PATCH "/api/players/$PID/sanction" '{"canEditStats":true}' >/dev/null

# grant mvp
if [ -n "$TID" ]; then
  c=$(req 201 POST "/api/players/$PID/achievements" "{\"kind\":\"mvp\",\"tournamentId\":\"$TID\"}")
  if [ "$c" = "201" ]; then ok "grant mvp → 201"; else ko "expected 201, got $c"; fi
  # idempotency
  c=$(req 409 POST "/api/players/$PID/achievements" "{\"kind\":\"mvp\",\"tournamentId\":\"$TID\"}")
  [ "$c" = "409" ] && ok "duplicate grant → 409" || ko "expected 409, got $c"
fi

# delete (forbidden as non-admin)
login "600000004" "123123123"
c=$(req 403 DELETE "/api/players/$PID")
[ "$c" = "403" ] && ok "non-admin delete → 403" || ko "expected 403, got $c"

echo
echo "sprint8: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
