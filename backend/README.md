# Dashboard Backend API

Express server running on Ubuntu (`163.192.18.76`) to provide secure access to OpenClaw data.

## Setup on Ubuntu

```bash
cd ~/dashboard-backend  # or wherever you clone the dashboard repo
cd backend
npm install
npm run build
```

Create `.env`:
```
BACKEND_API_KEY=your-secret-key-here
WORKSPACE_ROOT=/home/ubuntu/.openclaw/workspace
ALLOWED_ORIGIN=https://neo-claw-dashboard.vercel.app
PORT=3001
```

Run with PM2 (recommended):
```bash
pm2 start dist/server.js --name dashboard-backend
pm2 save
pm2 startup  # enable on boot
```

Or run directly: `npm start`

## Exposed Endpoints (all require `Authorization: Bearer <BACKEND_API_KEY>`)

- `GET /api/v1/files/*` — Read workspace files (sandboxed to `WORKSPACE_ROOT`)
- `POST /api/v1/chat/send` — Send message to agent (`{ message, sessionKey? }`)
- `GET /api/v1/trace?sessionId=<id>&limit=50` — Get session history (JSON)
- `GET /api/v1/calendar` — Today's calendar events (via gws)
- `GET /api/v1/status` — Cron runs + gateway status

## HTTPS (Production)

Do **not** expose this directly to the internet on HTTP. Use:

### Option A: Cloudflare Tunnel (Recommended)

See detailed guide: `CLOUDFLARE_TUNNEL.md`

Quick steps:
```bash
# Install cloudflared
sudo snap install cloudflared

# Create tunnel (in Cloudflare dashboard first to get token)
cloudflared tunnel create dashboard-backend

# Config file (~/.cloudflared/dashboard-backend/config.yml)
tunnel: <tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/dashboard-backend/dashboard-backend.json
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404

# Run as systemd service (see CLOUDFLARE_TUNNEL.md)
cloudflared tunnel run dashboard-backend
```

### Option B: Nginx + Let's Encrypt
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Rotation of API Key

1. Generate new: `openssl rand -hex 32`
2. Update `.env` on Ubuntu (`BACKEND_API_KEY=newkey`) and restart backend: `pm2 restart dashboard-backend`
3. Update Vercel environment variable `BACKEND_API_KEY` to same new key
4. Redeploy Vercel functions (automatic on env change)

## Security Notes

- All endpoints are rate-limited (100 req/min per IP)
- CORS restricted to `ALLOWED_ORIGIN`
- Helmet sets secure headers
- Filesystem access is sandboxed to `WORKSPACE_ROOT`
- Logs do not include request bodies
