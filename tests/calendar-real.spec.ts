import { test, expect } from '@playwright/test';

test.describe('Calendar Real Test', () => {
  test('Calendar shows today events or empty state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Navigate to Calendar tab
    const calendarTab = page.locator('button:has-text("Calendar")');
    await expect(calendarTab).toBeVisible();
    await calendarTab.click();
    await page.waitForLoadState('networkidle');

    // Wait for calendar content to load
    await page.waitForTimeout(1000);

    // There should be a section for "Today" and either events or "No events scheduled"
    const todaySection = page.locator('text=Today');
    await expect(todaySection).toBeVisible();

    // Check that either event cards exist or the empty state is shown
    const eventCards = page.locator('div[class*="rounded-2xl"]:has-text("Mar")');
    const emptyState = page.locator('text="No events scheduled"');

    const hasEvents = await eventCards.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasEvents || hasEmpty).toBe(true);
  });
});
