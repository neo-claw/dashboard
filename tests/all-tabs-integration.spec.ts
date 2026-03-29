import { test, expect } from '@playwright/test';

test.describe('All Tabs Integration Test', () => {
  const tabs = ['Overview', 'Kanban', 'Learnings', 'Trinity', 'Calendar'];

  test('All tabs load without console errors', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    for (const tabName of tabs) {
      // Click tab
      const tab = page.locator(`button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForLoadState('networkidle');

      // Wait for data to load (various components have different selectors)
      await page.waitForTimeout(2000);

      // Assert no critical console errors (ignore 404s, favicon, manifest)
      const criticalErrors = errors.filter(e =>
        !e.includes('404') &&
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('apple-touch-icon')
      );
      expect(criticalErrors).toHaveLength(0);
    }
  });
});
