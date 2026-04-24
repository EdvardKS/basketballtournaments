#!/usr/bin/env bash
# Conditionally load example seed data.
# Controlled by env var EXAMPLE_DATA (default: true).
#   EXAMPLE_DATA=true   → schema + seeds (dev-friendly demo data)
#   EXAMPLE_DATA=false  → schema only (production / fresh install)
#
# Seed SQL files are mounted at /seeds/ (read-only) via docker-compose volume.

set -euo pipefail

EXAMPLE_DATA="${EXAMPLE_DATA:-true}"
echo "[seed] EXAMPLE_DATA=$EXAMPLE_DATA"

if [ "$EXAMPLE_DATA" != "true" ]; then
  echo "[seed] skipping example data (production mode)"
  exit 0
fi

if [ ! -d /seeds ]; then
  echo "[seed] /seeds directory not mounted — nothing to load"
  exit 0
fi

shopt -s nullglob
for f in /seeds/*.sql; do
  echo "[seed] loading $f"
  psql --set ON_ERROR_STOP=0 -v ON_ERROR_STOP=0 \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
echo "[seed] done"
