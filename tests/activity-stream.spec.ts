import { test, expect, chromium } from '@playwright/test';

test.describe('Activity Stream', () => {
  test('shows subagent start event when a subagent spawns', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to Activity page
    await page.goto('http://localhost:3000/activity', { waitUntil: 'domcontentloaded' });

    // Wait for ActivityStream heading
    await expect(page.locator('h2:has-text("Activity Stream")')).toBeVisible({ timeout: 10000 });

    // Spawn a subagent via backend API (directly)
    const BACKEND_URL = 'http://localhost:3001';
    const API_KEY = '7add125df6ca9d2573d71e55e10b5a953d78601a6c4aca5af512b3edac6a3638';
    const sessionKey = await page.evaluate(async (url, key) => {
      const res = await fetch(`${url}/api/v1/subagents/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ model: 'stepfun/step-3.5-flash:free' }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Spawn failed: ${res.status} ${err}`);
      }
      const data = await res.json();
      return data.sessionKey;
    }, BACKEND_URL, API_KEY);

    // Wait for the activity event to appear (polling interval is 5s, so allow some time)
    const eventLocator = page.locator('[data-testid="activity-item"][data-event-type="subagent_start"]');
    await expect(eventLocator).toHaveCount(1, { timeout: 15000 });

    // Verify the event title contains 'started' and the sessionKey is mentioned
    const text = await eventLocator.textContent();
    expect(text).toContain('started');
    expect(text).toContain(sessionKey.slice(0, 8));

    await browser.close();
  }, 30000);
});
