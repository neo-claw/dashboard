'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Edit2, Save, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Modal from './Modal';
import SparklineChart from './SparklineChart';
import { Button } from './ui/button';

interface Session {
  key: string;
  sessionId: string;
  agentId: string;
  active: boolean;
  lastHeartbeat: string;
  lastActivity: string;
  createdAt: string;
  durationSec: number;
  label?: string;
  labelOverride?: string;
  descriptionOverride?: string;
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

interface MetricsData {
  metrics: Array<{ timestamp: string; cpu: number; memory: number }>;
  current: { cpu: number; memory: number };
}

interface StatusHistoryItem {
  status: string;
  timestamp: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

interface SubagentProfileModalProps {
  session: Session | null;
  open: boolean;
  onClose: () => void;
  onLabelSaved?: () => void;
}

export default function SubagentProfileModal({ session, open, onClose, onLabelSaved }: SubagentProfileModalProps) {
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = useCallback(async () => {
    if (!session) return;
    setLoadingTrace(true);
    try {
      const res = await fetch(`/api/trace?sessionKey=${encodeURIComponent(session.key)}&limit=50`);
      const data = await res.json();
      setTrace(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch trace:', err);
      setTrace([]);
    } finally {
      setLoadingTrace(false);
    }
  }, [session]);

  const fetchMetrics = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/subagents/${encodeURIComponent(session.key)}/metrics`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMetrics(data as MetricsData);
    } catch {
      setMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  }, [session]);

  const fetchStatusHistory = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/subagents/${encodeURIComponent(session.key)}/status-history`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStatusHistory(data.history || []);
    } catch {
      setStatusHistory([]);
    }
  }, [session]);

  // Initial fetch and set up interval for metrics and history updates
  useEffect(() => {
    if (!open || !session) return;

    // Initial loads
    fetchTrace();
    fetchMetrics();
    fetchStatusHistory();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchStatusHistory();
    }, 5000); // update every 5s

    return () => clearInterval(interval);
  }, [open, session, fetchTrace, fetchMetrics, fetchStatusHistory]);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (editing && session) {
      setEditLabel(session.labelOverride || session.label || '');
      setEditDesc(session.descriptionOverride || '');
    }
  }, [editing, session]);

  if (!session) return null;

  const displayLabel = session.labelOverride || session.label || `Subagent ${session.sessionId.slice(0, 8)}`;

  const handleSaveLabel = async () => {
    if (!session) return;
    setSavingLabel(true);
    try {
      const res = await fetch('/api/subagents/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: session.key, label: editLabel, description: editDesc }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setEditing(false);
      onLabelSaved?.();
    } catch (err) {
      setError('Failed to save label');
    } finally {
      setSavingLabel(false);
    }
  };

  const validateLabel = (label: string) => {
    if (label.length === 0) return 'Label is required';
    if (label.length > 50) return 'Maximum 50 characters';
    if (/[\n\r]/.test(label)) return 'No line breaks allowed';
    if (/[<>]/.test(label)) return 'Cannot contain < or >';
    return null;
  };

  const now = Date.now();
  const lastHbMs = new Date(session.lastHeartbeat).getTime();
  const lastHbSec = Math.floor((now - lastHbMs) / 1000);

  return (
    <Modal open={open} onClose={onClose} title={`Profile: ${displayLabel}`} size="xl">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg/50 p-3 rounded-lg border border-border/30">
            <p className="text-xs text-muted mb-1">Status</p>
            <p className={cn('text-sm font-medium', session.active ? 'text-emerald-400' : 'text-gray-400')}>
              {session.active ? 'Running' : 'Completed'}
            </p>
          </div>
          <div className="bg-bg/50 p-3 rounded-lg border border-border/30">
            <p className="text-xs text-muted mb-1">Age</p>
            <p className="text-sm font-mono text-fg">{formatDuration(session.durationSec)}</p>
          </div>
          <div className="bg-bg/50 p-3 rounded-lg border border-border/30">
            <p className="text-xs text-muted mb-1">Last heartbeat</p>
            <p className="text-sm font-mono text-fg">{lastHbSec}s ago</p>
          </div>
          <div className="bg-bg/50 p-3 rounded-lg border border-border/30">
            <p className="text-xs text-muted mb-1">Tokens</p>
            <p className="text-sm font-mono text-fg">
              {((session.metadata.totalTokens ?? (session.metadata.inputTokens ?? 0) + (session.metadata.outputTokens ?? 0)) || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {loadingMetrics ? (
          <div className="h-24 flex items-center justify-center text-muted text-sm">Loading metrics…</div>
        ) : metrics ? (
          <div className="bg-bg/30 p-4 rounded-lg border border-border/30">
            <h4 className="text-sm font-medium text-muted mb-2">Resource Usage (last 2.5 min)</h4>
            <div className="flex items-end gap-4 text-xs text-muted mb-2">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-accent"></span> CPU %
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Memory MB
              </div>
              <div className="ml-auto">
                Current: CPU {metrics.current.cpu.toFixed(1)}% · Mem {metrics.current.memory} MB
              </div>
            </div>
            <SparklineChart data={metrics.metrics} width={600} height={120} strokeWidth={2} className="w-full" />
          </div>
        ) : null}

        <div className="bg-bg/30 p-4 rounded-lg border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-fg">Purpose</h4>
            {!editing ? (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditing(true)}>
                <Edit2 size={12} /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}><X size={12} /></Button>
                <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveLabel} disabled={savingLabel}>
                  <Save size={12} /> {savingLabel ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted block mb-1">Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="w-full p-2 text-sm rounded border border-border bg-bg text-fg"
                  placeholder="Enter label..."
                />
                {validateLabel(editLabel) && (
                  <p className="text-xs text-red-400 mt-1">{validateLabel(editLabel)}</p>
                )}
                <p className="text-[10px] text-muted mt-0.5">{editLabel.length}/50</p>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full p-2 text-sm rounded border border-border bg-bg text-fg"
                  rows={3}
                  placeholder="Describe this subagent's purpose..."
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted italic">
              {session.descriptionOverride || (trace[0]?.role === 'user' ? String(trace[0].content).slice(0, 150) : 'No description set.')}
            </p>
          )}
        </div>

        <div className="bg-bg/30 p-4 rounded-lg border border-border/30">
          <h4 className="text-sm font-medium text-fg mb-2">Status History (last 10)</h4>
          {statusHistory.length === 0 ? (
            <p className="text-sm text-muted">No status changes recorded.</p>
          ) : (
            <ul className="space-y-2">
              {statusHistory.map((h, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className={cn(
                    'px-2 py-0.5 rounded font-mono',
                    h.status === 'stopped' ? 'bg-red-500/20 text-red-300' :
                    h.status === 'restarted' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-accent/20 text-accent'
                  )}>
                    {h.status}
                  </span>
                  <span className="text-muted font-mono">
                    {new Date(h.timestamp).toLocaleString()} ({formatDuration(Math.floor((now - h.timestamp) / 1000))} ago)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-fg mb-3">Full Conversation</h4>
          {loadingTrace ? (
            <div className="text-center py-4 text-muted text-sm">Loading trace…</div>
          ) : trace.length === 0 ? (
            <div className="text-center py-4 text-muted text-sm">No messages yet.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {trace.map((ev, idx) => (
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
                  <p className="text-fg line-clamp-4 leading-relaxed whitespace-pre-wrap break-words">
                    {typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content).slice(0, 500)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-fg mb-2">Configuration</h4>
          <pre className="text-xs p-3 bg-bg border border-border/30 rounded-lg overflow-x-auto text-fg font-mono">
            {JSON.stringify({
              sessionKey: session.key,
              sessionId: session.sessionId,
              agentId: session.agentId,
              model: session.metadata.model,
              kind: session.metadata.kind,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
