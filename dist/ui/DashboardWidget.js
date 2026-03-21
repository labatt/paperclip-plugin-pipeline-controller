import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";
/* ── Theme-aware styles using CSS variables ── */
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", display: "grid", gap: "12px", color: "var(--foreground)" },
    section: { borderBottom: "1px solid var(--border)", paddingBottom: "10px" },
    sectionTitle: { fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", color: "var(--foreground)" },
    pipeline: { marginBottom: "8px", padding: "6px 8px", borderRadius: "6px", background: "var(--muted)" },
    pipelineTitle: { fontWeight: 500, fontSize: "12px", marginBottom: "4px", color: "var(--foreground)" },
    steps: { display: "flex", gap: "2px", flexWrap: "wrap", alignItems: "center" },
    step: (isCompleted, isCurrent) => ({
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "11px",
        background: isCompleted ? "var(--accent)" : isCurrent ? "var(--accent)" : "var(--muted)",
        color: isCompleted ? "var(--accent-foreground)" : isCurrent ? "var(--accent-foreground)" : "var(--muted-foreground)",
        fontWeight: isCurrent ? 600 : 400,
    }),
    arrow: { color: "var(--muted-foreground)", fontSize: "10px" },
    stuckItem: { padding: "4px 8px", borderRadius: "4px", background: "var(--destructive)", border: "1px solid var(--border)", marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "12px" },
    stuckTitle: { color: "var(--destructive-foreground)", fontWeight: 500 },
    stuckAge: { color: "var(--destructive-foreground)", fontSize: "11px" },
    badge: (color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "var(--primary-foreground)", background: "var(--primary)", padding: "0 4px" }),
    badgeDanger: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "var(--destructive-foreground)", background: "var(--destructive)", padding: "0 4px" },
    empty: { color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" },
    refreshBtn: { padding: "3px 10px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-foreground)", cursor: "pointer" },
};
export function PipelineDashboardWidget({ context }) {
    const { data, loading, error, refresh } = usePluginData("pipeline-status", { companyId: context.companyId });
    if (loading)
        return _jsx("div", { style: css.container, children: "Loading..." });
    if (error)
        return _jsxs("div", { style: css.container, children: ["Error: ", error.message] });
    if (!data)
        return _jsx("div", { style: css.container, children: "No data" });
    return (_jsxs("div", { style: css.container, children: [_jsxs("div", { style: css.section, children: [_jsxs("div", { style: css.sectionTitle, children: ["Active Pipelines", data.activePipelines.length > 0 && _jsx("span", { style: css.badge("#3b82f6"), children: data.activePipelines.length })] }), data.activePipelines.length === 0 ? (_jsx("div", { style: css.empty, children: "No active pipelines" })) : (data.activePipelines.map((p) => (_jsxs("div", { style: css.pipeline, children: [_jsxs("div", { style: css.pipelineTitle, children: [p.identifier, ": ", p.parentTitle] }), _jsx("div", { style: css.steps, children: p.steps.map((step, idx) => (_jsxs("span", { children: [idx > 0 && _jsx("span", { style: css.arrow, children: "\u2192" }), _jsx("span", { style: css.step(idx < p.currentStep, idx === p.currentStep), children: step.agent })] }, idx))) })] }, p.parentId))))] }), data.stuckIssues.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: css.sectionTitle, children: ["Stuck ", _jsx("span", { style: css.badgeDanger, children: data.stuckIssues.length })] }), data.stuckIssues.slice(0, 5).map((s) => (_jsxs("div", { style: css.stuckItem, children: [_jsxs("span", { style: css.stuckTitle, children: [s.identifier, ": ", s.title] }), _jsxs("span", { style: css.stuckAge, children: [s.minutesStale, "m"] })] }, s.id)))] })), _jsx("button", { style: css.refreshBtn, onClick: refresh, children: "Refresh" })] }));
}
//# sourceMappingURL=DashboardWidget.js.map