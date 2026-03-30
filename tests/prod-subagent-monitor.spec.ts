import { test, expect, chromium } from '@playwright/test';

test('Prod: Subagent Monitor loads and shows subagents', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Vercel production (uses env configured there)
  await page.goto('https://neo-claw-dashboard.vercel.app', { waitUntil: 'networkidle' });

  // Wait for Subagent Monitor heading
  await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 15000 });

  // The monitor should display a count like "X subagents (last 60m)" even if zero
  const countLocator = page.locator('text=/\\d+ subagents/');
  await expect(countLocator).toBeVisible({ timeout: 15000 });
  // Note: we don't assert count > 0 because CI may run when no subagents are active.

  // Take screenshot
  await page.screenshot({ path: 'playwright-screenshots/prod-subagent-monitor.png', fullPage: true });

  await browser.close();
});
