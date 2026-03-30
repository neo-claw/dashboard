import { test, chromium } from '@playwright/test';
import * as path from 'path';
import { promises as fs } from 'fs';

const screenshotsDir = path.join(process.cwd(), 'playwright-screenshots');
const actualDir = path.join(screenshotsDir, 'actual');

test.describe('Dashboard Visual Verification', () => {
  test.beforeAll(async () => {
    // Ensure screenshots and actual directories exist
    await fs.mkdir(screenshotsDir, { recursive: true });
    await fs.mkdir(actualDir, { recursive: true });
  });

  test('capture all tabs with full page screenshots', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const tabs = [
      { name: 'overview', navText: 'Overview' },
      { name: 'sessions', navText: 'Sessions' },
      { name: 'kanban', navText: 'Kanban' },
      { name: 'learnings', navText: 'Learnings' },
      { name: 'trinity', navText: 'Trinity' },
      { name: 'calendar', navText: 'Calendar' },
    ];

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const tab of tabs) {
      if (tab.name !== 'overview') {
        // Click the sidebar link by its text
        await page.click(`a:has-text("${tab.navText}")`);
        // Wait for the main content to update; using DOM content loaded is sufficient for static pages
        await page.waitForLoadState('domcontentloaded');
        // Small settle time
        await page.waitForTimeout(300);
      }

      const screenshotPath = path.join(actualDir, `${tab.name}-full.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Saved ${screenshotPath}`);
    }

    await browser.close();
  }, 120000);
});
