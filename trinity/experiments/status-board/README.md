# OpenClaw Status Board

A minimalist, zero-dependency status dashboard for OpenClaw deployments.

## What it does

- Polls OpenClaw backend endpoints every 30 seconds
- Shows health of: Backend API, Gateway, Agents
- Single HTML file, no build step, no frameworks

## Deploy

1. Copy `index.html` to any web server (nginx, Caddy, GitHub Pages)
2. Optionally set `API_BASE` in the script if not served from same origin as backend
3. Open in browser

## Statuses

- ● Healthy (green): Endpoint responding as expected
- ● Unhealthy (red): Endpoint reachable but failing
- ● Unknown (orange): Endpoint not implemented (e.g., /gateway/status returns 404)

## Custom endpoints

Edit the `checkBackend`, `checkGateway`, `checkAgents` functions in the script to target different routes.

## Why this over full observability suites?

If you just need to know "is the system up?", this is 100 lines of HTML instead of 10GB of Prometheus. Keep it simple.
