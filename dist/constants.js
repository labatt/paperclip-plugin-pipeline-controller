export const PLUGIN_ID = "pipeline-controller";
export const PLUGIN_VERSION = "0.4.0";
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
    /** Saved pipeline templates. Scope: instance */
    templates: "pipeline-templates",
};
export const DEFAULT_NOTIFICATION_CHANNEL = {
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
};
//# sourceMappingURL=constants.js.map