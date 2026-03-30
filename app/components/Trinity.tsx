import { Badge } from '@/components/ui/badge';
import { Cpu, Terminal, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';

interface TrinityRun {
  date: string;
  runId: string;
  status: string;
  durationMs: number;
  summary: string;
  memoryEntries?: Array<{ text: string; category: string }>; // Optional, not used in UI
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
      <Panel>
        <div className="text-center py-12 text-muted">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Unable to load Trinity data.</p>
        </div>
      </Panel>
    );
  }

  const { runs, stats } = data;
  const progress = stats.totalRuns > 0 ? (stats.successCount / stats.totalRuns) * 100 : 0;
  const avgSec = stats.avgDuration / 1000;

  return (
    <div className="space-y-8">
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <p className="text-sm text-muted uppercase tracking-wider">Total Runs</p>
            <p className="text-3xl font-bold text-fg mt-1">{stats.totalRuns}</p>
          </div>
          <div>
            <p className="text-sm text-muted uppercase tracking-wider">Success Rate</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{progress.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted uppercase tracking-wider">Avg Duration</p>
            <p className="text-3xl font-bold text-fg mt-1">{avgSec.toFixed(1)}s</p>
          </div>
          <div>
            <p className="text-sm text-muted uppercase tracking-wider">Memory Entries</p>
            <p className="text-3xl font-bold text-accent mt-1">{stats.memoryEntriesTotal}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Latest Runs">
        <div className="space-y-4">
          {runs.slice(0, 5).map((run) => (
            <div
              key={run.runId}
              className="flex items-start gap-4 p-4 rounded-xl bg-bg border border-border"
            >
              <Clock size={18} className="text-muted mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-accent">{run.date}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs border-0 gap-1.5 px-2.5 py-1',
                      run.status === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-300'
                    )}
                  >
                    {run.status === 'ok' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {run.status === 'ok' ? 'success' : 'error'}
                  </Badge>
                </div>
                <p className="text-base text-fg truncate">{run.summary.split('\n')[0]}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}