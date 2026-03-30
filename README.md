# Neo Dashboard

Operating system view for Thomaz. Built with **Next.js 16** + TypeScript + Tailwind CSS.

## Features

- Kanban board
- Learnings timeline
- Trinity overnight activity
- Calendar view
- System overview
- **Subagent Monitor**: Real-time visibility into active subagents, with ability to label, describe, and steer them.

Data currently mocked; next step: wire to OpenClaw workspace files.

## Subagent Monitor

Located on the Overview page, the Subagent Monitor shows active subagents within the last hour.

- Each row displays: ID, custom **Label**, **Status** (Running/Completed), **Age**, **Model**, **Token usage**, and estimated **Cost**.
- Click a row to **expand** and view the recent conversation trace.
- Use the **Edit** (pencil) button to assign a descriptive label and purpose. These are stored in your browser's local storage.
- Use the **Send** (paper plane) button to send a message directly to that subagent.
- The feed auto-refreshes every 10 seconds.

### Best Practices

When spawning subagents, include a clear purpose in the initial user message. This automatically populates the description if not manually overridden. Use the edit functionality to keep labels meaningful for orchestration.

## Run locally

```bash
pnpm i
pnpm dev
# Open http://localhost:3000
```

## Tech

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS 4
- Lucide icons

---

*“The system is yours.”* — Trinity ◈
// test
