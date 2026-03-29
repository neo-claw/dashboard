import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useEffect, useState } from 'react';

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

export default function Overview() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/v1/stats/overview'),
          fetch('/api/v1/system/health'),
        ]);
        const statsData = await statsRes.json();
        const healthData = await healthRes.json();
        setStats(statsData);
        setHealth(healthData);
      } catch (e) {
        console.error('Failed to fetch overview data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="group relative overflow-hidden border border-border/50 bg-surface-card hover:bg-surface-hover transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 animate-pulse" />
                  <div className="h-5 w-8 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
                <div className="mt-2.5 h-4 w-1/2 rounded bg-muted animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-xl border border-border/50 bg-bg animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dynamicStats = stats ? [
    {
      label: 'Cron Health',
      value: stats.cronHealth.charAt(0).toUpperCase() + stats.cronHealth.slice(1),
      icon: stats.cronHealth === 'ok' ? CheckCircle2 : AlertCircle,
      gradient: stats.cronHealth === 'ok' ? 'from-emerald-400 to-green-500' : stats.cronHealth === 'down' ? 'from-red-400 to-rose-500' : 'from-yellow-400 to-amber-500',
      trend: stats.cronHealth === 'ok' ? 'up' : 'neutral',
    },
    {
      label: 'Last Brain Commit',
      value: stats.lastBrainCommit ? new Date(stats.lastBrainCommit).toLocaleDateString() : 'Never',
      icon: GitCommit,
      gradient: 'from-blue-400 to-cyan-500',
      trend: 'neutral',
    },
    {
      label: 'Trinity Cycles',
      value: `${stats.trinityCyclesToday} today`,
      icon: Cpu,
      gradient: 'from-purple-400 to-pink-500',
      trend: 'neutral',
    },
    {
      label: 'GWS Scanned',
      value: `${stats.gwsScansToday} notes`,
      icon: Scan,
      gradient: 'from-orange-400 to-amber-500',
      trend: stats.gwsScansToday > 0 ? 'new' : 'neutral',
    },
  ] : [];

  const systemStatusItems = health ? [
    <>Gateway: <span className="text-fg">{health.gateway.status}</span>{health.gateway.uptime && ` (uptime ${Math.round(health.gateway.uptime / 60)}m)`}</>,
    <>Agents: <span className="text-fg">{health.agents.filter(a => a.status === 'online').length} online / {health.agents.length} total</span></>,
    <>Workspace: <span className="text-fg">{health.workspace.sizeReadable}</span></>,
  ] : [];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {dynamicStats.map((stat) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden border border-border/50 bg-surface-card hover:bg-surface-hover transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 rounded-2xl"
          >
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity',
              stat.gradient
            )} />
            <CardHeader className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-accent/10">
                  <stat.icon size={26} className="text-accent" />
                </div>
                <Badge
                  variant={stat.trend === 'up' ? 'default' : 'outline'}
                  className="text-sm"
                >
                  {stat.trend === 'up' ? '↑' : stat.trend === 'new' ? '•' : '−'}
                </Badge>
              </div>
              <CardTitle className="text-4xl font-bold text-fg tracking-tight">{stat.value}</CardTitle>
              <p className="text-sm uppercase tracking-wider text-muted mt-2.5">
                {stat.label}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-xl">
              <Activity className="text-accent" size={22} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-base">
              {systemStatusItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <span className="text-fg">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-xl">
              <Zap className="text-accent" size={22} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
