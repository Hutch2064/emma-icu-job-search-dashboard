import { fetchPublicJobSources } from "@/lib/job-sources";
import { isLikelyTargetPosting, mergeJobResults } from "@/lib/job-ledger";
import { validateTrackedJobs } from "@/lib/job-validation";
import {
  readJobResults,
  readSearchRuns,
  writeJobResults,
  writeSearchRuns,
} from "@/lib/data-store";
import type { JobResult, SearchRun } from "@/lib/types";

function searchRunId(now: Date): string {
  return `scan-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
}

export async function runJobSearch(now = new Date()): Promise<{
  run: SearchRun;
  jobs: JobResult[];
  newJobs: JobResult[];
  sourceErrors: string[];
}> {
  const [existingJobs, existingRuns, fetched] = await Promise.all([
    readJobResults(),
    readSearchRuns(),
    fetchPublicJobSources(),
  ]);

  const validation = await validateTrackedJobs(existingJobs, now);
  const existingAlignedJobs = validation.activeJobs.filter(isLikelyTargetPosting);
  const removedForFitCount = validation.activeJobs.length - existingAlignedJobs.length;
  const candidatePostings = fetched.postings.filter(isLikelyTargetPosting);

  const merged = mergeJobResults(existingAlignedJobs, candidatePostings, now);
  const sourceErrors = [
    ...fetched.errors,
    ...validation.errors.map((error) => `Existing listing validation: ${error}`),
  ];
  const status = sourceErrors.length > 0 ? "error" : merged.newJobs.length > 0 ? "success" : "no_new_matches";
  const summary =
    merged.newJobs.length > 0
      ? `Found ${merged.newJobs.length} new open Dallas 50-mile area ICU role${merged.newJobs.length === 1 ? "" : "s"} across ${fetched.sources.length} official hospital boards.`
      : `Searched ${fetched.sources.length} official hospital boards and found no new open Dallas 50-mile area ICU roles.`;
  const validationSummary =
    ` Revalidated ${validation.checkedCount} tracked listing${validation.checkedCount === 1 ? "" : "s"}` +
    `${
      validation.archivedJobs.length + removedForFitCount > 0
        ? ` and removed ${validation.archivedJobs.length + removedForFitCount} closed/expired/non-matching listing${
            validation.archivedJobs.length + removedForFitCount === 1 ? "" : "s"
          }`
        : ""
    }.`;

  const run: SearchRun = {
    id: searchRunId(now),
    ranAt: now.toISOString(),
    status,
    summary: sourceErrors.length > 0 ? `${summary}${validationSummary} Source issues: ${sourceErrors.join("; ")}` : `${summary}${validationSummary}`,
    newJobsCount: merged.newJobs.length,
    totalTrackedJobs: merged.jobs.length,
    searchedSources: fetched.sources,
  };

  await Promise.all([
    writeJobResults(merged.jobs),
    writeSearchRuns([run, ...existingRuns].slice(0, 100)),
  ]);

  return {
    run,
    jobs: merged.jobs,
    newJobs: merged.newJobs,
    sourceErrors,
  };
}
