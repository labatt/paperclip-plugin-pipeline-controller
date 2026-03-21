import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";
const styles = {
    container: {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        display: "grid",
        gap: "16px",
    },
    section: {
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "12px",
    },
    sectionTitle: {
        fontSize: "14px",
        fontWeight: 600,
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    pipeline: {
        marginBottom: "12px",
        padding: "8px",
        borderRadius: "6px",
        background: "#f9fafb",
    },
    pipelineTitle: {
        fontWeight: 500,
        marginBottom: "6px",
    },
    steps: {
        display: "flex",
        gap: "4px",
        flexWrap: "wrap",
        alignItems: "center",
    },
    step: (isCompleted, isCurrent) => ({
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        background: isCompleted ? "#dcfce7" : isCurrent ? "#dbeafe" : "#f3f4f6",
        color: isCompleted ? "#166534" : isCurrent ? "#1e40af" : "#6b7280",
        fontWeight: isCurrent ? 600 : 400,
        border: isCurrent ? "1px solid #93c5fd" : "1px solid transparent",
    }),
    arrow: {
        color: "#9ca3af",
        fontSize: "11px",
    },
    stuckItem: {
        padding: "6px 8px",
        borderRadius: "4px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        marginBottom: "4px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    stuckTitle: {
        color: "#991b1b",
        fontWeight: 500,
        fontSize: "12px",
    },
    stuckAge: {
        color: "#dc2626",
        fontSize: "11px",
    },
    completionItem: {
        padding: "4px 0",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px",
    },
    completionTitle: {
        color: "#374151",
    },
    completionTime: {
        color: "#9ca3af",
        fontSize: "11px",
    },
    empty: {
        color: "#9ca3af",
        fontSize: "12px",
        fontStyle: "italic",
    },
    badge: (color) => ({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "18px",
        height: "18px",
        borderRadius: "9px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#fff",
        background: color,
        padding: "0 5px",
    }),
};
function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 60)
        return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24)
        return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}
export function PipelineDashboardWidget({ context }) {
    const { data, loading, error, refresh } = usePluginData("pipeline-status", { companyId: context.companyId });
    if (loading)
        return _jsx("div", { style: styles.container, children: "Loading pipeline status..." });
    if (error)
        return _jsxs("div", { style: styles.container, children: ["Error: ", error.message] });
    if (!data)
        return _jsx("div", { style: styles.container, children: "No data" });
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionTitle, children: ["Active Pipelines", data.activePipelines.length > 0 && (_jsx("span", { style: styles.badge("#3b82f6"), children: data.activePipelines.length }))] }), data.activePipelines.length === 0 ? (_jsx("div", { style: styles.empty, children: "No active pipelines" })) : (data.activePipelines
                        .filter((p) => p.status !== "done")
                        .map((p) => (_jsxs("div", { style: styles.pipeline, children: [_jsx("div", { style: styles.pipelineTitle, children: p.parentTitle }), _jsx("div", { style: styles.steps, children: p.pipeline.steps.map((step, idx) => {
                                    const currentStep = p.progress?.currentStep ?? 0;
                                    const isCompleted = idx < currentStep;
                                    const isCurrent = idx === currentStep;
                                    return (_jsxs("span", { children: [idx > 0 && _jsx("span", { style: styles.arrow, children: " \u2192 " }), _jsx("span", { style: styles.step(isCompleted, isCurrent), children: step.agent })] }, idx));
                                }) })] }, p.parentId))))] }), _jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionTitle, children: ["Stuck Issues", data.stuckIssues.length > 0 && (_jsx("span", { style: styles.badge("#ef4444"), children: data.stuckIssues.length }))] }), data.stuckIssues.length === 0 ? (_jsx("div", { style: styles.empty, children: "No stuck issues" })) : (data.stuckIssues.slice(0, 5).map((s) => (_jsxs("div", { style: styles.stuckItem, children: [_jsx("span", { style: styles.stuckTitle, children: s.title }), _jsxs("span", { style: styles.stuckAge, children: [s.minutesStale, "m stale"] })] }, s.id))))] }), _jsxs("div", { children: [_jsxs("div", { style: styles.sectionTitle, children: ["Recent Completions", data.recentCompletions.length > 0 && (_jsx("span", { style: styles.badge("#22c55e"), children: data.recentCompletions.length }))] }), data.recentCompletions.length === 0 ? (_jsx("div", { style: styles.empty, children: "No recent completions" })) : (data.recentCompletions.slice(0, 5).map((c) => (_jsxs("div", { style: styles.completionItem, children: [_jsx("span", { style: styles.completionTitle, children: c.title }), _jsx("span", { style: styles.completionTime, children: timeAgo(c.completedAt) })] }, c.id))))] }), _jsx("button", { onClick: refresh, style: {
                    padding: "4px 12px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                }, children: "Refresh" })] }));
}
//# sourceMappingURL=DashboardWidget.js.map