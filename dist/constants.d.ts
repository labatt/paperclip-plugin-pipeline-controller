export declare const PLUGIN_ID = "pipeline-controller";
export declare const PLUGIN_VERSION = "0.9.0";
export declare const SLOT_IDS: {
    readonly dashboardWidget: "pipeline-dashboard-widget";
    readonly issueDetailTab: "pipeline-issue-detail-tab";
    readonly settingsPage: "pipeline-settings-page";
};
export declare const EXPORT_NAMES: {
    readonly dashboardWidget: "PipelineDashboardWidget";
    readonly issueDetailTab: "PipelineIssueDetailTab";
    readonly settingsPage: "PipelineSettingsPage";
};
export declare const JOB_KEYS: {
    readonly stuckDetection: "stuck-detection";
};
export declare const STATE_KEYS: {
    /** Per-issue pipeline definition + progress. Scope: issue */
    readonly pipelineData: "pipeline-data";
    /** Alert history. Scope: instance */
    readonly alertHistory: "alert-history";
    /** Saved pipeline templates. Scope: instance */
    readonly templates: "pipeline-templates";
    /** User-edited notification prefix override. Scope: instance */
    readonly notificationPrefixOverride: "notification-prefix-override";
    /** Per-issue retry counter. Scope: issue */
    readonly retryCounter: "retry-counter";
    /** Pending verify requests. Scope: issue */
    readonly pendingVerify: "pending-verify";
    /** Registry of known verifier plugins. Scope: instance */
    readonly verifierRegistry: "verifier-registry";
};
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
export type ErrorPolicy = "retry" | "skip" | "escalate";
export interface ErrorPolicyConfig {
    /** Default error policy for all pipeline steps. Defaults to "escalate". */
    defaultPolicy: ErrorPolicy;
    /** Max retries when policy is "retry". Defaults to 2. */
    maxRetries: number;
    /** Agent ID to escalate to on failure. Falls back to parent issue creator if not set. */
    errorOverseerAgentId?: string;
}
export declare const DEFAULT_ERROR_POLICY: ErrorPolicyConfig;
export declare const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel;
export declare const DEFAULT_NOTIFICATION_PREFIX = "\u2699\uFE0F Pipeline Controller";
export declare const DEFAULT_CONFIG: {
    /** @deprecated Use notificationChannel instead */
    readonly telegramBotToken: "";
    /** @deprecated Use notificationChannel instead */
    readonly telegramChatId: "";
    readonly stuckTodoMinutes: 30;
    readonly stuckInProgressMinutes: 60;
    readonly notificationChannel: NotificationChannel;
    readonly notificationPrefix: "⚙️ Pipeline Controller";
};
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
    /** Optional content verification config passed to verifier plugins */
    contentVerification?: {
        minWords?: number;
        minImages?: number;
        apiUrl?: string;
        apiToken?: string;
    };
};
export interface PipelineStep {
    agent: string;
    agentId: string;
    role: string;
    /** Per-step error policy override. Falls back to global errorPolicy config. */
    errorPolicy?: ErrorPolicy;
    /** Per-step max retries override. Falls back to global errorPolicy.maxRetries. */
    maxRetries?: number;
    /** Plugin IDs of verifiers to run when this step completes (e.g. ["content-verifier"]) */
    verifiers?: string[];
}
/** Entry in the auto-discovered verifier registry */
export interface VerifierRegistryEntry {
    pluginId: string;
    displayName: string;
    lastSeen: string;
}
/** Result shape returned by a verifier plugin's verify-result event */
export interface VerifierResult {
    requestId?: string;
    issueId: string;
    pluginId: string;
    passed: boolean;
    failures: string[];
    stats: Record<string, unknown>;
}
/** Stored in ctx.state per issue (scopeKind: "issue", stateKey: "pipeline-data") */
export interface PipelineData {
    steps: PipelineStep[];
    currentStep: number;
    completedSteps: string[];
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
//# sourceMappingURL=constants.d.ts.map