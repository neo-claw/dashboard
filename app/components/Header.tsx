'use client';

import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';

const titles: Record<string, string> = {
  '/': 'Overview',
  '/sessions': 'Sessions',
  '/kanban': 'Kanban',
  '/learnings': 'Learnings',
  '/trinity': 'Trinity',
  '/calendar': 'Calendar',
  '/control-center': 'Control Center',
};

export default function Header() {
  const pathname = usePathname();
  const title = titles[pathname] || 'Dashboard';

  return (
    <header className="mb-10 flex items-center justify-between">
      <div>
        <h2 className="text-4xl font-bold text-fg tracking-tight">{title}</h2>
        <p className="text-base text-muted mt-2">
          Real-time overview of your brain and agents
        </p>
      </div>
      <div className="hidden md:flex items-center gap-2 text-sm text-muted">
        <Activity size={16} />
        <span>Live</span>
      </div>
    </header>
  );
}
