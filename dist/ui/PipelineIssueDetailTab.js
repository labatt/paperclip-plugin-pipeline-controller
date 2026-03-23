import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
/* ── Theme-aware styles using CSS variables ── */
const css = {
    container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "16px", color: "var(--foreground)" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: "16px", fontWeight: 600, color: "var(--foreground)" },
    helpBox: { padding: "10px 14px", borderRadius: "8px", background: "var(--muted)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" },
    section: { border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "var(--card)", color: "var(--card-foreground)" },
    sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" },
    stepRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", marginBottom: "4px", background: "var(--muted)" },
    stepNum: { fontWeight: 600, color: "var(--muted-foreground)", minWidth: "24px" },
    stepAgent: { fontWeight: 500, flex: 1, color: "var(--foreground)" },
    stepRole: { color: "var(--muted-foreground)", fontSize: "12px" },
    statusIcon: (status) => ({
        fontSize: "16px",
        marginRight: "4px",
    }),
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
    btnSmall: { padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-foreground)", cursor: "pointer" },
    select: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", flex: 1 },
    input: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", width: "120px" },
    progress: { display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" },
    progressStep: (status) => ({
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: status === "active" ? 600 : 400,
        background: status === "done" ? "var(--accent)" : status === "active" ? "var(--accent)" : "var(--muted)",
        color: status === "done" ? "var(--accent-foreground)" : status === "active" ? "var(--accent-foreground)" : "var(--muted-foreground)",
        border: status === "active" ? "1px solid var(--ring)" : "1px solid transparent",
    }),
    arrow: { color: "var(--muted-foreground)", fontSize: "11px" },
    empty: { color: "var(--muted-foreground)", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "24px" },
    templateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
    error: { color: "var(--destructive)", fontSize: "12px", marginTop: "4px" },
    verifierRow: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", paddingLeft: "32px", marginBottom: "6px", fontSize: "11px", color: "var(--muted-foreground)" },
    verifierCheckbox: { display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer", fontSize: "11px", color: "var(--foreground)" },
    verifierLabel: { fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", marginRight: "4px" },
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
    const [helpExpanded, setHelpExpanded] = useState(false);
    const pipeline = data?.pipeline ?? null;
    const agents = data?.agents ?? [];
    const availableVerifiers = data?.availableVerifiers ?? [];
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
    const toggleVerifier = useCallback((idx, pluginId) => {
        setEditSteps((prev) => {
            const next = [...prev];
            const step = { ...next[idx] };
            const current = step.verifiers ?? [];
            if (current.includes(pluginId)) {
                step.verifiers = current.filter((v) => v !== pluginId);
            }
            else {
                step.verifiers = [...current, pluginId];
            }
            if (step.verifiers.length === 0) {
                delete step.verifiers;
            }
            next[idx] = step;
            return next;
        });
    }, []);
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
    /* ─── Help Description ─── */
    const helpSection = (_jsxs("div", { style: css.helpBox, children: [_jsxs("div", { children: ["Define the agent handoff path for this task. Add agents in order -- each step runs automatically after the previous one completes.", " ", _jsx("span", { style: { cursor: "pointer", textDecoration: "underline" }, onClick: () => setHelpExpanded(!helpExpanded), children: helpExpanded ? "Show less" : "Learn more" })] }), helpExpanded && (_jsx("div", { style: { marginTop: "8px" }, children: _jsxs("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [_jsxs("li", { children: ["Click ", _jsx("strong", { children: "Create Pipeline" }), " or ", _jsx("strong", { children: "Edit" }), " to add agents as pipeline steps."] }), _jsx("li", { children: "When an agent marks their step done, the next step is automatically created and assigned." }), _jsxs("li", { children: ["Click ", _jsx("strong", { children: "Start Pipeline" }), " after defining steps to kick things off."] }), _jsx("li", { children: "You can save a pipeline as a template and reuse it on other issues." })] }) }))] }));
    // ─── Edit Mode ───
    if (editMode) {
        return (_jsxs("div", { style: css.container, children: [helpSection, _jsxs("div", { style: css.header, children: [_jsx("span", { style: css.title, children: "Edit Pipeline" }), _jsxs("div", { style: { display: "flex", gap: "6px" }, children: [_jsx("button", { style: css.btn("secondary"), onClick: () => setEditMode(false), children: "Cancel" }), _jsx("button", { style: css.btn("primary"), onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save" })] })] }), templates.length > 0 && (_jsxs("div", { children: [_jsx("span", { style: { fontSize: "12px", color: "var(--muted-foreground)" }, children: "Load template: " }), templates.map((t) => (_jsx("button", { style: css.btnSmall, onClick: () => loadTemplate(t), children: t.name }, t.name)))] })), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Steps" }), editSteps.map((step, idx) => (_jsxs("div", { children: [_jsxs("div", { style: css.stepRow, children: [_jsx("span", { style: css.stepNum, children: idx + 1 }), _jsx("select", { style: css.select, value: step.agentId, onChange: (e) => updateStep(idx, "agentId", e.target.value), children: agents.map((a) => (_jsx("option", { value: a.id, children: a.name }, a.id))) }), _jsx("input", { style: css.input, value: step.role, onChange: (e) => updateStep(idx, "role", e.target.value), placeholder: "Role (e.g. research)" }), _jsx("button", { style: css.btnSmall, onClick: () => moveStep(idx, -1), disabled: idx === 0, children: "\u2191" }), _jsx("button", { style: css.btnSmall, onClick: () => moveStep(idx, 1), disabled: idx === editSteps.length - 1, children: "\u2193" }), _jsx("button", { style: { ...css.btnSmall, color: "var(--destructive)" }, onClick: () => removeStep(idx), children: "\u00D7" })] }), availableVerifiers.length > 0 && (_jsxs("div", { style: css.verifierRow, children: [_jsx("span", { style: css.verifierLabel, children: "Verifiers:" }), availableVerifiers.map((v) => (_jsxs("label", { style: css.verifierCheckbox, children: [_jsx("input", { type: "checkbox", checked: step.verifiers?.includes(v.pluginId) ?? false, onChange: () => toggleVerifier(idx, v.pluginId) }), v.displayName] }, v.pluginId)))] }))] }, idx))), _jsx("button", { style: { ...css.btnSmall, marginTop: "8px" }, onClick: addStep, children: "+ Add Step" })] }), _jsxs("div", { style: { display: "flex", gap: "6px", alignItems: "center" }, children: [_jsx("input", { style: css.input, value: templateName, onChange: (e) => setTemplateName(e.target.value), placeholder: "Template name" }), _jsx("button", { style: css.btnSmall, onClick: handleSaveTemplate, disabled: !templateName.trim(), children: "Save as Template" })] }), errorMsg && _jsx("div", { style: css.error, children: errorMsg })] }));
    }
    // ─── View Mode ───
    if (!pipeline || pipeline.steps.length === 0) {
        return (_jsxs("div", { style: css.container, children: [helpSection, _jsxs("div", { style: css.empty, children: [_jsx("div", { style: { marginBottom: "8px" }, children: "No pipeline configured for this issue." }), _jsx("button", { style: css.btn("primary"), onClick: startEdit, children: "Create Pipeline" })] })] }));
    }
    // Determine step statuses
    const stepStatuses = pipeline.steps.map((_, idx) => {
        if (idx < pipeline.currentStep)
            return "done";
        if (idx === pipeline.currentStep)
            return "active";
        return "pending";
    });
    return (_jsxs("div", { style: css.container, children: [helpSection, _jsxs("div", { style: css.header, children: [_jsxs("span", { style: css.title, children: ["Pipeline ", pipeline.templateName ? `(${pipeline.templateName})` : ""] }), _jsxs("div", { style: { display: "flex", gap: "6px" }, children: [_jsx("button", { style: css.btn("secondary"), onClick: startEdit, children: "Edit" }), pipeline.currentStep === 0 && pipeline.completedSteps.length === 0 && (_jsx("button", { style: css.btn("primary"), onClick: handleStart, disabled: saving, children: "Start Pipeline" })), _jsx("button", { style: css.btn("danger"), onClick: handleRemove, disabled: saving, children: "Remove" })] })] }), _jsx("div", { style: css.progress, children: pipeline.steps.map((step, idx) => (_jsxs("span", { children: [idx > 0 && _jsx("span", { style: css.arrow, children: " \u2192 " }), _jsxs("span", { style: css.progressStep(stepStatuses[idx]), children: [statusIcon(stepStatuses[idx]), " ", step.agent] })] }, idx))) }), _jsxs("div", { style: css.section, children: [_jsx("div", { style: css.sectionTitle, children: "Steps" }), pipeline.steps.map((step, idx) => (_jsxs("div", { children: [_jsxs("div", { style: css.stepRow, children: [_jsx("span", { style: css.stepNum, children: idx + 1 }), _jsx("span", { style: { fontSize: "16px" }, children: statusIcon(stepStatuses[idx]) }), _jsx("span", { style: css.stepAgent, children: step.agent }), _jsx("span", { style: css.stepRole, children: step.role })] }), step.verifiers && step.verifiers.length > 0 && (_jsxs("div", { style: css.verifierRow, children: [_jsx("span", { style: css.verifierLabel, children: "Verifiers:" }), step.verifiers.map((v) => {
                                        const info = availableVerifiers.find((av) => av.pluginId === v);
                                        return (_jsx("span", { style: { padding: "1px 6px", borderRadius: "4px", background: "var(--accent)", color: "var(--accent-foreground)", fontSize: "11px" }, children: info?.displayName ?? v }, v));
                                    })] }))] }, idx)))] }), errorMsg && _jsx("div", { style: css.error, children: errorMsg }), _jsx("button", { style: css.btnSmall, onClick: refresh, children: "Refresh" })] }));
}
//# sourceMappingURL=PipelineIssueDetailTab.js.map