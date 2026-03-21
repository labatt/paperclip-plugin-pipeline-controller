import { usePluginData } from "@paperclipai/plugin-sdk/ui";
import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";

interface PipelineStep {
  agent: string;
  role: string;
}

interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  startedAt: string;
  lastAdvancedAt: string;
}

interface ActivePipeline {
  parentId: string;
  parentTitle: string;
  pipeline: { steps: PipelineStep[] };
  progress: PipelineProgress | null;
  status: string;
}

interface StuckIssue {
  id: string;
  title: string;
  status: string;
  minutesStale: number;
}

interface RecentCompletion {
  id: string;
  title: string;
  completedAt: string;
}

interface PipelineStatusData {
  activePipelines: ActivePipeline[];
  stuckIssues: StuckIssue[];
  recentCompletions: RecentCompletion[];
}

const styles = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    display: "grid",
    gap: "16px",
  } as React.CSSProperties,
  section: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "12px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,
  pipeline: {
    marginBottom: "12px",
    padding: "8px",
    borderRadius: "6px",
    background: "#f9fafb",
  } as React.CSSProperties,
  pipelineTitle: {
    fontWeight: 500,
    marginBottom: "6px",
  } as React.CSSProperties,
  steps: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap" as const,
    alignItems: "center",
  } as React.CSSProperties,
  step: (isCompleted: boolean, isCurrent: boolean) =>
    ({
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      background: isCompleted ? "#dcfce7" : isCurrent ? "#dbeafe" : "#f3f4f6",
      color: isCompleted ? "#166534" : isCurrent ? "#1e40af" : "#6b7280",
      fontWeight: isCurrent ? 600 : 400,
      border: isCurrent ? "1px solid #93c5fd" : "1px solid transparent",
    }) as React.CSSProperties,
  arrow: {
    color: "#9ca3af",
    fontSize: "11px",
  } as React.CSSProperties,
  stuckItem: {
    padding: "6px 8px",
    borderRadius: "4px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    marginBottom: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  stuckTitle: {
    color: "#991b1b",
    fontWeight: 500,
    fontSize: "12px",
  } as React.CSSProperties,
  stuckAge: {
    color: "#dc2626",
    fontSize: "11px",
  } as React.CSSProperties,
  completionItem: {
    padding: "4px 0",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
  } as React.CSSProperties,
  completionTitle: {
    color: "#374151",
  } as React.CSSProperties,
  completionTime: {
    color: "#9ca3af",
    fontSize: "11px",
  } as React.CSSProperties,
  empty: {
    color: "#9ca3af",
    fontSize: "12px",
    fontStyle: "italic" as const,
  } as React.CSSProperties,
  badge: (color: string) =>
    ({
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
    }) as React.CSSProperties,
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function PipelineDashboardWidget({ context }: PluginWidgetProps) {
  const { data, loading, error, refresh } = usePluginData<PipelineStatusData>(
    "pipeline-status",
    { companyId: context.companyId },
  );

  if (loading) return <div style={styles.container}>Loading pipeline status...</div>;
  if (error) return <div style={styles.container}>Error: {error.message}</div>;
  if (!data) return <div style={styles.container}>No data</div>;

  return (
    <div style={styles.container}>
      {/* Active Pipelines */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          Active Pipelines
          {data.activePipelines.length > 0 && (
            <span style={styles.badge("#3b82f6")}>{data.activePipelines.length}</span>
          )}
        </div>
        {data.activePipelines.length === 0 ? (
          <div style={styles.empty}>No active pipelines</div>
        ) : (
          data.activePipelines
            .filter((p) => p.status !== "done")
            .map((p) => (
              <div key={p.parentId} style={styles.pipeline}>
                <div style={styles.pipelineTitle}>{p.parentTitle}</div>
                <div style={styles.steps}>
                  {p.pipeline.steps.map((step, idx) => {
                    const currentStep = p.progress?.currentStep ?? 0;
                    const isCompleted = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <span key={idx}>
                        {idx > 0 && <span style={styles.arrow}> &rarr; </span>}
                        <span style={styles.step(isCompleted, isCurrent)}>
                          {step.agent}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Stuck Issues */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          Stuck Issues
          {data.stuckIssues.length > 0 && (
            <span style={styles.badge("#ef4444")}>{data.stuckIssues.length}</span>
          )}
        </div>
        {data.stuckIssues.length === 0 ? (
          <div style={styles.empty}>No stuck issues</div>
        ) : (
          data.stuckIssues.slice(0, 5).map((s) => (
            <div key={s.id} style={styles.stuckItem}>
              <span style={styles.stuckTitle}>{s.title}</span>
              <span style={styles.stuckAge}>{s.minutesStale}m stale</span>
            </div>
          ))
        )}
      </div>

      {/* Recent Completions */}
      <div>
        <div style={styles.sectionTitle}>
          Recent Completions
          {data.recentCompletions.length > 0 && (
            <span style={styles.badge("#22c55e")}>{data.recentCompletions.length}</span>
          )}
        </div>
        {data.recentCompletions.length === 0 ? (
          <div style={styles.empty}>No recent completions</div>
        ) : (
          data.recentCompletions.slice(0, 5).map((c) => (
            <div key={c.id} style={styles.completionItem}>
              <span style={styles.completionTitle}>{c.title}</span>
              <span style={styles.completionTime}>{timeAgo(c.completedAt)}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={refresh}
        style={{
          padding: "4px 12px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Refresh
      </button>
    </div>
  );
}
