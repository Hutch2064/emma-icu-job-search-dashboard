import { describe, expect, it } from "vitest";
import { parseResumeText, readResumeContext } from "@/lib/resume-context";

const resumeText = `Emma Baron\tMidlothian, TX | (225) 955-1870 | emmaebaron2@gmail.com

EDUCATION
University of Arkansas, Fayetteville, AR
Bachelor of Science in Nursing Candidate
GPA: 3.7

CLINICAL EXPERIENCE
Expected Finish: Dec. 2026
Foundations at Encompass Health - 150 hours
Mental Health at Northwest Springdale Hospital - 75 hours
Critical Care at TBD - 75 hours

WORK EXPERIENCE
TM Express Couriers Irving, Texas Summers of 2022, 2023, & 2024
Medical Courier
Drove time-sensitive courier routes in the DFW area to deliver medical supplies, laboratory samples, pathology specimens, surgical supplies, etc. to hospitals, physicians' offices, etc.
Worked with a live dispatch and is Biohazard and HIPAA-trained

CERTIFICATIONS
American Heart Association Basic Life Support (CPR and AED), Expiration: October 2026
Biohazard and HIPAA trained
CITI Training Certified, Record ID: 71544372, Expiration: October 1, 2028
Mandated Reporter trained

SHADOWING
December 2025 - Shadowed at Texas Health Mansfield Hospital under an ICU nurse`;

describe("parseResumeText", () => {
  it("extracts Emma nursing resume sections and clinical signals for the dashboard", () => {
    const parsed = parseResumeText(resumeText, "/tmp/EmmaResume.docx");

    expect(parsed.sourcePath).toBe("/tmp/EmmaResume.docx");
    expect(parsed.name).toBe("Emma Baron");
    expect(parsed.locationLine).toContain("Midlothian, TX");
    expect(parsed.education).toContain("Bachelor of Science in Nursing");
    expect(parsed.experience[0]?.organization).toBe("Encompass Health");
    expect(parsed.experience[0]?.title).toBe("Foundations clinical rotation");
    expect(parsed.experience.some((item) => item.title === "Critical Care clinical rotation")).toBe(true);
    expect(parsed.experience.some((item) => item.title === "Medical Courier")).toBe(true);
    expect(parsed.skills.investment).toContain("Critical care clinical rotation planned");
    expect(parsed.skills.technical).toContain("American Heart Association Basic Life Support (CPR and AED), Expiration: October 2026");
    expect(parsed.signals).toContain("ICU and critical care nursing focus");
    expect(parsed.signals).toContain("BSN candidate with December 2026 expected finish");
  });
});

describe("readResumeContext", () => {
  it("returns an explicit placeholder when Emma's resume file is not available yet", async () => {
    const parsed = await readResumeContext("/tmp/missing-emma-resume.docx");

    expect(parsed.sourcePath).toBe("/tmp/missing-emma-resume.docx");
    expect(parsed.name).toBe("Emma Baron");
    expect(parsed.education).toContain("Resume not available yet");
    expect(parsed.signals).toContain("Resume pending");
    expect(parsed.rawText).toContain("Emma's resume has not been added yet");
  });
});
