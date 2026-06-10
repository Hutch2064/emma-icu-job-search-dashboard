import { describe, expect, it } from "vitest";
import { readAutomationStatusFromToml, updateAutomationStatusToml } from "@/lib/automation";

const toml = `version = 1
id = "emma-icu-dfw-job-search-scan"
kind = "cron"
name = "Emma ICU DFW Job Search Scan"
status = "PAUSED"
rrule = "RRULE:FREQ=WEEKLY;BYHOUR=8;BYMINUTE=15;BYDAY=SU,MO,TU,WE,TH,FR,SA"
`;

describe("automation TOML helpers", () => {
  it("reads and updates the Codex automation status", () => {
    expect(readAutomationStatusFromToml(toml)).toBe("PAUSED");

    const active = updateAutomationStatusToml(toml, true);
    expect(readAutomationStatusFromToml(active)).toBe("ACTIVE");

    const paused = updateAutomationStatusToml(active, false);
    expect(readAutomationStatusFromToml(paused)).toBe("PAUSED");
  });
});
