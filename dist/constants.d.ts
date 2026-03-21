export declare const PLUGIN_ID = "pipeline-controller";
export declare const PLUGIN_VERSION = "0.1.0";
export declare const SLOT_IDS: {
    readonly dashboardWidget: "pipeline-dashboard-widget";
};
export declare const EXPORT_NAMES: {
    readonly dashboardWidget: "PipelineDashboardWidget";
};
export declare const JOB_KEYS: {
    readonly stuckDetection: "stuck-detection";
};
export declare const STATE_KEYS: {
    readonly pipelineProgress: "pipeline-progress";
    readonly alertHistory: "alert-history";
    readonly contentHash: "content-hash";
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
export interface PipelineDocument {
    steps: PipelineStep[];
}
export interface PipelineProgress {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    startedAt: string;
    lastAdvancedAt: string;
}
//# sourceMappingURL=constants.d.ts.map