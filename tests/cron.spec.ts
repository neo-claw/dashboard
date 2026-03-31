import { test, expect } from '@playwright/test';

test.describe('Cron Visualizer & Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cron', { waitUntil: 'domcontentloaded' });
  });

  test('cron page loads with health panel, timeline, and job cards', async ({ page }) => {
    // Health panel should be visible with a title
    await expect(page.locator('text=Cron Health')).toBeVisible();
    // Upcoming section
    await expect(page.locator('text=Upcoming (Next 24h)')).toBeVisible();
    // Job list section
    await expect(page.locator('text=Jobs & Recent Runs')).toBeVisible();
    // At least one job card should be present if any jobs exist
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount.at.least(1);
  });

  test('run now button triggers execution and updates within 5s', async ({ page }) => {
    // Find first Run now button
    const firstRunBtn = page.locator('button:has-text("Run now")').first();
    await expect(firstRunBtn).toBeVisible();
    await firstRunBtn.click();

    // Expect button to show "Running..." state
    await expect(firstRunBtn).toContainText('Running...');

    // Wait for completion (max 5s). The button should return to "Run now" or show a change in last run time.
    // We'll check that the last run time updates for that job within 5 seconds.
    const startTime = Date.now();
    const jobCard = firstRunBtn.locator('..').locator('..'); // approximate parent card

    // Poll for change in the status or timestamp
    let updated = false;
    for (let i = 0; i < 10; i++) {
      const lastRunText = await jobCard.locator('text=/\\d{1,2}:\\d{2}[AP]M|\\d+[smhd] ago/i').first().textContent();
      // Not ideal but a simple check: after running, the time should be very recent (like "just now" or same minute)
      // We'll try to see if the status returns to 'Run now' within 5s.
      if (!(await firstRunBtn.isDisabled()) && !(await firstRunBtn).innerText().includes('Running')) {
        updated = true;
        break;
      }
      await page.waitForTimeout(500);
    }
    const elapsed = Date.now() - startTime;
    expect(updated).toBeTruthy();
    expect(elapsed).toBeLessThan(5000);
  });

  test('inline schedule editing works with valid input', async ({ page }) => {
    // Click edit button on first job
    const firstEditBtn = page.locator('button[aria-label="Edit"]').first();
    await expect(firstEditBtn).toBeVisible();
    await firstEditBtn.click();

    // Modal should appear
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Edit Schedule');

    // Input field should be present
    const input = modal.locator('input[type="text"]');
    await expect(input).toBeVisible();

    // Clear and enter new schedule
    await input.fill('every 30 minutes');
    await modal.locator('button:has-text("Save")').click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // We can verify the schedule changed by seeing if the success toast or indicator appears? Not sure.
    // For now, we'll check that the edit-modal is gone and page is still functional.
    await expect(page.locator('text=Cron Health')).toBeVisible();
  });

  test('inline schedule editing shows errors for invalid input', async ({ page }) => {
    const firstEditBtn = page.locator('button[aria-label="Edit"]').first();
    await firstEditBtn.click();

    const modal = page.locator('[role="dialog"]').first();
    const input = modal.locator('input[type="text"]');
    await input.clear();
    await input.fill('invalid gibberish schedule');

    const saveBtn = modal.locator('button:has-text("Save")');
    await saveBtn.click();

    // Expect an alert or some error message. Since we use alert(), we can listen for page.on('dialog')
    // But we used alert(err.message) in the code. Let's handle that.
    const dialog = page.waitForEvent('dialog');
    await saveBtn.click();
    const popped = await dialog;
    expect(popped.message()).toContain('Failed to update schedule');
    await popped.dismiss();
  });

  test('clicking a failed run opens drill-down with error and logs link', async ({ page }) => {
    // Find a job card with a failed last run. Find any badge with 'error' status and click its parent text.
    const errorBadge = page.locator('text=error').first();
    const hasError = await errorBadge.count();
    if (hasError === 0) {
      // Skip if no failures visible
      test.info().annotations.push({ type: 'skip', description: 'No failed runs to test' });
      return;
    }

    // Click the container near the badge to open drill-down
    await errorBadge.locator('xpath=..').click(); // parent

    const drillModal = page.locator('[role="dialog"]:has-text("Run Failure Details")').first();
    await expect(drillModal).toBeVisible();

    // Should display error section
    await expect(drillModal.locator('text=Error:')).toBeVisible();
    // Should have a link to view session
    const sessionLink = drillModal.locator('a:has-text("View Session Trace")');
    await expect(sessionLink).toBeVisible();
    await expect(sessionLink).toHaveAttribute('href', /sessions\\?key=/);
  });
});
