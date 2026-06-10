import path from "node:path";

export const workspaceRoot = process.cwd();

export const careerContextPath =
  process.env.CAREER_CONTEXT_PATH ??
  "/Users/aidanhutchison/Desktop/Emma Job Search/codex_career_context.md";
export const resumePath =
  process.env.RESUME_PATH ?? "/Users/aidanhutchison/Desktop/Emma Job Search/Emma Resume.docx";

export const dataDir = path.join(workspaceRoot, "data");
export const appStatePath = path.join(dataDir, "app-state.json");
export const jobResultsPath = path.join(dataDir, "job-results.json");
export const jobRunsPath = path.join(dataDir, "job-search-runs.json");
export const codexRunStatusPath = path.join(dataDir, "codex-run-status.json");
export const codexRunLogPath = path.join(dataDir, "codex-automation-run.log");

export const automationId = "emma-icu-dfw-job-search-scan";
export const automationFolderPath = path.join(
  process.env.CODEX_HOME ?? "/Users/aidanhutchison/.codex",
  "automations",
  automationId,
);
export const automationTomlPath = path.join(automationFolderPath, "automation.toml");
