import type { SearchRun } from "@/lib/types";

export type ScanFeedback = {
  tone: "success" | "neutral" | "error";
  title: string;
  detail: string;
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const scanSourceHrefs: Record<string, string> = {
  "Workday:Methodist Health System": "https://methodisthealthsystem.wd1.myworkdayjobs.com/en-US/mhs_careers",
  "Workday:Cook Children's": "https://cookchildrens.wd1.myworkdayjobs.com/en-US/Cook_Childrens_Careers",
};

export function formatScanSourceLabel(source: string): string {
  const [provider, name] = source.split(/:(.+)/).map((part) => part?.trim());
  if (!provider || !name) return source.trim();
  return `${provider} · ${name}`;
}

export function getScanSourceHref(source: string): string | null {
  return scanSourceHrefs[source.trim()] ?? null;
}

export function buildScanFeedback(run: Pick<SearchRun, "status" | "newJobsCount" | "totalTrackedJobs" | "searchedSources">): ScanFeedback {
  const sourceText = pluralize(run.searchedSources.length, "source");
  const trackedText = pluralize(run.totalTrackedJobs, "tracked role");

  if (run.status === "error") {
    return {
      tone: "error",
      title: "Scan completed with source issues",
      detail: `${sourceText} checked; ${trackedText} remain in the ledger.`,
    };
  }

  if (run.newJobsCount > 0) {
    return {
      tone: "success",
      title: `Scan completed: ${pluralize(run.newJobsCount, "new role")} found`,
      detail: `${sourceText} checked; ${trackedText} now in the ledger.`,
    };
  }

  return {
    tone: "neutral",
    title: "Scan completed: no new eligible roles",
    detail: `${sourceText} checked; ${trackedText} remain in the ledger.`,
  };
}
