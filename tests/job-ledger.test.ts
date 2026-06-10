import { describe, expect, it } from "vitest";
import {
  isLikelyTargetPosting,
  isLocationEligible,
  mergeJobResults,
  scoreJobFit,
} from "@/lib/job-ledger";

describe("scoreJobFit", () => {
  it("rewards full-time ICU nursing roles in the Dallas 50-mile area and penalizes avoided work", () => {
    const strong = scoreJobFit({
      title: "Registered Nurse ICU",
      company: "Texas Health Resources",
      location: "Dallas, TX",
      description:
        "Full-time night shift RN role in an intensive care unit. Currently accepting applications for critical care registered nurses with BLS and ACLS.",
      url: "https://example.com/icu",
      source: "test",
    });

    const weak = scoreJobFit({
      title: "Travel ICU RN Contract",
      company: "Agency Co",
      location: "Dallas, TX",
      description: "13 week travel nursing contract assignment for ICU coverage.",
      url: "https://example.com/travel",
      source: "test",
    });

    expect(strong.score).toBeGreaterThanOrEqual(85);
    expect(strong.reasons).toContain("ICU or critical care title match");
    expect(strong.reasons).toContain("Dallas 50-mile area location fit");
    expect(weak.score).toBeLessThan(60);
    expect(weak.concerns).toContain("Avoid: travel, agency, contract, temporary, PRN, or per diem wording");
  });
});

describe("mergeJobResults", () => {
  it("deduplicates by URL and preserves existing status notes", () => {
    const merged = mergeJobResults(
      [
        {
          id: "existing",
          title: "ICU RN",
          company: "Baylor Scott & White",
          location: "Dallas, TX",
          url: "https://jobs.example.com/1",
          score: 92,
          reasons: ["Existing reason"],
          concerns: [],
          firstSeenAt: "2026-05-01T00:00:00.000Z",
          lastSeenAt: "2026-05-01T00:00:00.000Z",
          status: "watching",
          source: "manual",
        },
      ],
      [
        {
          title: "ICU RN",
          company: "Baylor Scott & White",
          location: "Dallas, TX",
          description: "Full-time ICU registered nurse role accepting applications.",
          url: "https://jobs.example.com/1",
          source: "scan",
        },
        {
          title: "Critical Care Registered Nurse",
          company: "Medical City Healthcare",
          location: "Plano, TX",
          description: "Full-time critical care RN opening in the intensive care unit.",
          url: "https://jobs.example.com/2",
          source: "scan",
        },
      ],
      new Date("2026-05-04T12:00:00.000Z"),
    );

    expect(merged.jobs).toHaveLength(2);
    expect(merged.newJobs).toHaveLength(1);
    expect(merged.jobs[0]?.status).toBe("watching");
    expect(merged.jobs[0]?.firstSeenAt).toBe("2026-05-01T00:00:00.000Z");
    expect(merged.jobs[0]?.lastSeenAt).toBe("2026-05-04T12:00:00.000Z");
  });
});

describe("isLikelyTargetPosting", () => {
  it("keeps currently open Dallas-area ICU roles and rejects non-ICU, closed, contract, and outside-area roles", () => {
    expect(
      isLikelyTargetPosting({
        title: "Registered Nurse ICU",
        company: "Medical City Dallas",
        location: "Dallas, TX",
        description: "Currently accepting applications for a full-time ICU registered nurse.",
        url: "https://example.com/dallas-icu",
        source: "test",
      }),
    ).toBe(true);

    expect(
      isLikelyTargetPosting({
        title: "Registered Nurse Med Surg",
        company: "Medical City Dallas",
        location: "Dallas, TX",
        description: "Full-time medical surgical registered nurse role.",
        url: "https://example.com/med-surg",
        source: "test",
      }),
    ).toBe(false);

    expect(
      isLikelyTargetPosting({
        title: "Registered Nurse ICU",
        company: "Hospital",
        location: "Dallas, TX",
        description: "This job is no longer accepting applications.",
        url: "https://example.com/closed",
        source: "test",
      }),
    ).toBe(false);

    expect(
      isLikelyTargetPosting({
        title: "Travel ICU RN",
        company: "Travel Agency",
        location: "Fort Worth, TX",
        description: "13 week travel contract assignment.",
        url: "https://example.com/travel",
        source: "test",
      }),
    ).toBe(false);

    expect(
      isLikelyTargetPosting({
        title: "RN, PICU",
        company: "Cook Children's",
        location: "Fort Worth, TX",
        description:
          "Full-time registered nurse role in a pediatric intensive care unit with high-acuity critical care patients and clinical documentation responsibilities.",
        url: "https://example.com/picu",
        source: "test",
      }),
    ).toBe(false);

    expect(
      isLikelyTargetPosting({
        title: "RN, Transport",
        company: "Cook Children's",
        location: "Fort Worth, TX",
        description:
          "Transport registered nurse role that references critical care equipment but is not an ICU unit position.",
        url: "https://example.com/transport",
        source: "test",
      }),
    ).toBe(false);

    expect(
      isLikelyTargetPosting({
        title: "Registered Nurse ICU",
        company: "Baylor Scott & White",
        location: "Waxahachie, TX",
        description: "Full-time ICU registered nurse role accepting applications.",
        url: "https://example.com/waxahachie",
        source: "test",
      }),
    ).toBe(true);

    expect(
      isLikelyTargetPosting({
        title: "Registered Nurse ICU",
        company: "Austin Hospital",
        location: "Austin, TX",
        description: "Full-time ICU registered nurse role accepting applications.",
        url: "https://example.com/austin",
        source: "test",
      }),
    ).toBe(false);
  });
});

describe("isLocationEligible", () => {
  it("allows cities roughly within 50 miles of Dallas while rejecting remote and outside-area roles", () => {
    expect(isLocationEligible("Dallas, TX")).toBe(true);
    expect(isLocationEligible("Plano, Texas")).toBe(true);
    expect(isLocationEligible("Fort Worth, TX")).toBe(true);
    expect(isLocationEligible("Arlington, TX")).toBe(true);
    expect(isLocationEligible("Frisco, TX")).toBe(true);
    expect(isLocationEligible("Waxahachie, TX")).toBe(true);
    expect(isLocationEligible("Terrell, Texas")).toBe(true);
    expect(isLocationEligible("Denton, TX")).toBe(true);
    expect(isLocationEligible("McKinney, TX")).toBe(true);
    expect(isLocationEligible("Burleson, TX")).toBe(true);
    expect(isLocationEligible("Austin, Texas, United States")).toBe(false);
    expect(isLocationEligible("Houston, TX")).toBe(false);
    expect(isLocationEligible("Waco, TX")).toBe(false);
    expect(isLocationEligible("Remote")).toBe(false);
    expect(isLocationEligible("Texas, United States")).toBe(false);
  });
});
