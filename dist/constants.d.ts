export declare const PLUGIN_ID = "pipeline-controller";
export declare const PLUGIN_VERSION = "0.2.0";
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
    /** Content hash tracking. Scope: issue */
    readonly contentHash: "content-hash";
    /** Saved pipeline templates. Scope: instance */
    readonly templates: "pipeline-templates";
};
/** Content task title patterns that trigger verify-on-done */
export declare const CONTENT_PATTERNS: RegExp[];
/** Pattern to extract post IDs from titles/comments */
export declare const POST_ID_PATTERNS: RegExp[];
export declare const DEFAULT_CONFIG: {
    readonly siteApiUrl: "https://www.labattsimon.com";
    readonly siteApiToken: "";
    readonly telegramBotToken: "";
    readonly telegramChatId: "";
    readonly stuckTodoMinutes: 30;
    readonly stuckInProgressMinutes: 60;
};
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