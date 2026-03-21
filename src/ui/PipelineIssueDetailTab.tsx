import { useState, useCallback } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import type { PluginDetailTabProps } from "@paperclipai/plugin-sdk/ui";

interface PipelineStep {
  agent: string;
  agentId: string;
  role: string;
}

interface StepHistory {
  stepIndex: number;
  agent: string;
  status: "done" | "active" | "pending";
  startedAt?: string;
  completedAt?: string;
  subTaskId?: string;
}

interface PipelineData {
  steps: PipelineStep[];
  currentStep: number;
  completedSteps: string[];
  stepHistory: StepHistory[];
  startedAt: string;
  lastAdvancedAt: string;
  templateName?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  role: string;
}

interface IssuePipelineData {
  pipeline: PipelineData | null;
  agents: AgentInfo[];
}

interface TemplatesData {
  templates: Array<{ name: string; steps: PipelineStep[]; createdAt: string }>;
}

/* ── Theme-aware styles using CSS variables ── */
const css = {
  container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "16px", display: "grid", gap: "16px", color: "var(--foreground)" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" } as React.CSSProperties,
  title: { fontSize: "16px", fontWeight: 600, color: "var(--foreground)" } as React.CSSProperties,
  helpBox: { padding: "10px 14px", borderRadius: "8px", background: "var(--muted)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" } as React.CSSProperties,
  section: { border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "var(--card)", color: "var(--card-foreground)" } as React.CSSProperties,
  sectionTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" } as React.CSSProperties,
  stepRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", marginBottom: "4px", background: "var(--muted)" } as React.CSSProperties,
  stepNum: { fontWeight: 600, color: "var(--muted-foreground)", minWidth: "24px" } as React.CSSProperties,
  stepAgent: { fontWeight: 500, flex: 1, color: "var(--foreground)" } as React.CSSProperties,
  stepRole: { color: "var(--muted-foreground)", fontSize: "12px" } as React.CSSProperties,
  statusIcon: (status: string) => ({
    fontSize: "16px",
    marginRight: "4px",
  }) as React.CSSProperties,
  btn: (variant: "primary" | "secondary" | "danger") => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: variant === "primary" ? "none" : "1px solid var(--border)",
    background: variant === "primary" ? "var(--primary)" : variant === "danger" ? "var(--destructive)" : "var(--secondary)",
    color: variant === "primary" ? "var(--primary-foreground)" : variant === "danger" ? "var(--destructive-foreground)" : "var(--secondary-foreground)",
    cursor: "pointer",
  }) as React.CSSProperties,
  btnSmall: { padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--secondary-foreground)", cursor: "pointer" } as React.CSSProperties,
  select: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", flex: 1 } as React.CSSProperties,
  input: { padding: "4px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", width: "120px" } as React.CSSProperties,
  progress: { display: "flex", gap: "4px", flexWrap: "wrap" as const, alignItems: "center", marginTop: "8px" } as React.CSSProperties,
  progressStep: (status: string) => ({
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: status === "active" ? 600 : 400,
    background: status === "done" ? "var(--accent)" : status === "active" ? "var(--accent)" : "var(--muted)",
    color: status === "done" ? "var(--accent-foreground)" : status === "active" ? "var(--accent-foreground)" : "var(--muted-foreground)",
    border: status === "active" ? "1px solid var(--ring)" : "1px solid transparent",
  }) as React.CSSProperties,
  arrow: { color: "var(--muted-foreground)", fontSize: "11px" } as React.CSSProperties,
  empty: { color: "var(--muted-foreground)", fontSize: "13px", fontStyle: "italic" as const, textAlign: "center" as const, padding: "24px" } as React.CSSProperties,
  templateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" } as React.CSSProperties,
  error: { color: "var(--destructive)", fontSize: "12px", marginTop: "4px" } as React.CSSProperties,
};

function statusIcon(status: string): string {
  if (status === "done") return "\u2705";
  if (status === "active") return "\ud83d\udd04";
  return "\u23f3";
}

export function PipelineIssueDetailTab({ context }: PluginDetailTabProps) {
  const issueId = context.entityId!;
  const companyId = context.companyId!;

  const { data, loading, error, refresh } = usePluginData<IssuePipelineData>("issue-pipeline", {
    entityId: issueId,
    companyId,
  });
  const { data: templatesData } = usePluginData<TemplatesData>("pipeline-templates");

  const savePipeline = usePluginAction("save-pipeline");
  const removePipeline = usePluginAction("remove-pipeline");
  const startPipeline = usePluginAction("start-pipeline");
  const saveTemplate = usePluginAction("save-template");

  const [editMode, setEditMode] = useState(false);
  const [editSteps, setEditSteps] = useState<PipelineStep[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [helpExpanded, setHelpExpanded] = useState(false);

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
    const first = agents[0]!;
    setEditSteps((prev) => [...prev, { agent: first.name, agentId: first.id, role: "" }]);
  }, [agents]);

  const removeStep = useCallback((idx: number) => {
    setEditSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveStep = useCallback((idx: number, dir: -1 | 1) => {
    setEditSteps((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }, []);

  const updateStep = useCallback((idx: number, field: "agentId" | "role", value: string) => {
    setEditSteps((prev) => {
      const next = [...prev];
      const step = { ...next[idx]! };
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

  const loadTemplate = useCallback((tmpl: { steps: PipelineStep[] }) => {
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
    } catch {}
  }, [templateName, pipeline, editSteps, saveTemplate, refresh]);

  if (loading) return <div style={css.container}>Loading...</div>;
  if (error) return <div style={css.container}>Error: {error.message}</div>;

  /* ─── Help Description ─── */
  const helpSection = (
    <div style={css.helpBox}>
      <div>
        Define the agent handoff path for this task. Add agents in order -- each step runs automatically after the previous one completes.
        {" "}
        <span
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => setHelpExpanded(!helpExpanded)}
        >
          {helpExpanded ? "Show less" : "Learn more"}
        </span>
      </div>
      {helpExpanded && (
        <div style={{ marginTop: "8px" }}>
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            <li>Click <strong>Create Pipeline</strong> or <strong>Edit</strong> to add agents as pipeline steps.</li>
            <li>When an agent marks their step done, the next step is automatically created and assigned.</li>
            <li>Click <strong>Start Pipeline</strong> after defining steps to kick things off.</li>
            <li>You can save a pipeline as a template and reuse it on other issues.</li>
          </ul>
        </div>
      )}
    </div>
  );

  // ─── Edit Mode ───
  if (editMode) {
    return (
      <div style={css.container}>
        {helpSection}
        <div style={css.header}>
          <span style={css.title}>Edit Pipeline</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button style={css.btn("secondary")} onClick={() => setEditMode(false)}>Cancel</button>
            <button style={css.btn("primary")} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Templates dropdown */}
        {templates.length > 0 && (
          <div>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Load template: </span>
            {templates.map((t) => (
              <button key={t.name} style={css.btnSmall} onClick={() => loadTemplate(t)}>
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Steps editor */}
        <div style={css.section}>
          <div style={css.sectionTitle}>Steps</div>
          {editSteps.map((step, idx) => (
            <div key={idx} style={css.stepRow}>
              <span style={css.stepNum}>{idx + 1}</span>
              <select
                style={css.select}
                value={step.agentId}
                onChange={(e) => updateStep(idx, "agentId", e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input
                style={css.input}
                value={step.role}
                onChange={(e) => updateStep(idx, "role", e.target.value)}
                placeholder="Role (e.g. research)"
              />
              <button style={css.btnSmall} onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                &uarr;
              </button>
              <button style={css.btnSmall} onClick={() => moveStep(idx, 1)} disabled={idx === editSteps.length - 1}>
                &darr;
              </button>
              <button style={{ ...css.btnSmall, color: "var(--destructive)" }} onClick={() => removeStep(idx)}>
                &times;
              </button>
            </div>
          ))}
          <button style={{ ...css.btnSmall, marginTop: "8px" }} onClick={addStep}>
            + Add Step
          </button>
        </div>

        {/* Save as template */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            style={css.input}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
          />
          <button style={css.btnSmall} onClick={handleSaveTemplate} disabled={!templateName.trim()}>
            Save as Template
          </button>
        </div>

        {errorMsg && <div style={css.error}>{errorMsg}</div>}
      </div>
    );
  }

  // ─── View Mode ───
  if (!pipeline || pipeline.steps.length === 0) {
    return (
      <div style={css.container}>
        {helpSection}
        <div style={css.empty}>
          <div style={{ marginBottom: "8px" }}>No pipeline configured for this issue.</div>
          <button style={css.btn("primary")} onClick={startEdit}>
            Create Pipeline
          </button>
        </div>
      </div>
    );
  }

  // Determine step statuses
  const stepStatuses = pipeline.steps.map((_, idx) => {
    if (idx < pipeline.currentStep) return "done";
    if (idx === pipeline.currentStep) return "active";
    return "pending";
  });

  return (
    <div style={css.container}>
      {helpSection}
      <div style={css.header}>
        <span style={css.title}>
          Pipeline {pipeline.templateName ? `(${pipeline.templateName})` : ""}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={css.btn("secondary")} onClick={startEdit}>Edit</button>
          {pipeline.currentStep === 0 && pipeline.completedSteps.length === 0 && (
            <button style={css.btn("primary")} onClick={handleStart} disabled={saving}>
              Start Pipeline
            </button>
          )}
          <button style={css.btn("danger")} onClick={handleRemove} disabled={saving}>
            Remove
          </button>
        </div>
      </div>

      {/* Progress visualization */}
      <div style={css.progress}>
        {pipeline.steps.map((step, idx) => (
          <span key={idx}>
            {idx > 0 && <span style={css.arrow}> &rarr; </span>}
            <span style={css.progressStep(stepStatuses[idx]!)}>
              {statusIcon(stepStatuses[idx]!)} {step.agent}
            </span>
          </span>
        ))}
      </div>

      {/* Steps detail */}
      <div style={css.section}>
        <div style={css.sectionTitle}>Steps</div>
        {pipeline.steps.map((step, idx) => (
          <div key={idx} style={css.stepRow}>
            <span style={css.stepNum}>{idx + 1}</span>
            <span style={{ fontSize: "16px" }}>{statusIcon(stepStatuses[idx]!)}</span>
            <span style={css.stepAgent}>{step.agent}</span>
            <span style={css.stepRole}>{step.role}</span>
          </div>
        ))}
      </div>

      {errorMsg && <div style={css.error}>{errorMsg}</div>}

      <button style={css.btnSmall} onClick={refresh}>Refresh</button>
    </div>
  );
}
