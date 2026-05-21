#!/usr/bin/env bash
# Wrapper so the cron prompt can shell out to a single command.
set -u
cd "$(dirname "$0")/.."
export BASE="${BASE:-http://127.0.0.1:4010}"
echo "[run.sh] BASE=$BASE"
node validation/run.mjs
exit $?
