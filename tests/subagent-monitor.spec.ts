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
    await page.route('/api/trace*', async (route) => {
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
    await page.route('/api/trace*', async (route) => {
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
    await page.route('/api/trace*', async (route) => {
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
    await page.route('/api/trace*', async (route) => {
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

  test('opens profile modal and displays metrics', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Mock sessions
    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:profile123',
              sessionId: 'profilesess-12345678',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              label: 'Test subagent',
              descriptionOverride: 'A test subagent for profiling',
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

    // Mock trace
    await page.route('/api/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'First user message',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });

    // Mock metrics
    await page.route('/api/subagents/*/metrics', async (route) => {
      await route.fulfill({
        json: {
          sessionKey: 'agent:main:subagent:profile123',
          metrics: Array.from({ length: 30 }, (_, i) => ({
            timestamp: new Date(Date.now() - (30 - i) * 5000).toISOString(),
            cpu: 10 + Math.random() * 20,
            memory: 100 + Math.random() * 50,
          })),
          current: { cpu: 15.5, memory: 128 },
        },
      });
    });

    // Mock status history
    await page.route('/api/subagents/*/status-history', async (route) => {
      await route.fulfill({
        json: {
          history: [
            { status: 'started', timestamp: Date.now() - 120000 },
            { status: 'running', timestamp: Date.now() - 60000 },
          ],
        },
      });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

    // Click the View Profile button (eye icon)
    await page.locator('button[title="View Profile"]').click();

    // Modal should open with title containing label
    await expect(page.locator('text=Profile: Test subagent')).toBeVisible({ timeout: 5000 });

    // Verify metrics section shows current CPU and memory
    await expect(page.locator('text=/Current: CPU 15\\.5% · Mem 128 MB/')).toBeVisible({ timeout: 5000 });

    // Verify status history section
    await expect(page.locator('text=Status History (last 10)')).toBeVisible();
    await expect(page.locator('text=/started|running/')).toBeVisible();

    await browser.close();
  });

  test('performs bulk action and undo', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:bulk1',
              sessionId: 'bulk1-11111111',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              metadata: { model: 'stepfun', kind: 'subagent' },
            },
            {
              key: 'agent:main:subagent:bulk2',
              sessionId: 'bulk2-22222222',
              agentId: 'main',
              active: true,
              lastHeartbeat: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              createdAt: new Date(Date.now() - 600000).toISOString(),
              durationSec: 600,
              metadata: { model: 'stepfun', kind: 'subagent' },
            },
          ],
          count: 2,
        },
      });
    });

    await page.route('/api/trace*', async (route) => {
      await route.fulfill({ json: [] });
    });

    // Mock actions endpoint (stop)
    await page.route('/api/subagents/actions', async (route) => {
      const body = JSON.parse(route.request().postBodyAsJson || '{}');
      // Simulate success
      await route.fulfill({
        json: {
          success: true,
          results: (body.sessionKeys || []).map((key: string) => ({ key, success: true })),
        },
      });
    });

    // Mock undo endpoint
    await page.route('/api/subagents/undo', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await expect(page.locator('text=Subagent Monitor')).toBeVisible({ timeout: 10000 });

    // Select two subagents via checkboxes
    await page.locator('button[aria-label="Select row"]').first().click();
    // The checkbox button is inside first row; better to locate by data-key?
    // Simpler: click the first checkbox
    const checkboxes = page.locator('button:has(svg)').filter({ hasText: '' }); // not reliable
    // Instead, within table rows, there is a button with CheckSquare or Square icon. Let's click the first one.
    // Use the first row's button (which has an svg). We'll click the button in first data row.
    const firstRowCheckbox = page.locator('tbody tr').first().locator('button');
    await firstRowCheckbox.click();
    // Ensure it's selected (icon changes to CheckSquare)
    // Then select second row
    const secondRowCheckbox = page.locator('tbody tr').nth(1).locator('button');
    await secondRowCheckbox.click();

    // Bulk action bar should appear
    await expect(page.locator('text="2 selected"')).toBeVisible();

    // Click Stop button
    await page.locator('button:has-text("Stop")').click();

    // Confirmation modal should open
    await expect(page.locator('text="Confirm Action"')).toBeVisible();
    await page.locator('button:has-text("Stop")').last().click(); // confirm

    // Snackbar should appear with Undo
    await expect(page.locator('text=Undo')).toBeVisible({ timeout: 5000 });

    // Click Undo
    await page.locator('button:has-text("Undo")').click();

    // Snackbar should disappear and subagents should be back
    await expect(page.locator('text=Undo')).not.toBeVisible({ timeout: 5000 });

    await browser.close();
  });
});
