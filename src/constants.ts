export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.2.0";

export const SLOT_IDS = {
  dashboardWidget: "pipeline-dashboard-widget",
  issueDetailTab: "pipeline-issue-detail-tab",
  settingsPage: "pipeline-settings-page",
} as const;

export const EXPORT_NAMES = {
  dashboardWidget: "PipelineDashboardWidget",
  issueDetailTab: "PipelineIssueDetailTab",
  settingsPage: "PipelineSettingsPage",
} as const;

export const JOB_KEYS = {
  stuckDetection: "stuck-detection",
} as const;

export const STATE_KEYS = {
  /** Per-issue pipeline definition + progress. Scope: issue */
  pipelineData: "pipeline-data",
  /** Alert history. Scope: instance */
  alertHistory: "alert-history",
  /** Content hash tracking. Scope: issue */
  contentHash: "content-hash",
  /** Saved pipeline templates. Scope: instance */
  templates: "pipeline-templates",
} as const;

/** Content task title patterns that trigger verify-on-done */
export const CONTENT_PATTERNS = [
  /\bexpand\b/i,
  /\bimage\b/i,
  /\bpost\b/i,
  /\barticle\b/i,
];

/** Pattern to extract post IDs from titles/comments */
export const POST_ID_PATTERNS = [
  /post[- _]?id[:\s]+([a-f0-9-]+)/i,
  /post[:\s]+(\d+)/i,
  /\/posts\/([a-f0-9-]+)/i,
  /\/posts\/(\d+)/i,
];

export const DEFAULT_CONFIG = {
  siteApiUrl: "https://www.labattsimon.com",
  siteApiToken: "",
  telegramBotToken: "",
  telegramChatId: "",
  stuckTodoMinutes: 30,
  stuckInProgressMinutes: 60,
} as const;

export type PipelineControllerConfig = {
  siteApiUrl?: string;
  siteApiToken?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  stuckTodoMinutes?: number;
  stuckInProgressMinutes?: number;
};

export interface PipelineStep {
  agent: string;
  agentId: string;
  role: string;
}

/** Stored in ctx.state per issue (scopeKind: "issue", stateKey: "pipeline-data") */
export interface PipelineData {
  steps: PipelineStep[];
  currentStep: number;
  completedSteps: string[]; // agent names that completed
  stepHistory: Array<{
    stepIndex: number;
    agent: string;
    status: "done" | "active" | "pending";
    startedAt?: string;
    completedAt?: string;
    subTaskId?: string;
  }>;
  startedAt: string;
  lastAdvancedAt: string;
  templateName?: string;
}

/** Stored in ctx.state at instance scope (stateKey: "pipeline-templates") */
export interface PipelineTemplates {
  templates: Array<{
    name: string;
    steps: PipelineStep[];
    createdAt: string;
  }>;
}
