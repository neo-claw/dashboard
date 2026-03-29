import { test, expect } from '@playwright/test';

test.describe('Overview Real Data Test', () => {
  test('Overview page loads with real stats (not placeholder)', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/', { waitUntil: 'networkidle' });

    // Ensure Overview tab is active (should be default)
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(overviewTab).toBeVisible();
    await overviewTab.click();
    await page.waitForLoadState('networkidle');

    // Wait for stats to load (they fetch from API)
    await page.waitForTimeout(2000);

    // Check that stat cards contain actual values (not "???")
    // Select all stat cards and their value elements
    const valueElements = page.locator('.grid button, .grid .text-4xl, .grid .text-2xl');
    const count = await valueElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one stat has real data (not placeholder)
    let hasRealData = false;
    for (let i = 0; i < count; i++) {
      const text = await valueElements.nth(i).innerText();
      if (text && text.trim() !== '???' && text.trim() !== '') {
        hasRealData = true;
        break;
      }
    }
    expect(hasRealData).toBe(true);
  });
});
