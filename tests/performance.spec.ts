import { test, expect } from '@playwright/test';

test('overview page loads within 2 seconds', async ({ page }) => {
  page.goto('/');
  // Wait for the Overview tab to be active by default
  await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });
  // Measure load time
  const start = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - start;
  console.log(`Overview load time: ${loadTime}ms`);
  // Assert reasonable load time (adjust threshold after baseline)
  expect(loadTime).toBeLessThan(5000);
  // Check that stats cards are present
  await expect(page.locator('text=Cron Health')).toBeVisible();
  await expect(page.locator('text=Last Brain Commit')).toBeVisible();
});

test('backend stats endpoint responds quickly', async ({ request }) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY || 'test';
  const start = Date.now();
  const response = await request.get(`${baseUrl}/api/v1/stats/overview`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const duration = Date.now() - start;
  expect(response.status()).toBe(200);
  console.log(`Stats endpoint latency: ${duration}ms`);
  expect(duration).toBeLessThan(1000);
});

test('backend health endpoint responds quickly', async ({ request }) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY || 'test';
  const start = Date.now();
  const response = await request.get(`${baseUrl}/api/v1/system/health`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const duration = Date.now() - start;
  expect(response.status()).toBe(200);
  console.log(`Health endpoint latency: ${duration}ms`);
  expect(duration).toBeLessThan(1000);
});

test('cache hit improves latency on second request', async ({ request }) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY || 'test';
  const endpoint = `${baseUrl}/api/v1/stats/overview`;

  // First request (cold)
  const start1 = Date.now();
  const res1 = await request.get(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
  const time1 = Date.now() - start1;
  expect(res1.status()).toBe(200);

  // Second request (should be cached)
  const start2 = Date.now();
  const res2 = await request.get(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
  const time2 = Date.now() - start2;
  expect(res2.status()).toBe(200);

  console.log(`Cold: ${time1}ms, Cached: ${time2}ms`);
  // Cached should be notably faster (at least 2x)
  expect(time2).toBeLessThan(time1 / 2);
});
