import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
const CHANNEL_TYPES = [
    { value: "webhook", label: "Webhook (generic)" },
    { value: "slack", label: "Slack" },
    { value: "discord", label: "Discord" },
    { value: "telegram", label: "Telegram" },
    { value: "email", label: "Email" },
];
/* ── Theme-aware styles using CSS variables ── */
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "20px", maxWidth: "640px", color: "var(--foreground)" },
    title: { fontSize: "18px", fontWeight: 600, color: "var(--foreground)" },
    section: { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", background: "var(--card)", color: "var(--card-foreground)" },
    sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" },
    sectionHelp: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginBottom: "12px" },
    field: { marginBottom: "12px" },
    label: { display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px", color: "var(--foreground)" },
    hint: { fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" },
    input: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" },
    select: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" },
    btn: (variant) => ({
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: 500,
        borderRadius: "6px",
        border: variant === "primary" ? "none" : "1px solid var(--border)",
        background: variant === "primary" ? "var(--primary)" : variant === "danger" ? "var(--destructive)" : "var(--secondary)",
        color: variant === "primary" ? "var(--primary-foreground)" : variant === "danger" ? "var(--destructive-foreground)" : "var(--secondary-foreground)",
        cursor: "pointer",
    }),
    templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "var(--muted)", marginBottom: "6px" },
    templateName: { fontWeight: 500, color: "var(--foreground)" },
    templateSteps: { fontSize: "12px", color: "var(--muted-foreground)" },
    empty: { color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" },
    legacyWarning: { padding: "8px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)", marginBottom: "12px" },
    successMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)" },
    errorMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--destructive)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--destructive-foreground)" },
    row: { display: "flex", gap: "8px", alignItems: "center" },
    fieldValue: { fontSize: "13px", color: "var(--foreground)" },
};
export function PipelineSettingsPage({ context }) {
    const { data: configData } = usePluginData("plugin-config");
    const { data: templatesData, refresh: refreshTemplates } = usePluginData("pipeline-templates");
    const deleteTemplate = usePluginAction("delete-template");
    const testNotification = usePluginAction("test-notification");
    const updatePrefix = usePluginAction("update-prefix");
    const [deleting, setDeleting] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [prefixValue, setPrefixValue] = useState(null);
    const [prefixSaving, setPrefixSaving] = useState(false);
    const [prefixSaved, setPrefixSaved] = useState(false);
    const [payloadRefOpen, setPayloadRefOpen] = useState(false);
    const config = configData ?? {};
    const channel = config.notificationChannel ?? {};
    const templates = templatesData?.templates ?? [];
    const hasLegacyTelegram = !!(config.telegramBotToken && !channel.enabled);
    const channelType = channel.type ?? "webhook";
    const handleDeleteTemplate = useCallback(async (name) => {
        setDeleting(name);
        try {
            await deleteTemplate({ name });
            refreshTemplates();
        }
        catch { }
        setDeleting(null);
    }, [deleteTemplate, refreshTemplates]);
    const handlePrefixSave = useCallback(async () => {
        if (prefixValue == null)
            return;
        setPrefixSaving(true);
        setPrefixSaved(false);
        try {
            await updatePrefix({ value: prefixValue });
            setPrefixSaved(true);
            setTimeout(() => setPrefixSaved(false), 2000);
        }
        catch { }
        setPrefixSaving(false);
    }, [updatePrefix, prefixValue]);
    const handleTestNotification = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        try {
            await testNotification({});
            setTestResult({ ok: true, msg: "Test notification sent successfully!" });
        }
        catch (err) {
            setTestResult({ ok: false, msg: err instanceof Error ? err.message : "Test failed" });
        }
        setTesting(false);
    }, [testNotification]);
    return (_jsxs("div", { style: css.container, children: [_jsx("div", { style: css.title, children: "Pipeline Controller Settings" }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Notification Channel" }), _jsx("div", { style: css.sectionHelp, children: "Configure where alerts are sent when something needs attention. Notifications are exception-only: stuck tasks, verification failures, and pipeline completions. Pick a channel type below and fill in the matching fields in the JSON config above." }), hasLegacyTelegram && (_jsx("div", { style: css.legacyWarning, children: "Legacy Telegram config detected at top level. These will continue to work but consider migrating to the notification channel config below for more flexibility." })), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Channel Type" }), _jsx("div", { style: css.fieldValue, children: CHANNEL_TYPES.find((ct) => ct.value === channelType)?.label ?? channelType })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Enabled" }), _jsx("div", { style: css.fieldValue, children: channel.enabled ? "Yes" : "No" })] }), (channelType === "webhook" || channelType === "slack" || channelType === "discord") && (_jsxs(_Fragment, { children: [_jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Webhook URL" }), _jsx("div", { style: css.fieldValue, children: channel.webhookUrl || "(not set)" }), _jsx("div", { style: css.hint, children: channelType === "slack" ? "Use the Incoming Webhook URL from your Slack workspace settings." :
                                            channelType === "discord" ? "Use the webhook URL from your Discord channel's integrations." :
                                                "Any HTTP endpoint that accepts JSON payloads." })] }), channelType === "webhook" && (_jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "HTTP Method" }), _jsx("div", { style: css.fieldValue, children: channel.webhookMethod ?? "POST" })] })), channelType === "webhook" && channel.webhookHeaders && Object.keys(channel.webhookHeaders).length > 0 && (_jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Custom Headers" }), _jsxs("div", { style: { fontSize: "12px", color: "var(--muted-foreground)" }, children: [Object.keys(channel.webhookHeaders).length, " header(s) configured"] })] }))] })), channelType === "telegram" && (_jsxs(_Fragment, { children: [_jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Telegram Bot Token" }), _jsx("div", { style: css.fieldValue, children: channel.telegramBotToken ? "***configured***" : "(not set)" }), _jsx("div", { style: css.hint, children: "Create a bot via @BotFather on Telegram to get a token." })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Telegram Chat ID" }), _jsx("div", { style: css.fieldValue, children: channel.telegramChatId || "(not set)" }), _jsx("div", { style: css.hint, children: "Numeric ID of the chat or group where alerts should go." })] })] })), channelType === "email" && (_jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Email API Endpoint" }), _jsx("div", { style: css.fieldValue, children: channel.emailEndpoint || "(not set)" }), _jsx("div", { style: css.hint, children: "URL of your email-sending service that accepts JSON POSTs." })] })), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Notification Prefix" }), _jsxs("div", { style: css.row, children: [_jsx("input", { style: css.input, type: "text", maxLength: 255, value: prefixValue ?? config.notificationPrefix ?? "\u2699\ufe0f Pipeline Controller", onChange: (e) => setPrefixValue(e.target.value), onBlur: handlePrefixSave, placeholder: "\\u2699\\ufe0f Pipeline Controller" }), _jsx("button", { style: css.btn("secondary"), onClick: handlePrefixSave, disabled: prefixSaving || prefixValue == null, children: prefixSaving ? "Saving..." : prefixSaved ? "Saved!" : "Save" })] }), _jsx("div", { style: css.hint, children: "Short label prepended to every alert so recipients can identify the source at a glance. Max 255 characters." })] }), _jsxs("div", { style: { marginTop: "12px", ...css.row }, children: [_jsx("button", { style: css.btn("primary"), onClick: handleTestNotification, disabled: testing, children: testing ? "Sending..." : "Test Notification" }), testResult && (_jsx("div", { style: testResult.ok ? css.successMsg : css.errorMsg, children: testResult.msg }))] })] }), _jsxs("div", { style: css.section, children: [_jsxs("div", { style: { ...css.sectionTitle, cursor: "pointer", userSelect: "none" }, onClick: () => setPayloadRefOpen(!payloadRefOpen), children: [payloadRefOpen ? "\u25BE" : "\u25B8", " Payload Reference"] }), _jsx("div", { style: css.sectionHelp, children: "Exact JSON payloads sent for each notification event, and how each channel renders them." }), payloadRefOpen && (_jsxs("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.6" }, children: [_jsxs("div", { style: { marginBottom: "12px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Base payload (all channels):" }), _jsx("pre", { style: {
                                            background: "var(--muted)",
                                            padding: "10px",
                                            borderRadius: "6px",
                                            overflow: "auto",
                                            fontSize: "11px",
                                            lineHeight: "1.4",
                                            marginTop: "4px",
                                        }, children: `{
  "event": "pipeline.stuck | pipeline.complete | pipeline.step_advanced | verification.failed",
  "prefix": "⚙️ Pipeline Alert",
  "title": "FAI-84 stuck for 45 minutes",
  "message": "Full description of what happened",
  "issueIdentifier": "FAI-84",
  "issueId": "uuid",
  "issueUrl": "https://paperclip.example.com/issues/FAI-84",
  "timestamp": "2026-03-21T16:40:00Z",
  "severity": "high | medium | low"
}` })] }), _jsxs("div", { style: { marginBottom: "12px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Webhook (generic):" }), _jsxs("div", { children: ["Raw JSON POST to the configured URL. The base payload above is sent as-is in the request body with ", _jsx("code", { children: "Content-Type: application/json" }), ". Custom headers are included if configured."] })] }), _jsxs("div", { style: { marginBottom: "12px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Slack:" }), _jsx("div", { children: "Formatted as Slack Block Kit attachments with color-coded severity sidebar:" }), _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsx("li", { children: "Green (#22c55e) for pipeline.complete" }), _jsx("li", { children: "Amber (#f59e0b) for pipeline.stuck" }), _jsx("li", { children: "Red (#ef4444) for verification.failed" })] }), _jsx("div", { children: "Includes header block (title), section block (message), optional link block, and context block (event type + timestamp)." })] }), _jsxs("div", { style: { marginBottom: "12px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Discord:" }), _jsx("div", { children: "Formatted as Discord embed with color-coded border:" }), _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsx("li", { children: "Green (0x22c55e) for pipeline.complete" }), _jsx("li", { children: "Amber (0xf59e0b) for pipeline.stuck" }), _jsx("li", { children: "Red (0xef4444) for verification.failed" })] }), _jsx("div", { children: "Includes embed title, description (message), inline fields (Issue ID, Event type), timestamp, and optional URL linking to the issue." })] }), _jsxs("div", { style: { marginBottom: "12px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Telegram:" }), _jsxs("div", { children: ["Sent via ", _jsx("code", { children: "sendMessage" }), " API with ", _jsx("code", { children: "parse_mode: \"HTML\"" }), ". Format:"] }), _jsx("pre", { style: {
                                            background: "var(--muted)",
                                            padding: "10px",
                                            borderRadius: "6px",
                                            overflow: "auto",
                                            fontSize: "11px",
                                            lineHeight: "1.4",
                                            marginTop: "4px",
                                        }, children: `<b>FAI-84 stuck for 45 minutes</b>
⚙️ Pipeline Alert: Full description of what happened
<a href="https://paperclip.example.com/issues/FAI-84">View Issue</a>` })] }), _jsxs("div", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Email:" }), _jsxs("div", { children: ["JSON POST to the configured email API endpoint with fields: ", _jsx("code", { children: "subject" }), " (title), ", _jsx("code", { children: "body" }), " (message), ", _jsx("code", { children: "event" }), ", ", _jsx("code", { children: "issueId" }), ", ", _jsx("code", { children: "issueUrl" }), ", ", _jsx("code", { children: "timestamp" }), ". Custom headers are included if configured."] })] })] }))] }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Stuck Detection" }), _jsx("div", { style: css.sectionHelp, children: "Tasks that sit too long without activity are flagged as \"stuck\" and trigger an alert. Adjust these thresholds based on your team's expected response times." }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Stuck Todo Threshold" }), _jsxs("div", { style: css.fieldValue, children: [config.stuckTodoMinutes ?? 30, " minutes"] }), _jsx("div", { style: css.hint, children: "How long an assigned task can remain in \"todo\" before an alert fires." })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Stuck In-Progress Threshold" }), _jsxs("div", { style: css.fieldValue, children: [config.stuckInProgressMinutes ?? 60, " minutes"] }), _jsx("div", { style: css.hint, children: "How long an \"in_progress\" task can go without updates before an alert fires." })] })] }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Pipeline Templates" }), _jsx("div", { style: css.sectionHelp, children: "Reusable agent sequences you can apply to new issues with one click. Create templates from the Pipeline tab on any issue, then manage (or delete) them here." }), _jsx("div", { style: { marginTop: "12px" }, children: templates.length === 0 ? (_jsx("div", { style: css.empty, children: "No templates saved yet." })) : (templates.map((t) => (_jsxs("div", { style: css.templateCard, children: [_jsxs("div", { children: [_jsx("div", { style: css.templateName, children: t.name }), _jsx("div", { style: css.templateSteps, children: t.steps.map((s) => s.agent).join(" > ") })] }), _jsx("button", { style: css.btn("danger"), onClick: () => handleDeleteTemplate(t.name), disabled: deleting === t.name, children: deleting === t.name ? "..." : "Delete" })] }, t.name)))) })] }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Alert Behavior" }), _jsx("div", { style: css.sectionHelp, children: "Understanding when (and when not) you will receive notifications." }), _jsxs("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" }, children: ["Notifications are ", _jsx("strong", { style: { color: "var(--foreground)" }, children: "exception-only" }), ":", _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsx("li", { children: "Task genuinely stuck (threshold exceeded)" }), _jsx("li", { children: "Content verification failed (from a verifier plugin)" }), _jsx("li", { children: "Pipeline completed (final step done)" })] }), "No alerts for: normal step transitions, tasks being picked up, or routine progress."] }), _jsxs("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginTop: "8px" }, children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Supported channels:" }), _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsxs("li", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Webhook (generic)" }), " - sends JSON payload to any URL"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Slack" }), " - formats as Slack blocks with color coding"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Discord" }), " - formats as Discord embed with color coding"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Telegram" }), " - sends HTML-formatted message via Bot API"] }), _jsxs("li", { children: [_jsx("strong", { style: { color: "var(--foreground)" }, children: "Email" }), " - POSTs JSON payload to an email API endpoint"] })] })] })] })] }));
}
//# sourceMappingURL=PipelineSettingsPage.js.map