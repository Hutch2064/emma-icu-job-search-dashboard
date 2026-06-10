import type { RawJobPosting } from "@/lib/types";

type SourceResult = {
  source: string;
  jobs: RawJobPosting[];
  error?: string;
};

type WorkdayBoard = {
  host: string;
  tenant: string;
  site: string;
  company: string;
  queries: string[];
};

const workdayBoards: WorkdayBoard[] = [
  {
    host: "cookchildrens.wd1.myworkdayjobs.com",
    tenant: "cookchildrens",
    site: "Cook_Childrens_Careers",
    company: "Cook Children's",
    queries: ["ICU RN", "PICU RN", "CICU RN", "Critical Care RN"],
  },
];

function stripHtml(value: string | undefined): string {
  return (value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "user-agent": "EmmaIcuJobSearchPlatform/0.1",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function workdayApiBase(board: WorkdayBoard): string {
  return `https://${board.host}/wday/cxs/${board.tenant}/${board.site}`;
}

function workdayJobUrl(board: WorkdayBoard, externalPath: string): string {
  return `https://${board.host}/en-US/${board.site}${externalPath}`;
}

async function fetchWorkdayDetails(board: WorkdayBoard, externalPath: string): Promise<{
  description: string;
  location?: string;
  title?: string;
  canApply?: boolean;
  timeType?: string;
  postedOn?: string;
}> {
  const data = (await fetchJson(`${workdayApiBase(board)}${externalPath}`)) as {
    jobPostingInfo?: {
      title?: string;
      jobDescription?: string;
      location?: string;
      canApply?: boolean;
      timeType?: string;
      postedOn?: string;
    };
  };
  const info = data.jobPostingInfo ?? {};
  return {
    title: info.title,
    location: info.location,
    description: stripHtml(info.jobDescription),
    canApply: info.canApply,
    timeType: info.timeType,
    postedOn: info.postedOn,
  };
}

async function fetchWorkdayBoard(board: WorkdayBoard): Promise<SourceResult> {
  const source = `Workday:${board.company}`;
  const byUrl = new Map<string, RawJobPosting>();
  const errors: string[] = [];

  for (const query of board.queries) {
    try {
      const data = (await fetchJson(`${workdayApiBase(board)}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: query,
        }),
      })) as {
        jobPostings?: Array<{
          title?: string;
          externalPath?: string;
          locationsText?: string;
          timeType?: string;
          postedOn?: string;
          bulletFields?: string[];
        }>;
      };

      for (const posting of data.jobPostings ?? []) {
        if (!posting.externalPath) continue;
        const url = workdayJobUrl(board, posting.externalPath);
        if (byUrl.has(url)) continue;

        try {
          const details = await fetchWorkdayDetails(board, posting.externalPath);
          if (details.canApply === false) continue;

          byUrl.set(url, {
            title: details.title ?? posting.title ?? "Untitled ICU nursing role",
            company: board.company,
            location: details.location ?? posting.locationsText ?? "Unspecified",
            description: [
              posting.timeType,
              details.timeType,
              posting.postedOn,
              details.postedOn,
              ...(posting.bulletFields ?? []),
              details.description,
            ]
              .filter(Boolean)
              .join(" "),
            url,
            source,
          });
        } catch (error) {
          errors.push(`${query} detail ${posting.externalPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      errors.push(`${query} search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { source, jobs: [...byUrl.values()], error: errors.length > 0 ? errors.join("; ") : undefined };
}

export async function fetchPublicJobSources(): Promise<{
  postings: RawJobPosting[];
  sources: string[];
  errors: string[];
}> {
  const results = await Promise.all(workdayBoards.map((board) => fetchWorkdayBoard(board)));

  return {
    postings: results.flatMap((result) => result.jobs),
    sources: results.map((result) => result.source),
    errors: results.flatMap((result) => (result.error ? [`${result.source}: ${result.error}`] : [])),
  };
}
