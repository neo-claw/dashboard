'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Clock, Edit2, Send, MessageSquare } from 'lucide-react';
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

interface LabelOverride {
  label: string;
  description: string;
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
  const cost = (totalTokens / 1000) * 0.002;
  return `$${cost.toFixed(4)}`;
}

function getDefaultLabel(session: Session): string {
  // For subagents, use a readable default
  if (session.key.includes(':subagent:')) {
    return `Subagent ${session.sessionId.slice(0, 8)}`;
  }
  // Fallback to agentId or sessionId
  return session.agentId || `Session ${session.sessionId.slice(0, 8)}`;
}

export default function SubagentMonitor() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceEvent[]>>({});
  const [loadingTrace, setLoadingTrace] = useState<Record<string, boolean>>({});

  // Label management
  const [labels, setLabels] = useState<Record<string, LabelOverride>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; description: string }>({ label: '', description: '' });

  // Send message management
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});

  // Load label overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('subagent_labels');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLabels(parsed);
      }
    } catch (e) {
      console.error('Failed to load subagent labels', e);
    }
  }, []);

  const saveLabels = (newLabels: Record<string, LabelOverride>) => {
    setLabels(newLabels);
    try {
      localStorage.setItem('subagent_labels', JSON.stringify(newLabels));
    } catch (e) {
      console.error('Failed to save subagent labels', e);
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/active');
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      const raw = Array.isArray(data.sessions) ? data.sessions : [];
      // Identify subagents by session key pattern or metadata.kind === 'subagent'
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
    const interval = setInterval(fetchSessions, 10000); // 10s as requested
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const fetchTrace = async (key: string) => {
    if (traces[key]) return; // already loaded
    setLoadingTrace(prev => ({ ...prev, [key]: true }));
    try {
      // Use the Next.js API proxy route
      const res = await fetch(`/api/trace?sessionKey=${encodeURIComponent(key)}&limit=20`);
      const data = await res.json();
      const traceEvents = Array.isArray(data) ? data : [];
      setTraces(prev => ({ ...prev, [key]: traceEvents }));

      // Auto-generate label and description from first user message if none exists
      setLabels(prev => {
        if (prev[key]) return prev; // already has custom label
        const firstUser = traceEvents.find(ev => ev.role === 'user' && typeof ev.content === 'string' && ev.content.trim().length > 0);
        if (firstUser) {
          const content = firstUser.content.trim();
          const autoLabel = content.length > 40 ? content.slice(0, 40) + '…' : content;
          const autoDesc = content.length > 150 ? content.slice(0, 150) + '…' : content;
          const newEntry = { label: autoLabel, description: autoDesc };
          const newLabels = { ...prev, [key]: newEntry };
          try {
            localStorage.setItem('subagent_labels', JSON.stringify(newLabels));
          } catch (e) {
            console.error('Failed to save auto-label', e);
          }
          return newLabels;
        }
        return prev;
      });
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

  // Editing
  const startEdit = (session: Session) => {
    setEditingKey(session.key);
    setEditForm({
      label: labels[session.key]?.label || getDefaultLabel(session),
      description: labels[session.key]?.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditForm({ label: '', description: '' });
  };

  const saveEdit = (key: string) => {
    const newLabels = { ...labels, [key]: { label: editForm.label, description: editForm.description } };
    saveLabels(newLabels);
    setEditingKey(null);
  };

  // Sending messages
  const startSend = (key: string) => {
    setSendingKey(key);
    setSendMessage('');
    setSendStatus(prev => ({ ...prev, [key]: 'idle' }));
  };

  const cancelSend = () => {
    setSendingKey(null);
    setSendMessage('');
  };

  const handleSend = async (session: Session) => {
    if (!sendMessage.trim()) return;
    setSendStatus(prev => ({ ...prev, [session.key]: 'sending' }));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sendMessage, sessionKey: session.key }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSendStatus(prev => ({ ...prev, [session.key]: 'sent' }));
      setSendMessage('');
      // Optionally refresh trace to see new messages
      if (traces[session.key]) {
        // Append the sent message as a user role to trace state for immediate display
        const newEvent: TraceEvent = {
          role: 'user',
          content: sendMessage,
          timestamp: new Date().toISOString(),
        };
        setTraces(prev => ({ ...prev, [session.key]: [...(prev[session.key] || []), newEvent] }));
      } else {
        // If trace not loaded yet, fetch it to include new message
        fetchTrace(session.key);
      }
      setTimeout(() => {
        setSendStatus(prev => ({ ...prev, [session.key]: 'idle' }));
        setSendingKey(null);
      }, 1000);
    } catch (err) {
      console.error('Send failed:', err);
      setSendStatus(prev => ({ ...prev, [session.key]: 'error' }));
    }
  };

  const manualRefresh = () => {
    if (loading) return;
    setLoading(true);
    fetchSessions();
  };

  // Get display label for a session
  const getLabel = (session: Session): string => {
    const override = labels[session.key];
    if (override?.label) return override.label;
    return getDefaultLabel(session);
  };

  // Get description for expanded view
  const getDescription = (session: Session): string => {
    const override = labels[session.key];
    if (override?.description) return override.description;
    // Try to derive from trace: first user message
    const trace = traces[session.key];
    if (trace) {
      const firstUser = trace.find(ev => ev.role === 'user');
      if (firstUser && typeof firstUser.content === 'string') {
        return firstUser.content.slice(0, 150);
      }
    }
    return '';
  };

  return (
    <Panel className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">Subagent Monitor</h3>
          <p className="text-xs text-muted mt-0.5">
            {sessions.length} subagent{sessions.length !== 1 ? 's' : ''} (last 60m) · auto-refresh 10s
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
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {sessions.map(session => {
                const totalTokens = session.metadata.totalTokens ?? (session.metadata.inputTokens ?? 0) + (session.metadata.outputTokens ?? 0);
                const cost = computeEstimatedCost(session);
                const isExpanded = expandedKey === session.key;
                const displayLabel = getLabel(session);
                const description = getDescription(session);
                return (
                  <Fragment key={session.key}>
                    <tr
                      data-key={session.key}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-accent/5',
                        isExpanded && 'bg-accent/10'
                      )}
                      onClick={() => toggleExpand(session.key)}
                    >
                      <td className="py-3 font-mono text-accent">
                        {session.sessionId.slice(0, 8)}…
                      </td>
                      <td className="py-3 text-fg max-w-xs truncate" title={displayLabel}>
                        {displayLabel}
                      </td>
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
                      <td className="py-3 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); startEdit(session); }}
                          title="Edit label/description"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); startSend(session.key); }}
                          title="Send message"
                        >
                          <Send size={14} />
                        </Button>
                        {isExpanded ? <ChevronDown size={16} className="text-accent" /> : <ChevronRight size={16} className="text-muted" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0 bg-bg">
                          <div className="p-4 border-t border-border/30">
                            <div className="space-y-4">
                              {/* Description and edit form */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium text-fg">Purpose</h4>
                                  {editingKey !== session.key && (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(session)}>
                                      <Edit2 size={12} /> Edit
                                    </Button>
                                  )}
                                </div>
                                {editingKey === session.key ? (
                                  <div className="space-y-2 bg-bg/50 p-3 rounded-lg border border-border/30">
                                    <div>
                                      <label className="text-xs text-muted block mb-1">Label</label>
                                      <input
                                        type="text"
                                        value={editForm.label}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                                        className="w-full p-2 text-sm rounded border border-border bg-bg text-fg"
                                        placeholder="Enter label..."
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted block mb-1">Description</label>
                                      <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-2 text-sm rounded border border-border bg-bg text-fg"
                                        rows={2}
                                        placeholder="Enter description of this subagent's purpose..."
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                                      <Button variant="default" size="sm" onClick={() => saveEdit(session.key)}>Save</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted italic">
                                    {description || 'No description set.'}
                                  </p>
                                )}
                              </div>

                              {/* Recent Messages */}
                              <div>
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

                              {/* Send message form */}
                              <div className="border-t pt-3">
                                <h4 className="text-sm font-medium text-fg mb-2">Send Message</h4>
                                {sendingKey === session.key ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={sendMessage}
                                      onChange={(e) => setSendMessage(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleSend(session)}
                                      placeholder="Enter message to send..."
                                      className="flex-1 p-2 text-sm rounded border border-border bg-bg text-fg"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSend(session)}
                                      disabled={sendStatus[session.key] === 'sending'}
                                    >
                                      {sendStatus[session.key] === 'sending' ? 'Sending...' : 'Send'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={cancelSend}>Cancel</Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => startSend(session.key)}
                                  >
                                    <MessageSquare size={14} /> Send Message
                                  </Button>
                                )}
                                {sendStatus[session.key] === 'error' && (
                                  <p className="text-xs text-red-400 mt-2">Failed to send message</p>
                                )}
                                {sendStatus[session.key] === 'sent' && (
                                  <p className="text-xs text-emerald-400 mt-2">Message sent</p>
                                )}
                              </div>
                            </div>
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
