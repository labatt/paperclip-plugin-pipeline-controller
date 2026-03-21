import { usePluginData } from "@paperclipai/plugin-sdk/ui";
import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";

interface ActivePipeline {
  parentId: string;
  parentTitle: string;
  identifier: string;
  steps: Array<{ agent: string; role: string }>;
  currentStep: number;
  totalSteps: number;
  status: string;
}

interface StuckIssue {
  id: string;
  title: string;
  identifier: string;
  status: string;
  minutesStale: number;
}

interface PipelineStatusData {
  activePipelines: ActivePipeline[];
  stuckIssues: StuckIssue[];
}

const css = {
  container: { fontFamily: "system-ui, sans-serif", fontSize: "13px", display: "grid", gap: "12px" } as React.CSSProperties,
  section: { borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" } as React.CSSProperties,
  sectionTitle: { fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" } as React.CSSProperties,
  pipeline: { marginBottom: "8px", padding: "6px 8px", borderRadius: "6px", background: "#f9fafb" } as React.CSSProperties,
  pipelineTitle: { fontWeight: 500, fontSize: "12px", marginBottom: "4px" } as React.CSSProperties,
  steps: { display: "flex", gap: "2px", flexWrap: "wrap" as const, alignItems: "center" } as React.CSSProperties,
  step: (isCompleted: boolean, isCurrent: boolean) => ({
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "11px",
    background: isCompleted ? "#dcfce7" : isCurrent ? "#dbeafe" : "#f3f4f6",
    color: isCompleted ? "#166534" : isCurrent ? "#1e40af" : "#9ca3af",
    fontWeight: isCurrent ? 600 : 400,
  }) as React.CSSProperties,
  arrow: { color: "#d1d5db", fontSize: "10px" } as React.CSSProperties,
  stuckItem: { padding: "4px 8px", borderRadius: "4px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "12px" } as React.CSSProperties,
  stuckTitle: { color: "#991b1b", fontWeight: 500 } as React.CSSProperties,
  stuckAge: { color: "#dc2626", fontSize: "11px" } as React.CSSProperties,
  badge: (color: string) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "16px", height: "16px", borderRadius: "8px", fontSize: "10px", fontWeight: 600, color: "#fff", background: color, padding: "0 4px" }) as React.CSSProperties,
  empty: { color: "#9ca3af", fontSize: "12px", fontStyle: "italic" as const } as React.CSSProperties,
  refreshBtn: { padding: "3px 10px", fontSize: "11px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" } as React.CSSProperties,
};

export function PipelineDashboardWidget({ context }: PluginWidgetProps) {
  const { data, loading, error, refresh } = usePluginData<PipelineStatusData>(
    "pipeline-status",
    { companyId: context.companyId },
  );

  if (loading) return <div style={css.container}>Loading...</div>;
  if (error) return <div style={css.container}>Error: {error.message}</div>;
  if (!data) return <div style={css.container}>No data</div>;

  return (
    <div style={css.container}>
      {/* Active Pipelines */}
      <div style={css.section}>
        <div style={css.sectionTitle}>
          Active Pipelines
          {data.activePipelines.length > 0 && <span style={css.badge("#3b82f6")}>{data.activePipelines.length}</span>}
        </div>
        {data.activePipelines.length === 0 ? (
          <div style={css.empty}>No active pipelines</div>
        ) : (
          data.activePipelines.map((p) => (
            <div key={p.parentId} style={css.pipeline}>
              <div style={css.pipelineTitle}>{p.identifier}: {p.parentTitle}</div>
              <div style={css.steps}>
                {p.steps.map((step, idx) => (
                  <span key={idx}>
                    {idx > 0 && <span style={css.arrow}>&rarr;</span>}
                    <span style={css.step(idx < p.currentStep, idx === p.currentStep)}>
                      {step.agent}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stuck Issues */}
      {data.stuckIssues.length > 0 && (
        <div>
          <div style={css.sectionTitle}>
            Stuck <span style={css.badge("#ef4444")}>{data.stuckIssues.length}</span>
          </div>
          {data.stuckIssues.slice(0, 5).map((s) => (
            <div key={s.id} style={css.stuckItem}>
              <span style={css.stuckTitle}>{s.identifier}: {s.title}</span>
              <span style={css.stuckAge}>{s.minutesStale}m</span>
            </div>
          ))}
        </div>
      )}

      <button style={css.refreshBtn} onClick={refresh}>Refresh</button>
    </div>
  );
}
