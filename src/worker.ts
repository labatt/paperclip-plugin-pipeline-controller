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
  type PipelineDocument,
  type PipelineProgress,
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

async function parsePipelineDoc(
  ctx: PluginContext,
  issueId: string,
  companyId: string,
): Promise<PipelineDocument | null> {
  try {
    const doc = await ctx.issues.documents.get(issueId, "pipeline", companyId);
    if (!doc) return null;
    return JSON.parse(doc.body) as PipelineDocument;
  } catch (err) {
    ctx.logger.warn("Failed to parse pipeline document", { issueId, error: String(err) });
    return null;
  }
}

async function sendTelegramAlert(
  ctx: PluginContext,
  config: PipelineControllerConfig,
  message: string,
): Promise<void> {
  const botToken = config.telegramBotToken;
  const chatId = config.telegramChatId;
  if (!botToken || !chatId) {
    ctx.logger.warn("Telegram alert skipped: missing botToken or chatId");
    return;
  }
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

  // Get the completed issue
  const issue = await ctx.issues.get(issueId, companyId);
  if (!issue) return;

  // Check if this is a sub-task with a parent
  const parentId = issue.parentId;
  if (!parentId) {
    // No parent - might be a content task to verify
    if (isContentTask(issue.title)) {
      await verifyContentTask(ctx, issue, companyId);
    }
    return;
  }

  // Read pipeline document from parent
  const pipeline = await parsePipelineDoc(ctx, parentId, companyId);
  if (!pipeline || !pipeline.steps || pipeline.steps.length === 0) {
    // No pipeline doc - check content verification
    if (isContentTask(issue.title)) {
      await verifyContentTask(ctx, issue, companyId);
    }
    return;
  }

  // Find which step just completed by matching assigneeAgentId
  const assignee = issue.assigneeAgentId ?? "";
  const completedStepIndex = pipeline.steps.findIndex(
    (step) => assignee === step.agentId || assignee.startsWith(step.agentId.slice(0, 8)),
  );

  if (completedStepIndex === -1) {
    ctx.logger.info("Completed issue agent not in pipeline", {
      issueId,
      assigneeAgentId: issue.assigneeAgentId,
    });
    return;
  }

  const completedStep = pipeline.steps[completedStepIndex]!;
  const nextStepIndex = completedStepIndex + 1;

  // If there is a next step, create the sub-task
  if (nextStepIndex < pipeline.steps.length) {
    const nextStep = pipeline.steps[nextStepIndex]!;

    // Gather context from completed task comments
    const comments = await ctx.issues.listComments(issueId, companyId);
    const contextSummary = comments
      .map((c) => c.body)
      .filter((body) => body.length > 0)
      .slice(-3) // Last 3 comments for context
      .join("\n\n---\n\n");

    // Get parent issue for title context
    const parentIssue = await ctx.issues.get(parentId, companyId);
    const parentTitle = parentIssue?.title ?? "Pipeline task";

    // Create next sub-task
    const description = [
      `Pipeline step ${nextStepIndex + 1}/${pipeline.steps.length}: ${nextStep.role}`,
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

    ctx.logger.info("Pipeline advanced", {
      parentId,
      from: completedStep.agent,
      to: nextStep.agent,
      newIssueId: newIssue.id,
    });

    // Comment on parent
    await ctx.issues.createComment(
      parentId,
      `Step ${completedStepIndex + 1} complete (${completedStep.agent} - ${completedStep.role}). Starting step ${nextStepIndex + 1} (${nextStep.agent} - ${nextStep.role}).`,
      companyId,
    );

    // Update pipeline progress state
    const progressKey = {
      scopeKind: "issue" as const,
      scopeId: parentId,
      stateKey: STATE_KEYS.pipelineProgress,
    };
    const existing = (await ctx.state.get(progressKey)) as PipelineProgress | null;
    const progress: PipelineProgress = {
      currentStep: nextStepIndex,
      totalSteps: pipeline.steps.length,
      completedSteps: [...(existing?.completedSteps ?? []), completedStep.agent],
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      lastAdvancedAt: new Date().toISOString(),
    };
    await ctx.state.set(progressKey, progress);
  } else {
    // Pipeline complete
    await ctx.issues.createComment(
      parentId,
      `Pipeline complete! All ${pipeline.steps.length} steps finished. Last step: ${completedStep.agent} (${completedStep.role}).`,
      companyId,
    );

    // Mark parent as done
    await ctx.issues.update(parentId, { status: "done" }, companyId);

    // Update progress state
    const progressKey = {
      scopeKind: "issue" as const,
      scopeId: parentId,
      stateKey: STATE_KEYS.pipelineProgress,
    };
    const existing = (await ctx.state.get(progressKey)) as PipelineProgress | null;
    const progress: PipelineProgress = {
      currentStep: pipeline.steps.length,
      totalSteps: pipeline.steps.length,
      completedSteps: [...(existing?.completedSteps ?? []), completedStep.agent],
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      lastAdvancedAt: new Date().toISOString(),
    };
    await ctx.state.set(progressKey, progress);

    ctx.logger.info("Pipeline completed", { parentId });
  }

  // Also check content verification for the completed task
  if (isContentTask(issue.title)) {
    await verifyContentTask(ctx, issue, companyId);
  }
}

// ─── Content Verification ───────────────────────────────────────────────────

async function verifyContentTask(
  ctx: PluginContext,
  issue: Issue,
  companyId: string,
): Promise<void> {
  const config = await getConfig(ctx);
  if (!config.siteApiToken) {
    ctx.logger.info("Content verification skipped: no siteApiToken configured");
    return;
  }

  // Try to find a post ID from the issue title and comments
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

  if (!postId) {
    ctx.logger.info("Content verification skipped: no post ID found", {
      issueId: issue.id,
    });
    return;
  }

  try {
    const apiUrl = config.siteApiUrl || DEFAULT_CONFIG.siteApiUrl;
    const response = await ctx.http.fetch(`${apiUrl}/api/v1/posts/${postId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.siteApiToken}` },
    });

    if (!response.ok) {
      ctx.logger.warn("Content verification: API returned non-OK", {
        issueId: issue.id,
        postId,
        status: response.status,
      });
      return;
    }

    const post = (await response.json()) as Record<string, unknown>;
    const content = String(post.content ?? post.body ?? "");
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const hasImgTag = /<img\b/i.test(content);
    const hasMarkdownImg = /!\[/.test(content);
    const hasImages = hasImgTag || hasMarkdownImg;

    // Check content hash to detect changes
    const hashKey = {
      scopeKind: "issue" as const,
      scopeId: issue.id,
      stateKey: STATE_KEYS.contentHash,
    };
    const previousHash = (await ctx.state.get(hashKey)) as string | null;
    const currentHash = `wc:${wordCount}|img:${hasImages}`;

    const failures: string[] = [];
    if (wordCount < 300) {
      failures.push(`Word count too low: ${wordCount} (minimum 300)`);
    }
    if (!hasImages) {
      failures.push("No images found (need either <img> or ![] markdown images)");
    }
    if (previousHash === currentHash && failures.length > 0) {
      failures.push("Content has not changed since last check");
    }

    if (failures.length > 0) {
      // Reopen the task
      await ctx.issues.update(issue.id, { status: "todo" }, companyId);
      await ctx.issues.createComment(
        issue.id,
        `Content verification FAILED for post ${postId}:\n\n${failures.map((f) => `- ${f}`).join("\n")}\n\nReopening task.`,
        companyId,
      );
      ctx.logger.warn("Content verification failed", { issueId: issue.id, postId, failures });
    } else {
      ctx.logger.info("Content verification passed", { issueId: issue.id, postId, wordCount });
    }

    await ctx.state.set(hashKey, currentHash);
  } catch (err) {
    ctx.logger.error("Content verification error", { issueId: issue.id, postId, error: String(err) });
  }
}

// ─── Stuck Detection Job ────────────────────────────────────────────────────

async function runStuckDetection(ctx: PluginContext, job: PluginJobContext): Promise<void> {
  const config = await getConfig(ctx);
  const companies = await ctx.companies.list({ limit: 10, offset: 0 });

  for (const company of companies) {
    const companyId = company.id;

    // Get open issues
    const todoIssues = await ctx.issues.list({ companyId, status: "todo", limit: 200, offset: 0 });
    const inProgressIssues = await ctx.issues.list({ companyId, status: "in_progress", limit: 200, offset: 0 });
    const blockedIssues = await ctx.issues.list({ companyId, status: "blocked", limit: 200, offset: 0 });

    const stuckIssues: Array<{ issue: Issue; reason: string }> = [];

    // Check todo issues
    const todoThreshold = config.stuckTodoMinutes ?? DEFAULT_CONFIG.stuckTodoMinutes;
    for (const issue of todoIssues) {
      if (!issue.assigneeAgentId) continue;
      const age = minutesSince(issue.updatedAt);
      if (age > todoThreshold) {
        // Check for recent comments
        const comments = await ctx.issues.listComments(issue.id, companyId);
        const latestComment = comments[comments.length - 1];
        const hasRecentComment = latestComment && minutesSince(latestComment.createdAt) < todoThreshold;
        if (!hasRecentComment) {
          stuckIssues.push({
            issue,
            reason: `todo for ${Math.round(age)} min (threshold: ${todoThreshold} min)`,
          });
        }
      }
    }

    // Check in_progress issues
    const ipThreshold = config.stuckInProgressMinutes ?? DEFAULT_CONFIG.stuckInProgressMinutes;
    for (const issue of inProgressIssues) {
      const age = minutesSince(issue.updatedAt);
      if (age > ipThreshold) {
        const comments = await ctx.issues.listComments(issue.id, companyId);
        const latestComment = comments[comments.length - 1];
        const hasRecentComment = latestComment && minutesSince(latestComment.createdAt) < ipThreshold;
        if (!hasRecentComment) {
          stuckIssues.push({
            issue,
            reason: `in_progress for ${Math.round(age)} min (threshold: ${ipThreshold} min)`,
          });
        }
      }
    }

    // Check blocked issues - auto-unblock if all prerequisite siblings are done
    for (const issue of blockedIssues) {
      if (!issue.parentId) continue;
      // Get all siblings (issues with same parent)
      const siblings = await ctx.issues.list({ companyId, limit: 200, offset: 0 });
      const sameSiblings = siblings.filter(
        (s) => s.parentId === issue.parentId && s.id !== issue.id,
      );
      const allSiblingsDone = sameSiblings.length > 0 && sameSiblings.every((s) => s.status === "done");
      if (allSiblingsDone) {
        // Auto-unblock
        await ctx.issues.update(issue.id, { status: "todo" }, companyId);
        await ctx.issues.createComment(
          issue.id,
          "Auto-unblocked: all sibling tasks are done.",
          companyId,
        );
        ctx.logger.info("Auto-unblocked issue", { issueId: issue.id });
      }
    }

    // Send alerts for stuck issues
    if (stuckIssues.length > 0) {
      // Rate limit: max 1 alert per issue per hour
      const alertHistoryKey = {
        scopeKind: "instance" as const,
        stateKey: STATE_KEYS.alertHistory,
      };
      const alertHistory = ((await ctx.state.get(alertHistoryKey)) as Record<string, string> | null) ?? {};
      const now = new Date().toISOString();
      const filteredStuck = stuckIssues.filter((entry) => {
        const lastAlert = alertHistory[entry.issue.id];
        if (!lastAlert) return true;
        return minutesSince(lastAlert) > 60;
      });

      if (filteredStuck.length > 0) {
        const issueIdentifier = (i: Issue) => (i as unknown as Record<string, string>).identifier ?? i.id.slice(0, 8);
        const lines = filteredStuck.map(
          (entry) =>
            `- <b>${issueIdentifier(entry.issue)}</b>: ${entry.issue.title} -- ${entry.reason}`,
        );
        const message = `<b>Stuck Issues Alert</b>\n\n${lines.join("\n")}`;
        await sendTelegramAlert(ctx, config, message);

        // Update alert history
        for (const entry of filteredStuck) {
          alertHistory[entry.issue.id] = now;
        }
        await ctx.state.set(alertHistoryKey, alertHistory);

        ctx.logger.info("Sent stuck detection alerts", { count: filteredStuck.length });
      }
    }
  }
}

// ─── Data Handlers (for UI) ─────────────────────────────────────────────────

async function registerDataHandlers(ctx: PluginContext): Promise<void> {
  ctx.data.register("pipeline-status", async (params) => {
    const companyId = typeof params.companyId === "string" ? params.companyId : "";
    if (!companyId) return { activePipelines: [], stuckIssues: [], recentCompletions: [] };

    // Find issues with pipeline documents
    const allIssues = await ctx.issues.list({ companyId, limit: 200, offset: 0 });

    const activePipelines: Array<{
      parentId: string;
      parentTitle: string;
      pipeline: { steps: Array<{ agent: string; role: string }> };
      progress: PipelineProgress | null;
      status: string;
    }> = [];

    const stuckIssues: Array<{
      id: string;
      title: string;
      status: string;
      minutesStale: number;
    }> = [];

    const recentCompletions: Array<{
      id: string;
      title: string;
      completedAt: string;
    }> = [];

    const config = await getConfig(ctx);

    for (const issue of allIssues) {
      // Check for pipeline documents on parent issues (those without parentId)
      if (!issue.parentId) {
        const pipeline = await parsePipelineDoc(ctx, issue.id, companyId);
        if (pipeline && pipeline.steps.length > 0) {
          const progressKey = {
            scopeKind: "issue" as const,
            scopeId: issue.id,
            stateKey: STATE_KEYS.pipelineProgress,
          };
          const progress = (await ctx.state.get(progressKey)) as PipelineProgress | null;
          activePipelines.push({
            parentId: issue.id,
            parentTitle: issue.title,
            pipeline: {
              steps: pipeline.steps.map((s) => ({ agent: s.agent, role: s.role })),
            },
            progress,
            status: issue.status,
          });
        }
      }

      // Check for stuck issues
      if (issue.status === "todo" && issue.assigneeAgentId) {
        const age = minutesSince(issue.updatedAt);
        const threshold = config.stuckTodoMinutes ?? DEFAULT_CONFIG.stuckTodoMinutes;
        if (age > threshold) {
          stuckIssues.push({
            id: issue.id,
            title: issue.title,
            status: issue.status,
            minutesStale: Math.round(age),
          });
        }
      } else if (issue.status === "in_progress") {
        const age = minutesSince(issue.updatedAt);
        const threshold = config.stuckInProgressMinutes ?? DEFAULT_CONFIG.stuckInProgressMinutes;
        if (age > threshold) {
          stuckIssues.push({
            id: issue.id,
            title: issue.title,
            status: issue.status,
            minutesStale: Math.round(age),
          });
        }
      }

      // Recent completions
      if (issue.status === "done" && issue.completedAt) {
        const age = minutesSince(issue.completedAt);
        if (age < 60 * 24) {
          // Last 24 hours
          recentCompletions.push({
            id: issue.id,
            title: issue.title,
            completedAt: issue.completedAt instanceof Date ? issue.completedAt.toISOString() : String(issue.completedAt),
          });
        }
      }
    }

    // Sort recent completions by date
    recentCompletions.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    return {
      activePipelines,
      stuckIssues,
      recentCompletions: recentCompletions.slice(0, 10),
    };
  });
}

// ─── Plugin Definition ──────────────────────────────────────────────────────

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Pipeline Controller setup starting", { pluginId: PLUGIN_ID });

    // Event handlers
    ctx.events.on("issue.updated", async (event: PluginEvent) => {
      try {
        await handleIssueCompleted(ctx, event);
      } catch (err) {
        ctx.logger.error("Error handling issue.updated", { error: String(err) });
      }
    });

    // Scheduled job
    ctx.jobs.register(JOB_KEYS.stuckDetection, async (job: PluginJobContext) => {
      try {
        await runStuckDetection(ctx, job);
      } catch (err) {
        ctx.logger.error("Stuck detection job failed", { error: String(err) });
        throw err;
      }
    });

    // Data handlers for UI
    await registerDataHandlers(ctx);

    ctx.logger.info("Pipeline Controller setup complete");
  },

  async onHealth() {
    return {
      status: "ok",
      message: "Pipeline Controller running",
    };
  },

  async onConfigChanged(newConfig) {
    // Config is re-read on each use, no restart needed
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
