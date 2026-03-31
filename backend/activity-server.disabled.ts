import { activityBroadcaster } from './activity-broadcaster';
import { WebSocketServer } from 'ws';

// Setup WebSocket endpoint on the Express server
export function registerWebSocketEndpoint(httpServer: any) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('[activity] WebSocket client connected from', req.socket.remoteAddress);
    activityBroadcaster.addClient(ws); // we need to add this method

    // Send initial state
    const recent = activityBroadcaster.getRecentEvents(50);
    ws.send(JSON.stringify({ type: 'init', events: recent.reverse() }));

    ws.on('close', () => {
      activityBroadcaster.removeClient(ws);
    });

    ws.on('error', (err) => {
      console.error('[activity] WebSocket error:', err);
    });
  });

  console.log('[activity] WebSocket server mounted on /ws');
}

// Helper to start the event polling loop
export function startEventPolling(
  fetchSessions: () => Promise<any[]>,
  checkGateway: () => Promise<boolean>,
  intervalMs: number = 5000
) {
  console.log(`[activity] Starting event poller (every ${intervalMs}ms)`);
  setInterval(async () => {
    try {
      await activityBroadcaster.pollForChanges(fetchSessions, checkGateway);
    } catch (err) {
      console.error('[activity] Polling error:', err);
    }
  }, intervalMs);
}
