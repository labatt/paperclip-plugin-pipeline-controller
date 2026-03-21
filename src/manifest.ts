import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  DEFAULT_ERROR_POLICY,
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
  description: "Automates multi-agent pipeline handoffs with visual pipeline editor, stuck detection, error handling (retry/skip/escalate), API action handlers, and notifications. Content verification is handled by separate verifier plugins.",
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
      telegramBotToken: {
        type: "string",
        title: "Telegram Bot Token (deprecated)",
        default: "",
        description: "Deprecated: use notificationChannel instead. Kept for backward compatibility.",
      },
      telegramChatId: {
        type: "string",
        title: "Telegram Chat ID (deprecated)",
        default: "",
        description: "Deprecated: use notificationChannel instead. Kept for backward compatibility.",
      },
      stuckTodoMinutes: {
        type: "number",
        title: "Stuck Todo Threshold (minutes)",
        default: DEFAULT_CONFIG.stuckTodoMinutes,
        description: "How long a task can sit in \"todo\" status before it is flagged as stuck. The assigned agent and notification channel will be alerted.",
      },
      stuckInProgressMinutes: {
        type: "number",
        title: "Stuck In-Progress Threshold (minutes)",
        default: DEFAULT_CONFIG.stuckInProgressMinutes,
        description: "How long a task can remain \"in_progress\" without activity before it is flagged as stuck.",
      },
      notificationPrefix: {
        type: "string",
        title: "Notification Prefix",
        default: DEFAULT_CONFIG.notificationPrefix,
        description: "Short label prepended to every alert so recipients know the source (e.g. a project name). Max 255 characters.",
        maxLength: 255,
      },
      errorPolicy: {
        type: "object",
        title: "Error Handling Policy",
        description: "Configure how the pipeline handles failed agent runs. Each step can also override these defaults.",
        properties: {
          defaultPolicy: {
            type: "string",
            title: "Default Error Policy",
            enum: ["retry", "skip", "escalate"],
            default: DEFAULT_ERROR_POLICY.defaultPolicy,
            description: "What to do when an agent run fails. 'retry' re-creates the sub-task (up to maxRetries). 'skip' moves to the next step. 'escalate' blocks the pipeline and reassigns to the overseer.",
          },
          maxRetries: {
            type: "number",
            title: "Max Retries",
            default: DEFAULT_ERROR_POLICY.maxRetries,
            description: "Maximum number of retry attempts when policy is 'retry'. After exhausting retries, falls back to escalation.",
          },
          errorOverseerAgentId: {
            type: "string",
            title: "Error Overseer Agent ID",
            description: "Agent to reassign the issue to when a step fails and policy is 'escalate'. If not set, the pipeline is blocked for manual intervention.",
          },
        },
      },
      notificationChannel: {
        type: "object",
        title: "Notification Channel",
        description: "Configure how stuck-task alerts and pipeline-complete notifications are delivered. Pick a channel type and fill in the relevant fields. Alerts are exception-only: stuck tasks, verification failures, and pipeline completion.",
        properties: {
          type: {
            type: "string",
            title: "Channel Type",
            enum: ["webhook", "slack", "discord", "telegram", "email"],
            default: "webhook",
          },
          enabled: {
            type: "boolean",
            title: "Enabled",
            default: false,
          },
          webhookUrl: {
            type: "string",
            title: "Webhook URL",
            description: "Target URL for webhook, Slack, or Discord notifications. For Slack/Discord, use the incoming webhook URL from your workspace settings.",
          },
          webhookMethod: {
            type: "string",
            title: "HTTP Method",
            enum: ["POST", "PUT"],
            default: "POST",
          },
          webhookHeaders: {
            type: "object",
            title: "Custom Headers",
            description: "Optional HTTP headers sent with each request (e.g. Authorization tokens).",
            additionalProperties: { type: "string" },
          },
          telegramBotToken: {
            type: "string",
            title: "Telegram Bot Token",
            description: "Bot token from @BotFather. Required when channel type is Telegram.",
          },
          telegramChatId: {
            type: "string",
            title: "Telegram Chat ID",
            description: "Numeric chat or group ID where alerts will be sent. Required when channel type is Telegram.",
          },
          emailEndpoint: {
            type: "string",
            title: "Email API Endpoint",
            description: "URL to POST email notification payloads to (your email-sending service).",
          },
          payloadTemplate: {
            type: "string",
            title: "Custom Payload Template",
            description: "Optional custom payload template with {{title}}, {{message}}, {{event}} variables. For advanced webhook integrations.",
          },
        },
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
