'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { RefreshCw, ChevronRight, ChevronDown, Clock, Edit2, Send, MessageSquare, Eye, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import SubagentProfileModal from '@/components/SubagentProfileModal';
import SparklineChart from '@/components/SparklineChart';

interface StatusHistoryItem {
  status: string;
  timestamp: number;
}

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

function getDisplayLabel(session: Session): string {
  if (session.labelOverride) return session.labelOverride;
  if (session.label) return session.label;
  return `Subagent ${session.sessionId.slice(0, 8)}`;
}

function getDescription(session: Session, trace?: TraceEvent[]): string {
  if (session.descriptionOverride) return session.descriptionOverride;
  const firstUser = trace?.find(ev => ev.role === 'user' && typeof ev.content === 'string' && ev.content.trim().length > 0);
  if (firstUser) {
    const content = firstUser.content.trim();
    return content.length > 150 ? content.slice(0, 150) + '…' : content;
  }
  return '';
}

function getStatusTooltip(history: StatusHistoryItem[], currentActive: boolean): string {
  const lines: string[] = [];
  if (currentActive) {
    lines.push('Currently: Running');
  } else {
    lines.push('Currently: Completed');
  }
  if (history.length > 0) {
    lines.push('');
    lines.push('Recent changes:');
    history.forEach(h => {
      const date = new Date(h.timestamp);
      lines.push(`  • ${h.status} (${date.toLocaleString()})`);
    });
  }
  return lines.join('\n');
}

export default function SubagentMonitor() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletingActions, setDeletingActions] = useState<Record<string, { action: string }>>({});
  const [undoQueue, setUndoQueue] = useState<Array<{ keys: string[]; action: string }>>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceEvent[]>>({});
  const [loadingTrace, setLoadingTrace] = useState<Record<string, boolean>>({});
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const [statusHistories, setStatusHistories] = useState<Record<string, StatusHistoryItem[]>>({});
  const loadedHistoriesRef = useRef<Set<string>>(new Set());

  // Profile modal
  const [profileSession, setProfileSession] = useState<Session | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Bulk action confirmation
  const [bulkActionState, setBulkActionState] = useState<{ open: boolean; action: string | null }>({ open: false, action: null });

  // Undo snackbar
  const [undoSnackbar, setUndoSnackbar] = useState<{ show: boolean; action: string; keys: string[] }>({ show: false, action: '', keys: [] });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/active');
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      const raw: any[] = Array.isArray(data.sessions) ? data.sessions : [];
      // Filter to subagents only (kind === 'subagent' or key includes subagent)
      const subagents: Session[] = raw.filter((s: any): s is Session => s.key.includes(':subagent:') || s.metadata?.kind === 'subagent');
      setSessions(subagents);
      setError(null);

      // Load status histories for any new subagents we haven't loaded yet
      const newKeys = subagents.filter((s: Session) => !loadedHistoriesRef.current.has(s.key)).map(s => s.key);
      if (newKeys.length > 0) {
        const histories = await Promise.all(
          newKeys.map(async (key: string) => {
            try {
              const res = await fetch(`/api/subagents/${encodeURIComponent(key)}/status-history`);
              if (!res.ok) return { key, history: [] as StatusHistoryItem[] };
              const data = await res.json();
              return { key, history: data.history || [] };
            } catch {
              return { key, history: [] as StatusHistoryItem[] };
            }
          })
        );
        setStatusHistories(prev => {
          const next = { ...prev };
          for (const h of histories) {
            next[h.key] = h.history;
          }
          return next;
        });
        newKeys.forEach((k: string) => loadedHistoriesRef.current.add(k));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const fetchTrace = async (key: string) => {
    if (traces[key]) return;
    setLoadingTrace(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/trace?sessionKey=${encodeURIComponent(key)}&limit=20`);
      const data = await res.json();
      const traceEvents = Array.isArray(data) ? data : [];
      setTraces(prev => ({ ...prev, [key]: traceEvents }));

      // Auto-generate label from first user message if none exists (from server)
      const currentSession = sessions.find(s => s.key === key);
      if (currentSession && !currentSession.labelOverride && !currentSession.label) {
        const firstUser = traceEvents.find((ev: any) => ev.role === 'user' && typeof ev.content === 'string' && ev.content.trim().length > 0);
        if (firstUser) {
          const content = firstUser.content.trim();
          const autoLabel = content.length > 40 ? content.slice(0, 40) + '…' : content;
          const autoDesc = content.length > 150 ? content.slice(0, 150) + '…' : content;
          fetch('/api/subagents/labels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionKey: key, label: autoLabel, description: autoDesc }),
          }).catch(console.error).finally(() => {
            // Refresh sessions to pick up new label
            fetchSessions();
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch trace:', err);
      setTraces(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingTrace(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleSelect = (key: string) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
  };

  const selectAll = () => {
    if (selectedKeys.size === sessions.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(sessions.map(s => s.key)));
    }
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const performBulkAction = async (action: string) => {
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) return;
    setBulkActionState({ open: false, action: null });
    try {
      const res = await fetch('/api/subagents/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKeys: keys, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed');
      }
      // Record for undo
      setUndoQueue(prev => [...prev, { keys, action }]);
      setUndoSnackbar({ show: true, action, keys });
      clearSelection();
      // Refresh list
      fetchSessions();
    } catch (err: any) {
      alert(`Failed to perform action: ${err.message}`);
    }
  };

  const undoLastAction = () => {
    if (undoQueue.length === 0) return;
    const last = undoQueue[undoQueue.length - 1];
    fetch('/api/subagents/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKeys: last.keys }),
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setUndoQueue(prev => prev.slice(0, -1));
        setUndoSnackbar(prev => ({ ...prev, show: false }));
        fetchSessions();
      } else {
        alert('Undo failed');
      }
    }).catch(err => {
      alert(`Undo failed: ${err.message}`);
    });
  };

  const openProfile = (session: Session) => {
    setProfileSession(session);
    setProfileOpen(true);
  };

  const handleLabelSaved = () => {
    // Refresh sessions to get updated label overrides
    fetchSessions();
  };

  const toggleExpand = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
    if (expandedKey !== key) {
      fetchTrace(key);
    }
  };

  // Send message
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
      // Append to trace
      const newEvent: TraceEvent = {
        role: 'user',
        content: sendMessage,
        timestamp: new Date().toISOString(),
      };
      setTraces(prev => ({ ...prev, [session.key]: [...(prev[session.key] || []), newEvent] }));
      setTimeout(() => {
        setSendStatus(prev => ({ ...prev, [session.key]: 'idle' }));
        setSendingKey(null);
      }, 1000);
    } catch (err) {
      console.error('Send failed:', err);
      setSendStatus(prev => ({ ...prev, [session.key]: 'error' }));
    }
  };

  // Helper to get status history tooltip content (last 10)
  const getStatusHistory = async (key: string): Promise<StatusHistoryItem[]> => {
    try {
      const res = await fetch(`/api/v1/subagents/${encodeURIComponent(key)}/status-history`);
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  };

  return (
    <Panel className="relative">
      {/* Bulk action bar */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-card border border-border/40 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-4 animate-slide-up">
          <span className="text-sm text-fg font-medium">{selectedKeys.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkActionState({ open: true, action: 'stop' })}>Stop</Button>
            <Button variant="outline" size="sm" onClick={() => setBulkActionState({ open: true, action: 'restart' })}>Restart</Button>
            <Button variant="outline" size="sm" onClick={() => setBulkActionState({ open: true, action: 'kill' })}>Kill</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={clearSelection}>Cancel</Button>
        </div>
      )}

      {/* Undo snackbar */}
      {undoSnackbar.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900/90 border border-emerald-500/30 text-emerald-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <div>
            <p className="text-sm font-medium">{undoSnackbar.action} {undoSnackbar.keys.length} subagent(s)</p>
            <p className="text-xs text-emerald-200/70">Action completed</p>
          </div>
          <Button variant="ghost" size="sm" className="text-emerald-100 hover:text-white" onClick={undoLastAction}>Undo</Button>
          <Button variant="ghost" size="sm" className="text-emerald-100/70 hover:text-white" onClick={() => setUndoSnackbar(prev => ({ ...prev, show: false }))}>Dismiss</Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">Subagent Monitor</h3>
          <p className="text-xs text-muted mt-0.5">
            {sessions.length} subagent{sessions.length !== 1 ? 's' : ''} (last 60m) · auto-refresh 10s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading} className="gap-2">
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
                <th className="pb-3 font-medium w-10 text-center">
                  <button onClick={selectAll} className="focus:outline-none">
                    {selectedKeys.size === sessions.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
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
                const displayLabel = getDisplayLabel(session);
                const isExpanded = expandedKey === session.key;
                const isSelected = selectedKeys.has(session.key);
                return (
                  <Fragment key={session.key}>
                    <tr
                      data-key={session.key}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-accent/5',
                        isExpanded && 'bg-accent/10',
                        isSelected && 'bg-accent/20'
                      )}
                      onClick={() => toggleExpand(session.key)}
                    >
                      <td className="py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(session.key)} className="focus:outline-none">
                          {isSelected ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="py-3 font-mono text-accent">
                        {session.sessionId.slice(0, 8)}…
                      </td>
                      <td className="py-3 text-fg max-w-xs truncate" title={displayLabel}>
                        {displayLabel}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            session.active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          )}
                          title={getStatusTooltip(statusHistories[session.key] || [], session.active)}
                        >
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
                          onClick={(e) => { e.stopPropagation(); openProfile(session); }}
                          title="View Profile"
                        >
                          <Eye size={14} />
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
                        <td colSpan={10} className="p-0 bg-bg">
                          <div className="p-4 border-t border-border/30">
                            <div className="space-y-4">
                              {/* Description */}
                              <div>
                                <h4 className="text-sm font-medium text-fg mb-1">Purpose</h4>
                                <p className="text-sm text-muted italic">
                                  {getDescription(session, traces[session.key]) || 'No description set.'}
                                </p>
                              </div>

                              {/* Resource Usage - view in profile */}
                              <div>
                                <h4 className="text-sm font-medium text-fg mb-2">Resource Usage</h4>
                                <div className="h-20 bg-bg/50 rounded border border-border/20 p-2 flex items-center justify-center text-sm text-muted">
                                  Open profile for detailed metrics chart
                                </div>
                              </div>

                              {/* Recent Messages */}
                              <div>
                                <h4 className="text-sm font-medium text-fg mb-3">Recent Messages</h4>
                                {loadingTrace[session.key] ? (
                                  <div className="text-sm text-muted">Loading trace…</div>
                                ) : traces[session.key]?.length === 0 ? (
                                  <div className="text-sm text-muted">No messages</div>
                                ) : (
                                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
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
                                        <p className="text-fg line-clamp-4 leading-relaxed whitespace-pre-wrap break-words">
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

      {/* Profile Modal */}
      <SubagentProfileModal
        session={profileSession}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLabelSaved={handleLabelSaved}
      />

      {/* Bulk action confirmation modal */}
      {bulkActionState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setBulkActionState({ open: false, action: null })}>
          <div className="bg-surface-card border border-border/30 rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-fg mb-2">Confirm Action</h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to <span className="text-accent font-medium">{bulkActionState.action}</span> {selectedKeys.size} selected subagent{selectedKeys.size !== 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkActionState({ open: false, action: null })}>Cancel</Button>
              <Button variant="default" onClick={() => performBulkAction(bulkActionState.action!)}>
                {bulkActionState.action === 'stop' ? 'Stop' : bulkActionState.action === 'restart' ? 'Restart' : 'Kill'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
