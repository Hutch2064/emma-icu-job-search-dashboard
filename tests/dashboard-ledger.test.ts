import { describe, expect, it } from "vitest";
import { getLedgerJobs } from "@/components/dashboard-client";
import type { JobResult } from "@/lib/types";

function job(score: number, id = `job-${score}`): JobResult {
  return {
    id,
    title: `ICU RN ${score}`,
    company: "Example Hospital",
    location: "Dallas, TX",
    url: `https://example.com/${id}`,
    score,
    reasons: ["ICU title match"],
    concerns: [],
    firstSeenAt: "2026-05-05T01:40:24.000Z",
    lastSeenAt: "2026-05-05T01:40:24.000Z",
    status: "new",
    source: "Test",
  };
}

describe("dashboard results ledger", () => {
  it("shows every tracked role instead of truncating the ledger", () => {
    const jobs = Array.from({ length: 12 }, (_, index) => job(index + 1));

    const ledgerJobs = getLedgerJobs(jobs);

    expect(ledgerJobs).toHaveLength(12);
    expect(ledgerJobs.map((result) => result.score)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});
