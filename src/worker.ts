import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginEvent,
  type PluginJobContext,
} from "@paperclipai/plugin-sdk";
import type { Issue } from "@paperclipai/shared";
import {
  CONTENT_PATTERNS,
  DEFAULT_CONFIG,
  JOB_KEYS,
  PLUGIN_ID,
  POST_ID_PATTERNS,
  STATE_KEYS,
  type PipelineControllerConfig,
  type PipelineData,
  type PipelineStep,
  type PipelineTemplates,
} from "./constants.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getConfig(ctx: PluginContext): Promise<PipelineControllerConfig> {
  const config = await ctx.config.get();
  return { ...DEFAULT_CONFIG, ...(config as PipelineControllerConfig) };
}

function isContentTask(title: string): boolean {
  return CONTENT_PATTERNS.some((pattern) => pattern.test(title));
}

function extractPostId(text: string): string | null {
  for (const pattern of POST_ID_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1];
  }
  return null;
}

function minutesSince(dateOrIso: string | Date): number {
  const time = dateOrIso instanceof Date ? dateOrIso.getTime() : new Date(dateOrIso).getTime();
  return (Date.now() - time) / 60_000;
}

/** Read pipeline data from ctx.state (scoped to issue) */
async function getPipelineData(
  ctx: PluginContext,
  issueId: string,
): Promise<PipelineData | null> {
  return (await ctx.state.get({
    scopeKind: "issue",
    scopeId: issueId,
    stateKey: STATE_KEYS.pipelineData,
  })) as PipelineData | null;
}

/** Write pipeline data to ctx.state (scoped to issue) */
async function setPipelineData(
  ctx: PluginContext,
  issueId: string,
  data: PipelineData,
): Promise<void> {
  await ctx.state.set(
    { scopeKind: "issue", scopeId: issueId, stateKey: STATE_KEYS.pipelineData },
    data,
  );
}

async function sendTelegramAlert(
  ctx: PluginContext,
  config: PipelineControllerConfig,
  message: string,
): Promise<void> {
  const botToken = config.telegramBotToken;
  const chatId = config.telegramChatId;
  if (!botToken || !chatId) return;
  try {
    await ctx.http.fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      },
    );
  } catch (err) {
    ctx.logger.error("Telegram alert failed", { error: String(err) });
  }
}

// ─── Auto-advance Pipeline ─────────────────────────────────────────────────

async function handleIssueCompleted(ctx: PluginContext, event: PluginEvent): Promise<void> {
  const payload = event.payload as Record<string, unknown> | undefined;
  if (!payload) return;

  const issueId = event.entityId;
  if (!issueId) return;

  const status = payload.status as string | undefined;
  const previousStatus = payload.previousStatus as string | undefined;

  // Only act on transitions TO done
  if (status !== "done" || previousStatus === "done") return;

  const companyId = event.companyId;
  const issue = await ctx.issues.get(issueId, companyId);
  if (!issue) return;

  // Content verification (applies to any content task)
  if (isContentTask(issue.title)) {
    await verifyContentTask(ctx, issue, companyId);
  }

  // Pipeline advance: only for sub-tasks with a parent
  const parentId = issue.parentId;
  if (!parentId) return;

  // Read pipeline data from parent's state
  const pipelineData = await getPipelineData(ctx, parentId);
  if (!pipelineData || !pipelineData.steps || pipelineData.steps.length === 0) return;

  // Find which step just completed by matching assigneeAgentId
  const assignee = issue.assigneeAgentId ?? "";
  const completedStepIndex = pipelineData.steps.findIndex(
    (step) => assignee === step.agentId || assignee.startsWith(step.agentId.slice(0, 8)),
  );

  if (completedStepIndex === -1) {
    ctx.logger.info("Completed issue agent not in pipeline", { issueId, assignee });
    return;
  }

  const completedStep = pipelineData.steps[completedStepIndex]!;
  const nextStepIndex = completedStepIndex + 1;

  // Update step history
  const history = pipelineData.stepHistory ?? [];
  const existingHistoryEntry = history.find((h) => h.stepIndex === completedStepIndex);
  if (existingHistoryEntry) {
    existingHistoryEntry.status = "done";
    existingHistoryEntry.completedAt = new Date().toISOString();
  } else {
    history.push({
      stepIndex: completedStepIndex,
      agent: completedStep.agent,
      status: "done",
      completedAt: new Date().toISOString(),
      subTaskId: issueId,
    });
  }

  if (nextStepIndex < pipelineData.steps.length) {
    const nextStep = pipelineData.steps[nextStepIndex]!;

    // Gather context from completed task comments
    const comments = await ctx.issues.listComments(issueId, companyId);
    const contextSummary = comments
      .map((c) => c.body)
      .filter((body) => body.length > 0)
      .slice(-3)
      .join("\n\n---\n\n");

    const parentIssue = await ctx.issues.get(parentId, companyId);
    const parentTitle = parentIssue?.title ?? "Pipeline task";

    // Create next sub-task
    const description = [
      `Pipeline step ${nextStepIndex + 1}/${pipelineData.steps.length}: ${nextStep.role}`,
      `Parent: ${parentTitle}`,
      `Previous step completed by ${completedStep.agent} (${completedStep.role}).`,
      "",
      contextSummary ? `## Context from previous step\n\n${contextSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const newIssue = await ctx.issues.create({
      companyId,
      parentId,
      title: `[${nextStep.role}] ${parentTitle}`,
      description,
      assigneeAgentId: nextStep.agentId,
      priority: issue.priority,
    });

    // Add history entry for new step
    history.push({
      stepIndex: nextStepIndex,
      agent: nextStep.agent,
      status: "active",
      startedAt: new Date().toISOString(),
      subTaskId: newIssue.id,
    });

    // Comment on parent (no Telegram alert - this is normal progress)
    await ctx.issues.createComment(
      parentId,
      `Step ${completedStepIndex + 1} complete (${completedStep.agent} - ${completedStep.role}). Starting step ${nextStepIndex + 1} (${nextStep.agent} - ${nextStep.role}).`,
      companyId,
    );

    // Update pipeline state
    await setPipelineData(ctx, parentId, {
      ...pipelineData,
      currentStep: nextStepIndex,
      completedSteps: [...(pipelineData.completedSteps ?? []), completedStep.agent],
      stepHistory: history,
      lastAdvancedAt: new Date().toISOString(),
    });

    ctx.logger.info("Pipeline advanced", {
      parentId,
      from: completedStep.agent,
      to: nextStep.agent,
      newIssueId: newIssue.id,
    });
  } else {
    // Pipeline complete - send ONE Telegram alert
    await ctx.issues.createComment(
      parentId,
      `Pipeline complete! All ${pipelineData.steps.length} steps finished. Last step: ${completedStep.agent} (${completedStep.role}).`,
      companyId,
    );

    await ctx.issues.update(parentId, { status: "done" }, companyId);

    await setPipelineData(ctx, parentId, {
      ...pipelineData,
      currentStep: pipelineData.steps.length,
      completedSteps: [...(pipelineData.completedSteps ?? []), completedStep.agent],
      stepHistory: history,
      lastAdvancedAt: new Date().toISOString(),
    });

    const config = await getConfig(ctx);
    const parentIssue = await ctx.issues.get(parentId, companyId);
    await sendTelegramAlert(
      ctx,
      config,
      `<b>Pipeline Complete</b>\n${parentIssue?.title ?? parentId}\nAll ${pipelineData.steps.length} steps finished.`,
    );

    ctx.logger.info("Pipeline completed", { parentId });
  }
}

// ─── Content Verification ───────────────────────────────────────────────────

async function verifyContentTask(
  ctx: PluginContext,
  issue: Issue,
  companyId: string,
): Promise<void> {
  const config = await getConfig(ctx);
  if (!config.siteApiToken) return;

  let postId = extractPostId(issue.title);
  if (!postId && issue.description) {
    postId = extractPostId(issue.description);
  }
  if (!postId) {
    const comments = await ctx.issues.listComments(issue.id, companyId);
    for (const comment of comments) {
      postId = extractPostId(comment.body);
      if (postId) break;
    }
  }
  if (!postId) return;

  try {
    const apiUrl = config.siteApiUrl || DEFAULT_CONFIG.siteApiUrl;
    const response = await ctx.http.fetch(`${apiUrl}/api/v1/posts/${postId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.siteApiToken}` },
    });

    if (!response.ok) return;

    const post = (await response.json()) as Record<string, unknown>;
    const content = String(post.content ?? post.body ?? "");
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const hasImages = /<img\b/i.test(content) || /!\[/.test(content);

    const hashKey = { scopeKind: "issue" as const, scopeId: issue.id, stateKey: STATE_KEYS.contentHash };
    const previousHash = (await ctx.state.get(hashKey)) as string | null;
    const currentHash = `wc:${wordCount}|img:${hasImages}`;

    const failures: string[] = [];
    if (wordCount < 300) failures.push(`Word count too low: ${wordCount} (minimum 300)`);
    if (!hasImages) failures.push("No images found (need <img> or ![] markdown images)");
    if (previousHash === currentHash && failures.length > 0) {
      failures.push("Content has not changed since last check");
    }

    if (failures.length > 0) {
      await ctx.issues.update(issue.id, { status: "todo" }, companyId);
      await ctx.issues.createComment(
        issue.id,
        `Content verification FAILED for post ${postId}:\n\n${failures.map((f) => `- ${f}`).join("\n")}\n\nReopening task.`,
        companyId,
      );

      // Exception alert: verification failed
      await sendTelegramAlert(
        ctx,
        config,
        `<b>Verification Failed</b>\n${issue.title}\n${failures.join(", ")}`,
      );
    }

    await ctx.state.set(hashKey, currentHash);
  } catch (err) {
    ctx.logger.error("Content verification error", { issueId: issue.id, postId, error: String(err) });
  }
}

// ─── Stuck Detection Job ────────────────────────────────────────────────────

async function runStuckDetection(ctx: PluginContext, _job: PluginJobContext): Promise<void> {
  const config = await getConfig(ctx);
  const companies = await ctx.companies.list({ limit: 10, offset: 0 });

  for (const company of companies) {
    const companyId = company.id;

    const todoIssues = await ctx.issues.list({ companyId, status: "todo", limit: 200, offset: 0 });
    const inProgressIssues = await ctx.issues.list({ companyId, status: "in_progress", limit: 200, offset: 0 });
    const blockedIssues = await ctx.issues.list({ companyId, status: "blocked", limit: 200, offset: 0 });

    const stuckIssues: Array<{ issue: Issue; reason: string }> = [];

    // Check todo
    const todoThreshold = config.stuckTodoMinutes ?? DEFAULT_CONFIG.stuckTodoMinutes;
    for (const issue of todoIssues) {
      if (!issue.assigneeAgentId) continue;
      const age = minutesSince(issue.updatedAt);
      if (age > todoThreshold) {
        const comments = await ctx.issues.listComments(issue.id, companyId);
        const latest = comments[comments.length - 1];
        if (!latest || minutesSince(latest.createdAt) > todoThreshold) {
          stuckIssues.push({ issue, reason: `todo for ${Math.round(age)}m` });
        }
      }
    }

    // Check in_progress
    const ipThreshold = config.stuckInProgressMinutes ?? DEFAULT_CONFIG.stuckInProgressMinutes;
    for (const issue of inProgressIssues) {
      const age = minutesSince(issue.updatedAt);
      if (age > ipThreshold) {
        const comments = await ctx.issues.listComments(issue.id, companyId);
        const latest = comments[comments.length - 1];
        if (!latest || minutesSince(latest.createdAt) > ipThreshold) {
          stuckIssues.push({ issue, reason: `in_progress for ${Math.round(age)}m` });
        }
      }
    }

    // Auto-unblock blocked issues
    for (const issue of blockedIssues) {
      if (!issue.parentId) continue;
      const siblings = await ctx.issues.list({ companyId, limit: 200, offset: 0 });
      const sameSiblings = siblings.filter((s) => s.parentId === issue.parentId && s.id !== issue.id);
      if (sameSiblings.length > 0 && sameSiblings.every((s) => s.status === "done")) {
        await ctx.issues.update(issue.id, { status: "todo" }, companyId);
        await ctx.issues.createComment(issue.id, "Auto-unblocked: all sibling tasks are done.", companyId);
      }
    }

    // Exception-only alerts for stuck issues
    if (stuckIssues.length > 0) {
      const alertHistoryKey = { scopeKind: "instance" as const, stateKey: STATE_KEYS.alertHistory };
      const alertHistory = ((await ctx.state.get(alertHistoryKey)) as Record<string, string> | null) ?? {};
      const now = new Date().toISOString();
      const filtered = stuckIssues.filter((entry) => {
        const last = alertHistory[entry.issue.id];
        return !last || minutesSince(last) > 60;
      });

      if (filtered.length > 0) {
        const id = (i: Issue) => (i as unknown as Record<string, string>).identifier ?? i.id.slice(0, 8);
        const lines = filtered.map((e) => `- <b>${id(e.issue)}</b>: ${e.issue.title} (${e.reason})`);
        await sendTelegramAlert(ctx, config, `<b>Stuck Issues</b>\n\n${lines.join("\n")}`);

        for (const entry of filtered) {
          alertHistory[entry.issue.id] = now;
        }
        await ctx.state.set(alertHistoryKey, alertHistory);
      }
    }
  }
}

// ─── Data Handlers (for UI) ─────────────────────────────────────────────────

async function registerDataHandlers(ctx: PluginContext): Promise<void> {
  // Pipeline data for a specific issue (detail tab)
  ctx.data.register("issue-pipeline", async (params) => {
    const issueId = typeof params.entityId === "string" ? params.entityId : "";
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!issueId) return null;

    const data = await getPipelineData(ctx, issueId);
    const agents = companyId ? await ctx.agents.list({ companyId, limit: 200, offset: 0 }) : [];

    return {
      pipeline: data,
      agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    };
  });

  // Dashboard: all active pipelines
  ctx.data.register("pipeline-status", async (params) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return { activePipelines: [], stuckIssues: [] };

    const allIssues = await ctx.issues.list({ companyId, limit: 200, offset: 0 });
    const config = await getConfig(ctx);

    const activePipelines: Array<{
      parentId: string;
      parentTitle: string;
      identifier: string;
      steps: Array<{ agent: string; role: string }>;
      currentStep: number;
      totalSteps: number;
      status: string;
    }> = [];

    const stuckIssues: Array<{
      id: string;
      title: string;
      identifier: string;
      status: string;
      minutesStale: number;
    }> = [];

    for (const issue of allIssues) {
      // Active pipelines (parent issues with pipeline data)
      if (!issue.parentId) {
        const data = await getPipelineData(ctx, issue.id);
        if (data && data.steps.length > 0 && issue.status !== "done") {
          const id = (issue as unknown as Record<string, string>).identifier ?? issue.id.slice(0, 8);
          activePipelines.push({
            parentId: issue.id,
            parentTitle: issue.title,
            identifier: id,
            steps: data.steps.map((s) => ({ agent: s.agent, role: s.role })),
            currentStep: data.currentStep,
            totalSteps: data.steps.length,
            status: issue.status,
          });
        }
      }

      // Stuck detection for UI
      if (issue.status === "todo" && issue.assigneeAgentId) {
        const age = minutesSince(issue.updatedAt);
        if (age > (config.stuckTodoMinutes ?? 30)) {
          const id = (issue as unknown as Record<string, string>).identifier ?? issue.id.slice(0, 8);
          stuckIssues.push({ id: issue.id, title: issue.title, identifier: id, status: "todo", minutesStale: Math.round(age) });
        }
      } else if (issue.status === "in_progress") {
        const age = minutesSince(issue.updatedAt);
        if (age > (config.stuckInProgressMinutes ?? 60)) {
          const id = (issue as unknown as Record<string, string>).identifier ?? issue.id.slice(0, 8);
          stuckIssues.push({ id: issue.id, title: issue.title, identifier: id, status: "in_progress", minutesStale: Math.round(age) });
        }
      }
    }

    return { activePipelines, stuckIssues };
  });

  // Pipeline templates
  ctx.data.register("pipeline-templates", async () => {
    const templates = (await ctx.state.get({
      scopeKind: "instance",
      stateKey: STATE_KEYS.templates,
    })) as PipelineTemplates | null;
    return templates ?? { templates: [] };
  });

  // Config for settings page
  ctx.data.register("plugin-config", async () => {
    return await getConfig(ctx);
  });
}

// ─── Action Handlers (for UI) ───────────────────────────────────────────────

async function registerActionHandlers(ctx: PluginContext): Promise<void> {
  // Save pipeline on an issue
  ctx.actions.register("save-pipeline", async (params) => {
    const issueId = typeof params.issueId === "string" ? params.issueId : "";
    if (!issueId) throw new Error("issueId is required");

    const steps = params.steps as PipelineStep[] | undefined;
    if (!steps || !Array.isArray(steps)) throw new Error("steps is required");

    const existing = await getPipelineData(ctx, issueId);
    const data: PipelineData = {
      steps,
      currentStep: existing?.currentStep ?? 0,
      completedSteps: existing?.completedSteps ?? [],
      stepHistory: existing?.stepHistory ?? [],
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      lastAdvancedAt: existing?.lastAdvancedAt ?? new Date().toISOString(),
      templateName: typeof params.templateName === "string" ? params.templateName : undefined,
    };

    await setPipelineData(ctx, issueId, data);
    return { ok: true };
  });

  // Remove pipeline from an issue
  ctx.actions.register("remove-pipeline", async (params) => {
    const issueId = typeof params.issueId === "string" ? params.issueId : "";
    if (!issueId) throw new Error("issueId is required");
    await ctx.state.delete({ scopeKind: "issue", scopeId: issueId, stateKey: STATE_KEYS.pipelineData });
    return { ok: true };
  });

  // Save a pipeline template
  ctx.actions.register("save-template", async (params) => {
    const name = typeof params.name === "string" ? params.name : "";
    const steps = params.steps as PipelineStep[] | undefined;
    if (!name || !steps) throw new Error("name and steps are required");

    const key = { scopeKind: "instance" as const, stateKey: STATE_KEYS.templates };
    const existing = ((await ctx.state.get(key)) as PipelineTemplates | null) ?? { templates: [] };

    // Replace if name exists, else append
    const idx = existing.templates.findIndex((t) => t.name === name);
    const entry = { name, steps, createdAt: new Date().toISOString() };
    if (idx >= 0) {
      existing.templates[idx] = entry;
    } else {
      existing.templates.push(entry);
    }

    await ctx.state.set(key, existing);
    return { ok: true };
  });

  // Delete a pipeline template
  ctx.actions.register("delete-template", async (params) => {
    const name = typeof params.name === "string" ? params.name : "";
    if (!name) throw new Error("name is required");

    const key = { scopeKind: "instance" as const, stateKey: STATE_KEYS.templates };
    const existing = ((await ctx.state.get(key)) as PipelineTemplates | null) ?? { templates: [] };
    existing.templates = existing.templates.filter((t) => t.name !== name);
    await ctx.state.set(key, existing);
    return { ok: true };
  });

  // Start a pipeline (create first sub-task)
  ctx.actions.register("start-pipeline", async (params) => {
    const issueId = typeof params.issueId === "string" ? params.issueId : "";
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!issueId || !companyId) throw new Error("issueId and companyId are required");

    const data = await getPipelineData(ctx, issueId);
    if (!data || data.steps.length === 0) throw new Error("No pipeline defined on this issue");

    const firstStep = data.steps[0]!;
    const parentIssue = await ctx.issues.get(issueId, companyId);
    const parentTitle = parentIssue?.title ?? "Pipeline task";

    const newIssue = await ctx.issues.create({
      companyId,
      parentId: issueId,
      title: `[${firstStep.role}] ${parentTitle}`,
      description: `Pipeline step 1/${data.steps.length}: ${firstStep.role}\nParent: ${parentTitle}`,
      assigneeAgentId: firstStep.agentId,
      priority: parentIssue?.priority,
    });

    const history = [{
      stepIndex: 0,
      agent: firstStep.agent,
      status: "active" as const,
      startedAt: new Date().toISOString(),
      subTaskId: newIssue.id,
    }];

    await setPipelineData(ctx, issueId, {
      ...data,
      currentStep: 0,
      completedSteps: [],
      stepHistory: history,
      startedAt: new Date().toISOString(),
      lastAdvancedAt: new Date().toISOString(),
    });

    await ctx.issues.createComment(
      issueId,
      `Pipeline started. Step 1/${data.steps.length}: ${firstStep.agent} (${firstStep.role}).`,
      companyId,
    );

    return { ok: true, firstIssueId: newIssue.id };
  });
}

// ─── Plugin Definition ──────────────────────────────────────────────────────

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Pipeline Controller v2 setup starting", { pluginId: PLUGIN_ID });

    // Event: auto-advance on issue completion
    ctx.events.on("issue.updated", async (event: PluginEvent) => {
      try {
        await handleIssueCompleted(ctx, event);
      } catch (err) {
        ctx.logger.error("Error handling issue.updated", { error: String(err) });
      }
    });

    // Job: stuck detection
    ctx.jobs.register(JOB_KEYS.stuckDetection, async (job: PluginJobContext) => {
      try {
        await runStuckDetection(ctx, job);
      } catch (err) {
        ctx.logger.error("Stuck detection job failed", { error: String(err) });
        throw err;
      }
    });

    // Data + Action handlers for UI
    await registerDataHandlers(ctx);
    await registerActionHandlers(ctx);

    ctx.logger.info("Pipeline Controller v2 setup complete");
  },

  async onHealth() {
    return { status: "ok", message: "Pipeline Controller running" };
  },

  async onConfigChanged() {
    // Config is re-read on each use
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
