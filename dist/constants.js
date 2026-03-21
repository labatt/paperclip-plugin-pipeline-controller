export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.1.0";
export const SLOT_IDS = {
    dashboardWidget: "pipeline-dashboard-widget",
};
export const EXPORT_NAMES = {
    dashboardWidget: "PipelineDashboardWidget",
};
export const JOB_KEYS = {
    stuckDetection: "stuck-detection",
};
export const STATE_KEYS = {
    pipelineProgress: "pipeline-progress",
    alertHistory: "alert-history",
    contentHash: "content-hash",
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