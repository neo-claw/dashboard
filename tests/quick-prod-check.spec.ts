const { test, expect } = require('@playwright/test');

test('overview page loads without 500', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // Should not have error banners
  const errorBanner = page.locator('text=Error loading sessions');
  await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
  // Subagent Monitor section should exist
  const monitor = page.locator('h2:has-text("Subagent Monitor")');
  await expect(monitor).toBeVisible();
});

test('subagent monitor shows no crash', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  // Check that the section renders even with 0 subagents
  const emptyState = page.locator('text=No subagent activity');
  await expect(emptyState.first()).toBeVisible({ timeout: 10000 });
});