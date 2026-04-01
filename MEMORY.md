# Long-term Memory

## Backend Recovery & Stability Fixes (2026-03-31)

**Problem**: Backend repeatedly crashed or returned 500 on `/api/v1/sessions/active`. Symptoms:
- Subagent Monitor shows "Error loading sessions: HTTP 500"
- Backend stops listening on port 3001
- Occurred multiple times

**Root Causes**:
1. Wrong sessions file path: code used `workspace/agents/main/sessions/sessions.json` instead of `~/.openclaw/agents/main/sessions/sessions.json`
2. Slow CLI calls (`openclaw sessions --json`) caused timeouts (~4s)
3. JSON parse errors due to trailing output from CLI
4. No auto-restart on crash

**Fixes Applied**:
- **Direct file read**: Backend now reads sessions JSON directly from `$OPENCLAW_HOME/agents/...` (or fallback to correct relative path) – fast and reliable.
- **Caching**: 10‑second in‑memory cache on `/api/v1/sessions/active`
- **Warm‑up**: Backend calls sessions endpoint on startup to pre‑populate cache
- **Sanitization**: Strips any trailing non‑JSON from CLI output (though direct read avoids this)
- **Process supervision**: Created systemd unit `openclaw-backend.service` with `Restart=on-failure`; enabled and started.

**Recovery Steps** (if backend goes down again):
```bash
# 1. Check status
sudo systemctl status openclaw-backend

# 2. Restart if needed
sudo systemctl restart openclaw-backend

# 3. Verify endpoint
curl -s http://localhost:3001/api/v1/stats/overview | jq .

# 4. If systemd unit missing, rebuild and start manually:
cd /home/ubuntu/.openclaw/workspace/backend && npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-backend
```

**Notes**:
- Backend listens on 0.0.0.0:3001
- Frontend Next.js dev server runs on :3000 and proxies API to :3001
- For remote access, set up Cloudflare Tunnel or ngrok (not currently installed)

---