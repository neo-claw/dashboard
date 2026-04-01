import { test, expect, chromium, Page, Response } from '@playwright/test';

test.describe('Tool Contract UI', () => {
  let browser: any;
  let context: any;
  let page: Page;

  test.beforeEach(async () => {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();

    // Mock the sessions API
    await page.route('/api/sessions/active', async (route) => {
      await route.fulfill({
        json: {
          sessions: [
            {
              key: 'agent:main:subagent:tooltest',
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

    // Mock the trace endpoint to return a tool call event with params
    await page.route('/api/trace*', async (route) => {
      await route.fulfill({
        json: [
          {
            role: 'user',
            content: 'Read the README file',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: '',
            tool: 'read',
            params: { path: 'README.md', stream: false },
            timestamp: new Date().toISOString(),
          },
          {
            role: 'tool',
            content: { success: true, result: '# OpenClaw' },
            tool: 'read',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    });
  });

  test.afterEach(async () => {
    await browser?.close();
  });

  test('displays tool call with input params and result', async () => {
    await page.goto('/');
    // Wait for monitor to load sessions
    await page.waitForSelector('text=Subagent Monitor');
    // Expand the subagent row
    await page.click('data-key="agent:main:subagent:tooltest"');
    // Wait for trace to load
    await page.waitForTimeout(500);

    // Check that the tool event shows input params
    const inputLabel = await page.$('text=Input:');
    expect(inputLabel).not.toBeNull();

    // Check that the params JSON includes the path
    const pre = await page.$('pre'); // the params pre block
    expect(pre).not.toBeNull();
    const preText = await pre?.textContent();
    expect(preText).toContain('"path"');
    expect(preText).toContain('README.md');

    // Check that the result is displayed (the content of tool event)
    const resultText = await page.textContent('text=# OpenClaw');
    expect(resultText).toContain('# OpenClaw');
  });
});