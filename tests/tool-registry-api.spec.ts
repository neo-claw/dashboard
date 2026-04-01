import { test, expect, request } from '@playwright/test';

test.describe('Tool Registry API', () => {
  test('GET /api/v1/tools returns list of available tools', async () => {
    // Use a standalone API request context (no browser needed)
    const apiContext = await request.newContext();
    const response = await apiContext.get('http://localhost:3001/api/v1/tools');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('tools');
    expect(Array.isArray(body.tools)).toBeTruthy();

    // Verify that the 'read' tool from agent-read skill is present
    const readTool = body.tools.find((t: any) => t.name === 'read');
    expect(readTool).toBeDefined();
    expect(readTool.skill).toBe('agent-read');
    expect(readTool.permissions).toContain('file_read');
    expect(readTool.inputSchema).toHaveProperty('properties.path');
    expect(readTool.inputSchema.required).toContain('path');
  });

  test('GET /api/v1/tools?skill filters by skill', async () => {
    const apiContext = await request.newContext();
    const response = await apiContext.get('http://localhost:3001/api/v1/tools?skill=agent-read');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.tools.every((t: any) => t.skill === 'agent-read')).toBeTruthy();
  });
});