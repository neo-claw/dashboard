import { test, expect, chromium, Page, Response } from '@playwright/test';

test.describe('Subagent Monitor', () => {
  test.beforeEach(async () => {
    // Intercept the sessions API and return mock data
    // Note: This interceptor must be set per page before navigation
  });

  test('renders without errors and shows heading', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mock the sessions API
    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:test123',
              sessionId: 'abc12345-5678-90ab-cdef-1234567890ab',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              metadata: {
                model: 'stepfun/step-3.5-flash:free',
                kind: 'subagent',
                inputTokens: 5000,
                outputTokens: 200,
                totalTokens: 5200,
              },
            },
          ],
          count: 1,
        },
      });
    });

    // Also mock trace endpoint for expand
    await page.route('/api/v1/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'Analyze this data',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: 'I am analyzing...',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Wait for the Subagent Monitor heading to appear
    await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

    // Verify that the subagent label is shown (should be "Subagent abc12345" by default)
    await expect(page.locator('text=Subagent abc12345')).toBeVisible({ timeout: 5000 });

    // Verify status badge
    await expect(page.locator('text=Running')).toBeVisible();

    // Expand to show messages
    await page.locator('tr[data-key="agent:main:subagent:test123"]').click();
    await expect(page.locator('text=Analyze this data')).toBeVisible();

    // Take a screenshot
    await page.screenshot({ path: 'playwright-screenshots/subagent-monitor-mock.png', fullPage: true });

    await browser.close();
  });

  test('displays multiple subagents', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:aaa',
              sessionId: '11111111-1111-1111-1111-111111111111',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 300000).toISOString(),
              durationSec: 300,
              metadata: {
                model: 'stepfun',
                kind: 'subagent',
                inputTokens: 1000,
                outputTokens: 100,
                totalTokens: 1100,
              },
            },
            {
              key: 'agent:main:subagent:bbb',
              sessionId: '22222222-2222-2222-2222-222222222222',
              agentId: 'main',
              active: false,
              lastHeartbeat: new Date(Date.now() - 7200000).toISOString(),
              lastActivity: new Date(Date.now() - 7200000).toISOString(),
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              durationSec: 7200,
              metadata: {
                model: 'stepfun',
                kind: 'subagent',
                inputTokens: 2000,
                outputTokens: 200,
                totalTokens: 2200,
              },
            },
          ],
          count: 2,
        },
      });
    });

    // Mock trace for both
    await page.route('/api/v1/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'Test message',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    await expect(page.locator('text=Subagent Monitor')).toBeVisible();

    // Verify both labels appear (defaults to Subagent + id prefix)
    await expect(page.locator('text=Subagent 11111111')).toBeVisible();
    await expect(page.locator('text=Subagent 22222222')).toBeVisible();

    // Verify count in header
    await expect(page.locator('text=2 subagents')).toBeVisible();

    await browser.close();
  });

  test('auto-labels subagent from first user message', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:test123',
              sessionId: 'abc12345-5678-90ab-cdef-1234567890ab',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              metadata: {
                model: 'stepfun/step-3.5-flash:free',
                kind: 'subagent',
                inputTokens: 5000,
                outputTokens: 200,
                totalTokens: 5200,
              },
            },
          ],
          count: 1,
        },
      });
    });

    // Mock trace with a user message
    await page.route('/api/v1/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'Process user uploads and generate reports',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: 'I will process the uploads.',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

    // Initial label should be generic (before expansion)
    await expect(page.locator('text=Subagent abc12345')).toBeVisible({ timeout: 5000 });

    // Expand the subagent row to trigger trace fetch and auto-label
    await page.locator('tr[data-key="agent:main:subagent:test123"]').click();

    // After trace loads, label should update to a snippet of the first user message
    // Wait for the row to contain the snippet
    await expect(page.locator('tr[data-key="agent:main:subagent:test123"]')).toContainText('Process user uploads', { timeout: 5000 });

    // Also verify the description in the expanded panel contains the message
    await expect(page.locator('text=/Process user uploads/')).toBeVisible();

    await browser.close();
  });

  test('sends message to subagent and updates trace', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:test123',
              sessionId: 'abc12345-5678-90ab-cdef-1234567890ab',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              metadata: {
                model: 'stepfun/step-3.5-flash:free',
                kind: 'subagent',
                inputTokens: 5000,
                outputTokens: 200,
                totalTokens: 5200,
              },
            },
          ],
          count: 1,
        },
      });
    });

    // Mock trace initial (could be empty)
    await page.route('/api/v1/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'Initial instruction',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });

    // Intercept chat send
    let chatPayload: any = null;
    await page.route('/api/chat', async (route) => {
      const req = route.request();
      chatPayload = JSON.parse(req.postBodyAsJson || '{}');
      await route.fulfill({
        json: { success: true, reply: 'Acknowledged' },
      });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

    // Expand the subagent row
    await page.locator('tr[data-key="agent:main:subagent:test123"]').click();

    // Wait for the send button to be visible
    await expect(page.locator('button:has-text("Send Message")')).toBeVisible({ timeout: 5000 });

    // Click the send button to activate the input
    await page.locator('button:has-text("Send Message")').click();

    // Find the input and send a message
    const input = page.locator('input[placeholder="Enter message to send..."]');
    await expect(input).toBeVisible();
    await input.fill('Hello subagent!');
    await input.press('Enter');

    // Wait for the user message to appear in the trace
    await expect(page.locator('text=Hello subagent!')).toBeVisible({ timeout: 5000 });

    // Verify the chat request payload
    expect(chatPayload).toEqual({
      message: 'Hello subagent!',
      sessionKey: 'agent:main:subagent:test123',
    });

    await browser.close();
  });
});
