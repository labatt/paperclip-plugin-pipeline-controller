import { DEFAULT_CONFIG, EXPORT_NAMES, JOB_KEYS, PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS, } from "./constants.js";
const manifest = {
    id: PLUGIN_ID,
    apiVersion: 1,
    version: PLUGIN_VERSION,
    displayName: "Pipeline Controller",
    description: "Automates agent pipeline handoffs, content verification, and stuck detection for multi-step workflows.",
    author: "Forge",
    categories: ["automation"],
    capabilities: [
        "events.subscribe",
        "issues.read",
        "issues.create",
        "issues.update",
        "issue.comments.read",
        "issue.comments.create",
        "issue.documents.read",
        "issue.documents.write",
        "jobs.schedule",
        "http.outbound",
        "plugin.state.read",
        "plugin.state.write",
        "ui.dashboardWidget.register",
        "agents.read",
        "companies.read",
    ],
    entrypoints: {
        worker: "./dist/worker.js",
        ui: "./dist/ui",
    },
    instanceConfigSchema: {
        type: "object",
        properties: {
            siteApiUrl: {
                type: "string",
                title: "Site API URL",
                default: DEFAULT_CONFIG.siteApiUrl,
            },
            siteApiToken: {
                type: "string",
                title: "Site API Token",
                default: DEFAULT_CONFIG.siteApiToken,
                description: "Bearer token for the labattsimon.com API (for content verification).",
            },
            telegramBotToken: {
                type: "string",
                title: "Telegram Bot Token",
                default: DEFAULT_CONFIG.telegramBotToken,
                description: "Bot token for stuck detection alerts.",
            },
            telegramChatId: {
                type: "string",
                title: "Telegram Chat ID",
                default: DEFAULT_CONFIG.telegramChatId,
                description: "Chat ID where stuck alerts are sent.",
            },
            stuckTodoMinutes: {
                type: "number",
                title: "Stuck Todo Threshold (minutes)",
                default: DEFAULT_CONFIG.stuckTodoMinutes,
            },
            stuckInProgressMinutes: {
                type: "number",
                title: "Stuck In-Progress Threshold (minutes)",
                default: DEFAULT_CONFIG.stuckInProgressMinutes,
            },
        },
    },
    jobs: [
        {
            jobKey: JOB_KEYS.stuckDetection,
            displayName: "Stuck Detection",
            description: "Checks for stuck tasks every 5 minutes and sends alerts.",
            schedule: "*/5 * * * *",
        },
    ],
    ui: {
        slots: [
            {
                type: "dashboardWidget",
                id: SLOT_IDS.dashboardWidget,
                displayName: "Pipeline Status",
                exportName: EXPORT_NAMES.dashboardWidget,
            },
        ],
    },
};
export default manifest;
//# sourceMappingURL=manifest.js.map