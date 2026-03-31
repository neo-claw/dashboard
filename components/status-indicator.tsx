import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusValue = 'online' | 'offline' | 'warning' | 'error' | 'busy' | 'idle';

interface StatusIndicatorProps {
  status: StatusValue;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

const statusConfig = {
  online: {
    dot: 'bg-success',
    label: 'Online',
    aria: 'Online, operational',
  },
  offline: {
    dot: 'bg-muted',
    label: 'Offline',
    aria: 'Offline, not operational',
  },
  warning: {
    dot: 'bg-warning',
    label: 'Warning',
    aria: 'Warning, attention needed',
  },
  error: {
    dot: 'bg-error',
    label: 'Error',
    aria: 'Error, requires attention',
  },
  busy: {
    dot: 'bg-primary',
    label: 'Busy',
    aria: 'Busy, unavailable',
  },
  idle: {
    dot: 'bg-muted',
    label: 'Idle',
    aria: 'Idle, not active',
  },
};

export function StatusIndicator({
  status,
  label,
  showLabel = false,
  size = 'md',
  className,
  ariaLabel,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;
  
  const sizeClasses = {
    sm: 'w-2 h-2 text-xs',
    md: 'w-3 h-3 text-sm',
    lg: 'w-4 h-4 text-base',
  };

  const pulseSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        className
      )}
      role="status"
      aria-label={ariaLabel || config.aria}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring for active states */}
        {(status === 'online' || status === 'busy') && (
          <span
            className={cn(
              'absolute rounded-full animate-pulse',
              config.dot.replace('bg-', 'bg-'),
              pulseSizes[size]
            )}
            style={{ opacity: 0.3 }}
            aria-hidden="true"
          />
        )}
        {/* Status dot */}
        <span
          className={cn(
            'relative rounded-full',
            config.dot,
            sizeClasses[size]
          )}
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-fg">
          {displayLabel}
        </span>
      )}
    </div>
  );
}
