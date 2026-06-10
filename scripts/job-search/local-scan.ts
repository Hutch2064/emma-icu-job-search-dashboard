import { runJobSearch } from "@/lib/search-runner";

const result = await runJobSearch();

console.log(result.run.summary);
console.log(`Tracked jobs: ${result.jobs.length}`);
console.log(`New jobs: ${result.newJobs.length}`);

if (result.sourceErrors.length > 0) {
  console.log("Source issues:");
  for (const issue of result.sourceErrors) console.log(`- ${issue}`);
}
