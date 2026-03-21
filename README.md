# pipeline-controller

Paperclip plugin that automates multi-agent pipeline workflows.

## Features

### Auto-advance Pipeline
Listens for `issue.updated` events. When a sub-task transitions to `done`, reads the parent issue's `pipeline` document, determines the next step, creates a new sub-task for the next agent, and posts progress comments.

Pipeline document format (attached to parent issues with key `pipeline`):
```json
{
  "steps": [
    {"agent": "Scout", "agentId": "6af8e496-...", "role": "research"},
    {"agent": "Quill", "agentId": "b4862b60-...", "role": "writing"},
    {"agent": "Editor", "agentId": "d517da6b-...", "role": "review"}
  ]
}
```

### Content Verification
When tasks with content-related titles (expand, image, post, article) are marked done, verifies the linked post via the site API:
- Word count >= 300
- Images present (HTML `<img>` or markdown `![]`)
- Reopens task with failure details if checks fail

### Stuck Detection
Scheduled job (every 5 minutes):
- `todo` > 30 min with no comments = stuck
- `in_progress` > 60 min with no comments = stuck
- Auto-unblocks `blocked` issues when all sibling tasks are done
- Sends Telegram alerts (rate-limited to 1 per issue per hour)

### Dashboard Widget
Shows active pipelines, stuck issues, and recent completions in the Paperclip UI.

## Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| siteApiUrl | string | https://www.labattsimon.com | Site API base URL |
| siteApiToken | string | | Bearer token for content verification |
| telegramBotToken | string | | Bot token for stuck alerts |
| telegramChatId | string | | Chat ID for stuck alerts |
| stuckTodoMinutes | number | 30 | Threshold for todo stuck detection |
| stuckInProgressMinutes | number | 60 | Threshold for in-progress stuck detection |

## Build

```bash
npm install
npm run build
```

## Install

Register the plugin in Paperclip by pointing to `/home/labatt/paperclip-plugins/pipeline-controller`.
