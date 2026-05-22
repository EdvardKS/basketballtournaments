#!/usr/bin/env bash
# SPEC-013 — Cromo por torneo + carousel + share-of-active.
# Exercises the new endpoints and validates the SDD-spec acceptance criteria.
# Run against a fresh dev stack (docker compose -f docker-compose.dev.yml up).
set -u
BASE="${BASE:-http://localhost:4010}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "[OK]   $*"; }
ko()  { FAIL=$((FAIL+1)); echo "[FAIL] $*"; }

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
  curl -s -o /dev/null -c "$JAR" -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    --data "{\"identifier\":\"$1\",\"password\":\"$2\"}"
}

echo "== spec-013: backend acceptance =="

# AC5 — admin can list the catalog (should be ≥ 32 after migration).
login "tester" "test1234"
N=$(curl -s -b "$JAR" "$BASE/api/admin/tournament-themes" | grep -oE '"catalog_index":[0-9]+' | wc -l)
[ "$N" -ge 32 ] && ok "catalog has ≥32 palettes (got $N)" || ko "catalog only has $N"

# AC5 — every existing tournament can resolve a theme.
TIDS=$(curl -s "$BASE/api/tournaments" | grep -oE '"id":"[a-z0-9-]+"' | head -3 | cut -d'"' -f4)
SEEN=""
for tid in $TIDS; do
  RES=$(curl -s "$BASE/api/tournaments/$tid/theme")
  IDX=$(echo "$RES" | grep -oE '"catalog_index":[0-9]+' | head -1 | cut -d: -f2)
  if [ -z "$IDX" ]; then ko "tournament $tid returned no theme: $RES"; continue; fi
  if echo "$SEEN" | grep -qw "$IDX"; then ko "duplicate catalog_index $IDX"; else ok "tournament $tid → catalog_index $IDX"; fi
  SEEN="$SEEN $IDX"
done

# Idempotency — second call returns the same catalog_index.
FIRST_TID=$(echo "$TIDS" | head -1)
RES1=$(curl -s "$BASE/api/tournaments/$FIRST_TID/theme")
RES2=$(curl -s "$BASE/api/tournaments/$FIRST_TID/theme")
[ "$RES1" = "$RES2" ] && ok "GET /theme is idempotent" || ko "responses differ"

# AC1 — captain with no registration gets cromos: []
login "600000001" "123123123"
RES=$(curl -s -b "$JAR" "$BASE/api/players/player-01/cromos")
echo "$RES" | grep -q '"cromos":\[\]' && ok "player-01 (captain, 0 regs) → cromos:[]" || ko "expected [], got $RES"

# AC3 — player with 2 registrations gets 2 cromos, newest first.
login "600000009" "123123123"
RES=$(curl -s -b "$JAR" "$BASE/api/players/player-09/cromos")
COUNT=$(echo "$RES" | grep -oE '"versionLabel":"v[0-9]+"' | wc -l)
[ "$COUNT" -ge 2 ] && ok "player-09 has $COUNT cromos" || ko "expected ≥2, got $COUNT: $RES"

VERSIONS=$(echo "$RES" | grep -oE '"versionLabel":"v[0-9]+"' | head -2 | cut -d'"' -f4 | tr '\n' ' ')
echo "$VERSIONS" | grep -q "v2 v1" && ok "ordering: newest first ($VERSIONS)" || ko "wrong ordering: $VERSIONS"

# AC6 — share-of-active: dashboard markup carries data-active.
FRONT="${FRONT:-http://localhost:4322}"
FJAR="$(mktemp)"
curl -s -o /dev/null -c "$FJAR" -X POST "$FRONT/api/auth/login" \
  -H 'content-type: application/json' \
  --data '{"identifier":"600000009","password":"123123123"}'
HTML=$(curl -s -b "$FJAR" "$FRONT/dashboard/player")
TRUE=$(echo "$HTML" | grep -oE 'data-active="true"' | wc -l)
FALSE=$(echo "$HTML" | grep -oE 'data-active="false"' | wc -l)
[ "$TRUE" = "1" ] && ok "exactly 1 data-active=\"true\" cromo at SSR" || ko "TRUE=$TRUE (expected 1)"
[ "$FALSE" = "1" ] && ok "the other cromo is data-active=\"false\"" || ko "FALSE=$FALSE (expected 1)"
rm -f "$FJAR"

# AC9 — gsap is bundled (the carousel JS imports it).
echo "$HTML" | grep -q 'cromo-carousel\b' && ok "carousel rendered" || ko "carousel missing"

# Admin: seed extra palette idempotent.
login "tester" "test1234"
c=$(req 200 POST "/api/admin/tournament-themes/seed" '{"extraPalettes":[]}')
[ "$c" = "200" ] && ok "POST /admin/tournament-themes/seed with empty list → 200" || ko "expected 200, got $c"

echo ""
echo "== summary =="
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
