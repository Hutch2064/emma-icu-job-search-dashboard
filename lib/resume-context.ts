import type { ResumeContext, ResumeExperience } from "@/lib/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function section(text: string, heading: string): string {
  const headings = ["EDUCATION", "WORK EXPERIENCE", "CLINICAL EXPERIENCE", "EXPERIENCE", "CERTIFICATIONS", "ADDITIONAL"];
  const pattern = new RegExp(`^${heading}$`, "m");
  const match = text.match(pattern);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeading = headings
    .filter((candidate) => candidate !== heading)
    .map((candidate) => rest.search(new RegExp(`^${candidate}$`, "m")))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return (nextHeading === undefined ? rest : rest.slice(0, nextHeading)).trim();
}

function splitSkills(additional: string, label: string): string[] {
  const match = additional.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  if (!match) return [];
  return match[1]
    .split(/[;,]/)
    .map((skill) => skill.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function sectionLines(text: string, heading: string): string[] {
  return section(text, heading)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitOrgLocation(line: string): { organization: string; location: string } {
  const match = line.match(
    /^(.+?)\s+((?:Dallas-Fort Worth|Dallas|Fort Worth|Plano|Irving|Arlington|Frisco|Mansfield|Prosper|Denton|Richardson|McKinney|Allen|Bedford|Hurst|Euless|Texas|TX).*)$/i,
  );
  if (!match) return { organization: line, location: "" };
  return { organization: match[1].trim(), location: match[2].trim() };
}

function parseHeader(lines: string[]): { name: string; locationLine: string } {
  const firstLine = lines[0] ?? "Emma Baron";
  const tabParts = firstLine.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    return {
      name: tabParts[0],
      locationLine: tabParts.slice(1).join(" | "),
    };
  }

  const spacedParts = firstLine.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (spacedParts.length >= 2) {
    return {
      name: spacedParts[0],
      locationLine: spacedParts.slice(1).join(" | "),
    };
  }

  return {
    name: firstLine,
    locationLine: lines[1] ?? "Dallas-Fort Worth, Texas",
  };
}

function certificationSkills(text: string): string[] {
  return sectionLines(text, "CERTIFICATIONS").flatMap((line) => {
    const parts = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [line];
  });
}

function parseExperienceBlock(workExperience: string): ResumeExperience[] {
  const lines = workExperience.split("\n").map((line) => line.trim()).filter(Boolean);
  const experiences: ResumeExperience[] = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const orgLine = lines[index] ?? "";
    const titleLine = lines[index + 1] ?? "";
    if (!/(registered nurse|\brn\b|nurse resident|graduate nurse|clinical nurse|medical courier)/i.test(titleLine)) continue;

    const nextOrgIndex = lines.findIndex((candidate, candidateIndex) => {
      if (candidateIndex <= index + 1) return false;
      const following = lines[candidateIndex + 1] ?? "";
      return /(registered nurse|\brn\b|nurse resident|graduate nurse|clinical nurse|medical courier)/i.test(following);
    });
    const end = nextOrgIndex === -1 ? lines.length : nextOrgIndex;
    const bullets = lines.slice(index + 2, end);
    const [title, dates = ""] = titleLine.split(/\s{2,}|\t|(?=\b(?:August|December|January|February|March|April|May|June|July|September|October|November)\b)/);
    const { organization, location } = splitOrgLocation(orgLine);

    experiences.push({
      organization,
      title: title.trim(),
      location,
      dates: dates.trim(),
      bullets,
    });

    index = end - 1;
  }

  return experiences;
}

function rotationTitle(area: string): string {
  return `${area} clinical rotation`;
}

function splitClinicalRotation(line: string): ResumeExperience | null {
  if (/^Expected Finish:/i.test(line)) return null;
  const match = line.match(/^(.+?)\s+at\s+(.+?)\s+[-\u2013]\s+(.+)$/i);
  if (!match) return null;

  return {
    organization: match[2].trim(),
    title: rotationTitle(match[1].trim()),
    location: "",
    dates: match[3].trim(),
    bullets: [],
  };
}

function parseClinicalRotations(text: string): ResumeExperience[] {
  return sectionLines(text, "CLINICAL EXPERIENCE").flatMap((line) => {
    const rotation = splitClinicalRotation(line);
    return rotation ? [rotation] : [];
  });
}

function parseExperience(text: string): ResumeExperience[] {
  return [
    ...parseClinicalRotations(text),
    ...parseExperienceBlock(section(text, "WORK EXPERIENCE") || section(text, "EXPERIENCE")),
  ];
}

function clinicalSkillSignals(text: string): string[] {
  const skills: string[] = [];
  if (/critical care/i.test(text)) skills.push("Critical care clinical rotation planned");
  if (/med surg|medical surgical/i.test(text)) skills.push("Med Surg clinical rotation");
  if (/pediatrics/i.test(text)) skills.push("Pediatrics clinical rotation");
  if (/\bob\b|obstetric|women/i.test(text)) skills.push("OB clinical rotation");
  if (/mental health/i.test(text)) skills.push("Mental health clinical rotation");
  if (/medical courier|laboratory samples|pathology specimens/i.test(text)) {
    skills.push("Medical courier experience with hospital specimens and supplies");
  }
  return skills;
}

function clinicalSignals(text: string): string[] {
  const signals: string[] = [];
  if (/\bicu\b|intensive care|critical care|cvicu|micu|sicu|cicu|nicu|picu/i.test(text)) {
    signals.push("ICU and critical care nursing focus");
  }
  if (/Bachelor of Science in Nursing Candidate/i.test(text) && /Expected Finish:\s*Dec\.?\s*2026/i.test(text)) {
    signals.push("BSN candidate with December 2026 expected finish");
  }
  if (/ventilator|acls|bls|pals|crrt|ecmo|high-acuity|high acuity/i.test(text)) {
    signals.push("High-acuity bedside care vocabulary");
  }
  if (/epic|cerner/i.test(text)) {
    signals.push("Clinical EMR experience");
  }
  return signals;
}

export function missingResumeContext(sourcePath: string): ResumeContext {
  return {
    sourcePath,
    name: "Emma Baron",
    locationLine: "Dallas-Fort Worth, Texas",
    education: "Resume not available yet. Add Emma's resume when available to enrich fit scoring and dashboard context.",
    experience: [],
    skills: {
      investment: [],
      technical: [],
    },
    signals: ["Resume pending"],
    rawText: "Emma's resume has not been added yet. The job-search automation is using the ICU/DFW context file only.",
  };
}

export function parseResumeText(rawText: string, sourcePath: string): ResumeContext {
  const text = normalizeText(rawText);
  const lines = text.split("\n");
  const header = parseHeader(lines);
  const additional = section(text, "ADDITIONAL");
  const clinicalSkills = splitSkills(additional, "Clinical Skills");
  const areasOfExpertise = splitSkills(additional, "Areas of Expertise");
  const inferredClinicalSkills = clinicalSkillSignals(text);
  const certifications = certificationSkills(text);

  return {
    sourcePath,
    name: header.name,
    locationLine: header.locationLine,
    education: section(text, "EDUCATION").replace(/\n/g, " "),
    experience: parseExperience(text),
    skills: {
      investment: clinicalSkills.length > 0 ? clinicalSkills : areasOfExpertise.length > 0 ? areasOfExpertise : inferredClinicalSkills,
      technical: splitSkills(additional, "Technical Skills").length > 0 ? splitSkills(additional, "Technical Skills") : certifications,
    },
    signals: clinicalSignals(text),
    rawText: text,
  };
}

export async function readResumeContext(sourcePath: string): Promise<ResumeContext> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: sourcePath });
    return parseResumeText(result.value, sourcePath);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return missingResumeContext(sourcePath);
    throw error;
  }
}
