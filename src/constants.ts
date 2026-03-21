export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.4.0";

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
  /** Saved pipeline templates. Scope: instance */
  templates: "pipeline-templates",
} as const;

// ---- Notification Channel Types ----

export type NotificationChannelType = "webhook" | "slack" | "discord" | "telegram" | "email";

export interface NotificationChannel {
  type: NotificationChannelType;
  enabled: boolean;
  webhookUrl?: string;
  webhookMethod?: "POST" | "PUT";
  webhookHeaders?: Record<string, string>;
  telegramBotToken?: string;
  telegramChatId?: string;
  emailEndpoint?: string;
  payloadTemplate?: string;
}

export interface NotificationPayload {
  event: "pipeline.stuck" | "pipeline.complete" | "verification.failed";
  title: string;
  message: string;
  issueId?: string;
  issueUrl?: string;
  timestamp: string;
}

export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = {
  type: "webhook",
  enabled: false,
  webhookMethod: "POST",
};

// ---- Plugin Config ----

export const DEFAULT_NOTIFICATION_PREFIX = "\u2699\ufe0f Pipeline Controller";

export const DEFAULT_CONFIG = {
  /** @deprecated Use notificationChannel instead */
  telegramBotToken: "",
  /** @deprecated Use notificationChannel instead */
  telegramChatId: "",
  stuckTodoMinutes: 30,
  stuckInProgressMinutes: 60,
  notificationChannel: DEFAULT_NOTIFICATION_CHANNEL,
  notificationPrefix: DEFAULT_NOTIFICATION_PREFIX,
} as const;

export type PipelineControllerConfig = {
  /** @deprecated Use notificationChannel instead. Kept for backward compat. */
  telegramBotToken?: string;
  /** @deprecated Use notificationChannel instead. Kept for backward compat. */
  telegramChatId?: string;
  stuckTodoMinutes?: number;
  stuckInProgressMinutes?: number;
  notificationChannel?: NotificationChannel;
  notificationPrefix?: string;
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
