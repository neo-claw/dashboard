'use client';

import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    { value: 'light', icon: Sun, label: 'Light mode' },
    { value: 'dark', icon: Moon, label: 'Dark mode' },
    { value: 'system', icon: Monitor, label: 'System preference' },
  ] as const;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const currentIndex = themes.findIndex(t => t.value === theme);
  const CurrentIcon = themes[currentIndex].icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={cycleTheme}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-card border border-border hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
        aria-label={`Current theme: ${themes[currentIndex].label}. Click to cycle through themes.`}
        type="button"
      >
        <CurrentIcon size={18} className="text-accent" aria-hidden="true" />
        <span className="text-sm text-fg">{themes[currentIndex].label}</span>
      </button>
      
      {/* Quick selection buttons */}
      <div className="hidden sm:flex items-center gap-1" role="group" aria-label="Theme selection">
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                isActive 
                  ? 'bg-primary text-bg' 
                  : 'text-muted hover:text-fg hover:bg-surface-hover'
              )}
              aria-label={t.label}
              aria-pressed={isActive}
              type="button"
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
