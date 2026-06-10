import { describe, expect, it } from "vitest";
import { parseCareerContext } from "@/lib/career-context";

const contextMarkdown = `# Codex Context Pack - Emma Baron ICU Nursing Job Search

## Candidate Profile

- Name: Emma Baron
- Location: Dallas-Fort Worth, Texas
- Education:
  - University of Arkansas
  - Bachelor of Science in Nursing Candidate
  - Expected BSN finish: December 2026
- Clinical focus:
  - ICU, critical care, intensive care, CVICU, MICU, SICU, trauma ICU, neuro ICU, PICU, and NICU roles in the DFW area.

## Job Search Timing

Primary goal:
- Currently open full-time nursing positions accepting applications now.

Avoid:
- Travel nursing contracts
- Contract, temporary, per diem, PRN-only, or agency roles
- Non-ICU bedside roles

Preferred:
- Full-time employee ICU roles
- DFW-area hospitals and health systems

## Target Role Families

Highest fit:
1. ICU Registered Nurse
2. Critical Care RN
3. CVICU RN

## Best Positioning Statement

Emma Baron is targeting currently open ICU and critical care nursing roles in the Dallas-Fort Worth area. Resume details will be added later.

## Search Strings

DFW:
- ICU RN Dallas
- Critical Care Registered Nurse Fort Worth

`;

describe("parseCareerContext", () => {
  it("extracts Emma ICU nursing profile, timing, guardrails, targets, and DFW search strings", () => {
    const parsed = parseCareerContext(contextMarkdown, "/tmp/emma-context.md");

    expect(parsed.sourcePath).toBe("/tmp/emma-context.md");
    expect(parsed.profile.name).toBe("Emma Baron");
    expect(parsed.profile.location).toContain("Dallas-Fort Worth");
    expect(parsed.profile.graduation).toBe("December 2026");
    expect(parsed.profile.project).toContain("ICU");
    expect(parsed.timing.primaryGoal).toContain("Currently open");
    expect(parsed.avoid).toContain("Travel nursing contracts");
    expect(parsed.preferred).toContain("Full-time employee ICU roles");
    expect(parsed.targetRoles).toEqual(["ICU Registered Nurse", "Critical Care RN", "CVICU RN"]);
    expect(parsed.positioning).toContain("Emma Baron");
    expect(parsed.searchStrings.dfw).toContain("ICU RN Dallas");
    expect(parsed.searchStrings.remote).toEqual([]);
  });
});
