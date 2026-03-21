# Build: pipeline-controller Paperclip Plugin

## Overview
Build a Paperclip plugin using the Plugin SDK that automates pipeline workflow management.

## References
- Plugin SDK README: /home/labatt/paperclip/packages/plugins/sdk/README.md
- Kitchen Sink Example: /home/labatt/paperclip/packages/plugins/examples/plugin-kitchen-sink-example/
- SDK Types: /home/labatt/paperclip/packages/plugins/sdk/src/types.ts

## Plugin Structure
Follow the kitchen-sink example pattern exactly:
```
pipeline-controller/
  package.json
  tsconfig.json
  scripts/build-ui.mjs
  src/
    constants.ts
    manifest.ts
    worker.ts
    ui/
      index.tsx         (barrel export for all UI components)
      DashboardWidget.tsx
```

## Features to Build

### 1. Pipeline Documents (event-driven)
Listen for `issue.created` events. When a parent issue has a pipeline document (key: "pipeline"), the plugin manages the agent handoff path.

Pipeline document format:
```json
{"steps": [{"agent": "Scout", "agentId": "6af8e496-897d-44e4-b54e-7fbd9b7c9585", "role": "research"}, ...]}
```

### 2. Auto-advance (event-driven)
Listen for `issue.updated` events. When a sub-task transitions to `done`:
- Read the parent issue's pipeline document via `ctx.issues.documents.get(parentId, "pipeline", companyId)`
- Determine which step just completed (match by assigneeAgentId)
- Create the next sub-task for the next agent in the pipeline via `ctx.issues.create()`
- Assign it with status `todo` (this triggers heartbeat wake-on-assignment)
- Copy relevant context from completed task comments into new task description
- Post a comment on parent: "Step N complete (Agent). Starting step N+1 (NextAgent)."
- Track current step in plugin state via `ctx.state.set()`

### 3. Verify-on-done (content tasks)
Listen for `issue.updated` (status -> done). If title matches content patterns (expand, image, post, article):
- Extract post ID from title/comments (look for patterns like "post 123" or "post-id: xxx")
- GET https://www.labattsimon.com/api/v1/posts/{id} using `ctx.http.fetch()`
- Token comes from config (siteApiToken in instanceConfigSchema)
- Verify: word count >= target, images present (both `<img` AND `![` patterns)
- If FAILS: reopen task (update to `todo`), comment explaining failure
- Use `ctx.state` to track content hashes to detect if content actually changed

### 4. Stuck detection (scheduled job)
Run every 5 minutes via `manifest.jobs`:
- `todo` > 30 min with no recent comments = stuck
- `in_progress` > 60 min with no recent comments = stuck
- `blocked` where all prerequisite siblings are done = should be auto-unblocked
- Send Telegram alert via `ctx.http.fetch()` (bot token + chat ID from config)
- Use `ctx.state` to track alert history (max 1 per issue per hour)

### 5. Dashboard widget
Show pipeline status in Paperclip UI:
- Active pipelines with current step highlighted
- Stuck issues flagged red
- Recent completions

## Capabilities Needed
```
events.subscribe, issues.read, issues.create, issues.update, 
issue.comments.read, issue.comments.create, issue.documents.read,
issue.documents.write, jobs.schedule, http.outbound, 
plugin.state.read, plugin.state.write, ui.dashboardWidget.register,
agents.read
```

## Config Schema (instanceConfigSchema)
- siteApiUrl: string (default: "https://www.labattsimon.com")
- siteApiToken: string (secret ref for site API token)
- telegramBotToken: string (secret ref for Telegram bot token)  
- telegramChatId: string (chat ID for stuck alerts)
- stuckTodoMinutes: number (default: 30)
- stuckInProgressMinutes: number (default: 60)

## Agent IDs (for reference)
```
Scout: 6af8e496-897d-44e4-b54e-7fbd9b7c9585
Quill: b4862b60-add9-4c88-b97d-98476eb65d28
Designer: dc6588c3-bc8a-4fc4-87f1-fe62eeec170b
Editor: d517da6b-7294-4b61-af70-ee42c66209a9
Alex: aa062e76-22c1-46ba-8b70-ba07be8b9d1c
Liv: 19440704-a824-43ef-8a0c-e3f3c18cd2bb
Sarah: db961dc2-72b7-4523-8020-ffe40d622ea6
Marcus: 2cbc2414-db1f-4a47-87bf-c648dc8fd386
Forge: 4972bf45-05c8-48c2-a752-dab7d712f76e
Helix: bdc27eb3-2755-447a-8ceb-28a9eac25043
Priya: 424acd58-8e45-45b2-9bd6-a6d4f3366643
Dev: 781fbe4c-9989-46c4-8bde-231237e8cb1d
```

## CRITICAL Implementation Notes

1. **Use `definePlugin` and `runWorker`** from `@paperclipai/plugin-sdk` exactly like the kitchen-sink example
2. **package.json** must have `"type": "module"` and the `paperclipPlugin` field pointing to dist paths
3. **tsconfig.json** should extend from the paperclip monorepo's base: `"extends": "../../../paperclip/tsconfig.json"` or use a standalone config
4. **Dependencies:** `@paperclipai/plugin-sdk` (use `workspace:*` if possible, or `file:` reference to the local SDK), `@paperclipai/shared` for types
5. **Build:** `tsc` for worker/manifest, esbuild for UI (see kitchen-sink's `scripts/build-ui.mjs`)
6. **Events carry `payload`** with the changed entity data - check `event.payload` for the issue data including `status`, `parentId`, `assigneeAgentId`
7. **For the Documents API:** `ctx.issues.documents.get(issueId, "pipeline", companyId)` returns `{body: string}` or null. Parse body as JSON.
8. **State scoping:** Use `scopeKind: "issue"` with `scopeId: parentIssueId` to track pipeline progress per parent issue
9. **No em dashes** in any strings/comments/descriptions
10. **Use `ctx.logger`** for logging, not console.log

## Build Instructions
After writing all source files:
```bash
cd /home/labatt/paperclip-plugins/pipeline-controller
npm install
npm run build
```

If the SDK isn't available on npm, use file references:
```json
"dependencies": {
  "@paperclipai/plugin-sdk": "file:/home/labatt/paperclip/packages/plugins/sdk",
  "@paperclipai/shared": "file:/home/labatt/paperclip/packages/shared"
}
```
