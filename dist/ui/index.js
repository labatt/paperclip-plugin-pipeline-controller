// src/ui/DashboardWidget.tsx
import { usePluginData } from "@paperclipai/plugin-sdk/ui";
import { jsx, jsxs } from "react/jsx-runtime";
var css = {
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
    fontWeight: isCurrent ? 600 : 400
  }),
  arrow: { color: "var(--muted-foreground)", fontSize: "10px" },
  stuckItem: { padding: "4px 8px", borderRadius: "4px", background: "var(--destructive)", border: "1px solid var(--border)", marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "12px" },
  stuckTitle: { color: "var(--destructive-foreground)", fontWeight: 500 },
  stuckAge: { color: "var(--destructive-foreground)", fontSize: "11px" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "var(--primary-foreground)", background: "var(--primary)", padding: "0 4px" }),
  badgeDanger: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "var(--destructive-foreground)", background: "var(--destructive)", padding: "0 4px" },
  empty: { color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" },
  refreshBtn: { padding: "3px 10px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-foreground)", cursor: "pointer" }
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
        /* @__PURE__ */ jsx("span", { style: css.badgeDanger, children: data.stuckIssues.length })
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
    marginRight: "4px"
  }),
  btn: (variant) => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: variant === "primary" ? "none" : "1px solid var(--border)",
    background: variant === "primary" ? "var(--primary)" : variant === "danger" ? "var(--destructive)" : "var(--secondary)",
    color: variant === "primary" ? "var(--primary-foreground)" : variant === "danger" ? "var(--destructive-foreground)" : "var(--secondary-foreground)",
    cursor: "pointer"
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
    border: status === "active" ? "1px solid var(--ring)" : "1px solid transparent"
  }),
  arrow: { color: "var(--muted-foreground)", fontSize: "11px" },
  empty: { color: "var(--muted-foreground)", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "24px" },
  templateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
  error: { color: "var(--destructive)", fontSize: "12px", marginTop: "4px" },
  verifierRow: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", paddingLeft: "32px", marginBottom: "6px", fontSize: "11px", color: "var(--muted-foreground)" },
  verifierCheckbox: { display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer", fontSize: "11px", color: "var(--foreground)" },
  verifierLabel: { fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", marginRight: "4px" }
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
  const toggleVerifier = useCallback((idx, pluginId) => {
    setEditSteps((prev) => {
      const next = [...prev];
      const step = { ...next[idx] };
      const current = step.verifiers ?? [];
      if (current.includes(pluginId)) {
        step.verifiers = current.filter((v) => v !== pluginId);
      } else {
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
  const helpSection = /* @__PURE__ */ jsxs2("div", { style: css2.helpBox, children: [
    /* @__PURE__ */ jsxs2("div", { children: [
      "Define the agent handoff path for this task. Add agents in order -- each step runs automatically after the previous one completes.",
      " ",
      /* @__PURE__ */ jsx2(
        "span",
        {
          style: { cursor: "pointer", textDecoration: "underline" },
          onClick: () => setHelpExpanded(!helpExpanded),
          children: helpExpanded ? "Show less" : "Learn more"
        }
      )
    ] }),
    helpExpanded && /* @__PURE__ */ jsx2("div", { style: { marginTop: "8px" }, children: /* @__PURE__ */ jsxs2("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
      /* @__PURE__ */ jsxs2("li", { children: [
        "Click ",
        /* @__PURE__ */ jsx2("strong", { children: "Create Pipeline" }),
        " or ",
        /* @__PURE__ */ jsx2("strong", { children: "Edit" }),
        " to add agents as pipeline steps."
      ] }),
      /* @__PURE__ */ jsx2("li", { children: "When an agent marks their step done, the next step is automatically created and assigned." }),
      /* @__PURE__ */ jsxs2("li", { children: [
        "Click ",
        /* @__PURE__ */ jsx2("strong", { children: "Start Pipeline" }),
        " after defining steps to kick things off."
      ] }),
      /* @__PURE__ */ jsx2("li", { children: "You can save a pipeline as a template and reuse it on other issues." })
    ] }) })
  ] });
  if (editMode) {
    return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
      helpSection,
      /* @__PURE__ */ jsxs2("div", { style: css2.header, children: [
        /* @__PURE__ */ jsx2("span", { style: css2.title, children: "Edit Pipeline" }),
        /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: "6px" }, children: [
          /* @__PURE__ */ jsx2("button", { style: css2.btn("secondary"), onClick: () => setEditMode(false), children: "Cancel" }),
          /* @__PURE__ */ jsx2("button", { style: css2.btn("primary"), onClick: handleSave, disabled: saving, children: saving ? "Saving..." : "Save" })
        ] })
      ] }),
      templates.length > 0 && /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("span", { style: { fontSize: "12px", color: "var(--muted-foreground)" }, children: "Load template: " }),
        templates.map((t) => /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: () => loadTemplate(t), children: t.name }, t.name))
      ] }),
      /* @__PURE__ */ jsxs2("div", { style: css2.section, children: [
        /* @__PURE__ */ jsx2("div", { style: css2.sectionTitle, children: "Steps" }),
        editSteps.map((step, idx) => /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsxs2("div", { style: css2.stepRow, children: [
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
            /* @__PURE__ */ jsx2("button", { style: { ...css2.btnSmall, color: "var(--destructive)" }, onClick: () => removeStep(idx), children: "\xD7" })
          ] }),
          availableVerifiers.length > 0 && /* @__PURE__ */ jsxs2("div", { style: css2.verifierRow, children: [
            /* @__PURE__ */ jsx2("span", { style: css2.verifierLabel, children: "Verifiers:" }),
            availableVerifiers.map((v) => /* @__PURE__ */ jsxs2("label", { style: css2.verifierCheckbox, children: [
              /* @__PURE__ */ jsx2(
                "input",
                {
                  type: "checkbox",
                  checked: step.verifiers?.includes(v.pluginId) ?? false,
                  onChange: () => toggleVerifier(idx, v.pluginId)
                }
              ),
              v.displayName
            ] }, v.pluginId))
          ] })
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
    return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
      helpSection,
      /* @__PURE__ */ jsxs2("div", { style: css2.empty, children: [
        /* @__PURE__ */ jsx2("div", { style: { marginBottom: "8px" }, children: "No pipeline configured for this issue." }),
        /* @__PURE__ */ jsx2("button", { style: css2.btn("primary"), onClick: startEdit, children: "Create Pipeline" })
      ] })
    ] });
  }
  const stepStatuses = pipeline.steps.map((_, idx) => {
    if (idx < pipeline.currentStep) return "done";
    if (idx === pipeline.currentStep) return "active";
    return "pending";
  });
  return /* @__PURE__ */ jsxs2("div", { style: css2.container, children: [
    helpSection,
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
      pipeline.steps.map((step, idx) => /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsxs2("div", { style: css2.stepRow, children: [
          /* @__PURE__ */ jsx2("span", { style: css2.stepNum, children: idx + 1 }),
          /* @__PURE__ */ jsx2("span", { style: { fontSize: "16px" }, children: statusIcon(stepStatuses[idx]) }),
          /* @__PURE__ */ jsx2("span", { style: css2.stepAgent, children: step.agent }),
          /* @__PURE__ */ jsx2("span", { style: css2.stepRole, children: step.role })
        ] }),
        step.verifiers && step.verifiers.length > 0 && /* @__PURE__ */ jsxs2("div", { style: css2.verifierRow, children: [
          /* @__PURE__ */ jsx2("span", { style: css2.verifierLabel, children: "Verifiers:" }),
          step.verifiers.map((v) => {
            const info = availableVerifiers.find((av) => av.pluginId === v);
            return /* @__PURE__ */ jsx2("span", { style: { padding: "1px 6px", borderRadius: "4px", background: "var(--accent)", color: "var(--accent-foreground)", fontSize: "11px" }, children: info?.displayName ?? v }, v);
          })
        ] })
      ] }, idx))
    ] }),
    errorMsg && /* @__PURE__ */ jsx2("div", { style: css2.error, children: errorMsg }),
    /* @__PURE__ */ jsx2("button", { style: css2.btnSmall, onClick: refresh, children: "Refresh" })
  ] });
}

// src/ui/PipelineSettingsPage.tsx
import { useState as useState2, useCallback as useCallback2 } from "react";
import { usePluginData as usePluginData3, usePluginAction as usePluginAction2 } from "@paperclipai/plugin-sdk/ui";
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var CHANNEL_TYPES = [
  { value: "webhook", label: "Webhook (generic)" },
  { value: "slack", label: "Slack" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" }
];
var css3 = {
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
    cursor: "pointer"
  }),
  templateCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "6px", background: "var(--muted)", marginBottom: "6px" },
  templateName: { fontWeight: 500, color: "var(--foreground)" },
  templateSteps: { fontSize: "12px", color: "var(--muted-foreground)" },
  empty: { color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" },
  legacyWarning: { padding: "8px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)", marginBottom: "12px" },
  successMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--accent)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--accent-foreground)" },
  errorMsg: { padding: "6px 12px", borderRadius: "6px", background: "var(--destructive)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--destructive-foreground)" },
  row: { display: "flex", gap: "8px", alignItems: "center" },
  fieldValue: { fontSize: "13px", color: "var(--foreground)" }
};
function PipelineSettingsPage({ context }) {
  const { data: configData } = usePluginData3("plugin-config");
  const { data: templatesData, refresh: refreshTemplates } = usePluginData3("pipeline-templates");
  const deleteTemplate = usePluginAction2("delete-template");
  const testNotification = usePluginAction2("test-notification");
  const updatePrefix = usePluginAction2("update-prefix");
  const [deleting, setDeleting] = useState2(null);
  const [testing, setTesting] = useState2(false);
  const [testResult, setTestResult] = useState2(null);
  const [prefixValue, setPrefixValue] = useState2(null);
  const [prefixSaving, setPrefixSaving] = useState2(false);
  const [prefixSaved, setPrefixSaved] = useState2(false);
  const [payloadRefOpen, setPayloadRefOpen] = useState2(false);
  const config = configData ?? {};
  const channel = config.notificationChannel ?? {};
  const templates = templatesData?.templates ?? [];
  const hasLegacyTelegram = !!(config.telegramBotToken && !channel.enabled);
  const channelType = channel.type ?? "webhook";
  const handleDeleteTemplate = useCallback2(async (name) => {
    setDeleting(name);
    try {
      await deleteTemplate({ name });
      refreshTemplates();
    } catch {
    }
    setDeleting(null);
  }, [deleteTemplate, refreshTemplates]);
  const handlePrefixSave = useCallback2(async () => {
    if (prefixValue == null) return;
    setPrefixSaving(true);
    setPrefixSaved(false);
    try {
      await updatePrefix({ value: prefixValue });
      setPrefixSaved(true);
      setTimeout(() => setPrefixSaved(false), 2e3);
    } catch {
    }
    setPrefixSaving(false);
  }, [updatePrefix, prefixValue]);
  const handleTestNotification = useCallback2(async () => {
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
  return /* @__PURE__ */ jsxs3("div", { style: css3.container, children: [
    /* @__PURE__ */ jsx3("div", { style: css3.title, children: "Pipeline Controller Settings" }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Notification Channel" }),
      /* @__PURE__ */ jsx3("div", { style: css3.sectionHelp, children: "Configure where alerts are sent when something needs attention. Notifications are exception-only: stuck tasks, verification failures, and pipeline completions. Pick a channel type below and fill in the matching fields in the JSON config above." }),
      hasLegacyTelegram && /* @__PURE__ */ jsx3("div", { style: css3.legacyWarning, children: "Legacy Telegram config detected at top level. These will continue to work but consider migrating to the notification channel config below for more flexibility." }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Channel Type" }),
        /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: CHANNEL_TYPES.find((ct) => ct.value === channelType)?.label ?? channelType })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Enabled" }),
        /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.enabled ? "Yes" : "No" })
      ] }),
      (channelType === "webhook" || channelType === "slack" || channelType === "discord") && /* @__PURE__ */ jsxs3(Fragment, { children: [
        /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
          /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Webhook URL" }),
          /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.webhookUrl || "(not set)" }),
          /* @__PURE__ */ jsx3("div", { style: css3.hint, children: channelType === "slack" ? "Use the Incoming Webhook URL from your Slack workspace settings." : channelType === "discord" ? "Use the webhook URL from your Discord channel's integrations." : "Any HTTP endpoint that accepts JSON payloads." })
        ] }),
        channelType === "webhook" && /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
          /* @__PURE__ */ jsx3("span", { style: css3.label, children: "HTTP Method" }),
          /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.webhookMethod ?? "POST" })
        ] }),
        channelType === "webhook" && channel.webhookHeaders && Object.keys(channel.webhookHeaders).length > 0 && /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
          /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Custom Headers" }),
          /* @__PURE__ */ jsxs3("div", { style: { fontSize: "12px", color: "var(--muted-foreground)" }, children: [
            Object.keys(channel.webhookHeaders).length,
            " header(s) configured"
          ] })
        ] })
      ] }),
      channelType === "telegram" && /* @__PURE__ */ jsxs3(Fragment, { children: [
        /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
          /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Telegram Bot Token" }),
          /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.telegramBotToken ? "***configured***" : "(not set)" }),
          /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "Create a bot via @BotFather on Telegram to get a token." })
        ] }),
        /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
          /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Telegram Chat ID" }),
          /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.telegramChatId || "(not set)" }),
          /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "Numeric ID of the chat or group where alerts should go." })
        ] })
      ] }),
      channelType === "email" && /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Email API Endpoint" }),
        /* @__PURE__ */ jsx3("div", { style: css3.fieldValue, children: channel.emailEndpoint || "(not set)" }),
        /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "URL of your email-sending service that accepts JSON POSTs." })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Notification Prefix" }),
        /* @__PURE__ */ jsxs3("div", { style: css3.row, children: [
          /* @__PURE__ */ jsx3(
            "input",
            {
              style: css3.input,
              type: "text",
              maxLength: 255,
              value: prefixValue ?? config.notificationPrefix ?? "\u2699\uFE0F Pipeline Controller",
              onChange: (e) => setPrefixValue(e.target.value),
              onBlur: handlePrefixSave,
              placeholder: "\\u2699\\ufe0f Pipeline Controller"
            }
          ),
          /* @__PURE__ */ jsx3(
            "button",
            {
              style: css3.btn("secondary"),
              onClick: handlePrefixSave,
              disabled: prefixSaving || prefixValue == null,
              children: prefixSaving ? "Saving..." : prefixSaved ? "Saved!" : "Save"
            }
          )
        ] }),
        /* @__PURE__ */ jsx3("div", { style: css3.hint, children: "Short label prepended to every alert so recipients can identify the source at a glance. Max 255 characters." })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: { marginTop: "12px", ...css3.row }, children: [
        /* @__PURE__ */ jsx3(
          "button",
          {
            style: css3.btn("primary"),
            onClick: handleTestNotification,
            disabled: testing,
            children: testing ? "Sending..." : "Test Notification"
          }
        ),
        testResult && /* @__PURE__ */ jsx3("div", { style: testResult.ok ? css3.successMsg : css3.errorMsg, children: testResult.msg })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsxs3(
        "div",
        {
          style: { ...css3.sectionTitle, cursor: "pointer", userSelect: "none" },
          onClick: () => setPayloadRefOpen(!payloadRefOpen),
          children: [
            payloadRefOpen ? "\u25BE" : "\u25B8",
            " Payload Reference"
          ]
        }
      ),
      /* @__PURE__ */ jsx3("div", { style: css3.sectionHelp, children: "Exact JSON payloads sent for each notification event, and how each channel renders them." }),
      payloadRefOpen && /* @__PURE__ */ jsxs3("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxs3("div", { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Base payload (all channels):" }),
          /* @__PURE__ */ jsx3("pre", { style: {
            background: "var(--muted)",
            padding: "10px",
            borderRadius: "6px",
            overflow: "auto",
            fontSize: "11px",
            lineHeight: "1.4",
            marginTop: "4px"
          }, children: `{
  "event": "pipeline.stuck | pipeline.complete | pipeline.step_advanced | verification.failed",
  "prefix": "\u2699\uFE0F Pipeline Alert",
  "title": "FAI-84 stuck for 45 minutes",
  "message": "Full description of what happened",
  "issueIdentifier": "FAI-84",
  "issueId": "uuid",
  "issueUrl": "https://paperclip.example.com/issues/FAI-84",
  "timestamp": "2026-03-21T16:40:00Z",
  "severity": "high | medium | low"
}` })
        ] }),
        /* @__PURE__ */ jsxs3("div", { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Webhook (generic):" }),
          /* @__PURE__ */ jsxs3("div", { children: [
            "Raw JSON POST to the configured URL. The base payload above is sent as-is in the request body with ",
            /* @__PURE__ */ jsx3("code", { children: "Content-Type: application/json" }),
            ". Custom headers are included if configured."
          ] })
        ] }),
        /* @__PURE__ */ jsxs3("div", { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Slack:" }),
          /* @__PURE__ */ jsx3("div", { children: "Formatted as Slack Block Kit attachments with color-coded severity sidebar:" }),
          /* @__PURE__ */ jsxs3("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
            /* @__PURE__ */ jsx3("li", { children: "Green (#22c55e) for pipeline.complete" }),
            /* @__PURE__ */ jsx3("li", { children: "Amber (#f59e0b) for pipeline.stuck" }),
            /* @__PURE__ */ jsx3("li", { children: "Red (#ef4444) for verification.failed" })
          ] }),
          /* @__PURE__ */ jsx3("div", { children: "Includes header block (title), section block (message), optional link block, and context block (event type + timestamp)." })
        ] }),
        /* @__PURE__ */ jsxs3("div", { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Discord:" }),
          /* @__PURE__ */ jsx3("div", { children: "Formatted as Discord embed with color-coded border:" }),
          /* @__PURE__ */ jsxs3("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
            /* @__PURE__ */ jsx3("li", { children: "Green (0x22c55e) for pipeline.complete" }),
            /* @__PURE__ */ jsx3("li", { children: "Amber (0xf59e0b) for pipeline.stuck" }),
            /* @__PURE__ */ jsx3("li", { children: "Red (0xef4444) for verification.failed" })
          ] }),
          /* @__PURE__ */ jsx3("div", { children: "Includes embed title, description (message), inline fields (Issue ID, Event type), timestamp, and optional URL linking to the issue." })
        ] }),
        /* @__PURE__ */ jsxs3("div", { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Telegram:" }),
          /* @__PURE__ */ jsxs3("div", { children: [
            "Sent via ",
            /* @__PURE__ */ jsx3("code", { children: "sendMessage" }),
            " API with ",
            /* @__PURE__ */ jsx3("code", { children: 'parse_mode: "HTML"' }),
            ". Format:"
          ] }),
          /* @__PURE__ */ jsx3("pre", { style: {
            background: "var(--muted)",
            padding: "10px",
            borderRadius: "6px",
            overflow: "auto",
            fontSize: "11px",
            lineHeight: "1.4",
            marginTop: "4px"
          }, children: `<b>FAI-84 stuck for 45 minutes</b>
\u2699\uFE0F Pipeline Alert: Full description of what happened
<a href="https://paperclip.example.com/issues/FAI-84">View Issue</a>` })
        ] }),
        /* @__PURE__ */ jsxs3("div", { children: [
          /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Email:" }),
          /* @__PURE__ */ jsxs3("div", { children: [
            "JSON POST to the configured email API endpoint with fields: ",
            /* @__PURE__ */ jsx3("code", { children: "subject" }),
            " (title), ",
            /* @__PURE__ */ jsx3("code", { children: "body" }),
            " (message), ",
            /* @__PURE__ */ jsx3("code", { children: "event" }),
            ", ",
            /* @__PURE__ */ jsx3("code", { children: "issueId" }),
            ", ",
            /* @__PURE__ */ jsx3("code", { children: "issueUrl" }),
            ", ",
            /* @__PURE__ */ jsx3("code", { children: "timestamp" }),
            ". Custom headers are included if configured."
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Stuck Detection" }),
      /* @__PURE__ */ jsx3("div", { style: css3.sectionHelp, children: `Tasks that sit too long without activity are flagged as "stuck" and trigger an alert. Adjust these thresholds based on your team's expected response times.` }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Stuck Todo Threshold" }),
        /* @__PURE__ */ jsxs3("div", { style: css3.fieldValue, children: [
          config.stuckTodoMinutes ?? 30,
          " minutes"
        ] }),
        /* @__PURE__ */ jsx3("div", { style: css3.hint, children: 'How long an assigned task can remain in "todo" before an alert fires.' })
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: css3.field, children: [
        /* @__PURE__ */ jsx3("span", { style: css3.label, children: "Stuck In-Progress Threshold" }),
        /* @__PURE__ */ jsxs3("div", { style: css3.fieldValue, children: [
          config.stuckInProgressMinutes ?? 60,
          " minutes"
        ] }),
        /* @__PURE__ */ jsx3("div", { style: css3.hint, children: 'How long an "in_progress" task can go without updates before an alert fires.' })
      ] })
    ] }),
    /* @__PURE__ */ jsxs3("div", { style: css3.section, children: [
      /* @__PURE__ */ jsx3("div", { style: css3.sectionTitle, children: "Pipeline Templates" }),
      /* @__PURE__ */ jsx3("div", { style: css3.sectionHelp, children: "Reusable agent sequences you can apply to new issues with one click. Create templates from the Pipeline tab on any issue, then manage (or delete) them here." }),
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
      /* @__PURE__ */ jsx3("div", { style: css3.sectionHelp, children: "Understanding when (and when not) you will receive notifications." }),
      /* @__PURE__ */ jsxs3("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" }, children: [
        "Notifications are ",
        /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "exception-only" }),
        ":",
        /* @__PURE__ */ jsxs3("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
          /* @__PURE__ */ jsx3("li", { children: "Task genuinely stuck (threshold exceeded)" }),
          /* @__PURE__ */ jsx3("li", { children: "Content verification failed (from a verifier plugin)" }),
          /* @__PURE__ */ jsx3("li", { children: "Pipeline completed (final step done)" })
        ] }),
        "No alerts for: normal step transitions, tasks being picked up, or routine progress."
      ] }),
      /* @__PURE__ */ jsxs3("div", { style: { fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginTop: "8px" }, children: [
        /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Supported channels:" }),
        /* @__PURE__ */ jsxs3("ul", { style: { margin: "4px 0", paddingLeft: "16px" }, children: [
          /* @__PURE__ */ jsxs3("li", { children: [
            /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Webhook (generic)" }),
            " - sends JSON payload to any URL"
          ] }),
          /* @__PURE__ */ jsxs3("li", { children: [
            /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Slack" }),
            " - formats as Slack blocks with color coding"
          ] }),
          /* @__PURE__ */ jsxs3("li", { children: [
            /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Discord" }),
            " - formats as Discord embed with color coding"
          ] }),
          /* @__PURE__ */ jsxs3("li", { children: [
            /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Telegram" }),
            " - sends HTML-formatted message via Bot API"
          ] }),
          /* @__PURE__ */ jsxs3("li", { children: [
            /* @__PURE__ */ jsx3("strong", { style: { color: "var(--foreground)" }, children: "Email" }),
            " - POSTs JSON payload to an email API endpoint"
          ] })
        ] })
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
