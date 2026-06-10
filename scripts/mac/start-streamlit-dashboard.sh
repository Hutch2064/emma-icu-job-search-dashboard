#!/bin/zsh
set -euo pipefail

cd "/Users/aidanhutchison/Documents/New project 3"

if [ ! -d ".venv-streamlit" ]; then
  python3 -m venv .venv-streamlit
fi

source ".venv-streamlit/bin/activate"
python -m pip install --upgrade pip >/dev/null
python -m pip install -r requirements.txt >/dev/null

echo "Emma ICU Job Search Streamlit dashboard"
echo "Local URL:   http://localhost:8501"
echo "Network URL: http://$(ipconfig getifaddr en0 2>/dev/null || echo localhost):8501"

exec streamlit run streamlit_app.py --server.headless true --server.address 0.0.0.0 --server.port 8501 --browser.gatherUsageStats false
