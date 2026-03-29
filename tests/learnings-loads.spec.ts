import { test, expect } from '@playwright/test';

test.describe('Learnings Loads Test', () => {
  test('Learnings timeline shows entries with dates', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Switch to Learnings tab
    const learningsTab = page.locator('button:has-text("Learnings")');
    await expect(learningsTab).toBeVisible();
    await learningsTab.click();
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check that timeline items exist
    const timelineItems = page.locator('[class*="timeline"], .space-y-10 > div, .card-content div[class*="relative"]');
    const count = await timelineItems.count();
    expect(count).toBeGreaterThan(0);

    // Each item should have a date badge (text matching date pattern or "Badge")
    const firstItem = timelineItems.first();
    const hasDate = await firstItem.locator('text=/\\d{4}-\\d{2}-\\d{2}/').count();
    expect(hasDate).toBeGreaterThan(0);
  });
});
