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

interface ConfigData {
  siteApiUrl?: string;
  siteApiToken?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  stuckTodoMinutes?: number;
  stuckInProgressMinutes?: number;
}

const css = {
  container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "20px", maxWidth: "640px" } as React.CSSProperties,
  title: { fontSize: "18px", fontWeight: 600 } as React.CSSProperties,
  section: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" } as React.CSSProperties,
  sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "12px" } as React.CSSProperties,
  field: { marginBottom: "12px" } as React.CSSProperties,
  label: { display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px", color: "#374151" } as React.CSSProperties,
  hint: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" } as React.CSSProperties,
  input: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" as const } as React.CSSProperties,
  btn: (variant: "primary" | "secondary" | "danger") => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: variant === "primary" ? "none" : "1px solid #d1d5db",
    background: variant === "primary" ? "#3b82f6" : variant === "danger" ? "#ef4444" : "#fff",
    color: variant === "primary" || variant === "danger" ? "#fff" : "#374151",
    cursor: "pointer",
  }) as React.CSSProperties,
  templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "#f9fafb", marginBottom: "6px" } as React.CSSProperties,
  templateName: { fontWeight: 500 } as React.CSSProperties,
  templateSteps: { fontSize: "12px", color: "#6b7280" } as React.CSSProperties,
  empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" as const } as React.CSSProperties,
};

export function PipelineSettingsPage({ context }: PluginSettingsPageProps) {
  const { data: configData } = usePluginData<ConfigData>("plugin-config");
  const { data: templatesData, refresh: refreshTemplates } = usePluginData<TemplatesData>("pipeline-templates");
  const deleteTemplate = usePluginAction("delete-template");

  const [deleting, setDeleting] = useState<string | null>(null);

  const config = configData ?? {};
  const templates = templatesData?.templates ?? [];

  const handleDeleteTemplate = useCallback(async (name: string) => {
    setDeleting(name);
    try {
      await deleteTemplate({ name });
      refreshTemplates();
    } catch {}
    setDeleting(null);
  }, [deleteTemplate, refreshTemplates]);

  return (
    <div style={css.container}>
      <div style={css.title}>Pipeline Controller Settings</div>

      {/* Config display (read-only since config is managed by Paperclip settings schema) */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Current Configuration</div>
        <div style={css.field}>
          <span style={css.label}>Site API URL</span>
          <div style={{ fontSize: "13px" }}>{config.siteApiUrl || "(not set)"}</div>
        </div>
        <div style={css.field}>
          <span style={css.label}>Site API Token</span>
          <div style={{ fontSize: "13px" }}>{config.siteApiToken ? "***configured***" : "(not set)"}</div>
        </div>
        <div style={css.field}>
          <span style={css.label}>Telegram Bot Token</span>
          <div style={{ fontSize: "13px" }}>{config.telegramBotToken ? "***configured***" : "(not set)"}</div>
        </div>
        <div style={css.field}>
          <span style={css.label}>Telegram Chat ID</span>
          <div style={{ fontSize: "13px" }}>{config.telegramChatId || "(not set)"}</div>
        </div>
        <div style={css.field}>
          <span style={css.label}>Stuck Thresholds</span>
          <div style={{ fontSize: "13px" }}>
            Todo: {config.stuckTodoMinutes ?? 30}m | In-Progress: {config.stuckInProgressMinutes ?? 60}m
          </div>
        </div>
        <div style={css.hint}>
          Edit these values in the plugin settings JSON above.
        </div>
      </div>

      {/* Templates */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Pipeline Templates</div>
        <div style={css.hint}>
          Create templates from the Pipeline tab on any issue. Manage them here.
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
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
          Telegram alerts are <strong>exception-only</strong>:
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            <li>Task genuinely stuck (threshold exceeded)</li>
            <li>Content verification failed</li>
            <li>Pipeline completed (final step done)</li>
          </ul>
          No alerts for: normal step transitions, tasks being picked up, or routine progress.
        </div>
      </div>
    </div>
  );
}
