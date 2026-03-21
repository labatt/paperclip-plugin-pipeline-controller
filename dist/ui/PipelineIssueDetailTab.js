import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "16px" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: "16px", fontWeight: 600 },
    section: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" },
    sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" },
    stepRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", marginBottom: "4px", background: "#f9fafb" },
    stepNum: { fontWeight: 600, color: "#6b7280", minWidth: "24px" },
    stepAgent: { fontWeight: 500, flex: 1 },
    stepRole: { color: "#6b7280", fontSize: "12px" },
    statusIcon: (status) => ({
        fontSize: "16px",
        marginRight: "4px",
    }),
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
    btnSmall: { padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
    select: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #d1d5db", flex: 1 },
    input: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #d1d5db", width: "120px" },
    progress: { display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" },
    progressStep: (status) => ({
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: status === "active" ? 600 : 400,
        background: status === "done" ? "#dcfce7" : status === "active" ? "#dbeafe" : "#f3f4f6",
        color: status === "done" ? "#166534" : status === "active" ? "#1e40af" : "#6b7280",
        border: status === "active" ? "1px solid #93c5fd" : "1px solid transparent",
    }),
    arrow: { color: "#9ca3af", fontSize: "11px" },
    empty: { color: "#9ca3af", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "24px" },
    templateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
    error: { color: "#dc2626", fontSize: "12px", marginTop: "4px" },
};
function statusIcon(status) {
    if (status === "done")
        return "\u2705";
    if (status === "active")
        return "\ud83d\udd04";
    return "\u23f3";
}
export function PipelineIssueDetailTab({ context }) {
    const issueId = context.entityId;
    const companyId = context.companyId;
    const { data, loading, error, refresh } = usePluginData("issue-pipeline", {
        entityId: issueId,
        companyId,
    });
    const { data: templatesData } = usePluginData("pipeline-templates");
    const savePipeline = usePluginAction("save-pipeline");
    const removePipeline = usePluginAction("remove-pipeline");
    const startPipeline = usePluginAction("start-pipeline");
    const saveTemplate = usePluginAction("save-template");
    const [editMode, setEditMode] = useState(false);
    const [editSteps, setEditSteps] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);
    const [saving, setSaving] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const pipeline = data?.pipeline ?? null;
    const agents = data?.agents ?? [];
    const templates = templatesData?.templates ?? [];
    const startEdit = useCallback(() => {
        setEditSteps(pipeline?.steps ? [...pipeline.steps] : []);
        setEditMode(true);
        setErrorMsg(null);
    }, [pipeline]);
    const addStep = useCallback(() => {
        if (agents.length === 0)
            return;
        const first = agents[0];
        setEditSteps((prev) => [...prev, { agent: first.name, agentId: first.id, role: "" }]);
    }, [agents]);
    const removeStep = useCallback((idx) => {
        setEditSteps((prev) => prev.filter((_, i) => i !== idx));
    }, []);
    const moveStep = useCallback((idx, dir) => {
        setEditSteps((prev) => {
            const next = [...prev];
            const target = idx + dir;
            if (target < 0 || target >= next.length)
                return prev;
            [next[idx], next[target]] = [next[target], next[idx]];
            return next;
        });
    }, []);
    const updateStep = useCallback((idx, field, value) => {
        setEditSteps((prev) => {
            const next = [...prev];
            const step = { ...next[idx] };
            if (field === "agentId") {
                step.agentId = value;
                step.agent = agents.find((a) => a.id === value)?.name ?? "";
            }
            else {
                step.role = value;
            }
            next[idx] = step;
            return next;
        });
    }, [agents]);
    const loadTemplate = useCallback((tmpl) => {
        setEditSteps([...tmpl.steps]);
    }, []);
    const handleSave = useCallback(async () => {
        if (editSteps.length === 0) {
            setErrorMsg("Add at least one step");
            return;
        }
        setSaving(true);
        setErrorMsg(null);
        try {
            await savePipeline({ issueId, steps: editSteps });
            setEditMode(false);
            refresh();
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Save failed");
        }
        finally {
            setSaving(false);
        }
    }, [editSteps, issueId, savePipeline, refresh]);
    const handleRemove = useCallback(async () => {
        setSaving(true);
        try {
            await removePipeline({ issueId });
            setEditMode(false);
            refresh();
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Remove failed");
        }
        finally {
            setSaving(false);
        }
    }, [issueId, removePipeline, refresh]);
    const handleStart = useCallback(async () => {
        setSaving(true);
        setErrorMsg(null);
        try {
            await startPipeline({ issueId, companyId });
            refresh();
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Start failed");
        }
        finally {
            setSaving(false);
        }
    }, [issueId, companyId, startPipeline, refresh]);
    const handleSaveTemplate = useCallback(async () => {
        if (!templateName.trim())
            return;
        const steps = pipeline?.steps ?? editSteps;
        if (steps.length === 0)
            return;
        try {
            await saveTemplate({ name: templateName.trim(), steps });
            setTemplateName("");
            refresh();
        }
        catch { }
    }, [templateName, pipeline, editSteps, saveTemplate, refresh]);
    if (loading)
        return _jsx("div", { style: css.container, children: "Loading..." });
    if (error)
        return _jsxs("div", { style: css.container, children: ["Error: ", error.message] });
    // ─── Edit Mode ───
    if (editMode) {
        return (_jsxs("div", { style: css.container, children: [_jsxs("div", { style: css.header, children: [_jsx("span", { style: css.title, children: "Edit Pipeline" }), _jsxs("div", { style: { display: "flex", gap: "6px" }, children: [_jsx("button", { style: css.btn("secondary"), onClick: () => setEditMode(false), children: "Cancel" }), _jsx("button", { style: css.btn("primary"), onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save" })] })] }), templates.length > 0 && (_jsxs("div", { children: [_jsx("span", { style: { fontSize: "12px", color: "#6b7280" }, children: "Load template: " }), templates.map((t) => (_jsx("button", { style: css.btnSmall, onClick: () => loadTemplate(t), children: t.name }, t.name)))] })), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Steps" }), editSteps.map((step, idx) => (_jsxs("div", { style: css.stepRow, children: [_jsx("span", { style: css.stepNum, children: idx + 1 }), _jsx("select", { style: css.select, value: step.agentId, onChange: (e) => updateStep(idx, "agentId", e.target.value), children: agents.map((a) => (_jsx("option", { value: a.id, children: a.name }, a.id))) }), _jsx("input", { style: css.input, value: step.role, onChange: (e) => updateStep(idx, "role", e.target.value), placeholder: "Role (e.g. research)" }), _jsx("button", { style: css.btnSmall, onClick: () => moveStep(idx, -1), disabled: idx === 0, children: "\u2191" }), _jsx("button", { style: css.btnSmall, onClick: () => moveStep(idx, 1), disabled: idx === editSteps.length - 1, children: "\u2193" }), _jsx("button", { style: { ...css.btnSmall, color: "#dc2626" }, onClick: () => removeStep(idx), children: "\u00D7" })] }, idx))), _jsx("button", { style: { ...css.btnSmall, marginTop: "8px" }, onClick: addStep, children: "+ Add Step" })] }), _jsxs("div", { style: { display: "flex", gap: "6px", alignItems: "center" }, children: [_jsx("input", { style: css.input, value: templateName, onChange: (e) => setTemplateName(e.target.value), placeholder: "Template name" }), _jsx("button", { style: css.btnSmall, onClick: handleSaveTemplate, disabled: !templateName.trim(), children: "Save as Template" })] }), errorMsg && _jsx("div", { style: css.error, children: errorMsg })] }));
    }
    // ─── View Mode ───
    if (!pipeline || pipeline.steps.length === 0) {
        return (_jsx("div", { style: css.container, children: _jsxs("div", { style: css.empty, children: [_jsx("div", { style: { marginBottom: "8px" }, children: "No pipeline configured for this issue." }), _jsx("button", { style: css.btn("primary"), onClick: startEdit, children: "Create Pipeline" })] }) }));
    }
    // Determine step statuses
    const stepStatuses = pipeline.steps.map((_, idx) => {
        if (idx < pipeline.currentStep)
            return "done";
        if (idx === pipeline.currentStep)
            return "active";
        return "pending";
    });
    return (_jsxs("div", { style: css.container, children: [_jsxs("div", { style: css.header, children: [_jsxs("span", { style: css.title, children: ["Pipeline ", pipeline.templateName ? `(${pipeline.templateName})` : ""] }), _jsxs("div", { style: { display: "flex", gap: "6px" }, children: [_jsx("button", { style: css.btn("secondary"), onClick: startEdit, children: "Edit" }), pipeline.currentStep === 0 && pipeline.completedSteps.length === 0 && (_jsx("button", { style: css.btn("primary"), onClick: handleStart, disabled: saving, children: "Start Pipeline" })), _jsx("button", { style: css.btn("danger"), onClick: handleRemove, disabled: saving, children: "Remove" })] })] }), _jsx("div", { style: css.progress, children: pipeline.steps.map((step, idx) => (_jsxs("span", { children: [idx > 0 && _jsx("span", { style: css.arrow, children: " \u2192 " }), _jsxs("span", { style: css.progressStep(stepStatuses[idx]), children: [statusIcon(stepStatuses[idx]), " ", step.agent] })] }, idx))) }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Steps" }), pipeline.steps.map((step, idx) => (_jsxs("div", { style: css.stepRow, children: [_jsx("span", { style: css.stepNum, children: idx + 1 }), _jsx("span", { style: { fontSize: "16px" }, children: statusIcon(stepStatuses[idx]) }), _jsx("span", { style: css.stepAgent, children: step.agent }), _jsx("span", { style: css.stepRole, children: step.role })] }, idx)))] }), errorMsg && _jsx("div", { style: css.error, children: errorMsg }), _jsx("button", { style: css.btnSmall, onClick: refresh, children: "Refresh" })] }));
}
//# sourceMappingURL=PipelineIssueDetailTab.js.map