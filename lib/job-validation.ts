import type { JobResult } from "@/lib/types";

const closedPagePatterns = [
  /no longer accepting applications/i,
  /job is closed/i,
  /posting closed/i,
  /position has been filled/i,
  /no longer available/i,
  /job has expired/i,
  /this job has expired/i,
  /application period.*closed/i,
  /we're sorry.*job.*not available/i,
  /job you are looking for.*no longer/i,
];

const userAgent = "EmmaIcuJobSearchPlatform/0.1 (+https://emma-icu-job-search-dashboard.streamlit.app)";

type ValidationResult = {
  job: JobResult;
  active: boolean;
  reason?: string;
};

export type JobValidationSummary = {
  activeJobs: JobResult[];
  archivedJobs: JobResult[];
  checkedCount: number;
  errors: string[];
};

function asArchived(job: JobResult, reason: string, now: Date): JobResult {
  return {
    ...job,
    status: "archived",
    lastSeenAt: now.toISOString(),
    concerns: [...new Set([...job.concerns, "Avoid: posting is closed or no longer accepting applications"])],
    notes: [job.notes, `Archived by link validation: ${reason}`].filter(Boolean).join(" "),
  };
}

async function fetchPostingPage(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
}

async function validateJob(job: JobResult): Promise<ValidationResult> {
  const response = await fetchPostingPage(job.url);

  if (response.status === 404 || response.status === 410) {
    return { job, active: false, reason: `HTTP ${response.status}` };
  }

  if (!response.ok) {
    return { job, active: true, reason: `Could not conclusively validate; HTTP ${response.status}` };
  }

  const body = await response.text();
  const closedPattern = closedPagePatterns.find((pattern) => pattern.test(body));
  if (closedPattern) {
    return { job, active: false, reason: `page matched "${closedPattern.source}"` };
  }

  return { job, active: true };
}

export async function validateTrackedJobs(jobs: JobResult[], now = new Date()): Promise<JobValidationSummary> {
  const activeJobs: JobResult[] = [];
  const archivedJobs: JobResult[] = [];
  const errors: string[] = [];
  let checkedCount = 0;
  const pendingJobs = jobs.filter((job) => job.status !== "archived");

  for (let index = 0; index < pendingJobs.length; index += 6) {
    const batch = pendingJobs.slice(index, index + 6);
    const results = await Promise.allSettled(batch.map((job) => validateJob(job)));

    for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
      const result = results[resultIndex];
      const job = batch[resultIndex];
      if (!job) continue;

      if (result.status === "rejected") {
        activeJobs.push(job);
        errors.push(`${job.company} - ${job.title}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
        continue;
      }

      checkedCount += 1;
      if (result.value.active) {
        activeJobs.push(job);
        if (result.value.reason) errors.push(`${job.company} - ${job.title}: ${result.value.reason}`);
      } else {
        archivedJobs.push(asArchived(job, result.value.reason ?? "posting is no longer active", now));
      }
    }
  }

  return { activeJobs, archivedJobs, checkedCount, errors };
}
