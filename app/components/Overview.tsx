import {
  CheckCircle2,
  AlertCircle,
  GitCommit,
  Cpu,
  Scan,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import SubagentMonitor from './SubagentMonitor';

interface StatsResponse {
  learningsCount: number;
  trinityCyclesToday: number;
  kanbanTasks: { todo: number; inprogress: number; done: number };
  cronHealth: 'ok' | 'degraded' | 'down' | 'unknown';
  gatewayStatus: 'connected' | 'disconnected' | 'unknown';
  lastBrainCommit: string | null;
  gwsScansToday: number;
}

interface HealthResponse {
  gateway: {
    status: 'connected' | 'disconnected' | 'error' | 'unknown';
    lastSeen?: string;
    uptime?: number;
  };
  agents: Array<{
    id: string;
    name?: string;
    status: 'online' | 'offline' | 'unknown';
    lastActivity?: string;
  }>;
  workspace: {
    path: string;
    sizeBytes: number;
    sizeReadable: string;
    diskFree?: number;
    diskFreeReadable?: string;
  };
}

export default async function Overview() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY;

  const [statsRes, healthRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/v1/stats/overview`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    }),
    fetch(`${baseUrl}/api/v1/system/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    }),
  ]);

  let stats: StatsResponse | null = null;
  let health: HealthResponse | null = null;

  if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
    stats = await statsRes.value.json();
  }
  if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
    health = await healthRes.value.json();
  }

  const dynamicStats = stats ? [
    {
      label: 'Cron Health',
      value: stats.cronHealth.charAt(0).toUpperCase() + stats.cronHealth.slice(1),
      icon: stats.cronHealth === 'ok' ? CheckCircle2 : AlertCircle,
      status: stats.cronHealth,
    },
    {
      label: 'Last Brain Commit',
      value: stats.lastBrainCommit ? new Date(stats.lastBrainCommit).toLocaleDateString() : 'Never',
      icon: GitCommit,
      status: 'neutral',
    },
    {
      label: 'Trinity Cycles',
      value: `${stats.trinityCyclesToday} today`,
      icon: Cpu,
      status: 'neutral',
    },
    {
      label: 'GWS Scanned',
      value: `${stats.gwsScansToday} notes`,
      icon: Scan,
      status: stats.gwsScansToday > 0 ? 'active' : 'neutral',
    },
  ] : [];

  const systemStatusItems = health ? [
    <>Gateway: <span className="text-fg">{health.gateway.status}</span>{health.gateway.uptime && ` (uptime ${Math.round(health.gateway.uptime / 60)}m)`}</>,
    <>Agents: <span className="text-fg">{health.agents.filter(a => a.status === 'online').length} online / {health.agents.length} total</span></>,
    <>Workspace: <span className="text-fg">{health.workspace.sizeReadable}</span></>,
  ] : [];

  return (
    <div className="space-y-12">
      <Panel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          {dynamicStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <div className="flex items-center gap-2 text-muted">
                <stat.icon size={18} className={cn(
                  'text-accent',
                  stat.status === 'ok' && 'text-emerald-400',
                  stat.status === 'down' && 'text-red-400',
                  stat.status === 'active' && 'text-orange-400'
                )} />
                <span className="text-sm uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-display font-bold text-fg tracking-tight">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SubagentMonitor />
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="System Status">
          <ul className="space-y-4 text-base">
            {systemStatusItems.map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-fg">{item}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-4">
            <button className="p-5 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-base font-medium text-fg group">
              <span className="flex items-center justify-center gap-2.5">
                <Activity size={18} className="text-accent" />
                Run Digest
              </span>
            </button>
            <button className="p-5 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-base font-medium text-fg">
              <span className="flex items-center justify-center gap-2.5">
                <Cpu size={18} className="text-accent" />
                Sync Brain
              </span>
            </button>
            <button className="p-5 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-base font-medium text-fg">
              <span className="flex items-center justify-center gap-2.5">
                <GitCommit size={18} className="text-accent" />
                View Logs
              </span>
            </button>
            <button className="p-5 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-base font-medium text-fg">
              <span className="flex items-center justify-center gap-2.5">
                <Activity size={18} className="text-accent" />
                Settings
              </span>
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
