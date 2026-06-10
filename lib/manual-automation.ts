import { spawn, type SpawnOptions } from "node:child_process";

const codexRunScriptPath = "/Users/aidanhutchison/.local/bin/emma-job-codex-run";

export type AutomationRunCommand = {
  command: string;
  args: string[];
  options: SpawnOptions;
};

export function automationRunCommand(): AutomationRunCommand {
  return {
    command: codexRunScriptPath,
    args: [],
    options: {
      detached: true,
      stdio: "ignore",
    },
  };
}

export function startCodexAutomationRun(): { started: true; pid: number | null } {
  const run = automationRunCommand();
  const child = spawn(run.command, run.args, run.options);
  child.unref();

  return { started: true, pid: child.pid ?? null };
}
