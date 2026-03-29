# Cloudflare Tunnel Setup (Recommended)

Expose your Ubuntu backend securely without managing certificates or opening firewall ports.

## Prerequisites

- Cloudflare account (free tier fine)
- A domain you control (can be a free one from Cloudflare)
- Cloudflared installed on Ubuntu: `sudo snap install cloudflared` or download from Cloudflare

---

## Step-by-Step

### 1. Create a Tunnel in Cloudflare Dashboard

1. Go to https://one.dash.cloudflare.com/
2. Click **"Create a Tunnel"**
3. Give it a name: `dashboard-backend`
4. Cloudflare will show you a **connector token** (long string). Copy it.

### 2. Install and Configure cloudflared on Ubuntu

```bash
# Install (if not already)
sudo snap install cloudflared

# Create tunnel
cloudflared tunnel create dashboard-backend

# This creates:
# - ~/.cloudflared/<tunnel-id>.json (credentials file)
# - ~/.cloudflared/cert.pem
```

If you already created the tunnel in the dashboard, copy the credentials file there. Or use the token method:

```bash
# Using the token from step 1
cloudflared tunnel token create dashboard-backend --token <YOUR_TOKEN>
# This writes credentials to ~/.cloudflared/dashboard-backend.json
```

### 3. Configure the Tunnel to Route to Your Backend

Create a config file at `/etc/cloudflared/config.yml` (or `~/.cloudflared/config.yml`):

```yaml
tunnel: <your-tunnel-id-from-step-2>
credentials-file: /home/ubuntu/.cloudflared/dashboard-backend.json

ingress:
  - hostname: api.yourdomain.com   # <--- change to your subdomain
    service: http://localhost:3001
  - service: http_status:404
```

Replace `api.yourdomain.com` with the subdomain you want to use (must be in your Cloudflare DNS).

### 4. Create DNS Record in Cloudflare

In Cloudflare DNS settings for your domain:
- Add a **CNAME** record:
  - Name: `api` (or whatever you chose)
  - Target: `<your-tunnel-id>.cfargotunnel.com` (Cloudflare gives this)
  - Proxy status: **Proxied** (orange cloud)

Alternatively, use `cloudflared` to create the DNS automatically:

```bash
cloudflared tunnel route dns dashboard-backend api.yourdomain.com
```

### 5. Run the Tunnel as a Service

Start it manually to test:

```bash
cloudflared tunnel run dashboard-backend
```

You should see:
```
2024/... INF Starting tunnel
2024/... INF Connection established
```

Visit `https://api.yourdomain.com/api/status` — you should get JSON from your backend.

#### Run as Systemd Service (auto-start on boot)

Create `/etc/systemd/system/cloudflared.service`:

```ini
[Unit]
Description=Cloudflare Tunnel for dashboard-backend
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run dashboard-backend
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared  # verify running
```

### 6. Configure Your Backend

Make sure your backend (`dashboard/backend`) is running on `localhost:3001`:

```bash
cd ~/dashboard/backend
npm install
npm run build
# Set .env
cat > .env <<EOF
BACKEND_API_KEY=your-secret-key-here
WORKSPACE_ROOT=/home/ubuntu/.openclaw/workspace
ALLOWED_ORIGIN=https://neo-claw-dashboard.vercel.app
PORT=3001
EOF
# Run with PM2
npm install -g pm2
pm2 start dist/server.js --name dashboard-backend
pm2 save
pm2 startup  # follow instructions to enable on boot
```

### 7. Test from Vercel

1. In Vercel dashboard, set environment variables:
   - `BACKEND_URL=https://api.yourdomain.com`
   - `BACKEND_API_KEY=your-secret-key-here` (same as in backend .env)

2. Redeploy the dashboard (`git push` or manual trigger).

3. Test the API:
   ```
   https://neo-claw-dashboard.vercel.app/api/status
   ```
   Should return JSON with `cron` and `gateway` status.

---

## Troubleshooting

- **Tunnel won't connect:** Check credentials file path, tunnel ID, and that `cloudflared` can reach `localhost:3001`.
- **DNS not propagating:** Make sure the CNAME points to `<tunnel-id>.cfargotunnel.com` and is proxied.
- **Backend unreachable:** Ensure backend is listening on `127.0.0.1:3001` (not just `localhost` or `0.0.0.0`? Cloudflared connects via localhost).
- **CORS errors:** Backend's `ALLOWED_ORIGIN` must match your Vercel URL exactly.

---

## Security Notes

- Cloudflare Tunnel terminates TLS at Cloudflare, then connects to your backend over localhost (no public IP暴露).
- Only Cloudflare can reach your backend; the rest of the internet cannot.
- Use `cloudflared access` if you want to add an additional auth layer (like Access policies) before reaching your backend.

---

## Alternative: Nginx + Let's Encrypt

If you prefer not to use Cloudflare, you can set up Nginx with Let's Encrypt certs and expose port 443 directly. That's more manual but works. See `NGINX_SETUP.md` (todo).

---

**That's it!** You now have a secure public endpoint for your backend. Update `BACKEND_URL` in Vercel and you're good.
