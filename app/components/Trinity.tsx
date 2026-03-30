import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Terminal, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrinityRun {
  date: string;
  runId: string;
  status: string;
  durationMs: number;
  summary: string;
  memoryEntries: Array<{ text: string; category: string }>;
}

interface TrinityResponse {
  runs: TrinityRun[];
  stats: {
    totalRuns: number;
    successCount: number;
    failureCount: number;
    avgDuration: number;
    memoryEntriesTotal: number;
  };
}

export default async function Trinity() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY;

  const trinityRes = await fetch(`${baseUrl}/api/v1/trinity/runs`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  let data: TrinityResponse | null = null;
  if (trinityRes.ok) {
    data = await trinityRes.json();
  }

  if (!data) {
    return (
      <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Cpu className="text-accent" size={24} />
            </div>
            Trinity Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Unable to load Trinity data.</p>
        </CardContent>
      </Card>
    );
  }

  const { runs, stats } = data;
  const progress = stats.totalRuns > 0 ? (stats.successCount / stats.totalRuns) * 100 : 0;
  const avgSec = stats.avgDuration / 1000;

  const formatDate = (dateStr: string) => {
    return dateStr;
  };

  const getShortMsg = (summary: string) => {
    const lines = summary.split('\n').filter(l => l.trim());
    return lines[0]?.substring(0, 80) || summary.substring(0, 80);
  };

  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2.5 rounded-lg bg-accent/10">
                <Cpu className="text-accent" size={24} />
              </div>
              Trinity Activity
            </CardTitle>
            <p className="text-base text-muted mt-2">
              Overnight agent cycles and builds
            </p>
          </div>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-sm">
            v0.1.0
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Progress bar */}
        <div className="p-6 bg-bg/50 rounded-2xl border border-border/30">
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted flex items-center gap-2.5">
              <BarChart3 size={18} /> Cycle progress
            </span>
            <span className="text-accent font-mono text-lg font-bold">{stats.successCount}/{stats.totalRuns}</span>
          </div>
          <div className="h-4 bg-surface rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-8 text-sm text-muted mt-4">
            <span className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Avg: {avgSec.toFixed(1)}s
            </span>
            <span className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-green-500" /> {stats.successCount} runs
            </span>
            <span className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-muted" /> {stats.totalRuns} total
            </span>
          </div>
        </div>

        {/* Activity log */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-lg font-semibold text-muted mb-3">
            <Terminal size={20} />
            Latest runs
          </div>
          <ul className="space-y-3">
            {runs.slice(0, 5).map((run) => (
              <li
                key={run.runId}
                className="flex items-start gap-4 p-4 rounded-xl bg-bg border border-border hover:border-accent/40 hover:bg-surface-hover transition-all group"
              >
                <Clock size={18} className="text-muted mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-accent text-lg">{run.date}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-sm border-0 gap-2 px-3 py-1',
                        run.status === 'ok'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      )}
                    >
                      {run.status === 'ok' ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {run.status === 'ok' ? 'success' : 'error'}
                    </Badge>
                  </div>
                  <p className="text-lg text-fg truncate group-hover:text-accent transition-colors">
                    {getShortMsg(run.summary)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-base text-muted flex items-center justify-between">
            <span>
              Latest log: <code className="bg-bg px-2.5 py-1.5 rounded text-accent border border-border/50">trinity/index.md</code>
            </span>
            <button className="text-accent hover:underline">View all runs →</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
