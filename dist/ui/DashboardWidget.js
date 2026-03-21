import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", display: "grid", gap: "12px" },
    section: { borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" },
    sectionTitle: { fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" },
    pipeline: { marginBottom: "8px", padding: "6px 8px", borderRadius: "6px", background: "#f9fafb" },
    pipelineTitle: { fontWeight: 500, fontSize: "12px", marginBottom: "4px" },
    steps: { display: "flex", gap: "2px", flexWrap: "wrap", alignItems: "center" },
    step: (isCompleted, isCurrent) => ({
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "11px",
        background: isCompleted ? "#dcfce7" : isCurrent ? "#dbeafe" : "#f3f4f6",
        color: isCompleted ? "#166534" : isCurrent ? "#1e40af" : "#9ca3af",
        fontWeight: isCurrent ? 600 : 400,
    }),
    arrow: { color: "#d1d5db", fontSize: "10px" },
    stuckItem: { padding: "4px 8px", borderRadius: "4px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "12px" },
    stuckTitle: { color: "#991b1b", fontWeight: 500 },
    stuckAge: { color: "#dc2626", fontSize: "11px" },
    badge: (color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "#fff", background: color, padding: "0 4px" }),
    empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" },
    refreshBtn: { padding: "3px 10px", fontSize: "11px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
};
export function PipelineDashboardWidget({ context }) {
    const { data, loading, error, refresh } = usePluginData("pipeline-status", { companyId: context.companyId });
    if (loading)
        return _jsx("div", { style: css.container, children: "Loading..." });
    if (error)
        return _jsxs("div", { style: css.container, children: ["Error: ", error.message] });
    if (!data)
        return _jsx("div", { style: css.container, children: "No data" });
    return (_jsxs("div", { style: css.container, children: [_jsxs("div", { style: css.section, children: [_jsxs("div", { style: css.sectionTitle, children: ["Active Pipelines", data.activePipelines.length > 0 && _jsx("span", { style: css.badge("#3b82f6"), children: data.activePipelines.length })] }), data.activePipelines.length === 0 ? (_jsx("div", { style: css.empty, children: "No active pipelines" })) : (data.activePipelines.map((p) => (_jsxs("div", { style: css.pipeline, children: [_jsxs("div", { style: css.pipelineTitle, children: [p.identifier, ": ", p.parentTitle] }), _jsx("div", { style: css.steps, children: p.steps.map((step, idx) => (_jsxs("span", { children: [idx > 0 && _jsx("span", { style: css.arrow, children: "\u2192" }), _jsx("span", { style: css.step(idx < p.currentStep, idx === p.currentStep), children: step.agent })] }, idx))) })] }, p.parentId))))] }), data.stuckIssues.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: css.sectionTitle, children: ["Stuck ", _jsx("span", { style: css.badge("#ef4444"), children: data.stuckIssues.length })] }), data.stuckIssues.slice(0, 5).map((s) => (_jsxs("div", { style: css.stuckItem, children: [_jsxs("span", { style: css.stuckTitle, children: [s.identifier, ": ", s.title] }), _jsxs("span", { style: css.stuckAge, children: [s.minutesStale, "m"] })] }, s.id)))] })), _jsx("button", { style: css.refreshBtn, onClick: refresh, children: "Refresh" })] }));
}
//# sourceMappingURL=DashboardWidget.js.map