from __future__ import annotations

import json
import os
import socket
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

import streamlit as st


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
JOB_RESULTS_PATH = DATA_DIR / "job-results.json"
JOB_RUNS_PATH = DATA_DIR / "job-search-runs.json"
APP_STATE_PATH = DATA_DIR / "app-state.json"
PUBLIC_APP_URL = "https://emma-icu-job-search-dashboard.streamlit.app"


def is_public_streamlit_cloud() -> bool:
    return str(ROOT).startswith("/mount/src") or bool(os.environ.get("STREAMLIT_CLOUD"))


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def format_dt(value: str | None) -> str:
    if not value:
        return "Not recorded"
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.strftime("%b %-d, %Y %I:%M %p")
    except Exception:
        return value


def local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except Exception:
        return "localhost"


def run_local_scan() -> tuple[bool, str]:
    completed = subprocess.run(
        ["npm", "run", "scan:local"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )
    output = "\n".join(part for part in [completed.stdout.strip(), completed.stderr.strip()] if part)
    return completed.returncode == 0, output or "Scan finished with no console output."


def load_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    jobs = read_json(JOB_RESULTS_PATH, [])
    runs = read_json(JOB_RUNS_PATH, [])
    app_state = read_json(APP_STATE_PATH, {})
    jobs = sorted(jobs, key=lambda item: (-int(item.get("score", 0)), item.get("company", ""), item.get("title", "")))
    runs = sorted(runs, key=lambda item: item.get("ranAt", ""), reverse=True)
    return jobs, runs, app_state


def status_counts(jobs: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for job in jobs:
        status = str(job.get("status", "unknown"))
        counts[status] = counts.get(status, 0) + 1
    return counts


st.set_page_config(
    page_title="Emma ICU Job Search Dashboard",
    layout="wide",
)

st.markdown(
    """
    <style>
    .block-container { padding-top: 1.35rem; padding-bottom: 2.5rem; max-width: 1400px; }
    h1, h2, h3 { letter-spacing: 0; }
    .metric-card {
        border: 1px solid #d9dfd8;
        border-radius: 8px;
        padding: 14px 16px;
        background: #ffffff;
    }
    .job-card {
        border: 1px solid #d9dfd8;
        border-radius: 8px;
        padding: 14px 16px;
        margin-bottom: 12px;
        background: #ffffff;
    }
    .job-meta { color: #5d6a64; font-size: 0.92rem; margin-bottom: 6px; }
    .small-muted { color: #5d6a64; font-size: 0.88rem; }
    .pill {
        display: inline-block;
        border: 1px solid #d9dfd8;
        border-radius: 999px;
        padding: 2px 8px;
        margin: 0 5px 5px 0;
        font-size: 0.82rem;
        color: #17201b;
        background: #f9faf7;
    }
    .issue { color: #8a3a2b; }
    </style>
    """,
    unsafe_allow_html=True,
)

jobs, runs, app_state = load_data()
latest_run = runs[0] if runs else None
counts = status_counts(jobs)
public_cloud = is_public_streamlit_cloud()

st.title("Emma ICU Job Search Dashboard")
st.caption("Public Streamlit dashboard reading Emma's checked-in job-search ledger.")

with st.sidebar:
    st.header("Controls")
    st.write("Search area: **Dallas + roughly 50 miles**")
    st.caption("Includes nearby Dallas-area cities such as Fort Worth, Denton, McKinney, Waxahachie, Terrell, Burleson, and surrounding suburbs when official postings expose those locations.")

    st.divider()
    if public_cloud:
        st.link_button("Open public dashboard", PUBLIC_APP_URL, use_container_width=True)
        st.caption("Data updates when the job-search ledger is refreshed and pushed to GitHub.")
    else:
        if st.button("Run local scan", type="primary", use_container_width=True):
            with st.spinner("Running npm run scan:local..."):
                ok, output = run_local_scan()
            st.success("Scan completed.") if ok else st.error("Scan finished with source issues.")
            st.code(output, language="text")
            st.rerun()

        ip = local_ip()
        st.write("Open from another computer on the same Wi-Fi:")
        st.code(f"http://{ip}:8501", language="text")
        st.caption("Leave this Mac awake and Streamlit running.")

    st.divider()
    st.caption(f"Ledger: `{JOB_RESULTS_PATH}`")
    st.caption(f"Runs: `{JOB_RUNS_PATH}`")

metric_cols = st.columns(4)
metric_cols[0].metric("Tracked roles", len(jobs))
metric_cols[1].metric("New", counts.get("new", 0))
metric_cols[2].metric("Watching", counts.get("watching", 0))
metric_cols[3].metric("Latest run", format_dt(latest_run.get("ranAt") if latest_run else None))

if latest_run:
    tone = "error" if latest_run.get("status") == "error" else "info"
    getattr(st, tone)(
        f"{latest_run.get('summary', 'Latest run recorded.')} "
        f"New roles: {latest_run.get('newJobsCount', 0)}. "
        f"Total tracked: {latest_run.get('totalTrackedJobs', len(jobs))}."
    )

st.subheader("Results Ledger")

filter_cols = st.columns([1.2, 1, 1, 1])
query = filter_cols[0].text_input("Search title, company, location, notes", "")
available_statuses = sorted({str(job.get("status", "unknown")) for job in jobs})
statuses = filter_cols[1].multiselect("Status", available_statuses, default=available_statuses)
min_score = filter_cols[2].slider("Minimum score", 0, 100, 0)
sort_mode = filter_cols[3].selectbox("Sort", ["Score", "Newest seen", "Company"], index=0)

filtered = []
query_norm = query.strip().lower()
for job in jobs:
    haystack = " ".join(
        str(job.get(field, ""))
        for field in ["title", "company", "location", "source", "notes", "status"]
    ).lower()
    if query_norm and query_norm not in haystack:
        continue
    if statuses and str(job.get("status", "unknown")) not in statuses:
        continue
    if int(job.get("score", 0)) < min_score:
        continue
    filtered.append(job)

if sort_mode == "Newest seen":
    filtered.sort(key=lambda item: item.get("lastSeenAt", ""), reverse=True)
elif sort_mode == "Company":
    filtered.sort(key=lambda item: (item.get("company", ""), item.get("title", "")))
else:
    filtered.sort(key=lambda item: (-int(item.get("score", 0)), item.get("company", "")))

st.caption(f"Showing {len(filtered)} of {len(jobs)} tracked roles.")

for job in filtered:
    with st.container():
        st.markdown('<div class="job-card">', unsafe_allow_html=True)
        title = job.get("title", "Untitled role")
        url = job.get("url", "")
        company = job.get("company", "Unknown company")
        location = job.get("location", "Unknown location")
        st.markdown(f"### [{title}]({url})" if url else f"### {title}")
        st.markdown(
            f'<div class="job-meta"><strong>{company}</strong> · {location} · '
            f'Score {job.get("score", 0)} · {job.get("status", "unknown")} · '
            f'Last seen {format_dt(job.get("lastSeenAt"))}</div>',
            unsafe_allow_html=True,
        )
        reasons = job.get("reasons") or []
        concerns = job.get("concerns") or []
        if reasons:
            st.markdown("".join(f'<span class="pill">{reason}</span>' for reason in reasons), unsafe_allow_html=True)
        if concerns:
            st.markdown(
                "".join(f'<span class="pill issue">{concern}</span>' for concern in concerns),
                unsafe_allow_html=True,
            )
        if job.get("notes"):
            st.caption(str(job["notes"]))
        st.markdown(f'<div class="small-muted">Source: {job.get("source", "Unknown")}</div>', unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

with st.expander("Run History", expanded=False):
    if not runs:
        st.write("No search runs recorded yet.")
    for run in runs[:30]:
        st.markdown(f"**{format_dt(run.get('ranAt'))}** · `{run.get('status')}`")
        st.write(run.get("summary", "No summary."))
        sources = run.get("searchedSources") or []
        if sources:
            st.caption("Sources: " + ", ".join(sources))

with st.expander("Fit Rules", expanded=False):
    st.write("Included: full-time employee ICU or critical-care nursing roles within roughly 50 miles of Dallas.")
    st.write("Excluded: travel, contract, temporary, per diem, PRN-only, agency, outpatient-only, home health, hospice, case management, utilization review, telephone triage, remote-only, closed, or clearly outside-area postings.")
    if app_state:
        st.caption(f"Automation: {app_state.get('automation', {}).get('name', 'Emma job search automation')}")
