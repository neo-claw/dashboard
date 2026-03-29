'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Brain,
  Code,
  Calendar as CalendarIcon,
  Menu,
  X,
  Activity,
  Zap,
  MessageSquare,
} from 'lucide-react';
import Overview from '@/app/components/Overview';
import Kanban from '@/app/components/Kanban';
import Learnings from '@/app/components/Learnings';
import Trinity from '@/app/components/Trinity';
import CalendarComp from '@/app/components/Calendar';
import ControlCenter from '@/app/control-center/page';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'kanban', label: 'Kanban', icon: CheckSquare },
  { id: 'learnings', label: 'Learnings', icon: Brain },
  { id: 'trinity', label: 'Trinity', icon: Code },
  { id: 'control-center', label: 'Control Center', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Persist sidebar state on mobile
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-sidebar-open');
    if (saved !== null) {
      setSidebarOpen(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-sidebar-open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-bg flex relative">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5 animate-pulse" />
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-surface/90 backdrop-blur border border-border rounded-lg shadow-glow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} className="text-accent" /> : <Menu size={20} className="text-accent" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-surface/95 backdrop-blur-xl border-r border-border transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-10'
        )}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Profile header */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center shadow-glow">
                <Brain className="text-bg" size={26} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-surface animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-fg truncate">Neo & Trinity</h1>
              <p className="text-sm text-muted truncate">AI Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group',
                  activeTab === item.id
                    ? 'bg-accent/15 text-accent border border-accent/30 shadow-glow-sm'
                    : 'text-muted hover:text-fg hover:bg-surface-hover border border-transparent'
                )}
              >
                <item.icon size={20} className={cn(activeTab === item.id ? 'text-accent' : 'group-hover:text-accent')} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom status */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <div className="p-4 rounded-xl bg-bg/50 border border-border/30">
              <p className="text-sm text-muted mb-2 flex items-center gap-2">
                <Zap size={14} /> System Status
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
                <span className="text-base text-fg truncate">Gateway healthy</span>
              </div>
              <p className="text-xs text-muted mt-2 opacity-60">
                OpenClaw • v0.1.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content - add left margin on lg+ */}
      <main className="flex-1 min-h-screen relative z-10 lg:ml-0">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold text-fg tracking-tight">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h2>
                <p className="text-base text-muted mt-2">
                  Real-time overview of your brain and agents
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-muted">
                <Activity size={16} />
                <span>Live</span>
              </div>
            </header>

            {/* Tab content */}
            <div className="animate-slide-up">
              {activeTab === 'overview' && <Overview />}
              {activeTab === 'kanban' && <Kanban />}
              {activeTab === 'learnings' && <Learnings />}
              {activeTab === 'trinity' && <Trinity />}
              {activeTab === 'control-center' && <ControlCenter />}
              {activeTab === 'calendar' && <CalendarComp />}
            </div>

            {/* Footer */}
            <footer className="mt-16 pt-6 border-t border-border/50 text-center text-muted text-sm">
              <p>Built by <span className="text-accent">Trinity</span> ◈ Data from <code className="px-2 py-1 bg-bg border border-border/50 rounded text-accent text-sm">neo-claw/brain</code></p>
              <p className="mt-2 text-xs opacity-60">Dashboard • {new Date().toLocaleDateString()}</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
