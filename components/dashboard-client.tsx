"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CirclePause,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { buildScanFeedback, formatScanSourceLabel, getScanSourceHref, type ScanFeedback } from "@/lib/scan-feedback";
import type { DashboardData, JobResult, SearchRun } from "@/lib/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(data: DashboardData): {
  label: string;
  tone: "good" | "paused" | "unknown";
} {
  if (data.automationStatus === "ACTIVE") return { label: "Codex automation active", tone: "good" };
  if (data.automationStatus === "PAUSED") return { label: "Codex automation paused", tone: "paused" };
  return { label: "Codex automation not created yet", tone: "unknown" };
}

export function getLedgerJobs(jobs: JobResult[]): JobResult[] {
  return [...jobs].sort((a, b) => b.score - a.score);
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState<"toggle" | "refresh" | "scan" | "codex" | "open" | null>(null);
  const [scanNotice, setScanNotice] = useState<ScanFeedback | null>(null);
  const status = statusLabel(data);
  const latestRun = data.runs[0];
  const latestRunFeedback = latestRun ? buildScanFeedback(latestRun) : null;
  const latestRunSources = latestRun?.searchedSources ?? [];
  const latestRunSourceLinks = latestRunSources.map((source) => ({
    href: getScanSourceHref(source),
    label: formatScanSourceLabel(source),
  }));
  const active = data.automationStatus === "ACTIVE";
  const dallasAreaSearches = data.context.searchStrings.dfw.slice(0, 12);
  const jobs = useMemo(() => getLedgerJobs(data.jobs), [data.jobs]);
  const resumeLocation = data.resume.locationLine.split("|")[0]?.trim() ?? data.context.profile.location;
  const resumeExperience = data.resume.experience.slice(0, 3);

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    setData((await response.json()) as DashboardData);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshDashboard().catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  async function refresh() {
    setBusy("refresh");
    try {
      await refreshDashboard();
    } finally {
      setBusy(null);
    }
  }

  async function toggleAutomation() {
    setBusy("toggle");
    try {
      await fetch("/api/automation", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !active }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function scanNow() {
    setBusy("scan");
    setScanNotice(null);
    try {
      const response = await fetch("/api/scan", { method: "POST" });
      const result = (await response.json()) as { run: SearchRun };
      setScanNotice(buildScanFeedback(result.run));
      await refresh();
    } catch {
      setScanNotice({
        tone: "error",
        title: "Scan failed",
        detail: "The dashboard could not reach the local scan API. Check that the local server is running.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function runCodexAutomation() {
    setBusy("codex");
    try {
      await fetch("/api/automation/run", { method: "POST" });
      await refreshDashboard();
    } finally {
      setBusy(null);
    }
  }

  async function openAutomation() {
    setBusy("open");
    try {
      await fetch("/api/automation/open", { method: "POST" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="shell">
      <section className="topbar" aria-label="Dashboard header">
        <div>
          <p className="eyebrow">Private local dashboard</p>
          <h1>Emma ICU Job Search Platform</h1>
          <p className="positioning">{data.context.positioning}</p>
        </div>
        <div className="topActions">
          <button className="iconButton" onClick={refresh} disabled={busy !== null} title="Refresh dashboard">
            {busy === "refresh" ? <Loader2 className="spin" /> : <RefreshCw />}
          </button>
          <button className="secondaryButton" onClick={openAutomation} disabled={busy !== null}>
            {busy === "open" ? <Loader2 className="spin" /> : <FolderOpen />}
            Codex automation
          </button>
          <button className="secondaryButton" onClick={runCodexAutomation} disabled={busy !== null}>
            {busy === "codex" ? <Loader2 className="spin" /> : <Radar />}
            Run Codex
          </button>
          <button className="primaryButton" onClick={scanNow} disabled={busy !== null}>
            {busy === "scan" ? <Loader2 className="spin" /> : <Search />}
            {busy === "scan" ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </section>

      {scanNotice ? (
        <section className={`scanNotice ${scanNotice.tone}`} role="status" aria-live="polite">
          <strong>{scanNotice.title}</strong>
          <span>{scanNotice.detail}</span>
        </section>
      ) : null}

      <section className="statusGrid" aria-label="Job search status">
        <article className={`panel automationPanel ${status.tone}`}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Automation</p>
              <h2>{status.label}</h2>
            </div>
            <button
              className={`toggle ${active ? "on" : "off"}`}
              onClick={toggleAutomation}
              disabled={busy !== null || data.automationStatus === "UNKNOWN"}
              aria-pressed={active}
              title="Toggle Codex automation"
            >
              {busy === "toggle" ? <Loader2 className="spin" /> : active ? <ToggleRight /> : <ToggleLeft />}
              <span>{active ? "On" : "Off"}</span>
            </button>
          </div>
          <div className="metricRow">
            <div>
              <span>Schedule</span>
              <strong>{data.appState.automation.scheduleLabel}</strong>
            </div>
            <div>
              <span>Tracked roles</span>
              <strong>{data.jobs.length}</strong>
            </div>
            <div>
              <span>Latest run</span>
              <strong>{latestRun ? formatDate(latestRun.ranAt) : "None"}</strong>
            </div>
          </div>
          <div className={`codexRunStatus ${data.codexRunStatus.state}`}>
            <strong>Manual Codex run</strong>
            <span>{data.codexRunStatus.summary}</span>
          </div>
        </article>

        <article className="panel runPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Last report</p>
              <h2>{latestRun?.summary ?? "No search run recorded yet."}</h2>
              {latestRun && latestRunFeedback ? (
                <p className="runMeta">
                  Last checked {formatDate(latestRun.ranAt)} · {latestRunFeedback.detail}
                </p>
              ) : null}
            </div>
            {latestRun?.newJobsCount ? <CheckCircle2 className="statusIcon goodIcon" /> : <CirclePause className="statusIcon" />}
          </div>
          <p className="pathText">{data.appState.automation.codexAutomationPath}</p>
        </article>
      </section>

      <section className="mainGrid">
        <article className="panel contextPanel">
          <div className="sectionTitle">
            <FileText />
            <div>
              <p className="eyebrow">Career context</p>
              <h2>{data.context.profile.name}</h2>
            </div>
          </div>
          <dl className="profileList">
            <div>
              <dt>Location</dt>
              <dd>{data.context.profile.location}</dd>
            </div>
            <div>
              <dt>Resume</dt>
              <dd>{data.context.profile.graduation || "Pending"}</dd>
            </div>
            <div>
              <dt>Primary timing</dt>
              <dd>{data.context.timing.primaryGoal}</dd>
            </div>
          </dl>
          <p className="projectText">{data.context.profile.project}</p>
          <div className="tagGroup">
            {data.context.targetRoles.slice(0, 7).map((role) => (
              <span className="tag strong" key={role}>
                {role}
              </span>
            ))}
          </div>
        </article>

        <article className="panel resumePanel">
          <div className="sectionTitle">
            <FileText />
            <div>
              <p className="eyebrow">Resume context</p>
              <h2>{resumeLocation}</h2>
            </div>
          </div>
          <p className="projectText">{data.resume.education}</p>
          <div className="resumeSignals">
            {data.resume.signals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          <div className="experienceList">
            {resumeExperience.map((item) => (
              <div className="experienceRow" key={`${item.organization}-${item.title}`}>
                <strong>{item.organization}</strong>
                <p>
                  {item.title}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="tagGroup resumeTags">
            {[...data.resume.skills.investment.slice(0, 5), ...data.resume.skills.technical.slice(0, 5)].map((skill) => (
              <span className="tag" key={skill}>
                {skill}
              </span>
            ))}
          </div>
          <p className="pathText">{data.resume.sourcePath}</p>
        </article>

        <article className="panel guardrailPanel">
          <div className="sectionTitle">
            <ShieldCheck />
            <div>
              <p className="eyebrow">Fit rules</p>
              <h2>What the platform should favor and reject</h2>
            </div>
          </div>
          <div className="ruleColumns">
            <div>
              <h3>Prefer</h3>
              <ul>
                {data.context.preferred.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Avoid</h3>
              <ul>
                {data.context.avoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section className="wideGrid">
        <article className="panel jobsPanel">
          <div className="sectionTitle">
            <BriefcaseBusiness />
            <div>
              <p className="eyebrow">Results ledger</p>
              <h2>{data.jobs.length > 0 ? "All tracked roles by score" : "No tracked roles yet"}</h2>
            </div>
          </div>
          {jobs.length > 0 ? (
            <div className="jobList">
              {jobs.map((job) => (
                <a className="jobRow" href={job.url} target="_blank" rel="noreferrer" key={job.id}>
                  <div className="score">{job.score}</div>
                  <div>
                    <h3>{job.title}</h3>
                    <p>
                      {job.company} · {job.location}
                    </p>
                    <span>{job.reasons[0]}</span>
                    <div className="jobMeta">
                      <em>{job.source}</em>
                      <em>Open posting</em>
                    </div>
                  </div>
                  <ExternalLink />
                </a>
              ))}
            </div>
          ) : (
            <p className="emptyText">The first Codex or local scan will populate this section when it finds open Dallas-area ICU roles.</p>
          )}
        </article>

        <article className="panel scanSummaryPanel">
          <div className="sectionTitle">
            <Radar />
            <div>
              <p className="eyebrow">Latest scan</p>
              <h2>{latestRun ? "Result-based search summary" : "No scan recorded yet"}</h2>
            </div>
          </div>
          <div className="scanMetricList">
            <div className="scanMetric">
              <span>Sources checked</span>
              <strong>{latestRunSources.length}</strong>
            </div>
            <div className="scanMetric">
              <span>New roles</span>
              <strong>{latestRun?.newJobsCount ?? 0}</strong>
            </div>
            <div className="scanMetric">
              <span>Total tracked</span>
              <strong>{latestRun?.totalTrackedJobs ?? data.jobs.length}</strong>
            </div>
          </div>
          <p className="scanSummaryText">{latestRun?.summary ?? "Run the first scan to populate search output."}</p>
          <div className="sourceRows" aria-label="Latest scan sources">
            {latestRunSourceLinks.length > 0 ? (
              latestRunSourceLinks.map((source) => (
                <a
                  className={`sourceRow${source.href ? "" : " disabled"}`}
                  href={source.href ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  key={source.label}
                  aria-disabled={source.href ? undefined : true}
                >
                  <span>{source.label}</span>
                  {source.href ? <ExternalLink /> : null}
                </a>
              ))
            ) : (
              <span className="sourceRow disabled">No sources recorded</span>
            )}
          </div>
        </article>
      </section>

      <section className="wideGrid bottomGrid">
        <article className="panel searchPanel">
          <div className="sectionTitle">
            <Target />
            <div>
              <p className="eyebrow">Search strings</p>
              <h2>Dallas-area ICU scans</h2>
            </div>
          </div>
          <div className="tagColumns">
            <div>
              <h3>Dallas 50-mile area ICU nursing</h3>
              <div className="tagGroup">
                {dallasAreaSearches.map((term) => (
                  <span className="tag" key={term}>
                    {term}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="panel runsPanel">
          <div className="sectionTitle">
            <Activity />
            <div>
              <p className="eyebrow">Run history</p>
              <h2>Automation output for the dashboard</h2>
            </div>
          </div>
          <div className="runList">
            {data.runs.slice(0, 6).map((run) => (
              <div className="runRow" key={run.id}>
                <Bell />
                <div>
                  <h3>{formatDate(run.ranAt)}</h3>
                  <p>{run.summary}</p>
                </div>
                <strong>{run.newJobsCount}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
