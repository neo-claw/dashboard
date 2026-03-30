'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

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

interface TraceEvent {
  role: string;
  content: string;
  tool?: string;
  timestamp?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function computeEstimatedCost(session: Session): string {
  const totalTokens = session.metadata.totalTokens ?? (session.metadata.inputTokens ?? 0) + (session.metadata.outputTokens ?? 0);
  if (totalTokens === 0) return '$0.00';
  // Rough estimate: $0.002 per 1K tokens (adjust based on your model pricing)
  const cost = (totalTokens / 1000) * 0.002;
  return `$${cost.toFixed(4)}`;
}

export default function SubagentMonitor() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceEvent[]>>({});
  const [loadingTrace, setLoadingTrace] = useState<Record<string, boolean>>({});

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/active');
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      // Filter to subagents and recent activity (within the last hour)
      const raw = Array.isArray(data.sessions) ? data.sessions : [];
      // Identify subagents by session key pattern (contains ':subagent:') or metadata.kind === 'subagent'
      const subagents = raw.filter((s: Session) => s.key.includes(':subagent:') || s.metadata.kind === 'subagent');
      const recent = subagents.filter((s: Session) => s.durationSec <= 3600);
      setSessions(recent);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const fetchTrace = async (key: string) => {
    if (traces[key]) return; // already loaded
    setLoadingTrace(prev => ({ ...prev, [key]: true }));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
      const res = await fetch(`${baseUrl}/api/v1/trace?sessionKey=${encodeURIComponent(key)}&limit=20`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      setTraces(prev => ({ ...prev, [key]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error('Failed to fetch trace:', err);
      setTraces(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingTrace(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleExpand = (key: string) => {
    if (expandedKey === key) {
      setExpandedKey(null);
    } else {
      setExpandedKey(key);
      if (!traces[key]) {
        fetchTrace(key);
      }
    }
  };

  const manualRefresh = () => {
    if (loading) return;
    setLoading(true);
    fetchSessions();
  };

  return (
    <Panel className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">Subagent Monitor</h3>
          <p className="text-xs text-muted mt-0.5">
            {sessions.length} subagent{sessions.length !== 1 ? 's' : ''} (last 60m) · auto-refresh 30s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={manualRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-4">
          Error loading sessions: {error}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="text-center py-8 text-muted">Loading subagents…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-muted">No subagent activity in the last hour.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-muted border-b border-border/30">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Label</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Age</th>
                <th className="pb-3 font-medium">Model</th>
                <th className="pb-3 font-medium">Tokens</th>
                <th className="pb-3 font-medium">Cost</th>
                <th className="pb-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {sessions.map(session => {
                const totalTokens = session.metadata.totalTokens ?? (session.metadata.inputTokens ?? 0) + (session.metadata.outputTokens ?? 0);
                const cost = computeEstimatedCost(session);
                const isExpanded = expandedKey === session.key;
                return (
                  <Fragment key={session.key}>
                    <tr
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-accent/5',
                        isExpanded && 'bg-accent/10'
                      )}
                      onClick={() => toggleExpand(session.key)}
                    >
                      <td className="py-3 font-mono text-accent">
                        {session.sessionId.slice(0, 8)}…
                      </td>
                      <td className="py-3 text-fg">{session.agentId}</td>
                      <td className="py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          session.active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        )}>
                          {session.active ? 'Running' : 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 text-muted flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(session.durationSec)}
                      </td>
                      <td className="py-3 text-muted font-mono text-xs">
                        {session.metadata.model ? session.metadata.model.split('/').pop() : '—'}
                      </td>
                      <td className="py-3 text-muted font-mono">
                        {totalTokens.toLocaleString()}
                      </td>
                      <td className="py-3 text-muted font-mono">
                        {cost}
                      </td>
                      <td className="py-3 text-right">
                        {isExpanded ? <ChevronDown size={16} className="text-accent" /> : <ChevronRight size={16} className="text-muted" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0 bg-bg">
                          <div className="p-4 border-t border-border/30">
                            <h4 className="text-sm font-medium text-fg mb-3">Recent Messages</h4>
                            {loadingTrace[session.key] ? (
                              <div className="text-sm text-muted">Loading trace…</div>
                            ) : traces[session.key]?.length === 0 ? (
                              <div className="text-sm text-muted">No messages</div>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {traces[session.key]?.map((ev, idx) => (
                                  <div key={idx} className="text-xs p-3 bg-bg border border-border/30 rounded-lg font-mono">
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
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
