from __future__ import annotations

import json
import os
import socket
import subprocess
import base64
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import streamlit as st


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
JOB_RESULTS_PATH = DATA_DIR / "job-results.json"
JOB_RUNS_PATH = DATA_DIR / "job-search-runs.json"
APP_STATE_PATH = DATA_DIR / "app-state.json"
PUBLIC_APP_URL = "https://emma-icu-job-search-dashboard.streamlit.app"
GITHUB_REPO = "Hutch2064/emma-icu-job-search-dashboard"
GITHUB_BRANCH = "main"
CENTRAL_TZ = ZoneInfo("America/Chicago")


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
        return parsed.astimezone(CENTRAL_TZ).strftime("%b %-d, %Y %-I:%M %p CT")
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


def write_json(path: Path, value: Any) -> None:
    path.write_text(f"{json.dumps(value, indent=2)}\n")


def secret_value(name: str) -> str | None:
    try:
        value = st.secrets.get(name)
        return str(value) if value else None
    except Exception:
        return None


def github_token() -> str | None:
    return (
        os.environ.get("EMMA_DASHBOARD_GITHUB_TOKEN")
        or os.environ.get("GITHUB_TOKEN")
        or secret_value("EMMA_DASHBOARD_GITHUB_TOKEN")
        or secret_value("GITHUB_TOKEN")
        or secret_value("github_token")
    )


def github_request(url: str, token: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "emma-icu-job-search-dashboard",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def commit_job_results_to_github(jobs: list[dict[str, Any]], token: str) -> None:
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/data/job-results.json?ref={GITHUB_BRANCH}"
    current = github_request(url, token)
    content = f"{json.dumps(jobs, indent=2)}\n"
    payload = {
        "message": "Update Emma job watching status",
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "sha": current["sha"],
        "branch": GITHUB_BRANCH,
    }
    github_request(f"https://api.github.com/repos/{GITHUB_REPO}/contents/data/job-results.json", token, method="PUT", payload=payload)


def set_job_status(job_id: str, status: str) -> tuple[bool, str]:
    current_jobs = read_json(JOB_RESULTS_PATH, [])
    updated = False
    for job in current_jobs:
        if job.get("id") == job_id:
            job["status"] = status
            updated = True
            break

    if not updated:
        return False, "Could not find that role in the ledger."

    try:
        write_json(JOB_RESULTS_PATH, current_jobs)
        if is_public_streamlit_cloud():
            token = github_token()
            if not token:
                return False, "Watching changes need a GitHub write token in Streamlit secrets to persist."
            commit_job_results_to_github(current_jobs, token)
        return True, "Updated."
    except urllib.error.HTTPError as error:
        return False, f"GitHub did not accept the watching update: HTTP {error.code}."
    except Exception as error:
        return False, f"Could not save the watching change: {error}"


def active_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [job for job in jobs if job.get("status") != "archived"]


def render_reason_pills(items: list[str], issue: bool = False) -> None:
    if not items:
        return
    klass = "pill issue" if issue else "pill"
    st.markdown("".join(f'<span class="{klass}">{item}</span>' for item in items), unsafe_allow_html=True)


def render_job_card(job: dict[str, Any]) -> None:
    with st.container(border=True):
        title_col, watch_col = st.columns([0.78, 0.22], vertical_alignment="top")
        with title_col:
            title = job.get("title", "Untitled role")
            url = job.get("url", "")
            st.markdown(f"### [{title}]({url})" if url else f"### {title}")
            st.caption(
                f"{job.get('company', 'Unknown company')} · {job.get('location', 'Unknown location')} · "
                f"Score {job.get('score', 0)} · Last checked {format_dt(job.get('lastSeenAt'))}"
            )
        with watch_col:
            current_watching = job.get("status") == "watching"
            desired_watching = st.checkbox("Watching", value=current_watching, key=f"watch_{job.get('id')}")
            if desired_watching != current_watching:
                ok, message = set_job_status(str(job.get("id")), "watching" if desired_watching else "new")
                st.success("Moved to Watching.") if ok else st.error(message)
                st.rerun()

        render_reason_pills(job.get("reasons") or [])
        render_reason_pills(job.get("concerns") or [], issue=True)
        if job.get("notes"):
            st.caption(str(job["notes"]))
        st.caption(f"Source: {job.get('source', 'Unknown')}")


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
public_cloud = is_public_streamlit_cloud()
visible_jobs = active_jobs(jobs)
watching_jobs = [job for job in visible_jobs if job.get("status") == "watching"]
tracked_jobs = [job for job in visible_jobs if job.get("status") != "watching"]

st.title("Emma ICU Job Search Dashboard")
st.caption("Public Streamlit dashboard reading Emma's checked-in job-search ledger.")

with st.sidebar:
    st.header("Controls")
    st.write("Search area: **Dallas + roughly 50 miles**")
    st.caption("Includes nearby Dallas-area cities such as Fort Worth, Denton, McKinney, Waxahachie, Terrell, Burleson, and surrounding suburbs when official postings expose those locations.")

    st.divider()
    if public_cloud:
        st.caption("Data updates when the job-search ledger is refreshed and pushed to GitHub.")
        if not github_token():
            st.caption("Watching changes require a GitHub write secret before they can persist.")
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

    if not public_cloud:
        st.divider()
        st.caption(f"Ledger: `{JOB_RESULTS_PATH}`")
        st.caption(f"Runs: `{JOB_RUNS_PATH}`")

metric_cols = st.columns([1, 2])
metric_cols[0].metric("Tracked roles", len(visible_jobs))
metric_cols[1].metric("Latest run", format_dt(latest_run.get("ranAt") if latest_run else None))

if latest_run:
    tone = "error" if latest_run.get("status") == "error" else "info"
    getattr(st, tone)(
        f"{latest_run.get('summary', 'Latest run recorded.')} "
        f"New roles: {latest_run.get('newJobsCount', 0)}. "
        f"Total tracked: {latest_run.get('totalTrackedJobs', len(jobs))}."
    )

st.subheader("Watching")
if watching_jobs:
    for job in watching_jobs:
        render_job_card(job)
else:
    st.caption("No roles are marked Watching yet. Check Watching on any tracked role below to move it here.")

st.subheader("Tracked Roles")
st.caption(f"Showing {len(tracked_jobs)} active tracked role{len(tracked_jobs) == 1 and '' or 's'}.")
for job in tracked_jobs:
    render_job_card(job)

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
