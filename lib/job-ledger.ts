import type { JobResult, RawJobPosting } from "@/lib/types";

const icuTitlePatterns = [
  /\bicu\b/i,
  /intensive care/i,
  /critical care/i,
  /\b(cvicu|cicu|micu|sicu|nicu|picu|nticu)\b/i,
  /cardiovascular intensive/i,
  /cardiac intensive/i,
  /medical intensive/i,
  /surgical intensive/i,
  /neuro.*trauma/i,
  /trauma.*intensive/i,
];

const nursingPatterns = [
  /registered nurse/i,
  /\brn\b/i,
  /nurse resident/i,
  /graduate nurse/i,
  /clinical nurse/i,
];

const strongClinicalPatterns = [
  /ventilator/i,
  /\bacls\b/i,
  /\bbls\b/i,
  /\bpals\b/i,
  /critical care/i,
  /high-acuity|high acuity/i,
  /\bcrrt\b/i,
  /\becmo\b/i,
  /invasive monitoring/i,
  /vasopressor|titration|drip/i,
  /trauma/i,
  /cardiac|cardiovascular/i,
  /neuro/i,
  /magnet/i,
];

const avoidPatterns = [
  {
    pattern: /travel|agency|contract|temporary|temp\b|per diem|\bprn\b|locum|13[\s-]?week/i,
    concern: "Avoid: travel, agency, contract, temporary, PRN, or per diem wording",
  },
  {
    pattern: /\bpicu\b|\bnicu\b|pediatric|paediatric|neonatal|children'?s|childrens/i,
    concern: "Avoid: pediatric ICU or children's hospital role",
  },
  {
    pattern: /no longer accepting applications|job is closed|posting closed|position has been filled|no longer available/i,
    concern: "Avoid: posting is closed or no longer accepting applications",
  },
  {
    pattern: /home health|hospice|\bclinic\b|ambulatory|outpatient|case manager|utilization review|telephone triage/i,
    concern: "Avoid: non-ICU or non-bedside nursing setting",
  },
];

const outsideDallasAreaLocation =
  /\b(austin|houston|san antonio|waco|tyler|college station|lubbock|amarillo|el paso|new york|california|florida|remote)\b/i;

const dallasAreaLocation =
  /\b(dallas|dallas-fort worth|dfw|fort worth|arlington|plano|irving|frisco|richardson|addison|allen|anna|argyle|aubrey|balch springs|bedford|burleson|carrollton|cedar hill|celina|cleburne|coppell|corinth|crandall|crowley|desoto|denton|duncanville|ennis|euless|farmers branch|fate|flower mound|forney|garland|glenn heights|grand prairie|grapevine|greenville|haslet|heath|highland park|hurst|hutchins|joshua|kaufman|keller|lancaster|las colinas|lavon|lewisville|little elm|mansfield|mckinney|mesquite|midlothian|murphy|north richland hills|prosper|red oak|richland hills|roanoke|rockwall|rowlett|royse city|sachse|seagoville|southlake|sunnyvale|terrell|the colony|university park|waxahachie|westlake|wylie)\b/i;

const openApplicationPattern =
  /accepting applications|apply now|submit your resume|talent acquisition.*reviewing applications|opening|open role|job posting|posted/i;

const closedApplicationPattern =
  /no longer accepting applications|job is closed|posting closed|position has been filled|no longer available/i;

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTextKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stableId(company: string, title: string, url: string): string {
  const base = `${company}-${title}-${normalizeUrl(url)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 96);
}

function titleCompanyKey(company: string, title: string): string {
  return `${normalizeTextKey(company)}::${normalizeTextKey(title)}`;
}

export function isOpenForApplications(posting: RawJobPosting | JobResult): boolean {
  const combined = `${posting.title} ${posting.company} ${posting.location} ${
    "description" in posting ? posting.description : posting.notes ?? ""
  }`;

  if (closedApplicationPattern.test(combined)) return false;
  if ("description" in posting) return true;
  return posting.status !== "archived" || openApplicationPattern.test(combined);
}

export function scoreJobFit(posting: RawJobPosting): {
  score: number;
  reasons: string[];
  concerns: string[];
} {
  const title = posting.title;
  const combined = `${posting.title} ${posting.company} ${posting.location} ${posting.description}`;
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 42;

  if (icuTitlePatterns.some((pattern) => pattern.test(title))) {
    score += 30;
    reasons.push("ICU or critical care title match");
  } else if (icuTitlePatterns.some((pattern) => pattern.test(combined))) {
    score += 20;
    reasons.push("ICU or critical care description match");
  }

  if (nursingPatterns.some((pattern) => pattern.test(title))) {
    score += 14;
    reasons.push("Registered nurse title match");
  } else if (nursingPatterns.some((pattern) => pattern.test(combined))) {
    score += 8;
    reasons.push("Registered nurse description match");
  }

  const clinicalHits = strongClinicalPatterns.filter((pattern) => pattern.test(combined)).length;
  if (clinicalHits >= 3) {
    score += 12;
    reasons.push("Strong ICU clinical vocabulary present");
  } else if (clinicalHits > 0) {
    score += 6;
    reasons.push("Some ICU clinical vocabulary present");
  }

  if (isLocationEligible(posting.location)) {
    score += 8;
    reasons.push("Dallas 50-mile area location fit");
  }

  if (isOpenForApplications(posting)) {
    score += 6;
    reasons.push("Posting appears open for applications");
  }

  for (const avoid of avoidPatterns) {
    if (avoid.pattern.test(combined)) {
      score -= avoid.concern.startsWith("Concern") ? 12 : 50;
      concerns.push(avoid.concern);
    }
  }

  if (reasons.length === 0) {
    reasons.push("Needs manual review against ICU nursing target criteria");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: [...new Set(reasons)],
    concerns: [...new Set(concerns)],
  };
}

export function isLocationEligible(location: string): boolean {
  if (outsideDallasAreaLocation.test(location)) return false;
  return dallasAreaLocation.test(location);
}

export function isLikelyTargetPosting(posting: RawJobPosting | JobResult): boolean {
  const combined = `${posting.title} ${posting.company} ${posting.location} ${
    "description" in posting ? posting.description : posting.notes ?? ""
  }`;
  const scored = "description" in posting ? scoreJobFit(posting) : { score: posting.score, concerns: posting.concerns };

  if (!isOpenForApplications(posting)) return false;
  if (!isLocationEligible(posting.location)) return false;
  if (avoidPatterns.some((avoid) => avoid.pattern.test(combined))) return false;
  if (!icuTitlePatterns.some((pattern) => pattern.test(posting.title))) return false;
  if (!nursingPatterns.some((pattern) => pattern.test(combined))) return false;
  if (scored.concerns.some((concern) => concern.startsWith("Avoid:"))) return false;

  return scored.score >= 70;
}

export function mergeJobResults(
  existing: JobResult[],
  incoming: RawJobPosting[],
  now: Date,
): { jobs: JobResult[]; newJobs: JobResult[] } {
  const nowIso = now.toISOString();
  const byUrl = new Map<string, JobResult>();
  const byTitleCompany = new Map<string, string>();

  for (const job of existing) {
    const urlKey = normalizeUrl(job.url);
    byUrl.set(urlKey, job);
    byTitleCompany.set(titleCompanyKey(job.company, job.title), urlKey);
  }

  const newJobs: JobResult[] = [];

  for (const posting of incoming) {
    const urlKey = normalizeUrl(posting.url);
    const alternateKey = byTitleCompany.get(titleCompanyKey(posting.company, posting.title));
    const previous = byUrl.get(urlKey) ?? (alternateKey ? byUrl.get(alternateKey) : undefined);
    const scored = scoreJobFit(posting);

    if (previous) {
      const previousUrlKey = normalizeUrl(previous.url);
      byUrl.set(previousUrlKey, {
        ...previous,
        title: posting.title || previous.title,
        company: posting.company || previous.company,
        location: posting.location || previous.location,
        source: posting.source || previous.source,
        url: posting.url || previous.url,
        score: Math.max(previous.score, scored.score),
        reasons: [...new Set([...previous.reasons, ...scored.reasons])],
        concerns: [...new Set([...previous.concerns, ...scored.concerns])],
        lastSeenAt: nowIso,
      });
      continue;
    }

    const job: JobResult = {
      id: stableId(posting.company, posting.title, posting.url),
      title: posting.title,
      company: posting.company,
      location: posting.location,
      url: posting.url,
      score: scored.score,
      reasons: scored.reasons,
      concerns: scored.concerns,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      status: "new",
      source: posting.source,
    };
    byUrl.set(urlKey, job);
    byTitleCompany.set(titleCompanyKey(job.company, job.title), urlKey);
    newJobs.push(job);
  }

  return {
    jobs: [...byUrl.values()].filter(isLikelyTargetPosting).sort((a, b) => b.score - a.score || a.company.localeCompare(b.company)),
    newJobs,
  };
}
