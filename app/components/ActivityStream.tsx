'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, X, Pause, Play, Filter, Clock, AlertCircle, CheckCircle, XCircle, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActivityEvent {
  id: string;
  type: 'subagent_start' | 'subagent_stop' | 'cron_start' | 'cron_complete' | 'cron_fail' | 'config_change' | 'gateway_connected' | 'gateway_disconnected' | 'system_health' | 'info' | 'error' | 'warning';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  read: boolean;
}

const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  subagent_start: { label: 'Subagent Start', icon: <Play size={12} />, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  subagent_stop: { label: 'Subagent Stop', icon: <CheckCircle size={12} />, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  cron_start: { label: 'Cron Start', icon: <Play size={12} />, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  cron_complete: { label: 'Cron Complete', icon: <CheckCircle size={12} />, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  cron_fail: { label: 'Cron Failed', icon: <XCircle size={12} />, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  config_change: { label: 'Config Change', icon: <AlertCircle size={12} />, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  gateway_connected: { label: 'Gateway Up', icon: <CheckCircle size={12} />, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  gateway_disconnected: { label: 'Gateway Down', icon: <XCircle size={12} />, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  system_health: { label: 'Health', icon: <Activity size={12} />, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  info: { label: 'Info', icon: <Info size={12} />, color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  warning: { label: 'Warning', icon: <AlertCircle size={12} />, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  error: { label: 'Error', icon: <XCircle size={12} />, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };

export default function ActivityStream() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filters, setFilters] = useState<{ type: string[]; severity: string[] }>({
    type: [],
    severity: [],
  });
  const [filterPresets, setFilterPresets] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load filter presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('activity-filter-presets');
      if (saved) setFilterPresets(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Save presets
  const savePreset = useCallback(() => {
    const name = prompt('Preset name:');
    if (!name) return;
    const newPreset = btoa(JSON.stringify(filters));
    setFilterPresets(prev => {
      const updated = [...prev, name];
      localStorage.setItem('activity-filter-presets', JSON.stringify(updated));
      return updated;
    });
  }, [filters]);

  const loadPreset = useCallback((index: number) => {
    if (index < 0 || index >= filterPresets.length) return;
    try {
      const presetStr = filterPresets[index];
      const decoded = JSON.parse(atob(presetStr));
      setFilters(decoded);
    } catch (e) {}
  }, [filterPresets]);

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws';
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[activity] WS connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            setEvents(data.events);
          } else if (data.type === 'event') {
            setEvents(prev => {
              if (prev.some(e => e.id === data.event.id)) return prev;
              return [...prev, data.event];
            });
          }
        } catch (e) {
          console.error('[activity] Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        console.log('[activity] WS disconnected');
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[activity] WS error', err);
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (!paused && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, paused]);

  // Mark events as read when they come into view (simple: after 3 seconds)
  useEffect(() => {
    if (events.length === 0) return;
    const timer = setTimeout(() => {
      const newReadIds = events.filter(e => !e.read).slice(-10).map(e => e.id);
      if (newReadIds.length > 0) {
        fetch('/api/v1/activity/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventIds: newReadIds }),
        }).catch(() => {});
        setEvents(prev => prev.map(e => (newReadIds.includes(e.id) ? { ...e, read: true } : e)));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [events]);

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filters.type.length > 0 && !filters.type.includes(e.type)) return false;
    if (filters.severity.length > 0 && !filters.severity.includes(e.severity)) return false;
    return true;
  });

  const unreadCount = events.filter(e => !e.read).length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearRead = async () => {
    await fetch('/api/v1/activity/clear-read', { method: 'POST' });
    setEvents(prev => prev.filter(e => !e.read));
  };

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type.includes(type) ? prev.type.filter(t => t !== type) : [...prev.type, type],
    }));
  };

  const toggleSeverity = (severity: string) => {
    setFilters(prev => ({
      ...prev,
      severity: prev.severity.includes(severity) ? prev.severity.filter(s => s !== severity) : [...prev.severity, severity],
    }));
  };

  return (
    <Panel className="relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
            <Activity size={18} className={cn(connected && 'text-emerald-400')} />
            Activity Stream
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPaused(p => !p)} title={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} title="Filters">
            <Filter size={16} />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClearRead} title="Clear read events">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {!connected && (
        <div className="text-xs text-muted mb-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Reconnecting...
        </div>
      )}

      {showFilters && (
        <div className="mb-4 p-4 rounded-lg border bg-bg/50">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Event Types</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeLabels).map(([key, { label, color }]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={cn(
                      'cursor-pointer border',
                      filters.type.includes(key) ? color : 'opacity-50',
                      'hover:opacity-100'
                    )}
                    onClick={() => toggleType(key)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Severity</h4>
              <div className="flex gap-2">
                {['error', 'warning', 'info'].map(s => (
                  <Badge
                    key={s}
                    variant="outline"
                    className={cn(
                      'cursor-pointer',
                      filters.severity.includes(s) ? (s === 'error' ? 'bg-red-500/20 text-red-300' : s === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300') : '',
                      'hover:opacity-100'
                    )}
                    onClick={() => toggleSeverity(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
            {filterPresets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Presets</h4>
                <div className="flex flex-wrap gap-2">
                  {filterPresets.map((name, idx) => (
                    <Button key={name} size="sm" variant="outline" onClick={() => loadPreset(idx)}>
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button size="sm" onClick={savePreset} className="w-full">
              Save Current as Preset
            </Button>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">No events match current filters</div>
        ) : (
          filteredEvents.slice(-200).reverse().map(ev => (
            <div
              key={ev.id}
              data-testid="activity-item"
              data-event-type={ev.type}
              className={cn(
                'p-3 rounded-lg border transition-all',
                ev.read ? 'bg-bg/50 border-border/20 opacity-70' : 'bg-accent/5 border-border/40',
                expandedId === ev.id && 'ring-1 ring-accent/30'
              )}
              onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('mt-0.5 p-1 rounded border', typeLabels[ev.type]?.color || 'bg-gray-500/20')}>
                    {typeLabels[ev.type]?.icon || <Info size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-fg truncate">{ev.title}</h4>
                      <Badge variant="outline" className={cn('text-[10px] uppercase font-mono', typeLabels[ev.type]?.color)}>
                        {ev.type}
                      </Badge>
                      {!ev.read && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" title="Unread" />}
                    </div>
                    {ev.description && <p className="text-xs text-muted mt-1 line-clamp-2">{ev.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted font-mono">
                      <span className="flex items-center gap-1"><Clock size={10} />{formatTime(ev.timestamp)}</span>
                      {ev.metadata?.agentId && <span>agent: {ev.metadata.agentId.slice(0, 8)}</span>}
                      {ev.metadata?.durationSec && <span>{ev.metadata.durationSec}s</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  {expandedId === ev.id ? <X size={12} /> : <Filter size={12} />}
                </Button>
              </div>

              {expandedId === ev.id && ev.metadata && (
                <div className="mt-3 pt-3 border-t border-border/20">
                  <h5 className="text-xs font-mono text-muted mb-2">Metadata</h5>
                  <pre className="text-xs bg-bg/50 p-2 rounded overflow-x-auto font-mono text-fg">
                    {JSON.stringify(ev.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
