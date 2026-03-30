import { test, expect } from '@playwright/test';

test.describe('Trinity page performance and content', () => {
  test('loads within 3 seconds and displays key sections', async ({ page }) => {
    const start = Date.now();
    await page.goto('/trinity', { waitUntil: 'domcontentloaded' });
    const domLoadTime = Date.now() - start;
    console.log(`DOM content loaded: ${domLoadTime}ms`);

    // Wait for the page to become responsive: key stats cards should be visible
    await expect(page.locator('text=Total Runs')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Success Rate')).toBeVisible();
    await expect(page.locator('text=Avg Duration')).toBeVisible();
    await expect(page.locator('text=Memory Entries')).toBeVisible();

    // Wait for latest runs section
    await expect(page.locator('text=Latest Runs')).toBeVisible();

    // Check that at least one run item is present (look for items with date and status badge)
    const firstRun = page.locator('div:has-text("success"), div:has-text("error")').first();
    await expect(firstRun).toBeVisible({ timeout: 10000 });

    // Measure total load time until network idle
    await page.waitForLoadState('networkidle');
    const totalLoadTime = Date.now() - start;
    console.log(`Total load time (network idle): ${totalLoadTime}ms`);

    // Assert load time is under 3 seconds (3000ms)
    expect(totalLoadTime).toBeLessThan(3000);
  });

  test('checks basic performance metrics', async ({ page }) => {
    await page.goto('/trinity', { waitUntil: 'networkidle' });

    // Capture navigation timing
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadComplete: nav.loadEventEnd - nav.startTime,
        responseEnd: nav.responseEnd - nav.startTime,
      };
    });

    console.log('Navigation timing:', timing);
    // DOM content should be relatively fast
    expect(timing.domContentLoaded).toBeLessThan(2000);
  });
});
