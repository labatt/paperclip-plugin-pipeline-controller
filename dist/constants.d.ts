export declare const PLUGIN_ID = "pipeline-controller";
export declare const PLUGIN_VERSION = "0.5.0";
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
    event: "pipeline.stuck" | "pipeline.complete" | "verification.failed";
    title: string;
    message: string;
    issueId?: string;
    issueUrl?: string;
    timestamp: string;
}
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
    completedSteps: string[];
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
//# sourceMappingURL=constants.d.ts.map