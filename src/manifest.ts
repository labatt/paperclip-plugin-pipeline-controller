import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  EXPORT_NAMES,
  JOB_KEYS,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Pipeline Controller",
  description: "Automates multi-agent pipeline handoffs with visual pipeline editor, content verification, and stuck detection.",
  author: "Forge",
  categories: ["automation", "ui"],
  capabilities: [
    "events.subscribe",
    "companies.read",
    "issues.read",
    "issues.create",
    "issues.update",
    "issue.comments.read",
    "issue.comments.create",
    "agents.read",
    "jobs.schedule",
    "http.outbound",
    "plugin.state.read",
    "plugin.state.write",
    "instance.settings.register",
    "ui.dashboardWidget.register",
    "ui.detailTab.register",
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
        description: "Bearer token for the labattsimon.com API (content verification).",
      },
      telegramBotToken: {
        type: "string",
        title: "Telegram Bot Token",
        default: DEFAULT_CONFIG.telegramBotToken,
        description: "Bot token for exception alerts only (stuck tasks, verification failures).",
      },
      telegramChatId: {
        type: "string",
        title: "Telegram Chat ID",
        default: DEFAULT_CONFIG.telegramChatId,
        description: "Chat ID for exception alerts.",
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
      description: "Checks for stuck tasks every 5 minutes.",
      schedule: "*/5 * * * *",
    },
  ],
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "Active Pipelines",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
      {
        type: "detailTab",
        id: SLOT_IDS.issueDetailTab,
        displayName: "Pipeline",
        exportName: EXPORT_NAMES.issueDetailTab,
        entityTypes: ["issue"],
      },
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Pipeline Controller Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
    ],
  },
};

export default manifest;
