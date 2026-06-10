#!/bin/zsh
set -euo pipefail

URL="http://localhost:3001"
LABEL="com.emma.icu-job-search-dashboard"
PROJECT_DIR="/Users/aidanhutchison/Documents/New project 3"
LOG_DIR="/Users/aidanhutchison/Library/Logs"

server_ready() {
  curl -fsS "$URL/api/dashboard" >/dev/null 2>&1
}

if ! server_ready; then
  if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
    launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  else
    mkdir -p "$LOG_DIR"
    nohup "$PROJECT_DIR/scripts/mac/start-dashboard.sh" \
      > "$LOG_DIR/emma-icu-job-search-dashboard.log" \
      2> "$LOG_DIR/emma-icu-job-search-dashboard.err.log" &
  fi

  for _ in {1..30}; do
    if server_ready; then
      break
    fi
    sleep 0.5
  done
fi

open "$URL"
