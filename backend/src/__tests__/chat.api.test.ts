import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../server';

// Mock the OpenClaw session functions
jest.mock('../sessions/openClawSession', () => ({
  spawnSession: jest.fn().mockResolvedValue('agent:main:mock-session-' + uuidv4()),
  openClawSendMessage: jest.fn().mockResolvedValue('This is a mocked reply from the agent.'),
  getOpenClawEvents: jest.fn().mockResolvedValue([
    {
      type: 'message',
      timestamp: new Date().toISOString(),
      message: { role: 'assistant', content: 'mocked event' },
    },
  ]),
}));

// Use isolated workspace for tests
process.env.WORKSPACE_ROOT = '/tmp/workspace-test-' + process.pid;

describe('Chat Sessions API', () => {
  const apiKey = process.env.BACKEND_API_KEY || 'test';

  let createdSessionId: string;

  beforeAll(async () => {
    // Ensure workspace dir exists
    const { mkdir } = require('fs').promises;
    try {
      await mkdir(process.env.WORKSPACE_ROOT!, { recursive: true });
    } catch (err) { /* ignore */ }
  });

  it('POST /api/v1/chat/create -> creates session', async () => {
    const res = await request(app)
      .post('/api/v1/chat/create')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ name: 'Test Chat' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('sessionKey');
    expect(res.body).toHaveProperty('createdAt');
    createdSessionId = res.body.id;
  });

  it('GET /api/v1/chat/sessions -> includes created session', async () => {
    const res = await request(app)
      .get('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((s: any) => s.id === createdSessionId);
    expect(found).toBeDefined();
  });

  it('POST /api/v1/chat/:id/send -> returns reply', async () => {
    const res = await request(app)
      .post(`/api/v1/chat/${createdSessionId}/send`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ message: 'hello integration' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, reply: expect.any(String) });
  });

  it('GET /api/v1/chat/:id/trace -> returns events array', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/${createdSessionId}/trace?limit=10`)
      .set('Authorization', `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const ev = res.body[0];
      expect(ev).toHaveProperty('id');
      expect(ev).toHaveProperty('timestamp');
      expect(ev).toHaveProperty('type');
      expect(ev).toHaveProperty('data');
    }
  });
});
