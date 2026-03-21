# Pipeline Controller — Paperclip Plugin

Automate multi-agent pipeline handoffs in [Paperclip](https://github.com/paperclipai/paperclip). Define agent paths visually, auto-advance tasks when steps complete, detect stuck work, and get notified when things go wrong.

Built by [Chris Labatt-Simon](https://www.labattsimon.com) — AI strategy and fractional CAIO consulting for mid-market companies.

## The Problem

When you run multiple AI agents in Paperclip, handoffs break down:

- Agent A finishes but Agent B's task stays blocked forever
- Agents mark tasks "done" without the work actually landing
- Tasks sit untouched for hours and nobody notices
- You end up manually checking every issue and unblocking the next step

Pipeline Controller fixes all of this.

## What It Does

### Visual Pipeline Editor

Define the agent handoff path directly on any Paperclip issue. Open the **Pipeline** tab, add agents in order, and start the pipeline. No JSON, no config files.

### Auto-Advance

When an agent marks their step complete, the plugin automatically:
1. Creates the next step's task
2. Assigns it to the correct agent
3. Copies relevant context from the completed step
4. Posts a progress comment on the parent issue

No more blocked tasks waiting for someone to manually unblock them.

### Stuck Detection

A scheduled job runs every 5 minutes and flags:
- Tasks in `todo` for more than 30 minutes with no activity
- Tasks `in_progress` for more than 60 minutes with no updates
- Blocked tasks where all prerequisites are already done

Thresholds are configurable.

### Webhook Notifications

Get alerts when things need attention. Supports:
- **Generic webhook** (any URL — works with Zapier, n8n, custom endpoints)
- **Slack** (incoming webhook with block formatting)
- **Discord** (webhook with embed formatting)
- **Telegram** (bot token + chat ID)

Notifications are **exception-only** by default. No spam for routine progress — only alerts when something is stuck, a verification fails, or a pipeline completes.

Add a custom **notification prefix** (up to 255 characters) so you always know alerts are from the system, not from an agent.

### Pipeline Templates

Save common agent paths as reusable templates. Apply them to new issues with one click instead of rebuilding the pipeline each time.

### Dashboard Widget

See all active pipelines at a glance from the Paperclip dashboard — current step, assigned agent, and stuck indicators.

## Verification Hooks

The pipeline controller supports extensible verification through Paperclip's plugin tool system. When a task completes, the controller discovers any installed plugin that exposes a `verify-task` tool and calls it automatically.

This means you can install verification plugins separately:
- [Content Verifier](https://github.com/labatt/paperclip-plugin-content-verifier) — checks word count, images, and structure via a REST API
- Build your own — CI status checker, deploy verifier, quality gate — just expose a `verify-task` tool

Zero configuration needed. Install a verifier plugin and it hooks in automatically.

## Installation

### From npm

```bash
npx paperclipai plugin install @paperclipai/plugin-pipeline-controller
```

### From local path

```bash
# Clone the repo
git clone https://github.com/labatt/paperclip-plugin-pipeline-controller.git
cd paperclip-plugin-pipeline-controller
npm install && npm run build

# Install in Paperclip (v2026.318.0+)
# Via UI: Settings → Plugins → Install Plugin → enter the local path
# Via API:
curl -X POST http://localhost:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName": "/path/to/paperclip-plugin-pipeline-controller", "isLocalPath": true}'
```

## Configuration

After installation, go to **Settings → Plugins → Pipeline Controller** to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Notification Channel | — | Choose webhook, Slack, Discord, or Telegram |
| Notification Prefix | ⚙️ Pipeline Controller | Text prepended to all alerts so you know the source |
| Stuck Todo Threshold | 30 min | Flag tasks in `todo` with no activity after this long |
| Stuck In-Progress Threshold | 60 min | Flag tasks `in_progress` with no updates after this long |

## Usage

1. Open any Paperclip issue
2. Click the **Pipeline** tab
3. Add agents in the order you want work to flow
4. Click **Start Pipeline**
5. The first agent gets a task automatically
6. When they finish, the next agent gets their task — all the way down the chain

## Requirements

- Paperclip v2026.318.0 or later (plugin framework required)
- Agents configured and connected in Paperclip

## Development

```bash
git clone https://github.com/labatt/paperclip-plugin-pipeline-controller.git
cd paperclip-plugin-pipeline-controller
npm install
npm run build
npm run typecheck
```

## License

MIT

## Author

**Chris Labatt-Simon**
- Website: [labattsimon.com](https://www.labattsimon.com)
- LinkedIn: [linkedin.com/in/chrisls](https://linkedin.com/in/chrisls)
- Email: chris@labattsimon.com

Built as part of the [Fair Winds AI Strategies](https://www.labattsimon.com) agent fleet — a real-world deployment of 15 AI agents orchestrated through Paperclip.
