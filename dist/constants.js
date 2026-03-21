export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.2.0";
export const SLOT_IDS = {
    dashboardWidget: "pipeline-dashboard-widget",
    issueDetailTab: "pipeline-issue-detail-tab",
    settingsPage: "pipeline-settings-page",
};
export const EXPORT_NAMES = {
    dashboardWidget: "PipelineDashboardWidget",
    issueDetailTab: "PipelineIssueDetailTab",
    settingsPage: "PipelineSettingsPage",
};
export const JOB_KEYS = {
    stuckDetection: "stuck-detection",
};
export const STATE_KEYS = {
    /** Per-issue pipeline definition + progress. Scope: issue */
    pipelineData: "pipeline-data",
    /** Alert history. Scope: instance */
    alertHistory: "alert-history",
    /** Content hash tracking. Scope: issue */
    contentHash: "content-hash",
    /** Saved pipeline templates. Scope: instance */
    templates: "pipeline-templates",
};
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
};
//# sourceMappingURL=constants.js.map