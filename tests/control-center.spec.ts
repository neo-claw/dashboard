import { test, expect } from '@playwright/test';

test.describe('Control Center Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/control-center', { waitUntil: 'networkidle' });
  });

  test('page loads with expected UI', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/);
    // Sidebar buttons
    await expect(page.getByRole('button', { name: /Trace/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Files/i })).toBeVisible();
    // Chat input
    await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
  });

  test('trace panel is present', async ({ page }) => {
    // The trace panel should be visible by default on desktop
    const tracePanel = page.getByTestId('trace-panel');
    await expect(tracePanel).toBeVisible();
    // It may have events or be empty; ensure it's not in an error state
    await expect(tracePanel).not.toBeEmpty();
  });

  test('chat sends message and receives response', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Send a message...');

    await chatInput.fill('hello from playwright');
    await expect(chatInput).toHaveValue('hello from playwright');
    // Submit by pressing Enter (form submission)
    await chatInput.press('Enter');

    // User message appears
    await expect(page.getByText('hello from playwright')).toBeVisible({ timeout: 10000 });

    // Assistant response should appear within 30s
    const assistantMsg = page.locator('[data-message-role="assistant"]').first();
    await expect(assistantMsg).toBeVisible({ timeout: 30000 });
  });

  test('trace panel can be toggled', async ({ page }) => {
    const traceButton = page.getByRole('button', { name: /Trace/i });
    const filesButton = page.getByRole('button', { name: /Files/i });

    // Initially trace is shown
    const tracePanel = page.getByTestId('trace-panel');
    await expect(tracePanel).toBeVisible();

    // Click Files to hide trace
    await filesButton.click();
    await expect(tracePanel).not.toBeVisible();

    // Click Trace to show again
    await traceButton.click();
    await expect(tracePanel).toBeVisible();
  });
});
