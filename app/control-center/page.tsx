'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, MessageSquare, Activity, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ControlCenter() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Connected to OpenClaw. How can I help?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState(true);
  const [fullscreenChat, setFullscreenChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll trace every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/trace?sessionKey=main&limit=50');
        const data = await res.json();
        if (Array.isArray(data)) {
          setTrace(data.slice(0, 20));
        }
      } catch (err) {
        console.error('Trace poll failed:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Convert trace events to chat messages (avoid duplicates)
  useEffect(() => {
    const recentTrace = trace.slice(0, 5);
    for (const event of recentTrace) {
      if (event.role === 'assistant' && event.content) {
        const exists = messages.some(m => m.content === event.content);
        if (!exists) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: event.content,
            timestamp: new Date(event.timestamp || Date.now())
          }]);
        }
      }
    }
  }, [trace]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, sessionKey: 'main' }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Failed to send'}`,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Network error: ${err}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Mobile swipe to toggle trace (simple: tap button)
  const toggleTrace = () => setShowTrace(!showTrace);
  const toggleFullscreen = () => setFullscreenChat(!fullscreenChat);

  return (
    <div className="min-h-screen bg-bg flex relative">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-80 border-r border-border bg-surface-card p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center shadow-glow-sm">
            <MessageSquare className="text-bg" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-fg">Control Center</h1>
            <p className="text-xs text-muted">Live agent trace</p>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setShowTrace(true)}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              showTrace
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-muted hover:bg-surface-hover hover:text-fg'
            )}
          >
            <Activity size={16} className="inline mr-2" />
            Trace
          </button>
          <button
            onClick={() => setShowTrace(false)}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              !showTrace
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-muted hover:bg-surface-hover hover:text-fg'
            )}
          >
            <Terminal size={16} className="inline mr-2" />
            Files
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="text-xs text-muted">
            <p className="mb-1">Connected to</p>
            <code className="bg-bg px-1.5 py-0.5 rounded text-accent text-[10px] font-mono">main session</code>
            <p className="mt-2 opacity-60">Auto-refresh: 2s</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center shadow-glow-sm">
              <MessageSquare className="text-bg" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-fg">Control Center</h1>
              <p className="text-xs text-muted">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border border-border bg-bg"
              title={fullscreenChat ? 'Show trace' : 'Hide trace'}
            >
              {fullscreenChat ? <Terminal size={20} /> : <MessageSquare size={20} />}
            </button>
            <button
              onClick={toggleTrace}
              className="p-2 rounded-lg border border-border bg-bg"
              title={showTrace ? 'Hide trace' : 'Show trace'}
            >
              {showTrace ? <X size={20} /> : <Activity size={20} />}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat panel */}
          <div className={cn(
            'flex-1 flex flex-col',
            showTrace && !fullscreenChat ? 'border-r border-border' : ''
          )}>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-2xl p-4 shadow-sm',
                    msg.role === 'user'
                      ? 'bg-accent/20 ml-auto border border-accent/30'
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
            <div className="p-4 border-t border-border bg-surface-card">
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
          </div>

          {/* Trace panel */}
          {showTrace && !fullscreenChat && (
            <div data-testid="trace-panel" className="hidden md:flex w-96 flex-col border-l border-border bg-bg">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  Live Trace
                </h2>
                <span className="text-xs text-muted font-mono">{trace.length} events</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {trace.map((ev, i) => (
                  <div key={i} className="text-xs p-2.5 rounded-lg bg-surface-card border border-border/50">
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
                    <p className="text-fg line-clamp-3 font-mono text-[11px] leading-relaxed">
                      {typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content).slice(0, 300)}
                    </p>
                  </div>
                ))}
                <div ref={traceEndRef} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile fullscreen trace overlay */}
      {fullscreenChat && (
        <div className="fixed inset-0 z-50 bg-bg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-fg">Trace</h2>
            <button onClick={toggleFullscreen} className="p-2 rounded-lg border border-border bg-bg">
              <Minimize2 size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {trace.map((ev, i) => (
              <div key={i} className="text-xs p-2.5 rounded-lg bg-surface-card border border-border/50">
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
                </div>
                <p className="text-fg line-clamp-3 font-mono text-[11px] leading-relaxed">
                  {typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content).slice(0, 300)}
                </p>
              </div>
            ))}
            <div ref={traceEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
