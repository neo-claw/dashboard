import { cn } from '@/lib/utils';
import { Cpu, Clock } from 'lucide-react';
import Panel from '@/components/ui/panel';

function SkeletonBox({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

export default function TrinityLoading() {
  return (
    <div className="space-y-8">
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-10 w-16" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Latest Runs">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-xl border border-border/20 bg-bg"
            >
              <SkeletonBox className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <SkeletonBox className="h-4 w-24" />
                  <SkeletonBox className="h-5 w-16 rounded-full" />
                </div>
                <SkeletonBox className="h-5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
