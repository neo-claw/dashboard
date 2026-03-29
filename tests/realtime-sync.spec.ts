import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Realtime Sync Test', () => {
  test('Adding a learning updates dashboard within 15s', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Locate tabs
    const learningsTab = page.locator('button:has-text("Learnings")');
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(learningsTab).toBeVisible();

    // Open Learnings initially
    await learningsTab.click();
    const timeline = page.locator('.space-y-10');
    await expect(timeline).toBeAttached({ timeout: 10000 });
    const initialCount = await timeline.locator('> div').count();

    // Append a new entry to LEARNINGS.md
    const workspaceRoot = '/home/ubuntu/.openclaw/workspace';
    const learningsPath = path.join(workspaceRoot, 'LEARNINGS.md');
    const timestamp = new Date().toISOString().split('T')[0];
    const marker = `TEST-REALTIME-${Date.now()}`;
    const newEntry = `\n## ${timestamp}\n\n- ${marker}: Realtime sync test entry\n`;
    await fs.promises.appendFile(learningsPath, newEntry);

    // Switch to another tab and back to remount Learnings component
    await overviewTab.click();
    await page.waitForTimeout(500);
    await learningsTab.click();

    // Wait for timeline to be attached again
    await expect(timeline).toBeAttached({ timeout: 10000 });

    // Poll for count increase within 15 seconds
    const timeoutMs = 15000;
    const start = Date.now();
    let increased = false;
    while (Date.now() - start < timeoutMs) {
      const newCount = await timeline.locator('> div').count();
      if (newCount > initialCount) {
        increased = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    expect(increased).toBe(true);

    // Cleanup
    try {
      const content = await fs.promises.readFile(learningsPath, 'utf-8');
      const cleaned = content.split('\n').filter(line => !line.includes(marker)).join('\n');
      await fs.promises.writeFile(learningsPath, cleaned);
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
  });
});
