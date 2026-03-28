import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Terminal, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <Card className="border border-border bg-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="text-accent" size={20} />
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Cycle progress</span>
            <span className="text-accent font-mono">{cycleStats.completed}/{cycleStats.total}</span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Avg: {cycleStats.avgTime}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-500" /> {cycleStats.completed} runs
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
                className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border hover:border-accent/30 transition-all group"
              >
                <Clock size={14} className="text-muted mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-accent text-sm">{run.time}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] uppercase border',
                        run.status === 'success'
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      )}
                    >
                      {run.status === 'success' ? (
                        <CheckCircle2 size={10} className="inline mr-1" />
                      ) : (
                        <AlertCircle size={10} className="inline mr-1" />
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

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted flex items-center justify-between">
            <span>
              Latest log: <code className="bg-bg px-1.5 py-0.5 rounded text-accent">trinity/2026-03-28.md</code>
            </span>
            <button className="text-accent hover:underline">View all runs →</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

