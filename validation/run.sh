#!/usr/bin/env bash
# Wrapper so the cron prompt can shell out to a single command.
set -u
cd "$(dirname "$0")/.."
BASE="${BASE:-http://localhost:4000}"
echo "[run.sh] BASE=$BASE"
node validation/run.mjs
exit $?
