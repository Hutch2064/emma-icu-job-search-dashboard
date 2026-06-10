import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { parse } from "smol-toml";
import { automationTomlPath, codexRunLogPath, codexRunStatusPath, workspaceRoot } from "@/lib/paths";
import type { CodexRunStatus } from "@/lib/types";

async function writeStatus(status: CodexRunStatus) {
  await fs.writeFile(codexRunStatusPath, `${JSON.stringify(status, null, 2)}\n`);
}

const startedAt = new Date().toISOString();
const logHeader = `Manual Codex automation run started at ${startedAt}\nAutomation file: ${automationTomlPath}\n\n`;

await writeStatus({
  state: "running",
  startedAt,
  summary: "Manual Codex automation run is running now. Refresh this dashboard to see updated results.",
  logPath: codexRunLogPath,
});
await fs.writeFile(codexRunLogPath, logHeader);

const automationToml = await fs.readFile(automationTomlPath, "utf8");
const automation = parse(automationToml) as { prompt?: unknown; model?: unknown };
const prompt = typeof automation.prompt === "string" ? automation.prompt : "";
const model = typeof automation.model === "string" ? automation.model : "gpt-5.5";

if (!prompt.trim()) {
  const finishedAt = new Date().toISOString();
  await writeStatus({
    state: "failed",
    startedAt,
    finishedAt,
    summary: "Manual Codex automation run failed because the automation prompt could not be read.",
    logPath: codexRunLogPath,
  });
  process.exit(1);
}

const child = spawn(
  "codex",
  [
    "exec",
    "--dangerously-bypass-approvals-and-sandbox",
    "-m",
    model,
    "-C",
    workspaceRoot,
    "--add-dir",
    "/Users/aidanhutchison/Desktop/Emma Job Search",
    "-",
  ],
  {
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
  },
);

child.stdin.write(prompt);
child.stdin.end();

const logHandle = await fs.open(codexRunLogPath, "a");

child.stdout.on("data", (chunk: Buffer) => {
  void logHandle.write(chunk);
});
child.stderr.on("data", (chunk: Buffer) => {
  void logHandle.write(chunk);
});

const exitCode = await new Promise<number | null>((resolve) => {
  child.on("close", resolve);
});

await logHandle.close();

const finishedAt = new Date().toISOString();
if (exitCode === 0) {
  await writeStatus({
    state: "completed",
    startedAt,
    finishedAt,
    summary: "Manual Codex automation run completed. Refresh the dashboard if results did not update automatically.",
    logPath: codexRunLogPath,
  });
  process.exit(0);
}

await writeStatus({
  state: "failed",
  startedAt,
  finishedAt,
  summary: `Manual Codex automation run failed with exit code ${exitCode ?? "unknown"}. Check the log file for details.`,
  logPath: codexRunLogPath,
});
process.exit(exitCode ?? 1);
