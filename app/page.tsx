'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import Overview from '@/app/components/Overview';
import Kanban from '@/app/components/Kanban';
import Learnings from '@/app/components/Learnings';
import Trinity from '@/app/components/Trinity';
import CalendarComp from '@/app/components/Calendar';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'kanban', label: 'Kanban', icon: CheckSquare },
  { id: 'learnings', label: 'Learnings', icon: Brain },
  { id: 'trinity', label: 'Trinity', icon: Code },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-bg flex relative">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5 animate-pulse" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2Zy4uLgo=')] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface/80 backdrop-blur border border-border rounded-lg shadow-glow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} className="text-accent" /> : <Menu size={20} className="text-accent" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface/80 backdrop-blur-xl border-r border-border transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'
        )}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Profile header */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-cyan-500 flex items-center justify-center shadow-glow">
                <Brain className="text-bg" size={24} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-surface animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-fg truncate">Neo & Trinity</h1>
              <p className="text-xs text-muted truncate">AI Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  activeTab === item.id
                    ? 'bg-accent/15 text-accent border border-accent/30 shadow-glow-sm'
                    : 'text-muted hover:text-fg hover:bg-surface-hover border border-transparent'
                )}
              >
                <item.icon size={18} className={cn(activeTab === item.id ? 'text-accent' : 'group-hover:text-accent')} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom status */}
          <div className="pt-4 border-t border-border">
            <div className="p-4 rounded-xl bg-bg border border-border/50">
              <p className="text-xs text-muted mb-2 flex items-center gap-2">
                <Zap size={12} /> System Status
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
                <span className="text-sm text-fg truncate">Gateway healthy</span>
              </div>
              <p className="text-[10px] text-muted mt-2 opacity-60">
                OpenClaw • v0.1.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 min-h-screen relative z-10">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-fg tracking-tight">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h2>
                <p className="text-muted text-sm mt-1">
                  Real-time overview of your brain and agents
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted">
                <Activity size={14} />
                <span>Live</span>
              </div>
            </header>

            {/* Tab content */}
            <div className="animate-slide-up">
              {activeTab === 'overview' && <Overview />}
              {activeTab === 'kanban' && <Kanban />}
              {activeTab === 'learnings' && <Learnings />}
              {activeTab === 'trinity' && <Trinity />}
              {activeTab === 'calendar' && <CalendarComp />}
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-border/50 text-center text-muted text-sm">
              <p>Built by <span className="text-accent">Trinity</span> ◈ Data from <code className="px-1.5 py-0.5 bg-bg border border-border/50 rounded text-accent text-xs">neo-claw/brain</code></p>
              <p className="mt-1 text-xs opacity-60">Dashboard • {new Date().toLocaleDateString()}</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
