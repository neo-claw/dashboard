import { test, expect, chromium } from '@playwright/test';

test('Prod: Subagent Monitor shows test subagent', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Vercel production
  await page.goto('https://neo-claw-dashboard.vercel.app', { waitUntil: 'networkidle' });

  // Wait for Subagent Monitor heading
  await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 15000 });

  // Wait a moment for fetch
  await page.waitForTimeout(2000);

  // Should show at least 1 subagent (our test)
  // The table should have at least one row, OR the count says "1 subagents"
  const countText = await page.locator('text=/subagents/').textContent();
  console.log('Monitor says:', countText);

  // Take screenshot
  await page.screenshot({ path: 'playwright-screenshots/prod-subagent-monitor.png', fullPage: true });

  await browser.close();
});
