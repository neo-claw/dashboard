'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Activity, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const titles: Record<string, string> = {
  '/': 'Overview',
  '/sessions': 'Sessions',
  '/kanban': 'Kanban',
  '/learnings': 'Learnings',
  '/trinity': 'Trinity',
  '/control-center': 'Control Center',
  '/calendar': 'Calendar',
  '/activity': 'Activity Stream',
};

export default function Header() {
  const pathname = usePathname();
  const title = titles[pathname] || 'Dashboard';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
        if (!apiKey) return;
        const res = await fetch('/api/v1/activity/unread-count', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUnreadCount(data.count || 0);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <header className="mb-10 flex items-center justify-between">
      <div>
        <h2 className="text-4xl font-bold text-fg tracking-tight">{title}</h2>
        <p className="text-base text-muted mt-2">
          System status and agent activity
        </p>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <ThemeToggle />
        <Link href="/activity" className="group relative">
          <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-bg/50 backdrop-blur">
            <Bell size={16} />
            Activity
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Activity size={16} />
          <span>Live</span>
        </div>
      </div>
    </header>
  );
}
