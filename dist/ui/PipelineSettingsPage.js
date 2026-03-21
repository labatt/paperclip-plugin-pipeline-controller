import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "20px", maxWidth: "640px" },
    title: { fontSize: "18px", fontWeight: 600 },
    section: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" },
    sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "12px" },
    field: { marginBottom: "12px" },
    label: { display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "4px", color: "#374151" },
    hint: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    input: { width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" },
    btn: (variant) => ({
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: 500,
        borderRadius: "6px",
        border: variant === "primary" ? "none" : "1px solid #d1d5db",
        background: variant === "primary" ? "#3b82f6" : variant === "danger" ? "#ef4444" : "#fff",
        color: variant === "primary" || variant === "danger" ? "#fff" : "#374151",
        cursor: "pointer",
    }),
    templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "#f9fafb", marginBottom: "6px" },
    templateName: { fontWeight: 500 },
    templateSteps: { fontSize: "12px", color: "#6b7280" },
    empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" },
};
export function PipelineSettingsPage({ context }) {
    const { data: configData } = usePluginData("plugin-config");
    const { data: templatesData, refresh: refreshTemplates } = usePluginData("pipeline-templates");
    const deleteTemplate = usePluginAction("delete-template");
    const [deleting, setDeleting] = useState(null);
    const config = configData ?? {};
    const templates = templatesData?.templates ?? [];
    const handleDeleteTemplate = useCallback(async (name) => {
        setDeleting(name);
        try {
            await deleteTemplate({ name });
            refreshTemplates();
        }
        catch { }
        setDeleting(null);
    }, [deleteTemplate, refreshTemplates]);
    return (_jsxs("div", { style: css.container, children: [_jsx("div", { style: css.title, children: "Pipeline Controller Settings" }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Current Configuration" }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Site API URL" }), _jsx("div", { style: { fontSize: "13px" }, children: config.siteApiUrl || "(not set)" })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Site API Token" }), _jsx("div", { style: { fontSize: "13px" }, children: config.siteApiToken ? "***configured***" : "(not set)" })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Telegram Bot Token" }), _jsx("div", { style: { fontSize: "13px" }, children: config.telegramBotToken ? "***configured***" : "(not set)" })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Telegram Chat ID" }), _jsx("div", { style: { fontSize: "13px" }, children: config.telegramChatId || "(not set)" })] }), _jsxs("div", { style: css.field, children: [_jsx("span", { style: css.label, children: "Stuck Thresholds" }), _jsxs("div", { style: { fontSize: "13px" }, children: ["Todo: ", config.stuckTodoMinutes ?? 30, "m | In-Progress: ", config.stuckInProgressMinutes ?? 60, "m"] })] }), _jsx("div", { style: css.hint, children: "Edit these values in the plugin settings JSON above." })] }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Pipeline Templates" }), _jsx("div", { style: css.hint, children: "Create templates from the Pipeline tab on any issue. Manage them here." }), _jsx("div", { style: { marginTop: "12px" }, children: templates.length === 0 ? (_jsx("div", { style: css.empty, children: "No templates saved yet." })) : (templates.map((t) => (_jsxs("div", { style: css.templateCard, children: [_jsxs("div", { children: [_jsx("div", { style: css.templateName, children: t.name }), _jsx("div", { style: css.templateSteps, children: t.steps.map((s) => s.agent).join(" > ") })] }), _jsx("button", { style: css.btn("danger"), onClick: () => handleDeleteTemplate(t.name), disabled: deleting === t.name, children: deleting === t.name ? "..." : "Delete" })] }, t.name)))) })] }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Alert Behavior" }), _jsxs("div", { style: { fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }, children: ["Telegram alerts are ", _jsx("strong", { children: "exception-only" }), ":", _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsx("li", { children: "Task genuinely stuck (threshold exceeded)" }), _jsx("li", { children: "Content verification failed" }), _jsx("li", { children: "Pipeline completed (final step done)" })] }), "No alerts for: normal step transitions, tasks being picked up, or routine progress."] })] })] }));
}
//# sourceMappingURL=PipelineSettingsPage.js.map