#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/aidanhutchison/Documents/New project 3"
PORT="${PORT:-3001}"

export PATH="/Users/aidanhutchison/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
export NEXT_TELEMETRY_DISABLED=1

cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
  npm install
fi

if [ ! -f ".next/BUILD_ID" ]; then
  npm run build
fi

exec npm run start -- -H 127.0.0.1 -p "$PORT"
