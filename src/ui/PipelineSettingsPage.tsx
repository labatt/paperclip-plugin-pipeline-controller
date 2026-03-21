import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import type { PluginSettingsPageProps } from "@paperclipai/plugin-sdk/ui";

interface PipelineStep {
  agent: string;
  agentId: string;
  role: string;
}

interface TemplatesData {
  templates: Array<{ name: string; steps: PipelineStep[]; createdAt: string }>;
}

interface NotificationChannelData {
  type?: string;
  enabled?: boolean;
  webhookUrl?: string;
  webhookMethod?: string;
  webhookHeaders?: Record<string, string>;
  telegramBotToken?: string;
  telegramChatId?: string;
  emailEndpoint?: string;
  payloadTemplate?: string;
}

interface ConfigData {
  /** @deprecated */
  telegramBotToken?: string;
  /** @deprecated */
  telegramChatId?: string;
  stuckTodoMinutes?: number;
  stuckInProgressMinutes?: number;
  notificationChannel?: NotificationChannelData;
  notificationPrefix?: string;
}

const CHANNEL_TYPES = [
  { value: "webhook", label: "Webhook (generic)" },
  { value: "slack", label: "Slack" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
] as const;

/* ── Theme-aware styles using CSS variables ── */
const css = {
  container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "20px", maxWidth: "640px", color: "var(--foreground)" } as React.CSSProperties,
  title: { fontSize: "18px", fontWeight: 600, color: "var(--foreground)" } as React.CSSProperties,
  section: { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", background: "var(--card)", color: "var(--card-foreground)" } as React.CSSProperties,
  sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" } as React.CSSProperties,
  sectionHelp: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginBottom: "12px" } as React.CSSProperties,
  field: { marginBottom: "12px" } as React.CSSProperties,
  label: { display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px", color: "var(--foreground)" } as React.CSSProperties,
  hint: { fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" } as React.CSSProperties,
  input: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" as const } as React.CSSProperties,
  select: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" as const } as React.CSSProperties,
  btn: (variant: "primary" | "secondary" | "danger") => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: variant === "primary" ? "none" : "1px solid var(--border)",
    background: variant === "primary" ? "var(--primary)" : variant === "danger" ? "var(--destructive)" : "var(--secondary)",
    color: variant === "primary" ? "var(--primary-foreground)" : variant === "danger" ? "var(--destructive-foreground)" : "var(--secondary-foreground)",
    cursor: "pointer",
  }) as React.CSSProperties,
  templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "var(--muted)", marginBottom: "6px" } as React.CSSProperties,
  templateName: { fontWeight: 500, color: "var(--foreground)" } as React.CSSProperties,
  templateSteps: { fontSize: "12px", color: "var(--muted-foreground)" } as React.CSSProperties,
  empty: { color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" as const } as React.CSSProperties,
  legacyWarning: { padding: "8px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)", marginBottom: "12px" } as React.CSSProperties,
  successMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)" } as React.CSSProperties,
  errorMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--destructive)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--destructive-foreground)" } as React.CSSProperties,
  row: { display: "flex", gap: "8px", alignItems: "center" } as React.CSSProperties,
  fieldValue: { fontSize: "13px", color: "var(--foreground)" } as React.CSSProperties,
};

export function PipelineSettingsPage({ context }: PluginSettingsPageProps) {
  const { data: configData } = usePluginData<ConfigData>("plugin-config");
  const { data: templatesData, refresh: refreshTemplates } = usePluginData<TemplatesData>("pipeline-templates");
  const deleteTemplate = usePluginAction("delete-template");
  const testNotification = usePluginAction("test-notification");

  const [deleting, setDeleting] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const config = configData ?? {};
  const channel = config.notificationChannel ?? {};
  const templates = templatesData?.templates ?? [];

  const hasLegacyTelegram = !!(config.telegramBotToken && !channel.enabled);
  const channelType = channel.type ?? "webhook";

  const handleDeleteTemplate = useCallback(async (name: string) => {
    setDeleting(name);
    try {
      await deleteTemplate({ name });
      refreshTemplates();
    } catch {}
    setDeleting(null);
  }, [deleteTemplate, refreshTemplates]);

  const handleTestNotification = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testNotification({});
      setTestResult({ ok: true, msg: "Test notification sent successfully!" });
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : "Test failed" });
    }
    setTesting(false);
  }, [testNotification]);

  return (
    <div style={css.container}>
      <div style={css.title}>Pipeline Controller Settings</div>

      {/* Notification Channel */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Notification Channel</div>
        <div style={css.sectionHelp}>
          Configure where alerts are sent when something needs attention. Notifications are
          exception-only: stuck tasks, verification failures, and pipeline completions. Pick a
          channel type below and fill in the matching fields in the JSON config above.
        </div>

        {hasLegacyTelegram && (
          <div style={css.legacyWarning}>
            Legacy Telegram config detected at top level. These will continue to work but
            consider migrating to the notification channel config below for more flexibility.
          </div>
        )}

        <div style={css.field}>
          <span style={css.label}>Channel Type</span>
          <div style={css.fieldValue}>
            {CHANNEL_TYPES.find((ct) => ct.value === channelType)?.label ?? channelType}
          </div>
        </div>

        <div style={css.field}>
          <span style={css.label}>Enabled</span>
          <div style={css.fieldValue}>{channel.enabled ? "Yes" : "No"}</div>
        </div>

        {/* Dynamic fields based on channel type */}
        {(channelType === "webhook" || channelType === "slack" || channelType === "discord") && (
          <>
            <div style={css.field}>
              <span style={css.label}>Webhook URL</span>
              <div style={css.fieldValue}>{channel.webhookUrl || "(not set)"}</div>
              <div style={css.hint}>
                {channelType === "slack" ? "Use the Incoming Webhook URL from your Slack workspace settings." :
                 channelType === "discord" ? "Use the webhook URL from your Discord channel's integrations." :
                 "Any HTTP endpoint that accepts JSON payloads."}
              </div>
            </div>
            {channelType === "webhook" && (
              <div style={css.field}>
                <span style={css.label}>HTTP Method</span>
                <div style={css.fieldValue}>{channel.webhookMethod ?? "POST"}</div>
              </div>
            )}
            {channelType === "webhook" && channel.webhookHeaders && Object.keys(channel.webhookHeaders).length > 0 && (
              <div style={css.field}>
                <span style={css.label}>Custom Headers</span>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {Object.keys(channel.webhookHeaders).length} header(s) configured
                </div>
              </div>
            )}
          </>
        )}

        {channelType === "telegram" && (
          <>
            <div style={css.field}>
              <span style={css.label}>Telegram Bot Token</span>
              <div style={css.fieldValue}>
                {channel.telegramBotToken ? "***configured***" : "(not set)"}
              </div>
              <div style={css.hint}>Create a bot via @BotFather on Telegram to get a token.</div>
            </div>
            <div style={css.field}>
              <span style={css.label}>Telegram Chat ID</span>
              <div style={css.fieldValue}>{channel.telegramChatId || "(not set)"}</div>
              <div style={css.hint}>Numeric ID of the chat or group where alerts should go.</div>
            </div>
          </>
        )}

        {channelType === "email" && (
          <div style={css.field}>
            <span style={css.label}>Email API Endpoint</span>
            <div style={css.fieldValue}>{channel.emailEndpoint || "(not set)"}</div>
            <div style={css.hint}>URL of your email-sending service that accepts JSON POSTs.</div>
          </div>
        )}

        <div style={css.field}>
          <span style={css.label}>Notification Prefix</span>
          <div style={css.fieldValue}>
            {config.notificationPrefix || "\u2699\ufe0f Pipeline Controller"}
          </div>
          <div style={css.hint}>
            Short label prepended to every alert so recipients can identify the source at a glance.
          </div>
        </div>

        {/* Test button */}
        <div style={{ marginTop: "12px", ...css.row }}>
          <button
            style={css.btn("primary")}
            onClick={handleTestNotification}
            disabled={testing}
          >
            {testing ? "Sending..." : "Test Notification"}
          </button>
          {testResult && (
            <div style={testResult.ok ? css.successMsg : css.errorMsg}>
              {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* Stuck Detection */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Stuck Detection</div>
        <div style={css.sectionHelp}>
          Tasks that sit too long without activity are flagged as "stuck" and trigger an alert.
          Adjust these thresholds based on your team's expected response times.
        </div>
        <div style={css.field}>
          <span style={css.label}>Stuck Todo Threshold</span>
          <div style={css.fieldValue}>{config.stuckTodoMinutes ?? 30} minutes</div>
          <div style={css.hint}>
            How long an assigned task can remain in "todo" before an alert fires.
          </div>
        </div>
        <div style={css.field}>
          <span style={css.label}>Stuck In-Progress Threshold</span>
          <div style={css.fieldValue}>{config.stuckInProgressMinutes ?? 60} minutes</div>
          <div style={css.hint}>
            How long an "in_progress" task can go without updates before an alert fires.
          </div>
        </div>
      </div>

      {/* Templates */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Pipeline Templates</div>
        <div style={css.sectionHelp}>
          Reusable agent sequences you can apply to new issues with one click. Create templates
          from the Pipeline tab on any issue, then manage (or delete) them here.
        </div>
        <div style={{ marginTop: "12px" }}>
          {templates.length === 0 ? (
            <div style={css.empty}>No templates saved yet.</div>
          ) : (
            templates.map((t) => (
              <div key={t.name} style={css.templateCard}>
                <div>
                  <div style={css.templateName}>{t.name}</div>
                  <div style={css.templateSteps}>
                    {t.steps.map((s) => s.agent).join(" > ")}
                  </div>
                </div>
                <button
                  style={css.btn("danger")}
                  onClick={() => handleDeleteTemplate(t.name)}
                  disabled={deleting === t.name}
                >
                  {deleting === t.name ? "..." : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert behavior note */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Alert Behavior</div>
        <div style={css.sectionHelp}>
          Understanding when (and when not) you will receive notifications.
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" }}>
          Notifications are <strong style={{ color: "var(--foreground)" }}>exception-only</strong>:
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            <li>Task genuinely stuck (threshold exceeded)</li>
            <li>Content verification failed (from a verifier plugin)</li>
            <li>Pipeline completed (final step done)</li>
          </ul>
          No alerts for: normal step transitions, tasks being picked up, or routine progress.
        </div>

        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginTop: "8px" }}>
          <strong style={{ color: "var(--foreground)" }}>Supported channels:</strong>
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            <li><strong style={{ color: "var(--foreground)" }}>Webhook (generic)</strong> - sends JSON payload to any URL</li>
            <li><strong style={{ color: "var(--foreground)" }}>Slack</strong> - formats as Slack blocks with color coding</li>
            <li><strong style={{ color: "var(--foreground)" }}>Discord</strong> - formats as Discord embed with color coding</li>
            <li><strong style={{ color: "var(--foreground)" }}>Telegram</strong> - sends HTML-formatted message via Bot API</li>
            <li><strong style={{ color: "var(--foreground)" }}>Email</strong> - POSTs JSON payload to an email API endpoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
