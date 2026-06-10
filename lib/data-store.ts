import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  appStatePath,
  automationFolderPath,
  automationTomlPath,
  codexRunStatusPath,
  careerContextPath,
  dataDir,
  jobResultsPath,
  jobRunsPath,
  resumePath,
} from "@/lib/paths";
import { readAutomationStatus, setAutomationStatus } from "@/lib/automation";
import { readCareerContext } from "@/lib/career-context";
import { readResumeContext } from "@/lib/resume-context";
import type { AppState, CodexRunStatus, DashboardData, JobResult, SearchRun } from "@/lib/types";

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, value: T): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function defaultAppState(): AppState {
  return {
    automation: {
      id: "emma-icu-dfw-job-search-scan",
      name: "Emma ICU Dallas-Area Job Search Scan",
      enabled: true,
      codexAutomationPath: automationTomlPath,
      automationFolderPath,
      scheduleLabel: "Daily at 8:15 AM Central",
    },
    contextPath: careerContextPath,
    resumePath,
  };
}

export function defaultCodexRunStatus(): CodexRunStatus {
  return {
    state: "idle",
    summary: "No manual Emma Codex automation run has been started from this dashboard yet.",
  };
}

export async function ensureDataFiles(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await Promise.all([
    fs
      .access(appStatePath)
      .catch(() => writeJson(appStatePath, defaultAppState())),
    fs.access(jobResultsPath).catch(() => writeJson<JobResult[]>(jobResultsPath, [])),
    fs.access(jobRunsPath).catch(() => writeJson<SearchRun[]>(jobRunsPath, [])),
    fs.access(codexRunStatusPath).catch(() => writeJson(codexRunStatusPath, defaultCodexRunStatus())),
  ]);
}

export async function readDashboardData(): Promise<DashboardData> {
  await ensureDataFiles();
  const appState = await readJson(appStatePath, defaultAppState());
  const [context, resume, jobs, runs, codexRunStatus, automationStatus] = await Promise.all([
    readCareerContext(appState.contextPath),
    readResumeContext(appState.resumePath),
    readJson<JobResult[]>(jobResultsPath, []),
    readJson<SearchRun[]>(jobRunsPath, []),
    readJson<CodexRunStatus>(codexRunStatusPath, defaultCodexRunStatus()),
    readAutomationStatus(appState.automation.codexAutomationPath),
  ]);

  return {
    context,
    resume,
    jobs,
    runs: runs.sort((a, b) => b.ranAt.localeCompare(a.ranAt)).slice(0, 20),
    codexRunStatus,
    appState,
    automationStatus,
    generatedAt: new Date().toISOString(),
  };
}

export async function readJobResults(): Promise<JobResult[]> {
  await ensureDataFiles();
  return readJson<JobResult[]>(jobResultsPath, []);
}

export async function writeJobResults(jobs: JobResult[]): Promise<void> {
  await writeJson(jobResultsPath, jobs);
}

export async function readSearchRuns(): Promise<SearchRun[]> {
  await ensureDataFiles();
  return readJson<SearchRun[]>(jobRunsPath, []);
}

export async function writeSearchRuns(runs: SearchRun[]): Promise<void> {
  await writeJson(jobRunsPath, runs);
}

export async function updateAutomationEnabled(enabled: boolean): Promise<{
  appState: AppState;
  automationStatus: string;
}> {
  await ensureDataFiles();
  const appState = await readJson(appStatePath, defaultAppState());
  const automationStatus = await setAutomationStatus(appState.automation.codexAutomationPath, enabled);
  const nextState: AppState = {
    ...appState,
    automation: {
      ...appState.automation,
      enabled: automationStatus === "ACTIVE",
    },
  };
  await writeJson(appStatePath, nextState);
  return { appState: nextState, automationStatus };
}

export async function openAutomationFolder(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("open", [automationFolderPath], { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`open exited with code ${code}`));
    });
  });
}
