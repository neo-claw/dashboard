import { test, chromium } from '@playwright/test';
import * as path from 'path';
import { promises as fs } from 'fs';

const screenshotsDir = path.join(process.cwd(), 'playwright-screenshots');

test.describe('Dashboard Visual Verification', () => {
  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    await fs.mkdir(screenshotsDir, { recursive: true });
  });

  test('capture all tabs with full page screenshots', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const tabs = [
      { name: 'overview', navText: 'Overview' },
      { name: 'kanban', navText: 'Kanban' },
      { name: 'learnings', navText: 'Learnings' },
      { name: 'trinity', navText: 'Trinity' },
      { name: 'calendar', navText: 'Calendar' },
    ];

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    for (const tab of tabs) {
      if (tab.name !== 'overview') {
        await page.click(`button:has-text("${tab.navText}")`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      const screenshotPath = path.join(screenshotsDir, `${tab.name}-full.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Saved ${screenshotPath}`);
    }

    await browser.close();
  }, 120000);
});
