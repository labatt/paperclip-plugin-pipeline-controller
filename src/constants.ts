export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.1.0";

export const SLOT_IDS = {
  dashboardWidget: "pipeline-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  dashboardWidget: "PipelineDashboardWidget",
} as const;

export const JOB_KEYS = {
  stuckDetection: "stuck-detection",
} as const;

export const STATE_KEYS = {
  pipelineProgress: "pipeline-progress",
  alertHistory: "alert-history",
  contentHash: "content-hash",
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

export interface PipelineDocument {
  steps: PipelineStep[];
}

export interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[]; // agent names that completed
  startedAt: string;
  lastAdvancedAt: string;
}
