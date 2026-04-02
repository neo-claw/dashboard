import {
  CheckCircle2,
  AlertCircle,
  GitCommit,
  Cpu,
  Scan,
  Activity,
  Zap,
  Server,
  Users,
  HardDrive,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import SubagentMonitor from './SubagentMonitor';
import RecreationCheckWidget from './RecreationCheckWidget';

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

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  status: string;
  highlight?: boolean;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'ok':
      return { color: 'text-emerald-400', badgeVariant: 'emerald' as const, glow: 'shadow-emerald-400/20' };
    case 'down':
      return { color: 'text-red-400', badgeVariant: 'red' as const, glow: 'shadow-red-400/20' };
    case 'degraded':
      return { color: 'text-red-400', badgeVariant: 'red' as const, glow: 'shadow-red-400/20' };
    case 'active':
      return { color: 'text-orange-400', badgeVariant: 'orange' as const, glow: 'shadow-orange-400/20' };
    case 'unknown':
      return { color: 'text-muted', badgeVariant: 'muted' as const, glow: 'shadow-accent/20' };
    default:
      return { color: 'text-accent', badgeVariant: 'default' as const, glow: 'shadow-accent/20' };
  }
}

function StatCard({ label, value, icon: Icon, status, highlight = false }: StatCardProps) {
  const config = getStatusConfig(status);

  return (
    <div
      className={cn(
        'relative group p-6 rounded-2xl border border-border/30 bg-surface-glass backdrop-blur-xs',
        'transition-all duration-300 hover:scale-[1.02] hover:border-accent/50',
        'hover:shadow-glow-sm overflow-hidden',
        highlight && 'md:row-span-2 md:col-span-2 bg-gradient-to-br from-surface-card to-accent/5',
        config.glow
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn('p-2.5 rounded-xl bg-accent/10 border border-accent/20', config.color)}>
            <Icon size={20} className={config.color} />
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-mono',
              config.badgeVariant === 'emerald' && 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
              config.badgeVariant === 'red' && 'border-red-500/50 text-red-400 bg-red-500/10',
              config.badgeVariant === 'orange' && 'border-orange-500/50 text-orange-400 bg-orange-500/10',
              config.badgeVariant === 'muted' && 'border-accent/30 text-accent bg-accent/5',
              config.badgeVariant === 'default' && 'border-accent/30 text-accent bg-accent/5'
            )}
          >
            {status}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className={cn(
            'text-display font-bold tracking-tight',
            highlight ? 'text-4xl md:text-5xl' : 'text-3xl'
          )}>
            {value}
          </p>
        </div>
      </div>

      <div className={cn(
        'absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity',
        config.glow.replace('shadow-', 'bg-')
      )} />
    </div>
  );
}

interface StatusItemProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  status?: 'connected' | 'disconnected' | 'error' | 'unknown';
}

function StatusItem({ label, value, icon: Icon, status = 'unknown' }: StatusItemProps) {
  const statusConfig = {
    connected: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    disconnected: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    unknown: { color: 'text-muted', bg: 'bg-muted/10', border: 'border-muted/30' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-card/50 border border-border/20 hover:bg-surface-card hover:border-accent/20 transition-all">
      <div className={cn('p-2 rounded-lg', config.bg, config.border)}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
        <p className="text-sm text-fg font-medium">{value}</p>
      </div>
      <div className={cn('w-2 h-2 rounded-full bg-current', config.bg.replace('bg-', 'bg-'), status === 'connected' && 'animate-pulse')} />
    </div>
  );
}

interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick?: () => void;
}

function QuickAction({ label, description, icon: Icon }: QuickActionProps) {
  return (
    <button className="group relative p-5 rounded-2xl border border-border/30 bg-gradient-to-br from-surface-card to-accent/[0.02] hover:from-accent/5 hover:to-accent/10 transition-all duration-300 hover:scale-[1.02] hover:border-accent/40 hover:shadow-glow-sm overflow-hidden text-left">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent group-hover:text-bg transition-colors duration-300">
            <Icon size={20} />
          </div>
        </div>
        <div>
          <p className="text-base font-semibold text-fg">{label}</p>
          <p className="text-sm text-muted mt-0.5">{description}</p>
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-accent/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
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

  const cronHealth = stats?.cronHealth || 'unknown';
  const gwsScansToday = stats?.gwsScansToday || 0;
  const lastBrainCommit = stats?.lastBrainCommit ? new Date(stats.lastBrainCommit).toLocaleDateString() : 'Never';
  const trinityCyclesToday = stats?.trinityCyclesToday || 0;

  const dynamicStats: StatCardProps[] = stats ? [
    {
      label: 'Cron Health',
      value: cronHealth.charAt(0).toUpperCase() + cronHealth.slice(1),
      icon: cronHealth === 'ok' ? CheckCircle2 : AlertCircle,
      status: cronHealth,
      highlight: true,
    },
    {
      label: 'Last Brain Commit',
      value: lastBrainCommit,
      icon: GitCommit,
      status: 'neutral',
    },
    {
      label: 'Trinity Cycles',
      value: `${trinityCyclesToday} today`,
      icon: Cpu,
      status: 'neutral',
      highlight: true,
    },
    {
      label: 'GWS Scanned',
      value: `${gwsScansToday} notes`,
      icon: Scan,
      status: gwsScansToday > 0 ? 'active' : 'neutral',
    },
  ] : [];

  const systemStatusItems: StatusItemProps[] = health ? [
    {
      label: 'Gateway',
      value: (
        <>
          {health.gateway.status}
          {health.gateway.uptime && ` (uptime ${Math.round(health.gateway.uptime / 60)}m)`}
        </>
      ),
      icon: health.gateway.status === 'connected' ? Wifi : Server,
      status: health.gateway.status as StatusItemProps['status'],
    },
    {
      label: 'Agents',
      value: (
        <>
          {health.agents.filter(a => a.status === 'online').length} online / {health.agents.length} total
        </>
      ),
      icon: Users,
      status: health.agents.some(a => a.status === 'online') ? 'connected' : 'disconnected',
    },
    {
      label: 'Workspace',
      value: health.workspace.sizeReadable,
      icon: HardDrive,
      status: 'connected',
    },
  ] : [];

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
          {dynamicStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
          <div className="md:col-span-2 md:row-span-1">
            <RecreationCheckWidget />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel className="min-h-[400px]">
              <SubagentMonitor />
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="System Status" className="bg-surface-glass backdrop-blur-xs">
              <div className="space-y-3">
                {systemStatusItems.map((item, i) => (
                  <StatusItem key={i} {...item} />
                ))}
                <div className="pt-3 mt-3 border-t border-border/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">API Status</span>
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Operational
                    </Badge>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Quick Actions" className="bg-surface-glass backdrop-blur-xs">
              <div className="grid grid-cols-1 gap-3">
                <QuickAction
                  label="Run Digest"
                  description="Process and summarize new content"
                  icon={Activity}
                />
                <QuickAction
                  label="Sync Brain"
                  description="Update knowledge base"
                  icon={Cpu}
                />
                <QuickAction
                  label="View Logs"
                  description="Check system activity"
                  icon={GitCommit}
                />
                <QuickAction
                  label="Settings"
                  description="Configure system preferences"
                  icon={Zap}
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
