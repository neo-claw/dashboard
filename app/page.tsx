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
    <div className="min-h-screen bg-bg flex">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg shadow-glow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} className="text-accent" /> : <Menu size={20} className="text-accent" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'
        )}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shadow-glow-sm">
              <Brain className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-accent tracking-tight">Neo & Trinity</h1>
              <p className="text-xs text-muted">Dashboard v0.1</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  activeTab === item.id
                    ? 'bg-accent/10 text-accent border border-accent/30 shadow-glow-sm'
                    : 'text-muted hover:text-fg hover:bg-bg-hover border border-transparent'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-4 bg-bg-card rounded-xl border border-border">
            <p className="text-xs text-muted mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-fg">Gateway healthy</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-fg mb-1">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-muted text-sm">
                Real-time overview of your brain and agents
              </p>
            </header>

            {/* Tab content */}
            <div className="animate-fade-in">
              {activeTab === 'overview' && <Overview />}
              {activeTab === 'kanban' && <Kanban />}
              {activeTab === 'learnings' && <Learnings />}
              {activeTab === 'trinity' && <Trinity />}
              {activeTab === 'calendar' && <CalendarComp />}
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-border text-center text-muted text-sm">
              <p>Built by Trinity ◈ Data from <code className="px-1.5 py-0.5 bg-bg-card rounded text-accent text-xs">neo-claw/brain</code></p>
              <p className="mt-1 text-xs opacity-60">Dashboard • {new Date().toLocaleDateString()}</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
