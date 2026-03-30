'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CheckSquare,
  Brain,
  Code,
  Calendar as CalendarIcon,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: '/', label: 'Overview', icon: LayoutDashboard },
  { id: '/kanban', label: 'Kanban', icon: CheckSquare },
  { id: '/learnings', label: 'Learnings', icon: Brain },
  { id: '/trinity', label: 'Trinity', icon: Code },
  { id: '/control-center', label: 'Control Center', icon: Code }, // Will use different icon if needed
  { id: '/calendar', label: 'Calendar', icon: CalendarIcon },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Restore sidebar state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-sidebar-open');
    if (saved !== null) {
      setSidebarOpen(JSON.parse(saved));
    }
  }, []);

  // Persist sidebar state changes
  useEffect(() => {
    localStorage.setItem('dashboard-sidebar-open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <>
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-surface/90 backdrop-blur border border-border rounded-lg shadow-glow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
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
            {navItems.map(item => {
              const isActive = pathname === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.id}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-accent/15 text-accent border border-accent/30 shadow-glow-sm'
                      : 'text-muted hover:text-fg hover:bg-surface-hover border border-transparent'
                  )}
                >
                  <item.icon size={20} className={cn(isActive ? 'text-accent' : 'group-hover:text-accent')} />
                  {item.label}
                </Link>
              );
            })}
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
    </>
  );
}
