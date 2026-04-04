import { test, expect } from '@playwright/test';

test.describe('Recreation Check Widget', () => {
  test('shows availability count > 0 when API returns data', async ({ page }) => {
    // Intercept the API call and return mock data with availability
    page.route('**/api/recreation-check/status', route => {
      route.fulfill({
        json: {
          hasCache: true,
          status: 'fresh',
          lastCheck: new Date().toISOString(),
          ageMinutes: 0,
          campgroundIds: ['232447'],
          campgroundNames: { '232447': 'Upper Pines' },
          startDate: '2025-04-01',
          endDate: '2025-04-03',
          hadAvailability: true,
          availableSitesCount: 5
        }
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the widget to load; the value may be initially 0 then update.
    const availableSitesValue = page.locator('div:has-text("Available Sites")').locator('p.font-medium').first();
    // Expect the count to become 5 within timeout
    await expect(availableSitesValue).toContainText('5', { timeout: 10000 });

    // Verify the availability badge is visible
    const badge = page.locator('text="AVAILABILITY FOUND!"');
    await expect(badge).toBeVisible();

    // Also check campground count shows 1 monitored
    const campgroundCount = page.locator('div:has-text("Campgrounds")').locator('p.font-medium').first();
    await expect(campgroundCount).toContainText('1');
  });

  test('shows no availability when API returns no sites', async ({ page }) => {
    page.route('**/api/recreation-check/status', route => {
      route.fulfill({
        json: {
          hasCache: true,
          status: 'fresh',
          lastCheck: new Date().toISOString(),
          ageMinutes: 0,
          campgroundIds: ['232447'],
          campgroundNames: { '232447': 'Upper Pines' },
          startDate: '2025-04-01',
          endDate: '2025-04-03',
          hadAvailability: false,
          availableSitesCount: 0
        }
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const availableSitesValue = page.locator('div:has-text("Available Sites")').locator('p.font-medium').first();
    await expect(availableSitesValue).toContainText('0');

    const badge = page.locator('text="AVAILABILITY FOUND!"');
    await expect(badge).not.toBeVisible();
  });
});
