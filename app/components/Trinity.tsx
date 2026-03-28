import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Terminal, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockRuns = [
  { time: '03:00', status: 'success', msg: 'Built SWE toolkit, agent patterns, templates, and showcase experiment.' },
  { time: '02:45', status: 'success', msg: 'Enhanced Decision Engine with ant‑inspired context question.' },
  { time: '02:30', status: 'success', msg: 'Created Agent Framework Decision Engine prototype (HTML + server).' },
  { time: '02:00', status: 'success', msg: 'Built Concept2Cards flashcard generator.' },
];

const cycleStats = {
  total: 32,
  completed: 8,
  failed: 0,
  avgTime: '4.2s',
};

export default function Trinity() {
  const progress = (cycleStats.completed / cycleStats.total) * 100;

  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-accent/10">
                <Cpu className="text-accent" size={20} />
              </div>
              Trinity Activity
            </CardTitle>
            <p className="text-xs text-muted mt-1">
              Overnight agent cycles and builds
            </p>
          </div>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            v0.1.0
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="p-5 bg-bg/50 rounded-xl border border-border/30">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-muted flex items-center gap-2">
              <BarChart3 size={14} /> Cycle progress
            </span>
            <span className="text-accent font-mono text-sm font-bold">{cycleStats.completed}/{cycleStats.total}</span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-6 text-xs text-muted mt-3">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Avg: {cycleStats.avgTime}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-500" /> {cycleStats.completed} runs
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted" /> {cycleStats.total} total
            </span>
          </div>
        </div>

        {/* Activity log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-2">
            <Terminal size={16} />
            Latest runs
          </div>
          <ul className="space-y-2">
            {mockRuns.map((run, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border hover:border-accent/40 hover:bg-surface-hover transition-all group"
              >
                <Clock size={14} className="text-muted mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-accent text-sm">{run.time}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] uppercase border-0 gap-1',
                        run.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      )}
                    >
                      {run.status === 'success' ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <AlertCircle size={10} />
                      )}
                      {run.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-fg truncate group-hover:text-accent transition-colors">
                    {run.msg}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted flex items-center justify-between">
            <span>
              Latest log: <code className="bg-bg px-1.5 py-0.5 rounded text-accent border border-border/50">trinity/2026-03-28.md</code>
            </span>
            <button className="text-accent hover:underline">View all runs →</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

