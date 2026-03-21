export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.6.0";

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
  /** User-edited notification prefix override. Scope: instance */
  notificationPrefixOverride: "notification-prefix-override",
  /** Per-issue retry counter. Scope: issue */
  retryCounter: "retry-counter",
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
  event: "pipeline.stuck" | "pipeline.complete" | "verification.failed" | "run.failed";
  title: string;
  message: string;
  issueId?: string;
  issueUrl?: string;
  timestamp: string;
}

// ---- Error Policy Types ----

export type ErrorPolicy = "retry" | "skip" | "escalate";

export interface ErrorPolicyConfig {
  /** Default error policy for all pipeline steps. Defaults to "escalate". */
  defaultPolicy: ErrorPolicy;
  /** Max retries when policy is "retry". Defaults to 2. */
  maxRetries: number;
  /** Agent ID to escalate to on failure. Falls back to parent issue creator if not set. */
  errorOverseerAgentId?: string;
}

export const DEFAULT_ERROR_POLICY: ErrorPolicyConfig = {
  defaultPolicy: "escalate",
  maxRetries: 2,
};

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
  /** Error handling policy for failed agent runs */
  errorPolicy?: ErrorPolicyConfig;
};

export interface PipelineStep {
  agent: string;
  agentId: string;
  role: string;
  /** Per-step error policy override. Falls back to global errorPolicy config. */
  errorPolicy?: ErrorPolicy;
  /** Per-step max retries override. Falls back to global errorPolicy.maxRetries. */
  maxRetries?: number;
}

/** Stored in ctx.state per issue (scopeKind: "issue", stateKey: "pipeline-data") */
export interface PipelineData {
  steps: PipelineStep[];
  currentStep: number;
  completedSteps: string[]; // agent names that completed
  stepHistory: Array<{
    stepIndex: number;
    agent: string;
    status: "done" | "active" | "pending" | "failed" | "skipped";
    startedAt?: string;
    completedAt?: string;
    subTaskId?: string;
    /** Number of retries attempted for this step */
    retryCount?: number;
    /** Last failure reason */
    failureReason?: string;
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
