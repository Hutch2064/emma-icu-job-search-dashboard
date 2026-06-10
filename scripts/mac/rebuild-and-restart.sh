#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/aidanhutchison/Documents/New project 3"
LABEL="com.emma.icu-job-search-dashboard"

export PATH="/Users/aidanhutchison/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
export NEXT_TELEMETRY_DISABLED=1

cd "$PROJECT_DIR"
npm run build

if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/$LABEL"
fi

open "http://localhost:3001"
