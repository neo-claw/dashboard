#!/bin/bash
set -e

cd /home/ubuntu/.openclaw/workspace

# Start the Next.js dev server in background
npm run dev &
DEV_PID=$!

# Ensure we kill the server on exit
cleanup() {
  kill $DEV_PID 2>/dev/null || true
  wait $DEV_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be ready (up to 60 seconds)
echo "Waiting for dev server to start..."
for i in {1..60}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q 200; then
    echo "Server is up."
    break
  fi
  sleep 2
done

# Run the Playwright test with local baseURL
npx playwright test tests/recreation-check-widget.spec.ts --baseURL=http://localhost:3000 --reporter=list
