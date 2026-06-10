import { describe, expect, it } from "vitest";
import { buildScanFeedback, formatScanSourceLabel, getScanSourceHref } from "@/lib/scan-feedback";

describe("buildScanFeedback", () => {
  it("makes no-new-results scans visible and specific", () => {
    const message = buildScanFeedback({
      status: "no_new_matches",
      newJobsCount: 0,
      totalTrackedJobs: 3,
      searchedSources: ["Workday:Methodist Health System", "Workday:Cook Children's"],
    });

    expect(message.tone).toBe("neutral");
    expect(message.title).toBe("Scan completed: no new eligible roles");
    expect(message.detail).toContain("2 sources checked");
    expect(message.detail).toContain("3 tracked roles remain");
  });

  it("summarizes new roles when a scan finds matches", () => {
    const message = buildScanFeedback({
      status: "success",
      newJobsCount: 2,
      totalTrackedJobs: 5,
      searchedSources: ["Workday:Methodist Health System"],
    });

    expect(message.tone).toBe("success");
    expect(message.title).toBe("Scan completed: 2 new roles found");
    expect(message.detail).toContain("1 source checked");
  });

  it("formats source names for compact dashboard display", () => {
    expect(formatScanSourceLabel("Workday:Methodist Health System")).toBe("Workday · Methodist Health System");
    expect(formatScanSourceLabel("Workday:Cook Children's")).toBe("Workday · Cook Children's");
    expect(formatScanSourceLabel("Medical City careers")).toBe("Medical City careers");
  });

  it("maps scan sources to their public job board URLs", () => {
    expect(getScanSourceHref("Workday:Methodist Health System")).toBe(
      "https://methodisthealthsystem.wd1.myworkdayjobs.com/en-US/mhs_careers",
    );
    expect(getScanSourceHref("Workday:Cook Children's")).toBe(
      "https://cookchildrens.wd1.myworkdayjobs.com/en-US/Cook_Childrens_Careers",
    );
    expect(getScanSourceHref("Unknown:Source")).toBeNull();
  });
});
