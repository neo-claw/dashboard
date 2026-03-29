import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Realtime Sync Test', () => {
  test.describe.configure({ timeout: 45000 });

  test('Adding a learning updates dashboard within 15s', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Switch to Learnings tab initially
    const learningsTab = page.locator('button:has-text("Learnings")');
    await expect(learningsTab).toBeVisible();
    await learningsTab.click();
    await page.waitForLoadState('networkidle');

    // Wait for timeline to be present and get initial count
    const timeline = page.locator('.space-y-10');
    await expect(timeline).toBeAttached({ timeout: 10000 });
    const initialCount = await timeline.locator('> div').count();

    // Add a new learning entry to LEARNINGS.md
    const workspaceRoot = '/home/ubuntu/.openclaw/workspace';
    const learningsPath = path.join(workspaceRoot, 'LEARNINGS.md');
    const timestamp = new Date().toISOString().split('T')[0];
    const marker = `TEST-REALTIME-${Date.now()}`;
    const newEntry = `\n## ${timestamp}\n\n- ${marker}: Realtime sync test entry\n`;
    await fs.promises.appendFile(learningsPath, newEntry);

    // Poll for up to 20 seconds for the count to increase
    const timeoutMs = 20000;
    const start = Date.now();
    let increased = false;
    while (Date.now() - start < timeoutMs) {
      await page.reload({ waitUntil: 'networkidle' });
      // After reload, need to click Learnings tab again to see timeline
      await learningsTab.click();
      await page.waitForLoadState('networkidle');
      // Wait for timeline to be attached
      await expect(timeline).toBeAttached({ timeout: 5000 });
      const newCount = await timeline.locator('> div').count();
      if (newCount > initialCount) {
        increased = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    expect(increased).toBe(true);

    // Cleanup: remove the test entry from LEARNINGS.md
    try {
      const content = await fs.promises.readFile(learningsPath, 'utf-8');
      const cleaned = content.split('\n').filter(line => !line.includes(marker)).join('\n');
      await fs.promises.writeFile(learningsPath, cleaned);
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
  });
});
