'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Activity, Cpu, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
}

interface Session {
  key: string;
  agentId: string;
  active: boolean;
  durationSec: number;
}

export default function ControlCenterChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch sessions list once (no auto-refresh to keep it stable)
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
        if (!baseUrl || !apiKey) return;
        const res = await fetch(`${baseUrl}/api/v1/sessions/active`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        const list = (data.sessions || []).slice(0, 10).map((s: any) => ({
          key: s.key,
          agentId: s.agentId,
          active: s.active,
          durationSec: s.durationSec,
        }));
        setSessions(list);
        if (list.length > 0 && !selectedSession) {
          setSelectedSession(list[0]);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    fetchSessions();
  }, []);

  // Poll trace and merge into chat messages (deduped)
  useEffect(() => {
    if (!selectedSession) return;
    let mounted = true;
    const pollTrace = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
        const res = await fetch(`${baseUrl}/api/v1/trace?sessionKey=${encodeURIComponent(selectedSession.key)}&limit=50`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        if (!mounted) return;
        const events = Array.isArray(data) ? data : [];
        // Convert events to chat-style messages (only assistant/tool)
        const newMessages: Message[] = events
          .filter(ev => ev.role === 'assistant' || ev.tool)
          .map(ev => ({
            role: ev.tool ? 'tool' : 'assistant',
            content: typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content),
            timestamp: new Date(ev.timestamp || Date.now()),
          }));
        // Dedupe by content+timestamp (rough)
        setMessages(prev => {
          const combined = [...prev];
          for (const nm of newMessages) {
            const exists = combined.some(m => m.content === nm.content && Math.abs(m.timestamp.getTime() - nm.timestamp.getTime()) < 1000);
            if (!exists) combined.push(nm);
          }
          // Keep last 100 messages
          return combined.slice(-100);
        });
      } catch (err) {
        console.error('Trace poll failed:', err);
      }
    };
    pollTrace();
    const interval = setInterval(pollTrace, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedSession]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedSession) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
      const res = await fetch(`${baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ message: userMsg.content, sessionKey: selectedSession.key }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Error: ${data.error || 'Failed to send'}`,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Network error: ${err}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading sessions…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Session list */}
      <Panel className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="text-accent" size={22} />
          <h4 className="text-lg font-semibold text-fg">Sessions</h4>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1">
          {sessions.map(s => (
            <button
              key={s.key}
              onClick={() => setSelectedSession(s)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border transition-all',
                selectedSession?.key === s.key
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-transparent hover:border-accent/30 hover:bg-bg'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-accent">{s.agentId}</span>
                {s.active && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-muted font-mono">{s.key.split(':').pop()}</div>
            </button>
          ))}
        </div>
      </Panel>

      {/* Chat area */}
      <Panel className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-fg">{selectedSession?.agentId}</h4>
            <p className="text-xs text-muted font-mono">{selectedSession?.key}</p>
          </div>
          <div className="flex items-center gap-2 text-accent text-sm">
            <Activity size={16} className="animate-pulse" />
            Live
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl p-4',
                msg.role === 'user'
                  ? 'bg-accent/20 ml-auto border border-accent/30'
                  : msg.role === 'system'
                  ? 'bg-red-500/10 border border-red-500/30 mr-auto'
                  : 'bg-surface-card border border-border/50 mr-auto'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] text-muted mt-2 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          {loading && (
            <div className="bg-surface-card border border-border/50 rounded-2xl p-4 mr-auto max-w-[85%]">
              <p className="text-sm text-muted animate-pulse">Thinking...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="pt-4 border-t border-border">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Send a message..."
              rows={2}
              className="flex-1 bg-bg border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-shadow"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-5 py-2 bg-accent text-black font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end flex items-center justify-center"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}