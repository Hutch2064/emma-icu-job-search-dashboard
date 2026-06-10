#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/aidanhutchison/Documents/New project 3"

export PATH="/Users/aidanhutchison/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

cd "$PROJECT_DIR"
exec npm run automation:run-now
