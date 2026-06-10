import fs from "node:fs/promises";
import type { CareerContext } from "@/lib/types";

function section(markdown: string, heading: string): string {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "m");
  const match = markdown.match(pattern);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = rest.search(/^## /m);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstMatch(markdown: string, pattern: RegExp, fallback = ""): string {
  return markdown.match(pattern)?.[1]?.trim().replace(/\*\*/g, "") ?? fallback;
}

function bulletsAfterLabel(markdown: string, label: string): string[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === label);
  if (start < 0) return [];

  const results: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (results.length > 0) break;
      continue;
    }
    if (/^[A-Z][A-Za-z /&-]+:$/.test(trimmed) && results.length > 0) break;
    if (trimmed.startsWith("##") || trimmed.startsWith("###")) break;
    if (trimmed.startsWith("- ")) {
      results.push(cleanListItem(trimmed));
    }
  }
  return results;
}

function cleanListItem(value: string): string {
  return value
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function numberedItems(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map(cleanListItem);
}

function extractPositioning(markdown: string): string {
  return section(markdown, "Best Positioning Statement")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*/g, "");
}

function extractProject(markdown: string): string {
  const projectLines = markdown
    .split("\n")
    .filter((line) => /clinical focus|ICU|intensive care|critical care|CVICU|CICU|MICU|SICU|PICU|NICU/i.test(line))
    .map(cleanListItem);
  return projectLines.slice(0, 4).join(" ");
}

export function parseCareerContext(markdown: string, sourcePath: string): CareerContext {
  const profile = section(markdown, "Candidate Profile");
  const timing = section(markdown, "Job Search Timing");
  const targetRoles = numberedItems(section(markdown, "Target Role Families"));
  const searchStrings = section(markdown, "Search Strings");

  return {
    sourcePath,
    profile: {
      name: firstMatch(profile, /- Name:\s*(.+)/),
      location: firstMatch(profile, /- Location:\s*(.+)/),
      graduation: firstMatch(profile, /Expected (?:MS Finance graduation|BSN finish|finish):\s*(.+)/i),
      project: extractProject(profile),
    },
    timing: {
      primaryGoal: bulletsAfterLabel(timing, "Primary goal:")[0] ?? firstMatch(timing, /- Full-time employee role starting\s*(.+)/),
    },
    avoid: bulletsAfterLabel(timing, "Avoid:"),
    preferred: bulletsAfterLabel(timing, "Preferred:"),
    targetRoles,
    positioning: extractPositioning(markdown),
    searchStrings: {
      remote: bulletsAfterLabel(searchStrings, "Remote:"),
      dfw: bulletsAfterLabel(searchStrings, "DFW:"),
    },
  };
}

export async function readCareerContext(sourcePath: string): Promise<CareerContext> {
  const markdown = await fs.readFile(sourcePath, "utf8");
  return parseCareerContext(markdown, sourcePath);
}
