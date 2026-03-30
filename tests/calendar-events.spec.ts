import { test, expect } from '@playwright/test';

test.describe('Calendar Events Test', () => {
  test('displays calendar events or empty state', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });

    // Wait for Calendar heading to appear
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Calendar', { timeout: 15000 });

    // Allow content to render
    await page.waitForTimeout(1000);

    // Check for either event cards or empty state message
    const eventCards = page.locator('div[class*="rounded-2xl"]:has-text("Today"), div[class*="rounded-2xl"]:has-text("Upcoming")');
    const emptyState = page.locator('text="No events scheduled"');
    const sectionHeadings = page.locator('h4:has-text("Today"), h4:has-text("Upcoming")');

    // At least one section should be visible
    const hasSection = await sectionHeadings.count() > 0;
    expect(hasSection).toBe(true);

    // Either there are events or empty state message
    const hasEvents = await eventCards.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasEvents || hasEmpty).toBe(true);

    // If events exist, verify at least one event card has title and date
    if (hasEvents) {
      const firstEvent = eventCards.first();
      await expect(firstEvent).toBeVisible();

      // Check for summary (title)
      const summary = firstEvent.locator('p.text-xl, p.font-medium, .text-fg').first();
      await expect(summary).not.toBeEmpty();

      // Check for date (formatted as Mon, DD or similar)
      const dateBadge = firstEvent.locator('span:has-text("Mar"), span:has-text("Apr"), span:has-text("May")').first();
      await expect(dateBadge).toBeVisible();
    }
  });
});
