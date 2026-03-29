import { test, expect } from '@playwright/test';

test.describe('All Tabs Integration Test', () => {
  const tabs = ['Overview', 'Kanban', 'Learnings', 'Trinity', 'Calendar'];

  test('All tabs load without console errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();

      // Click tab
      await tab.click();

      // Wait for heading to update to this tab's label
      const heading = page.locator('h2');
      await expect(heading).toHaveText(tabName, { timeout: 15000 });

      // Allow content to render and any data to fetch
      await page.waitForTimeout(2000);
    }

    // Filter benign errors
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('apple-touch-icon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
