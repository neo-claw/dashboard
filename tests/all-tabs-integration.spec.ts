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
      await tab.click();

      // Wait for tab to become active (shadcn Tabs sets data-state="active")
      await expect(tab).toHaveAttribute('data-state', 'active', { timeout: 10000 });

      // Allow content to render
      await page.waitForTimeout(1000);
    }

    // Filter out benign errors
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('apple-touch-icon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
