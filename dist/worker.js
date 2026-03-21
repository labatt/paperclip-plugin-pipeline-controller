import { definePlugin, runWorker, } from "@paperclipai/plugin-sdk";
import { DEFAULT_CONFIG, DEFAULT_ERROR_POLICY, DEFAULT_NOTIFICATION_CHANNEL, DEFAULT_NOTIFICATION_PREFIX, JOB_KEYS, PLUGIN_ID, STATE_KEYS, } from "./constants.js";
// ---- Helpers ----
async function getConfig(ctx) {
    const config = await ctx.config.get();
    const merged = { ...DEFAULT_CONFIG, ...config };
    // Check for user-edited prefix override stored in instance state
    const prefixOverride = await ctx.state.get({
        scopeKind: "instance",
        stateKey: STATE_KEYS.notificationPrefixOverride,
    });
    if (prefixOverride?.value != null) {
        merged.notificationPrefix = prefixOverride.value;
    }
    return merged;
}
function minutesSince(dateOrIso) {
    const time = dateOrIso instanceof Date ? dateOrIso.getTime() : new Date(dateOrIso).getTime();
    return (Date.now() - time) / 60_000;
}
/** Read pipeline data from ctx.state (scoped to issue) */
async function getPipelineData(ctx, issueId) {
    return (await ctx.state.get({
        scopeKind: "issue",
        scopeId: issueId,
        stateKey: STATE_KEYS.pipelineData,
    }));
}
/** Write pipeline data to ctx.state (scoped to issue) */
async function setPipelineData(ctx, issueId, data) {
    await ctx.state.set({ scopeKind: "issue", scopeId: issueId, stateKey: STATE_KEYS.pipelineData }, data);
}
// ---- Notification System ----
function eventColor(event) {
    switch (event) {
        case "pipeline.complete": return 0x22c55e; // green
        case "pipeline.stuck": return 0xf59e0b; // amber
        case "verification.failed": return 0xef4444; // red
        default: return 0x6b7280; // gray
    }
}
function eventColorSlack(event) {
    switch (event) {
        case "pipeline.complete": return "#22c55e";
        case "pipeline.stuck": return "#f59e0b";
        case "verification.failed": return "#ef4444";
        default: return "#6b7280";
    }
}
/**
 * Resolve the effective notification channel.
 * If notificationChannel is configured and enabled, use it.
 * Otherwise, fall back to legacy top-level telegramBotToken/telegramChatId.
 */
function resolveChannel(config) {
    const ch = config.notificationChannel;
    if (ch && ch.enabled) {
        return { ...DEFAULT_NOTIFICATION_CHANNEL, ...ch };
    }
    // Legacy backward compat: top-level Telegram config
    if (config.telegramBotToken && config.telegramChatId) {
        return {
            type: "telegram",
            enabled: true,
            telegramBotToken: config.telegramBotToken,
            telegramChatId: config.telegramChatId,
        };
    }
    return null;
}
async function sendViaWebhook(ctx, channel, payload) {
    if (!channel.webhookUrl)
        return;
    const method = channel.webhookMethod ?? "POST";
    const headers = {
        "Content-Type": "application/json",
        ...(channel.webhookHeaders ?? {}),
    };
    await ctx.http.fetch(channel.webhookUrl, {
        method,
        headers,
        body: JSON.stringify(payload),
    });
}
async function sendViaSlack(ctx, channel, payload) {
    if (!channel.webhookUrl)
        return;
    const color = eventColorSlack(payload.event);
    const body = {
        attachments: [
            {
                color,
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: payload.title, emoji: true },
                    },
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: payload.message },
                    },
                    ...(payload.issueUrl
                        ? [
                            {
                                type: "section",
                                text: { type: "mrkdwn", text: `<${payload.issueUrl}|View Issue>` },
                            },
                        ]
                        : []),
                    {
                        type: "context",
                        elements: [
                            { type: "mrkdwn", text: `Event: \`${payload.event}\` | ${payload.timestamp}` },
                        ],
                    },
                ],
            },
        ],
    };
    await ctx.http.fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
async function sendViaDiscord(ctx, channel, payload) {
    if (!channel.webhookUrl)
        return;
    const color = eventColor(payload.event);
    const body = {
        embeds: [
            {
                title: payload.title,
                description: payload.message,
                color,
                fields: [
                    ...(payload.issueId
                        ? [{ name: "Issue", value: payload.issueId, inline: true }]
                        : []),
                    { name: "Event", value: payload.event, inline: true },
                ],
                timestamp: payload.timestamp,
                ...(payload.issueUrl ? { url: payload.issueUrl } : {}),
            },
        ],
    };
    await ctx.http.fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
async function sendViaTelegram(ctx, channel, payload) {
    const botToken = channel.telegramBotToken;
    const chatId = channel.telegramChatId;
    if (!botToken || !chatId)
        return;
    const text = [
        `<b>${payload.title}</b>`,
        payload.message,
        ...(payload.issueUrl ? [`<a href="${payload.issueUrl}">View Issue</a>`] : []),
    ].join("\n");
    await ctx.http.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
}
async function sendViaEmail(ctx, channel, payload) {
    if (!channel.emailEndpoint)
        return;
    const headers = {
        "Content-Type": "application/json",
        ...(channel.webhookHeaders ?? {}),
    };
    await ctx.http.fetch(channel.emailEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
            subject: payload.title,
            body: payload.message,
            event: payload.event,
            issueId: payload.issueId,
            issueUrl: payload.issueUrl,
            timestamp: payload.timestamp,
        }),
    });
}
async function sendNotification(ctx, config, payload) {
    const channel = resolveChannel(config);
    if (!channel)
        return;
    // Prepend notification prefix to message
    const prefix = config.notificationPrefix ?? DEFAULT_NOTIFICATION_PREFIX;
    if (prefix) {
        payload = { ...payload, message: `${prefix}: ${payload.message}` };
    }
    try {
        switch (channel.type) {
            case "webhook":
                await sendViaWebhook(ctx, channel, payload);
                break;
            case "slack":
                await sendViaSlack(ctx, channel, payload);
                break;
            case "discord":
                await sendViaDiscord(ctx, channel, payload);
                break;
            case "telegram":
                await sendViaTelegram(ctx, channel, payload);
                break;
            case "email":
                await sendViaEmail(ctx, channel, payload);
                break;
            default:
                ctx.logger.warn("Unknown notification channel type", { type: channel.type });
        }
    }
    catch (err) {
        ctx.logger.error("Notification send failed", { type: channel.type, error: String(err) });
    }
}
// ---- Auto-advance Pipeline ----
async function handleIssueCompleted(ctx, event) {
    const payload = event.payload;
    if (!payload)
        return;
    const issueId = event.entityId;
    if (!issueId)
        return;
    const status = payload.status;
    const previousStatus = payload.previousStatus;
    // Only act on transitions TO done
    if (status !== "done" || previousStatus === "done")
        return;
    const companyId = event.companyId;
    const issue = await ctx.issues.get(issueId, companyId);
    if (!issue)
        return;
    // Pipeline advance: only for sub-tasks with a parent
    const parentId = issue.parentId;
    if (!parentId)
        return;
    // Read pipeline data from parent's state
    const pipelineData = await getPipelineData(ctx, parentId);
    if (!pipelineData || !pipelineData.steps || pipelineData.steps.length === 0)
        return;
    // Find which step just completed by matching assigneeAgentId
    const assignee = issue.assigneeAgentId ?? "";
    const completedStepIndex = pipelineData.steps.findIndex((step) => assignee === step.agentId || assignee.startsWith(step.agentId.slice(0, 8)));
    if (completedStepIndex === -1) {
        ctx.logger.info("Completed issue agent not in pipeline", { issueId, assignee });
        return;
    }
    const completedStep = pipelineData.steps[completedStepIndex];
    const nextStepIndex = completedStepIndex + 1;
    // Update step history
    const history = pipelineData.stepHistory ?? [];
    const existingHistoryEntry = history.find((h) => h.stepIndex === completedStepIndex);
    if (existingHistoryEntry) {
        existingHistoryEntry.status = "done";
        existingHistoryEntry.completedAt = new Date().toISOString();
    }
    else {
        history.push({
            stepIndex: completedStepIndex,
            agent: completedStep.agent,
            status: "done",
            completedAt: new Date().toISOString(),
            subTaskId: issueId,
        });
    }
    if (nextStepIndex < pipelineData.steps.length) {
        const nextStep = pipelineData.steps[nextStepIndex];
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
        // Comment on parent (no alert - this is normal progress)
        await ctx.issues.createComment(parentId, `Step ${completedStepIndex + 1} complete (${completedStep.agent} - ${completedStep.role}). Starting step ${nextStepIndex + 1} (${nextStep.agent} - ${nextStep.role}).`, companyId);
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
    }
    else {
        // Pipeline complete
        await ctx.issues.createComment(parentId, `Pipeline complete! All ${pipelineData.steps.length} steps finished. Last step: ${completedStep.agent} (${completedStep.role}).`, companyId);
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
        await sendNotification(ctx, config, {
            event: "pipeline.complete",
            title: "Pipeline Complete",
            message: `${parentIssue?.title ?? parentId} - All ${pipelineData.steps.length} steps finished.`,
            issueId: parentId,
            timestamp: new Date().toISOString(),
        });
        ctx.logger.info("Pipeline completed", { parentId });
    }
}
// ---- Handle Already-Started Issues (pipeline attached mid-flight) ----
async function handlePipelineSavedOnActiveIssue(ctx, issueId, companyId, data) {
    const issue = await ctx.issues.get(issueId, companyId);
    if (!issue)
        return;
    const status = issue.status;
    const assignee = issue.assigneeAgentId ?? "";
    // Only applies to issues that are already in_progress or done
    if (status !== "in_progress" && status !== "done")
        return;
    // Find step matching current assignee
    const matchIdx = data.steps.findIndex((step) => assignee === step.agentId || assignee.startsWith(step.agentId.slice(0, 8)));
    if (matchIdx === -1) {
        // No assignee matches any step -- start from step 1 and reassign
        if (data.steps.length > 0) {
            const firstStep = data.steps[0];
            await ctx.issues.update(issueId, { assigneeAgentId: firstStep.agentId, status: "todo" }, companyId);
            await ctx.issues.createComment(issueId, `Pipeline attached: no current assignee matches any step. Reassigning to ${firstStep.agent} (step 1/${data.steps.length}).`, companyId);
            const history = [{
                    stepIndex: 0,
                    agent: firstStep.agent,
                    status: "active",
                    startedAt: new Date().toISOString(),
                }];
            await setPipelineData(ctx, issueId, {
                ...data,
                currentStep: 0,
                completedSteps: [],
                stepHistory: history,
                startedAt: new Date().toISOString(),
                lastAdvancedAt: new Date().toISOString(),
            });
        }
        return;
    }
    if (status === "done") {
        // Issue is already done: mark all steps up to and including matched step as complete,
        // then auto-advance to next step
        const history = data.steps.slice(0, matchIdx + 1).map((step, i) => ({
            stepIndex: i,
            agent: step.agent,
            status: "done",
            completedAt: new Date().toISOString(),
        }));
        const completedAgents = data.steps.slice(0, matchIdx + 1).map((s) => s.agent);
        const nextIdx = matchIdx + 1;
        if (nextIdx < data.steps.length) {
            const nextStep = data.steps[nextIdx];
            const parentTitle = issue.title;
            // Create sub-task for next step
            const newIssue = await ctx.issues.create({
                companyId,
                parentId: issueId,
                title: `[${nextStep.role}] ${parentTitle}`,
                description: `Pipeline step ${nextIdx + 1}/${data.steps.length}: ${nextStep.role}\nParent: ${parentTitle}\nPrevious steps auto-completed based on issue state.`,
                assigneeAgentId: nextStep.agentId,
                priority: issue.priority,
            });
            history.push({
                stepIndex: nextIdx,
                agent: nextStep.agent,
                status: "active",
                startedAt: new Date().toISOString(),
            });
            await ctx.issues.createComment(issueId, `Pipeline attached to already-completed issue. Steps 1-${matchIdx + 1} marked done. Advancing to step ${nextIdx + 1} (${nextStep.agent} - ${nextStep.role}).`, companyId);
            // Reset parent status back to in_progress since pipeline continues
            await ctx.issues.update(issueId, { status: "in_progress" }, companyId);
            await setPipelineData(ctx, issueId, {
                ...data,
                currentStep: nextIdx,
                completedSteps: completedAgents,
                stepHistory: history,
                startedAt: new Date().toISOString(),
                lastAdvancedAt: new Date().toISOString(),
            });
        }
        else {
            // Matched step is the last step, and issue is done -- pipeline is already complete
            await ctx.issues.createComment(issueId, `Pipeline attached: issue already completed at final step (${data.steps[matchIdx].agent}). Pipeline marked complete.`, companyId);
            await setPipelineData(ctx, issueId, {
                ...data,
                currentStep: data.steps.length,
                completedSteps: completedAgents,
                stepHistory: history,
                startedAt: new Date().toISOString(),
                lastAdvancedAt: new Date().toISOString(),
            });
        }
    }
    else {
        // status === "in_progress": mark steps 1..matchIdx-1 as complete, set current to matchIdx
        const history = data.steps.slice(0, matchIdx).map((step, i) => ({
            stepIndex: i,
            agent: step.agent,
            status: "done",
            completedAt: new Date().toISOString(),
        }));
        history.push({
            stepIndex: matchIdx,
            agent: data.steps[matchIdx].agent,
            status: "active",
            startedAt: new Date().toISOString(),
        });
        const completedAgents = data.steps.slice(0, matchIdx).map((s) => s.agent);
        if (matchIdx > 0) {
            await ctx.issues.createComment(issueId, `Pipeline attached to in-progress issue. Steps 1-${matchIdx} marked as complete. Current step: ${matchIdx + 1} (${data.steps[matchIdx].agent} - ${data.steps[matchIdx].role}).`, companyId);
        }
        await setPipelineData(ctx, issueId, {
            ...data,
            currentStep: matchIdx,
            completedSteps: completedAgents,
            stepHistory: history,
            startedAt: new Date().toISOString(),
            lastAdvancedAt: new Date().toISOString(),
        });
    }
}
// ---- Error/Failure Handling ----
function getStepErrorPolicy(step, config) {
    const globalPolicy = config.errorPolicy ?? DEFAULT_ERROR_POLICY;
    return {
        policy: step.errorPolicy ?? globalPolicy.defaultPolicy,
        maxRetries: step.maxRetries ?? globalPolicy.maxRetries,
    };
}
async function getRetryCount(ctx, issueId, stepIndex) {
    const counters = (await ctx.state.get({
        scopeKind: "issue",
        scopeId: issueId,
        stateKey: STATE_KEYS.retryCounter,
    }));
    return counters?.[String(stepIndex)] ?? 0;
}
async function incrementRetryCount(ctx, issueId, stepIndex) {
    const key = { scopeKind: "issue", scopeId: issueId, stateKey: STATE_KEYS.retryCounter };
    const counters = (await ctx.state.get(key)) ?? {};
    const newCount = (counters[String(stepIndex)] ?? 0) + 1;
    counters[String(stepIndex)] = newCount;
    await ctx.state.set(key, counters);
    return newCount;
}
async function handleRunFailed(ctx, event) {
    const payload = event.payload;
    if (!payload)
        return;
    const issueId = payload.issueId ?? event.entityId;
    if (!issueId)
        return;
    const companyId = event.companyId;
    const issue = await ctx.issues.get(issueId, companyId);
    if (!issue)
        return;
    const failureReason = payload.error ?? payload.reason ?? "Unknown error";
    // Check if this issue is a sub-task in a pipeline
    const parentId = issue.parentId;
    if (!parentId)
        return;
    const pipelineData = await getPipelineData(ctx, parentId);
    if (!pipelineData || !pipelineData.steps || pipelineData.steps.length === 0)
        return;
    const assignee = issue.assigneeAgentId ?? "";
    const stepIndex = pipelineData.steps.findIndex((step) => assignee === step.agentId || assignee.startsWith(step.agentId.slice(0, 8)));
    if (stepIndex === -1)
        return;
    const step = pipelineData.steps[stepIndex];
    const config = await getConfig(ctx);
    const { policy, maxRetries } = getStepErrorPolicy(step, config);
    // Immediate notification on failure
    await sendNotification(ctx, config, {
        event: "run.failed",
        title: "Agent Run Failed",
        message: `Step ${stepIndex + 1} (${step.agent} - ${step.role}) failed: ${failureReason}`,
        issueId: parentId,
        timestamp: new Date().toISOString(),
    });
    const history = pipelineData.stepHistory ?? [];
    const historyEntry = history.find((h) => h.stepIndex === stepIndex && h.status === "active");
    if (policy === "retry") {
        const retryCount = await getRetryCount(ctx, parentId, stepIndex);
        if (retryCount < maxRetries) {
            const newRetryCount = await incrementRetryCount(ctx, parentId, stepIndex);
            // Create a new sub-task for retry
            const parentIssue = await ctx.issues.get(parentId, companyId);
            const parentTitle = parentIssue?.title ?? "Pipeline task";
            const retryIssue = await ctx.issues.create({
                companyId,
                parentId,
                title: `[${step.role} - Retry ${newRetryCount}] ${parentTitle}`,
                description: [
                    `Pipeline step ${stepIndex + 1}/${pipelineData.steps.length}: ${step.role} (retry ${newRetryCount}/${maxRetries})`,
                    `Parent: ${parentTitle}`,
                    `Previous attempt failed: ${failureReason}`,
                ].join("\n"),
                assigneeAgentId: step.agentId,
                priority: issue.priority,
            });
            if (historyEntry) {
                historyEntry.retryCount = newRetryCount;
                historyEntry.subTaskId = retryIssue.id;
            }
            await ctx.issues.createComment(parentId, `Step ${stepIndex + 1} (${step.agent}) failed: ${failureReason}. Retrying (${newRetryCount}/${maxRetries}).`, companyId);
            await setPipelineData(ctx, parentId, {
                ...pipelineData,
                stepHistory: history,
                lastAdvancedAt: new Date().toISOString(),
            });
            ctx.logger.info("Pipeline step retrying", { parentId, stepIndex, retryCount: newRetryCount });
        }
        else {
            // Max retries exhausted -- escalate
            await handleEscalation(ctx, config, pipelineData, parentId, companyId, stepIndex, step, failureReason, history, historyEntry, issue);
        }
    }
    else if (policy === "skip") {
        // Mark step as skipped and advance
        if (historyEntry) {
            historyEntry.status = "skipped";
            historyEntry.failureReason = failureReason;
            historyEntry.completedAt = new Date().toISOString();
        }
        else {
            history.push({
                stepIndex,
                agent: step.agent,
                status: "skipped",
                failureReason,
                completedAt: new Date().toISOString(),
                subTaskId: issueId,
            });
        }
        await ctx.issues.createComment(parentId, `Step ${stepIndex + 1} (${step.agent}) failed: ${failureReason}. Skipping per error policy.`, companyId);
        const nextIdx = stepIndex + 1;
        if (nextIdx < pipelineData.steps.length) {
            const nextStep = pipelineData.steps[nextIdx];
            const parentIssue = await ctx.issues.get(parentId, companyId);
            const parentTitle = parentIssue?.title ?? "Pipeline task";
            const newIssue = await ctx.issues.create({
                companyId,
                parentId,
                title: `[${nextStep.role}] ${parentTitle}`,
                description: `Pipeline step ${nextIdx + 1}/${pipelineData.steps.length}: ${nextStep.role}\nParent: ${parentTitle}\nPrevious step (${step.agent}) was skipped due to failure.`,
                assigneeAgentId: nextStep.agentId,
                priority: issue.priority,
            });
            history.push({
                stepIndex: nextIdx,
                agent: nextStep.agent,
                status: "active",
                startedAt: new Date().toISOString(),
                subTaskId: newIssue.id,
            });
            await setPipelineData(ctx, parentId, {
                ...pipelineData,
                currentStep: nextIdx,
                completedSteps: [...(pipelineData.completedSteps ?? []), `${step.agent} (skipped)`],
                stepHistory: history,
                lastAdvancedAt: new Date().toISOString(),
            });
        }
        else {
            // Last step skipped -- pipeline complete (with skips)
            await ctx.issues.update(parentId, { status: "done" }, companyId);
            await ctx.issues.createComment(parentId, `Pipeline complete (step ${stepIndex + 1} was skipped).`, companyId);
            await setPipelineData(ctx, parentId, {
                ...pipelineData,
                currentStep: pipelineData.steps.length,
                completedSteps: [...(pipelineData.completedSteps ?? []), `${step.agent} (skipped)`],
                stepHistory: history,
                lastAdvancedAt: new Date().toISOString(),
            });
        }
        ctx.logger.info("Pipeline step skipped", { parentId, stepIndex });
    }
    else {
        // "escalate" (default)
        await handleEscalation(ctx, config, pipelineData, parentId, companyId, stepIndex, step, failureReason, history, historyEntry, issue);
    }
}
async function handleEscalation(ctx, config, pipelineData, parentId, companyId, stepIndex, step, failureReason, history, historyEntry, failedIssue) {
    const overseerAgentId = config.errorPolicy?.errorOverseerAgentId;
    if (historyEntry) {
        historyEntry.status = "failed";
        historyEntry.failureReason = failureReason;
    }
    else {
        history.push({
            stepIndex,
            agent: step.agent,
            status: "failed",
            failureReason,
            completedAt: new Date().toISOString(),
            subTaskId: failedIssue.id,
        });
    }
    if (overseerAgentId) {
        // Reassign the parent issue to the overseer with failure context
        await ctx.issues.update(parentId, {
            assigneeAgentId: overseerAgentId,
            status: "blocked",
        }, companyId);
        await ctx.issues.createComment(parentId, [
            `Pipeline step ${stepIndex + 1} (${step.agent} - ${step.role}) FAILED and has been escalated.`,
            `Error: ${failureReason}`,
            `Failed sub-task: ${failedIssue.id}`,
            `The issue has been reassigned to the error overseer agent for review.`,
        ].join("\n"), companyId);
    }
    else {
        // No overseer -- just mark as blocked with comment
        await ctx.issues.update(parentId, { status: "blocked" }, companyId);
        await ctx.issues.createComment(parentId, [
            `Pipeline step ${stepIndex + 1} (${step.agent} - ${step.role}) FAILED.`,
            `Error: ${failureReason}`,
            `No error overseer configured. Pipeline is blocked and requires manual intervention.`,
        ].join("\n"), companyId);
    }
    await setPipelineData(ctx, parentId, {
        ...pipelineData,
        stepHistory: history,
        lastAdvancedAt: new Date().toISOString(),
    });
    ctx.logger.info("Pipeline step escalated", { parentId, stepIndex, overseerAgentId });
}
// ---- Stuck Detection Job ----
async function runStuckDetection(ctx, _job) {
    const config = await getConfig(ctx);
    const companies = await ctx.companies.list({ limit: 10, offset: 0 });
    for (const company of companies) {
        const companyId = company.id;
        const todoIssues = await ctx.issues.list({ companyId, status: "todo", limit: 200, offset: 0 });
        const inProgressIssues = await ctx.issues.list({ companyId, status: "in_progress", limit: 200, offset: 0 });
        const blockedIssues = await ctx.issues.list({ companyId, status: "blocked", limit: 200, offset: 0 });
        const stuckIssues = [];
        // Check todo
        const todoThreshold = config.stuckTodoMinutes ?? DEFAULT_CONFIG.stuckTodoMinutes;
        for (const issue of todoIssues) {
            if (!issue.assigneeAgentId)
                continue;
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
            if (!issue.parentId)
                continue;
            const siblings = await ctx.issues.list({ companyId, limit: 200, offset: 0 });
            const sameSiblings = siblings.filter((s) => s.parentId === issue.parentId && s.id !== issue.id);
            if (sameSiblings.length > 0 && sameSiblings.every((s) => s.status === "done")) {
                await ctx.issues.update(issue.id, { status: "todo" }, companyId);
                await ctx.issues.createComment(issue.id, "Auto-unblocked: all sibling tasks are done.", companyId);
            }
        }
        // Exception-only alerts for stuck issues
        if (stuckIssues.length > 0) {
            const alertHistoryKey = { scopeKind: "instance", stateKey: STATE_KEYS.alertHistory };
            const alertHistory = (await ctx.state.get(alertHistoryKey)) ?? {};
            const now = new Date().toISOString();
            const filtered = stuckIssues.filter((entry) => {
                const last = alertHistory[entry.issue.id];
                return !last || minutesSince(last) > 60;
            });
            if (filtered.length > 0) {
                const id = (i) => i.identifier ?? i.id.slice(0, 8);
                const lines = filtered.map((e) => `${id(e.issue)}: ${e.issue.title} (${e.reason})`);
                await sendNotification(ctx, config, {
                    event: "pipeline.stuck",
                    title: "Stuck Issues",
                    message: lines.join("\n"),
                    timestamp: now,
                });
                for (const entry of filtered) {
                    alertHistory[entry.issue.id] = now;
                }
                await ctx.state.set(alertHistoryKey, alertHistory);
            }
        }
    }
}
// ---- Data Handlers (for UI) ----
async function registerDataHandlers(ctx) {
    // Pipeline data for a specific issue (detail tab)
    ctx.data.register("issue-pipeline", async (params) => {
        const issueId = typeof params.entityId === "string" ? params.entityId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId)
            return null;
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
        if (!companyId)
            return { activePipelines: [], stuckIssues: [] };
        const allIssues = await ctx.issues.list({ companyId, limit: 200, offset: 0 });
        const config = await getConfig(ctx);
        const activePipelines = [];
        const stuckIssues = [];
        for (const issue of allIssues) {
            // Active pipelines (parent issues with pipeline data)
            if (!issue.parentId) {
                const data = await getPipelineData(ctx, issue.id);
                if (data && data.steps.length > 0 && issue.status !== "done") {
                    const ident = issue.identifier ?? issue.id.slice(0, 8);
                    activePipelines.push({
                        parentId: issue.id,
                        parentTitle: issue.title,
                        identifier: ident,
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
                    const ident = issue.identifier ?? issue.id.slice(0, 8);
                    stuckIssues.push({ id: issue.id, title: issue.title, identifier: ident, status: "todo", minutesStale: Math.round(age) });
                }
            }
            else if (issue.status === "in_progress") {
                const age = minutesSince(issue.updatedAt);
                if (age > (config.stuckInProgressMinutes ?? 60)) {
                    const ident = issue.identifier ?? issue.id.slice(0, 8);
                    stuckIssues.push({ id: issue.id, title: issue.title, identifier: ident, status: "in_progress", minutesStale: Math.round(age) });
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
        }));
        return templates ?? { templates: [] };
    });
    // Config for settings page
    ctx.data.register("plugin-config", async () => {
        return await getConfig(ctx);
    });
}
// ---- Action Handlers (for UI) ----
async function registerActionHandlers(ctx) {
    // Save pipeline on an issue (handles already-started issues)
    ctx.actions.register("save-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId)
            throw new Error("issueId is required");
        const steps = params.steps;
        if (!steps || !Array.isArray(steps))
            throw new Error("steps is required");
        const existing = await getPipelineData(ctx, issueId);
        const data = {
            steps,
            currentStep: existing?.currentStep ?? 0,
            completedSteps: existing?.completedSteps ?? [],
            stepHistory: existing?.stepHistory ?? [],
            startedAt: existing?.startedAt ?? new Date().toISOString(),
            lastAdvancedAt: existing?.lastAdvancedAt ?? new Date().toISOString(),
            templateName: typeof params.templateName === "string" ? params.templateName : undefined,
        };
        await setPipelineData(ctx, issueId, data);
        // Handle already-started issues: detect current state and sync pipeline
        if (companyId && !existing) {
            try {
                await handlePipelineSavedOnActiveIssue(ctx, issueId, companyId, data);
            }
            catch (err) {
                ctx.logger.error("Error handling pipeline on active issue", { error: String(err) });
            }
        }
        return { ok: true };
    });
    // Remove pipeline from an issue
    ctx.actions.register("remove-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        if (!issueId)
            throw new Error("issueId is required");
        await ctx.state.delete({ scopeKind: "issue", scopeId: issueId, stateKey: STATE_KEYS.pipelineData });
        return { ok: true };
    });
    // Save a pipeline template
    ctx.actions.register("save-template", async (params) => {
        const name = typeof params.name === "string" ? params.name : "";
        const steps = params.steps;
        if (!name || !steps)
            throw new Error("name and steps are required");
        const key = { scopeKind: "instance", stateKey: STATE_KEYS.templates };
        const existing = (await ctx.state.get(key)) ?? { templates: [] };
        // Replace if name exists, else append
        const idx = existing.templates.findIndex((t) => t.name === name);
        const entry = { name, steps, createdAt: new Date().toISOString() };
        if (idx >= 0) {
            existing.templates[idx] = entry;
        }
        else {
            existing.templates.push(entry);
        }
        await ctx.state.set(key, existing);
        return { ok: true };
    });
    // Delete a pipeline template
    ctx.actions.register("delete-template", async (params) => {
        const name = typeof params.name === "string" ? params.name : "";
        if (!name)
            throw new Error("name is required");
        const key = { scopeKind: "instance", stateKey: STATE_KEYS.templates };
        const existing = (await ctx.state.get(key)) ?? { templates: [] };
        existing.templates = existing.templates.filter((t) => t.name !== name);
        await ctx.state.set(key, existing);
        return { ok: true };
    });
    // Start a pipeline (create first sub-task)
    ctx.actions.register("start-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId || !companyId)
            throw new Error("issueId and companyId are required");
        const data = await getPipelineData(ctx, issueId);
        if (!data || data.steps.length === 0)
            throw new Error("No pipeline defined on this issue");
        const firstStep = data.steps[0];
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
                status: "active",
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
        await ctx.issues.createComment(issueId, `Pipeline started. Step 1/${data.steps.length}: ${firstStep.agent} (${firstStep.role}).`, companyId);
        return { ok: true, firstIssueId: newIssue.id };
    });
    // Update notification prefix (from settings UI)
    ctx.actions.register("update-prefix", async (params) => {
        const value = typeof params.value === "string" ? params.value.slice(0, 255) : "";
        await ctx.state.set({ scopeKind: "instance", stateKey: STATE_KEYS.notificationPrefixOverride }, { value });
        return { ok: true };
    });
    // Test notification - sends a test payload through the configured channel
    ctx.actions.register("test-notification", async (_params) => {
        const config = await getConfig(ctx);
        await sendNotification(ctx, config, {
            event: "pipeline.complete",
            title: "Test Notification",
            message: "This is a test notification from Pipeline Controller. If you see this, notifications are working.",
            timestamp: new Date().toISOString(),
        });
        return { ok: true };
    });
    // ---- API Action Handlers (programmatic pipeline management) ----
    // set-pipeline: create or update pipeline steps on an issue
    ctx.actions.register("set-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId)
            throw new Error("issueId is required");
        const steps = params.steps;
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            throw new Error("steps is required and must be a non-empty array of {agent, agentId, role}");
        }
        // Validate steps
        for (const step of steps) {
            if (!step.agent || !step.agentId || !step.role) {
                throw new Error("Each step must have agent, agentId, and role");
            }
        }
        const existing = await getPipelineData(ctx, issueId);
        const data = {
            steps,
            currentStep: existing?.currentStep ?? 0,
            completedSteps: existing?.completedSteps ?? [],
            stepHistory: existing?.stepHistory ?? [],
            startedAt: existing?.startedAt ?? new Date().toISOString(),
            lastAdvancedAt: existing?.lastAdvancedAt ?? new Date().toISOString(),
            templateName: typeof params.templateName === "string" ? params.templateName : undefined,
        };
        await setPipelineData(ctx, issueId, data);
        // Handle already-started issues
        if (companyId && !existing) {
            try {
                await handlePipelineSavedOnActiveIssue(ctx, issueId, companyId, data);
            }
            catch (err) {
                ctx.logger.error("Error handling pipeline on active issue", { error: String(err) });
            }
        }
        return { ok: true, steps: data.steps.length, currentStep: data.currentStep };
    });
    // get-pipeline: read current pipeline state for an issue
    ctx.actions.register("get-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        if (!issueId)
            throw new Error("issueId is required");
        const data = await getPipelineData(ctx, issueId);
        if (!data)
            return { exists: false, pipeline: null };
        return {
            exists: true,
            pipeline: {
                steps: data.steps,
                currentStep: data.currentStep,
                totalSteps: data.steps.length,
                completedSteps: data.completedSteps,
                stepHistory: data.stepHistory,
                startedAt: data.startedAt,
                lastAdvancedAt: data.lastAdvancedAt,
                templateName: data.templateName,
            },
        };
    });
    // advance-pipeline: manually advance to next step
    ctx.actions.register("advance-pipeline", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId || !companyId)
            throw new Error("issueId and companyId are required");
        const data = await getPipelineData(ctx, issueId);
        if (!data || data.steps.length === 0)
            throw new Error("No pipeline defined on this issue");
        const currentIdx = data.currentStep;
        const nextIdx = currentIdx + 1;
        if (nextIdx >= data.steps.length) {
            // Mark pipeline complete
            const history = data.stepHistory ?? [];
            const currentEntry = history.find((h) => h.stepIndex === currentIdx && h.status === "active");
            if (currentEntry) {
                currentEntry.status = "done";
                currentEntry.completedAt = new Date().toISOString();
            }
            await ctx.issues.update(issueId, { status: "done" }, companyId);
            await ctx.issues.createComment(issueId, `Pipeline manually advanced. All ${data.steps.length} steps complete.`, companyId);
            await setPipelineData(ctx, issueId, {
                ...data,
                currentStep: data.steps.length,
                completedSteps: [...(data.completedSteps ?? []), data.steps[currentIdx].agent],
                stepHistory: history,
                lastAdvancedAt: new Date().toISOString(),
            });
            return { ok: true, status: "complete", totalSteps: data.steps.length };
        }
        const currentStep = data.steps[currentIdx];
        const nextStep = data.steps[nextIdx];
        const parentIssue = await ctx.issues.get(issueId, companyId);
        const parentTitle = parentIssue?.title ?? "Pipeline task";
        // Mark current step done
        const history = data.stepHistory ?? [];
        const currentEntry = history.find((h) => h.stepIndex === currentIdx && h.status === "active");
        if (currentEntry) {
            currentEntry.status = "done";
            currentEntry.completedAt = new Date().toISOString();
        }
        // Create sub-task for next step
        const newIssue = await ctx.issues.create({
            companyId,
            parentId: issueId,
            title: `[${nextStep.role}] ${parentTitle}`,
            description: `Pipeline step ${nextIdx + 1}/${data.steps.length}: ${nextStep.role}\nParent: ${parentTitle}\nManually advanced from step ${currentIdx + 1} (${currentStep.agent}).`,
            assigneeAgentId: nextStep.agentId,
            priority: parentIssue?.priority,
        });
        history.push({
            stepIndex: nextIdx,
            agent: nextStep.agent,
            status: "active",
            startedAt: new Date().toISOString(),
            subTaskId: newIssue.id,
        });
        await ctx.issues.createComment(issueId, `Pipeline manually advanced from step ${currentIdx + 1} (${currentStep.agent}) to step ${nextIdx + 1} (${nextStep.agent}).`, companyId);
        await setPipelineData(ctx, issueId, {
            ...data,
            currentStep: nextIdx,
            completedSteps: [...(data.completedSteps ?? []), currentStep.agent],
            stepHistory: history,
            lastAdvancedAt: new Date().toISOString(),
        });
        return { ok: true, status: "advanced", from: currentIdx, to: nextIdx, newIssueId: newIssue.id };
    });
    // retry-step: retry the current failed step
    ctx.actions.register("retry-step", async (params) => {
        const issueId = typeof params.issueId === "string" ? params.issueId : "";
        const companyId = typeof params.companyId === "string" ? params.companyId : "";
        if (!issueId || !companyId)
            throw new Error("issueId and companyId are required");
        const data = await getPipelineData(ctx, issueId);
        if (!data || data.steps.length === 0)
            throw new Error("No pipeline defined on this issue");
        const stepIndex = typeof params.stepIndex === "number" ? params.stepIndex : data.currentStep;
        if (stepIndex < 0 || stepIndex >= data.steps.length)
            throw new Error("Invalid step index");
        const step = data.steps[stepIndex];
        const history = data.stepHistory ?? [];
        // Find the failed entry
        const failedEntry = history.find((h) => h.stepIndex === stepIndex && (h.status === "failed" || h.status === "skipped"));
        const parentIssue = await ctx.issues.get(issueId, companyId);
        const parentTitle = parentIssue?.title ?? "Pipeline task";
        const retryCount = await incrementRetryCount(ctx, issueId, stepIndex);
        // Create a new sub-task for retry
        const retryIssue = await ctx.issues.create({
            companyId,
            parentId: issueId,
            title: `[${step.role} - Retry ${retryCount}] ${parentTitle}`,
            description: [
                `Pipeline step ${stepIndex + 1}/${data.steps.length}: ${step.role} (manual retry ${retryCount})`,
                `Parent: ${parentTitle}`,
                failedEntry?.failureReason ? `Previous failure: ${failedEntry.failureReason}` : "",
            ].filter(Boolean).join("\n"),
            assigneeAgentId: step.agentId,
            priority: parentIssue?.priority,
        });
        // Update or add history entry
        if (failedEntry) {
            failedEntry.status = "active";
            failedEntry.retryCount = retryCount;
            failedEntry.subTaskId = retryIssue.id;
            failedEntry.startedAt = new Date().toISOString();
            delete failedEntry.completedAt;
        }
        else {
            history.push({
                stepIndex,
                agent: step.agent,
                status: "active",
                startedAt: new Date().toISOString(),
                subTaskId: retryIssue.id,
                retryCount,
            });
        }
        // If parent was blocked from escalation, put it back to in_progress
        if (parentIssue?.status === "blocked") {
            await ctx.issues.update(issueId, { status: "in_progress" }, companyId);
        }
        await ctx.issues.createComment(issueId, `Step ${stepIndex + 1} (${step.agent}) manually retried (attempt ${retryCount}).`, companyId);
        await setPipelineData(ctx, issueId, {
            ...data,
            currentStep: stepIndex,
            stepHistory: history,
            lastAdvancedAt: new Date().toISOString(),
        });
        return { ok: true, retryIssueId: retryIssue.id, retryCount };
    });
}
// ---- Plugin Definition ----
const plugin = definePlugin({
    async setup(ctx) {
        ctx.logger.info("Pipeline Controller v4 setup starting", { pluginId: PLUGIN_ID });
        // Event: auto-advance on issue completion
        ctx.events.on("issue.updated", async (event) => {
            try {
                await handleIssueCompleted(ctx, event);
            }
            catch (err) {
                ctx.logger.error("Error handling issue.updated", { error: String(err) });
            }
        });
        // Event: handle agent run failures
        ctx.events.on("agent.run.failed", async (event) => {
            try {
                await handleRunFailed(ctx, event);
            }
            catch (err) {
                ctx.logger.error("Error handling agent.run.failed", { error: String(err) });
            }
        });
        // Event: handle agent run cancellations (treat as failures)
        ctx.events.on("agent.run.cancelled", async (event) => {
            try {
                await handleRunFailed(ctx, event);
            }
            catch (err) {
                ctx.logger.error("Error handling agent.run.cancelled", { error: String(err) });
            }
        });
        // Job: stuck detection
        ctx.jobs.register(JOB_KEYS.stuckDetection, async (job) => {
            try {
                await runStuckDetection(ctx, job);
            }
            catch (err) {
                ctx.logger.error("Stuck detection job failed", { error: String(err) });
                throw err;
            }
        });
        // Data + Action handlers for UI
        await registerDataHandlers(ctx);
        await registerActionHandlers(ctx);
        ctx.logger.info("Pipeline Controller v4 setup complete");
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
//# sourceMappingURL=worker.js.map