// src/ui/DashboardWidget.tsx
import { usePluginData } from "@paperclipai/plugin-sdk/ui";
import { jsx, jsxs } from "react/jsx-runtime";
var css = {
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
    fontWeight: isCurrent ? 600 : 400
  }),
  arrow: { color: "#d1d5db", fontSize: "10px" },
  stuckItem: { padding: "4px 8px", borderRadius: "4px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "12px" },
  stuckTitle: { color: "#991b1b", fontWeight: 500 },
  stuckAge: { color: "#dc2626", fontSize: "11px" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "#fff", background: color, padding: "0 4px" }),
  empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" },
  refreshBtn: { padding: "3px 10px", fontSize: "11px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }
};
function PipelineDashboardWidget({ context }) {
  const { data, loading, error, refresh } = usePluginData(
    "pipeline-status",
    { companyId: context.companyId }
  );
  if (loading) return /* @__PURE__ */ jsx("div", { style: css.container, children: "Loading..." });
  if (error) return /* @__PURE__ */ jsxs("div", { style: css.container, children: [
    "Error: ",
    error.message
  ] });
  if (!data) return /* @__PURE__ */ jsx("div", { style: css.container, children: "No data" });
  return /* @__PURE__ */ jsxs("div", { style: css.container, children: [
    /* @__PURE__ */ jsxs("div", { style: css.section, children: [
      /* @__PURE__ */ jsxs("div", { style: css.sectionTitle, children: [
        "Active Pipelines",
        data.activePipelines.length > 0 && /* @__PURE__ */ jsx("span", { style: css.badge("#3b82f6"), children: data.activePipelines.length })
      ] }),
      data.activePipelines.length === 0 ? /* @__PURE__ */ jsx("div", { style: css.empty, children: "No active pipelines" }) : data.activePipelines.map((p) => /* @__PURE__ */ jsxs("div", { style: css.pipeline, children: [
        /* @__PURE__ */ jsxs("div", { style: css.pipelineTitle, children: [
          p.identifier,
          ": ",
          p.parentTitle
        ] }),
        /* @__PURE__ */ jsx("div", { style: css.steps, children: p.steps.map((step, idx) => /* @__PURE__ */ jsxs("span", { children: [
          idx > 0 && /* @__PURE__ */ jsx("span", { style: css.arrow, children: "\u2192" }),
          /* @__PURE__ */ jsx("span", { style: css.step(idx < p.currentStep, idx === p.currentStep), children: step.agent })
        ] }, idx)) })
      ] }, p.parentId))
    ] }),
    data.stuckIssues.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: css.sectionTitle, children: [
        "Stuck ",
        /* @__PURE__ */ jsx("span", { style: css.badge("#ef4444"), children: data.stuckIssues.length })
      ] }),
      data.stuckIssues.slice(0, 5).map((s) => /* @__PURE__ */ jsxs("div", { style: css.stuckItem, children: [
        /* @__PURE__ */ jsxs("span", { style: css.stuckTitle, children: [
          s.identifier,
          ": ",
          s.title
        ] }),
        /* @__PURE__ */ jsxs("span", { style: css.stuckAge, children: [
          s.minutesStale,
          "m"
        ] })
      ] }, s.id))
    ] }),
    /* @__PURE__ */ jsx("button", { style: css.refreshBtn, onClick: refresh, children: "Refresh" })
  ] });
}

// src/ui/PipelineIssueDetailTab.tsx
import { useState, useCallback } from "react";
import { usePluginData as usePluginData2, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var css2 = {
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
    marginRight: "4px"
  }),
  btn: (variant) => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: variant === "primary" ? "none" : "1px solid #d1d5db",
    background: variant === "primary" ? "#3b82f6" : variant === "danger" ? "#ef4444" : "#fff",
    color: variant === "primary" || variant === "danger" ? "#fff" : "#374151",
    cursor: "pointer"
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
    border: status === "active" ? "1px solid #93c5fd" : "1px solid transparent"
  }),
  arrow: { color: "#9ca3af", fontSize: "11px" },
  empty: { color: "#9ca3af", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "24px" },
  templateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
  error: { color: "#dc2626", fontSize: "12px", marginTop: "4px" }
};
function statusIcon(status) {
  if (status === "done") return "\u2705";
  if (status === "active") return "\u{1F504}";
  return "\u23F3";
}
function PipelineIssueDetailTab({ context }) {
  const issueId = context.entityId;
  const companyId = context.companyId;
  const { data, loading, error, refresh } = usePluginData2("issue-pipeline", {
    entityId: issueId,
    companyId
  });
  const { data: templatesData } = usePluginData2("pipeline-templates");
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
    if (agents.length === 0) return;
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
      if (target < 0 || target >= next.length) return prev;
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
      } else {
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editSteps, issueId, savePipeline, refresh]);
  const handleRemove = useCallback(async () => {
    setSaving(true);
    try {
      await removePipeline({ issueId });
      setEditMode(false);
      refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  }, [issueId, removePipeline, refresh]);
  const handleStart = useCallback(async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await startPipeline({ issueId, companyId });
      refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Start failed");
    } finally {
      setSaving(false);
    }
  }, [issueId, companyId, startPipeline, refresh]);
  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) return;
    const steps = pipeline?.steps ?? editSteps;
    if (steps.length === 0) return;
    try {
      await saveTemplate({ name: templateName.trim(), steps });
      setTemplateName("");
      refresh();
    } catch {
    }
  }, [templateName, pipeline, editSteps, saveTemplate, refresh]);
  if (loading) return /* @__PURE__ */ jsx2("div", { style: css2.container, children: "Loading..." });
  if (error) return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
    "Error: ",
    error.message
  ] });
  if (editMode) {
    return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
      /* @__PURE__ */ jsxs2("div", { style: css2.header, children: [
        /* @__PURE__ */ jsx2("span", { style: css2.title, children: "Edit Pipeline" }),
        /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "6px" }, children: [
          /* @__PURE__ */ jsx2("button", { style: css2.btn("secondary"), onClick: () => setEditMode(false), children: "Cancel" }),
          /* @__PURE__ */ jsx2("button", { style: css2.btn("primary"), onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save" })
        ] })
      ] }),
      templates.length > 0 && /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("span", { style: { fontSize: "12px", color: "#6b7280" }, children: "Load template: " }),
        templates.map((t) => /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: () => loadTemplate(t), children: t.name }, t.name))
      ] }),
      /* @__PURE__ */ jsxs2("div", { style: css2.section, children: [
        /* @__PURE__ */ jsx2("div", { style: css2.sectionTitle, children: "Steps" }),
        editSteps.map((step, idx) => /* @__PURE__ */ jsxs2("div", { style: css2.stepRow, children: [
          /* @__PURE__ */ jsx2("span", { style: css2.stepNum, children: idx + 1 }),
          /* @__PURE__ */ jsx2(
            "select",
            {
              style: css2.select,
              value: step.agentId,
              onChange: (e) => updateStep(idx, "agentId", e.target.value),
              children: agents.map((a) => /* @__PURE__ */ jsx2("option", { value: a.id, children: a.name }, a.id))
            }
          ),
          /* @__PURE__ */ jsx2(
            "input",
            {
              style: css2.input,
              value: step.role,
              onChange: (e) => updateStep(idx, "role", e.target.value),
              placeholder: "Role (e.g. research)"
            }
          ),
          /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: () => moveStep(idx, -1), disabled: idx === 0, children: "\u2191" }),
          /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: () => moveStep(idx, 1), disabled: idx === editSteps.length - 1, children: "\u2193" }),
          /* @__PURE__ */ jsx2("button", { style: { ...css2.btnSmall, color: "#dc2626" }, onClick: () => removeStep(idx), children: "\xD7" })
        ] }, idx)),
        /* @__PURE__ */ jsx2("button", { style: { ...css2.btnSmall, marginTop: "8px" }, onClick: addStep, children: "+ Add Step" })
      ] }),
      /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "6px", alignItems: "center" }, children: [
        /* @__PURE__ */ jsx2(
          "input",
          {
            style: css2.input,
            value: templateName,
            onChange: (e) => setTemplateName(e.target.value),
            placeholder: "Template name"
          }
        ),
        /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: handleSaveTemplate, disabled: !templateName.trim(), children: "Save as Template" })
      ] }),
      errorMsg && /* @__PURE__ */ jsx2("div", { style: css2.error, children: errorMsg })
    ] });
  }
  if (!pipeline || pipeline.steps.length === 0) {
    return /* @__PURE__ */ jsx2("div", { style: css2.container, children: /* @__PURE__ */ jsxs2("div", { style: css2.empty, children: [
      /* @__PURE__ */ jsx2("div", { style: { marginBottom: "8px" }, children: "No pipeline configured for this issue." }),
      /* @__PURE__ */ jsx2("button", { style: css2.btn("primary"), onClick: startEdit, children: "Create Pipeline" })
    ] }) });
  }
  const stepStatuses = pipeline.steps.map((_, idx) => {
    if (idx < pipeline.currentStep) return "done";
    if (idx === pipeline.currentStep) return "active";
    return "pending";
  });
  return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
    /* @__PURE__ */ jsxs2("div", { style: css2.header, children: [
      /* @__PURE__ */ jsxs2("span", { style: css2.title, children: [
        "Pipeline ",
        pipeline.templateName ? `(${pipeline.templateName})` : ""
      ] }),
      /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "6px" }, children: [
        /* @__PURE__ */ jsx2("button", { style: css2.btn("secondary"), onClick: startEdit, children: "Edit" }),
        pipeline.currentStep === 0 && pipeline.completedSteps.length === 0 && /* @__PURE__ */ jsx2("button", { style: css2.btn("primary"), onClick: handleStart, disabled: saving, children: "Start Pipeline" }),
        /* @__PURE__ */ jsx2("button", { style: css2.btn("danger"), onClick: handleRemove, disabled: saving, children: "Remove" })
      ] })
    ] }),
    /* @__PURE__ */ jsx2("div", { style: css2.progress, children: pipeline.steps.map((step, idx) => /* @__PURE__ */ jsxs2("span", { children: [
      idx > 0 && /* @__PURE__ */ jsx2("span", { style: css2.arrow, children: " \u2192 " }),
      /* @__PURE__ */ jsxs2("span", { style: css2.progressStep(stepStatuses[idx]), children: [
        statusIcon(stepStatuses[idx]),
        " ",
        step.agent
      ] })
    ] }, idx)) }),
    /* @__PURE__ */ jsxs2("div", { style: css2.section, children: [
      /* @__PURE__ */ jsx2("div", { style: css2.sectionTitle, children: "Steps" }),
      pipeline.steps.map((step, idx) => /* @__PURE__ */ jsxs2("div", { style: css2.stepRow, children: [
        /* @__PURE__ */ jsx2("span", { style: css2.stepNum, children: idx + 1 }),
        /* @__PURE__ */ jsx2("span", { style: { fontSize: "16px" }, children: statusIcon(stepStatuses[idx]) }),
        /* @__PURE__ */ jsx2("span", { style: css2.stepAgent, children: step.agent }),
        /* @__PURE__ */ jsx2("span", { style: css2.stepRole, children: step.role })
      ] }, idx))
    ] }),
    errorMsg && /* @__PURE__ */ jsx2("div", { style: css2.error, children: errorMsg }),
    /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: refresh, children: "Refresh" })
  ] });
}

// src/ui/PipelineSettingsPage.tsx
import { useState as useState2, useCallback as useCallback2 } from "react";
import { usePluginData as usePluginData3, usePluginAction as usePluginAction2 } from "@paperclipai/plugin-sdk/ui";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var css3 = {
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
    cursor: "pointer"
  }),
  templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "#f9fafb", marginBottom: "6px" },
  templateName: { fontWeight: 500 },
  templateSteps: { fontSize: "12px", color: "#6b7280" },
  empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" }
};
function PipelineSettingsPage({ context }) {
  const { data: configData } = usePluginData3("plugin-config");
  const { data: templatesData, refresh: refreshTemplates } = usePluginData3("pipeline-templates");
  const deleteTemplate = usePluginAction2("delete-template");
  const [deleting, setDeleting] = useState2(null);
  const config = configData ?? {};
  const templates = templatesData?.templates ?? [];
  const handleDeleteTemplate = useCallback2(async (name) => {
    setDeleting(name);
    try {
      await deleteTemplate({ name });
      refreshTemplates();
    } catch {
    }
    setDeleting(null);
  }, [deleteTemplate, refreshTemplates]);
  return /* @__PURE__ */ jsxs3("div", { style: css3.container, children: [
    /* @__PURE__ */ jsx3("div", { style: css3.title, children: "Pipeline Controller Settings" }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Current Configuration" }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Site API URL" }),
        /* @__PURE__ */ jsx3("div", { style: { fontSize: "13px" }, children: config.siteApiUrl || "(not set)" })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Site API Token" }),
        /* @__PURE__ */ jsx3("div", { style: { fontSize: "13px" }, children: config.siteApiToken ? "***configured***" : "(not set)" })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Telegram Bot Token" }),
        /* @__PURE__ */ jsx3("div", { style: { fontSize: "13px" }, children: config.telegramBotToken ? "***configured***" : "(not set)" })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Telegram Chat ID" }),
        /* @__PURE__ */ jsx3("div", { style: { fontSize: "13px" }, children: config.telegramChatId || "(not set)" })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Stuck Thresholds" }),
        /* @__PURE__ */ jsxs3("div", { style: { fontSize: "13px" }, children: [
          "Todo: ",
          config.stuckTodoMinutes ?? 30,
          "m | In-Progress: ",
          config.stuckInProgressMinutes ?? 60,
          "m"
        ] })
      ] }),
      /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "Edit these values in the plugin settings JSON above." })
    ] }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Pipeline Templates" }),
      /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "Create templates from the Pipeline tab on any issue. Manage them here." }),
      /* @__PURE__ */ jsx3("div", { style: { marginTop: "12px" }, children: templates.length === 0 ? /* @__PURE__ */ jsx3("div", { style: css3.empty, children: "No templates saved yet." }) : templates.map((t) => /* @__PURE__ */ jsxs3("div", { style: css3.templateCard, children: [
        /* @__PURE__ */ jsxs3("div", { children: [
          /* @__PURE__ */ jsx3("div", { style: css3.templateName, children: t.name }),
          /* @__PURE__ */ jsx3("div", { style: css3.templateSteps, children: t.steps.map((s) => s.agent).join(" > ") })
        ] }),
        /* @__PURE__ */ jsx3(
          "button",
          {
            style: css3.btn("danger"),
            onClick: () => handleDeleteTemplate(t.name),
            disabled: deleting === t.name,
            children: deleting === t.name ? "..." : "Delete"
          }
        )
      ] }, t.name)) })
    ] }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Alert Behavior" }),
      /* @__PURE__ */ jsxs3("div", { style: { fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }, children: [
        "Telegram alerts are ",
        /* @__PURE__ */ jsx3("strong", { children: "exception-only" }),
        ":",
        /* @__PURE__ */ jsxs3("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
          /* @__PURE__ */ jsx3("li", { children: "Task genuinely stuck (threshold exceeded)" }),
          /* @__PURE__ */ jsx3("li", { children: "Content verification failed" }),
          /* @__PURE__ */ jsx3("li", { children: "Pipeline completed (final step done)" })
        ] }),
        "No alerts for: normal step transitions, tasks being picked up, or routine progress."
      ] })
    ] })
  ] });
}
export {
  PipelineDashboardWidget,
  PipelineIssueDetailTab,
  PipelineSettingsPage
};
//# sourceMappingURL=index.js.map
