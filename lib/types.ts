export type AutomationStatus = "ACTIVE" | "PAUSED" | "UNKNOWN";

export type CareerContext = {
  sourcePath: string;
  profile: {
    name: string;
    location: string;
    graduation: string;
    project: string;
  };
  timing: {
    primaryGoal: string;
  };
  avoid: string[];
  preferred: string[];
  targetRoles: string[];
  positioning: string;
  searchStrings: {
    remote: string[];
    dfw: string[];
  };
};

export type ResumeContext = {
  sourcePath: string;
  name: string;
  locationLine: string;
  education: string;
  experience: ResumeExperience[];
  skills: {
    investment: string[];
    technical: string[];
  };
  signals: string[];
  rawText: string;
};

export type ResumeExperience = {
  organization: string;
  title: string;
  location: string;
  dates: string;
  bullets: string[];
};

export type RawJobPosting = {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
};

export type JobResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  reasons: string[];
  concerns: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  status: "new" | "watching" | "applied" | "archived";
  source: string;
  notes?: string;
  startDateFit?: string;
};

export type SearchRun = {
  id: string;
  ranAt: string;
  status: "success" | "no_new_matches" | "error" | "manual";
  summary: string;
  newJobsCount: number;
  totalTrackedJobs: number;
  searchedSources: string[];
};

export type CodexRunStatus = {
  state: "idle" | "running" | "completed" | "failed";
  startedAt?: string;
  finishedAt?: string;
  summary: string;
  logPath?: string;
};

export type AppState = {
  automation: {
    id: string;
    name: string;
    enabled: boolean;
    codexAutomationPath: string;
    automationFolderPath: string;
    scheduleLabel: string;
  };
  contextPath: string;
  resumePath: string;
};

export type DashboardData = {
  context: CareerContext;
  resume: ResumeContext;
  jobs: JobResult[];
  runs: SearchRun[];
  codexRunStatus: CodexRunStatus;
  appState: AppState;
  automationStatus: AutomationStatus;
  generatedAt: string;
};
