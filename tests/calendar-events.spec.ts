import { test, expect } from '@playwright/test';

test.describe('Calendar Events Test', () => {
  test('displays calendar events or empty state', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });

    // Wait for Calendar heading to appear
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Calendar', { timeout: 15000 });

    // Allow content to render and hydrate
    await page.waitForTimeout(1000);

    // Check for either event cards or empty state message
    // Event cards have p-5 and rounded-2xl; empty state has rounded-2xl but not p-5
    const eventCards = page.locator('div.p-5.rounded-2xl');
    const emptyState = page.locator('text="No events scheduled"');

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

      // Check for date badge (contains month abbreviation)
      const dateBadge = firstEvent.locator('span:has-text("Jan"), span:has-text("Feb"), span:has-text("Mar"), span:has-text("Apr"), span:has-text("May"), span:has-text("Jun"), span:has-text("Jul"), span:has-text("Aug"), span:has-text("Sep"), span:has-text("Oct"), span:has-text("Nov"), span:has-text("Dec")').first();
      await expect(dateBadge).toBeVisible();
    }
  });
});
