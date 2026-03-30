import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export default function Panel({ title, className, children, ...props }: PanelProps) {
  return (
    <section
      className={cn('bg-surface-card rounded-xl border border-border/20 p-6', className)}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
