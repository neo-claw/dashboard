import { test, expect } from '@playwright/test';

test.describe('Dashboard Functional & Design Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('overview page displays unified stats panel', async ({ page }) => {
    await expect(page.locator('h2:text("Overview")')).toBeVisible();
    // Stats should be in a Panel (section with border-border/20)
    await expect(page.locator('section').filter({ hasText: 'Cron Health' })).toBeVisible();
    // Values should be visible
    await expect(page.locator('text=/^(Ok|Down|Degraded|Unknown)$/')).toBeVisible();
  });

  test('sessions page loads and displays active sessions', async ({ page }) => {
    await page.click('a:has-text("Sessions")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Sessions")')).toBeVisible();
    // Wait for sessions to load (polling)
    await page.waitForSelector('[data-testid="session-list"]', { timeout: 15000 });
    // At least one session should be listed or "No sessions found"
    const list = page.locator('[data-testid="session-list"]');
    await expect(list).toBeVisible();
  });

  test('sessions selection shows trace', async ({ page }) => {
    await page.click('a:has-text("Sessions")');
    await page.waitForLoadState('domcontentloaded');
    // Wait for sessions list
    await page.waitForSelector('[data-testid="session-item"]', { timeout: 15000 });
    const firstSession = page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    // Trace panel should update
    await expect(page.locator('[data-testid="trace-panel"]')).toBeVisible();
    // Could have trace events or "No trace events yet"
    await page.waitForTimeout(1000);
  });

  test('learnings page uses panel styling', async ({ page }) => {
    await page.click('a:has-text("Learnings")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Learnings")')).toBeVisible();
    // Learning entries should be inside a Panel (section)
    await expect(page.locator('section').filter({ hasText: /Improvement|Automation|Discovery/ })).toBeVisible();
  });

  test('kanban page displays columns in panels', async ({ page }) => {
    await page.click('a:has-text("Kanban")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Kanban")')).toBeVisible();
    // Columns To Do, In Progress, Done
    await expect(page.locator('text=/To Do|In Progress|Done/')).toBeVisible();
  });

  test('trinity page stats panel', async ({ page }) => {
    await page.click('a:has-text("Trinity")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Trinity")')).toBeVisible();
    await expect(page.locator('text=/Total Runs|Success Rate|Avg Duration/')).toBeVisible();
  });

  test('calendar page shows events in panels', async ({ page }) => {
    await page.click('a:has-text("Calendar")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Calendar")')).toBeVisible();
    await expect(page.locator('section').filter({ hasText: /Today|Upcoming/ })).toBeVisible();
  });

  test('control center chat loads', async ({ page }) => {
    await page.click('a:has-text("Control Center")');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h2:text("Control Center")')).toBeVisible();
    // Session list and chat area
    await expect(page.locator('text=Sessions')).toBeVisible();
    await expect(page.locator('textarea[placeholder="Send a message..."]')).toBeVisible();
  });

  test('design system: body has Space Grotesk variable', async ({ page }) => {
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily).toContain('Space Grotesk');
  });

  test('design system: no leftover Card borders on overview', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Cards typically have shadow or rounded-xl; our Panel uses rounded-xl border-border/20
    // Ensure stats are not inside Card components
    const cardCount = await page.locator('[class*="shadow"]').count();
    // We expect zero shadows on overview (glow only on hover)
    expect(cardCount).toBe(0);
  });
});
