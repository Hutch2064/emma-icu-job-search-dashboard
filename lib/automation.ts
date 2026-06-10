import fs from "node:fs/promises";
import { parse } from "smol-toml";
import type { AutomationStatus } from "@/lib/types";

export function readAutomationStatusFromToml(toml: string): AutomationStatus {
  try {
    const parsed = parse(toml) as { status?: unknown };
    if (parsed.status === "ACTIVE" || parsed.status === "PAUSED") return parsed.status;
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export function updateAutomationStatusToml(toml: string, enabled: boolean): string {
  const status = enabled ? "ACTIVE" : "PAUSED";
  if (/^status\s*=\s*"(ACTIVE|PAUSED)"/m.test(toml)) {
    return toml.replace(/^status\s*=\s*"(ACTIVE|PAUSED)"/m, `status = "${status}"`);
  }
  return `${toml.trimEnd()}\nstatus = "${status}"\n`;
}

export async function readAutomationStatus(tomlPath: string): Promise<AutomationStatus> {
  try {
    return readAutomationStatusFromToml(await fs.readFile(tomlPath, "utf8"));
  } catch {
    return "UNKNOWN";
  }
}

export async function setAutomationStatus(tomlPath: string, enabled: boolean): Promise<AutomationStatus> {
  const current = await fs.readFile(tomlPath, "utf8");
  const next = updateAutomationStatusToml(current, enabled);
  await fs.writeFile(tomlPath, next);
  return readAutomationStatusFromToml(next);
}
