# Subagent Activity Feed — Usage Guide

## Overview

The **Subagent Activity Feed** (also known as the Subagent Monitor) provides real-time visibility into all active subagents in your OpenClaw workspace. It shows their status, recent messages, token usage, and allows you to steer them by sending messages directly from the dashboard.

## Location

The Subagent Monitor is integrated into the **Overview** page of the Neo Dashboard (`/`). You can also access it via a dedicated **Agents** tab if configured.

## Features

### Real-time List
- Polls every **10 seconds** for active subagents (last 60 minutes)
- Shows:
  - **Label** – a custom name for the subagent (auto-generated from first user message, editable)
  - **Status** – Running (green) or Completed (gray)
  - **Age** – duration since last activity
  - **Model** – the AI model used
  - **Tokens** – total tokens consumed
  - **Estimated Cost** – based on token usage

### Automatic Labeling
When a subagent is first expanded, the dashboard automatically generates a label and description from its first user message (if available). This ensures every subagent has a meaningful identifier without manual effort.

> You can override the auto-generated label and description by clicking the **Edit** button (pencil icon). Changes are saved to your browser's local storage and persist across sessions.

### Recent Messages (Trace)
- Click a row to expand and see the **last 20 messages** in chronological order.
- Messages are color-coded by role:
  - **user** – blue
  - **assistant** – accent color
  - **tool** – purple (if tool calls are included)
  - other roles in gray
- Timestamps show the time of each event.

### Steering (Send Messages)
- In the expanded panel, click **Send Message** to open an input.
- Type your message and press **Enter** or click **Send**.
- The message is delivered instantly to the subagent via the OpenClaw gateway.
- Your message appears immediately in the trace (optimistic UI).
- Useful for redirecting, correcting, or providing additional context while the subagent is running.

## Usage for Task Orchestration

### Assigning Work
1. Spawn a subagent via your usual OpenClaw skill (e.g., `subagent` skill, or an agent that delegates).
2. The subagent appears in the feed within seconds.
3. Expand it to see its initial instruction (first user message). If it’s generic, edit the label to something memorable (e.g., "Data Validation", "Weekly Report").
4. The description field can hold the task goal or acceptance criteria.

### Monitoring Progress
- Watch the **token count** and **age** to gauge progress.
- Open the trace to see what the subagent is thinking and whether it’s stuck.
- If you see repetitive or erroneous behavior, intervene.

### Steering
- Use the **Send Message** input to:
  - Refine the task ("Actually, use the CSV from March 15").
  - Change output format ("Give me a bullet list instead").
  - Abort or reprioritize ("Stop. Switch to the other project.").
- The subagent receives the message as if from the user, so it will adapt its next steps.

### Completion
- Completed subagents (no activity for >5 minutes) show as “Completed” but remain visible for an hour.
- You can still view their traces and labels after completion.

## Best Practices

- **Label early**: Even with auto-labeling, rename unclear labels to something domain-specific.
- **Use descriptions**: Add a clear purpose statement; this helps when reviewing multiple subagents.
- **Steer sparingly**: Resist micromanaging; let the subagent work unless it veers off course.
- **Clean up**: Periodically clear old labels from localStorage (via browser dev tools) if they accumulate.

## Technical Notes

- **Polling**: Subagent list updates every 10 seconds. Trace updates when expanded and then every 2 seconds while the panel is open.
- **Caching**: Traces are cached in component state; revisiting an expanded subagent does not re-fetch unless you manually refresh the page.
- **Storage**: Custom labels and descriptions are persisted in `localStorage` under the key `subagent_labels`.
- **API**: The component uses Next.js API routes (`/api/sessions/active`, `/api/trace`, `/api/chat`) which forward to the backend service (Express) that invokes OpenClaw tools:
  - `openclaw sessions --json` for the session list.
  - `/api/v1/trace` for message history.
  - `/api/v1/chat/send` for sending messages.

## Standardizing Future Spawns

To ensure subagents spawn with useful metadata, consider extending your agent workflows:

- When creating a subagent, pass a clear **initial user message** that describes the task. That message will be used for auto-labeling and becomes the default description.
- Optionally, include `label` and `description` fields in the subagent’s session metadata if your spawning mechanism supports it. The dashboard could be enhanced to read these fields directly, reducing reliance on manual edits.

## Troubleshooting

- **No subagents appear?** Ensure the OpenClaw gateway is running and the backend API is reachable (check `BACKEND_URL` and `BACKEND_API_KEY` in `.env.local`).
- **Labels not saving?** Check browser storage permissions; localStorage must be enabled.
- **Send fails?** The subagent may have completed or become unresponsive. Check the trace for errors.

---

*“The system is yours.” — Trinity ◈*
