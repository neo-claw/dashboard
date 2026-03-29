import { test, expect } from '@playwright/test';

test.describe('Control Center Chat Test', () => {
  test('Sending "hello" receives assistant response within 30s', async ({ page }) => {
    await page.goto('http://localhost:3000/control-center', { waitUntil: 'networkidle' });

    // Wait for textarea in chat input
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Get initial count of assistant messages (bg-surface-card, mr-auto)
    const assistantMsgs = page.locator('div.bg-surface-card.mr-auto');
    const initialCount = await assistantMsgs.count();

    // Type and send
    await textarea.fill('hello');
    await textarea.press('Enter');

    // Poll for new assistant message
    const timeout = 30000;
    const start = Date.now();
    let found = false;
    while (Date.now() - start < timeout) {
      const newCount = await assistantMsgs.count();
      if (newCount > initialCount) {
        found = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    expect(found).toBe(true);
  });
});
