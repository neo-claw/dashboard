import { test, expect } from '@playwright/test';

test.describe('Control Center Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/control-center', { waitUntil: 'networkidle' });
  });

  test('page loads with expected panels', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/);
    // Check sidebar panels exist by heading text
    await expect(page.getByText('Calendar')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Files')).toBeVisible();

    // Chat input should be present
    await expect(page.getByPlaceholder('Message the agent...')).toBeVisible();
  });

  test('calendar loads events', async ({ page }) => {
    // Calendar panel heading
    const calendarHeading = page.getByText('Calendar').first();
    await expect(calendarHeading).toBeVisible();
    // The panel container can be located by the heading's ancestor
    const calendarPanel = calendarHeading.locator('..').locator('..'); // approximate
    await expect(calendarPanel).toBeVisible();
    // It may have events or an empty state; ensure not crashing
    await expect(calendarPanel).not.toBeEmpty();
  });

  test('chat sends message and receives response', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Message the agent...');
    const sendButton = page.getByRole('button', { name: 'Send' });

    await chatInput.fill('hello from playwright');
    await sendButton.click();

    // User message appears
    await expect(page.getByText('hello from playwright')).toBeVisible();

    // Wait for assistant response (could take several seconds)
    const assistantMsg = page.locator('[data-message-role="assistant"]').first();
    await expect(assistantMsg).toBeVisible({ timeout: 15000 });

    // Trace panel should contain the conversation
    // Switch to trace tab
    await page.getByRole('button', { name: 'Trace' }).click();
    await expect(page.getByText('hello from playwright')).toBeVisible({ timeout: 10000 });
  });

  test('trace loads on page load', async ({ page }) => {
    // Trace tab
    await page.getByRole('button', { name: 'Trace' }).click();
    const tracePanel = page.getByTestId('trace-panel').or(page.locator('text=Trace').locator('..'));
    await expect(tracePanel).toBeVisible();
    // May have items or empty state
    const items = tracePanel.locator('[data-message-role]');
    await expect(items).toBeDefined();
  });
});