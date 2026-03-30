import { test, expect, chromium } from '@playwright/test';

test('Subagent Monitor renders without errors', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to local dev
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Wait for the Subagent Monitor heading to appear
  await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

  // Take a screenshot showing the monitor component
  await page.screenshot({ path: 'playwright-screenshots/overview-subagent-monitor.png', fullPage: true });

  await browser.close();
});
