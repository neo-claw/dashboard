'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';

interface Session {
  key: string;
  sessionId: string;
  agentId: string;
  active: boolean;
  lastHeartbeat: string;
  lastActivity: string;
  createdAt: string;
  durationSec: number;
  metadata: {
    model?: string;
    kind?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function SessionsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [trace, setTrace] = useState<any[]>([]);

  // Fetch sessions every 5 seconds
  useEffect(() => {
    let mounted = true;
    const fetchSessions = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
        if (!baseUrl || !apiKey) throw new Error('Backend URL or API key not configured');
        const res = await fetch(`${baseUrl}/api/v1/sessions/active`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        if (mounted) {
          setSessions(data.sessions || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch trace for selected session
  useEffect(() => {
    if (!selectedSession) return;
    let mounted = true;
    const fetchTrace = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
        if (!baseUrl || !apiKey) throw new Error('Backend URL or API key not configured');
        const res = await fetch(`${baseUrl}/api/v1/trace?sessionKey=${encodeURIComponent(selectedSession.key)}&limit=50`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        if (mounted) setTrace(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Trace fetch failed:', err);
      }
    };
    fetchTrace();
    const interval = setInterval(fetchTrace, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedSession]);

  const activeCount = sessions.filter(s => s.active).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-fg">Active Sessions</h3>
          <p className="text-sm text-muted mt-1">
            {activeCount} active / {sessions.length} total · auto-refresh 5s
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-accent">
          <Activity size={16} className="animate-pulse" />
          Live
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
          Error loading sessions: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted">No sessions found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions List */}
          <Panel>
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="text-accent" size={22} />
              <h4 className="text-lg font-semibold text-fg">Sessions</h4>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {sessions.map(s => (
                <div
                  key={s.key}
                  onClick={() => setSelectedSession(selectedSession?.key === s.key ? null : s)}
                  className={cn(
                    'p-4 border-l-2 transition-all cursor-pointer',
                    selectedSession?.key === s.key
                      ? 'border-accent bg-accent/5'
                      : 'border-transparent hover:border-accent/30 hover:bg-bg'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-accent truncate" title={s.key}>
                          {s.key.split(':').pop()}
                        </span>
                        {s.active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-muted font-mono">{s.agentId}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} /> {formatDuration(s.durationSec)}
                        </span>
                        {s.metadata.model && (
                          <span className="truncate" title={s.metadata.model}>{s.metadata.model.split('/').pop()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Trace Panel */}
          <Panel title="Trace">
            <div className="flex-1 overflow-y-auto max-h-[600px] space-y-2">
              {!selectedSession ? (
                <div className="text-center py-12 text-muted text-sm">
                  Select a session to view its trace
                </div>
              ) : trace.length === 0 ? (
                <div className="text-center py-12 text-muted text-sm">No trace events yet</div>
              ) : (
                trace.map((ev, i) => (
                  <div key={i} className="text-xs p-3 bg-bg border border-border/30 font-mono">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] uppercase font-mono',
                        ev.role === 'user' ? 'bg-blue-500/20 text-blue-300' :
                        ev.role === 'assistant' ? 'bg-accent/20 text-accent' :
                        ev.tool ? 'bg-purple-500/20 text-purple-300' :
                        'bg-gray-500/20 text-gray-300'
                      )}>
                        {ev.role}
                        {ev.tool && `·${ev.tool}`}
                      </span>
                      {ev.timestamp && (
                        <span className="text-[10px] text-muted font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-fg line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content).slice(0, 500)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}