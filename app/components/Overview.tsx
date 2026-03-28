import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  GitCommit,
  Cpu,
  Scan,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stats = [
  {
    label: 'Cron Health',
    value: '5/5 succeeded',
    icon: CheckCircle2,
    gradient: 'from-emerald-400 to-green-500',
    trend: 'up',
  },
  {
    label: 'Brain Commits',
    value: '12 today',
    icon: GitCommit,
    gradient: 'from-blue-400 to-cyan-500',
    trend: 'up',
  },
  {
    label: 'Trinity Cycles',
    value: '8/32 runs',
    icon: Cpu,
    gradient: 'from-purple-400 to-pink-500',
    trend: 'neutral',
  },
  {
    label: 'GWS Scanned',
    value: '3 new notes',
    icon: Scan,
    gradient: 'from-orange-400 to-amber-500',
    trend: 'new',
  },
];

export default function Overview() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden border border-border/50 bg-surface-card hover:bg-surface-hover transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 rounded-2xl"
          >
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity',
              stat.gradient
            )} />
            <CardHeader className="p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <stat.icon size={22} className="text-accent" />
                </div>
                <Badge
                  variant={stat.trend === 'up' ? 'default' : 'outline'}
                  className="text-[10px] uppercase"
                >
                  {stat.trend === 'up' ? '↑' : stat.trend === 'new' ? '•' : '−'}
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-fg tracking-tight">{stat.value}</CardTitle>
              <p className="text-xs uppercase tracking-wider text-muted mt-2">
                {stat.label}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="text-accent" size={20} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
                <span className="text-fg">OpenClaw gateway running</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-fg">All agents healthy</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-fg">Morning digest scheduled for 07:30 PT</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="text-accent" size={20} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-sm font-medium text-fg group">
                <span className="flex items-center justify-center gap-2">
                  <Activity size={16} className="text-accent" />
                  Run Digest
                </span>
              </button>
              <button className="p-4 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-sm font-medium text-fg">
                <span className="flex items-center justify-center gap-2">
                  <Cpu size={16} className="text-accent" />
                  Sync Brain
                </span>
              </button>
              <button className="p-4 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-sm font-medium text-fg">
                <span className="flex items-center justify-center gap-2">
                  <GitCommit size={16} className="text-accent" />
                  View Logs
                </span>
              </button>
              <button className="p-4 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/50 hover:shadow-glow-sm transition-all text-sm font-medium text-fg">
                <span className="flex items-center justify-center gap-2">
                  <Activity size={16} className="text-accent" />
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

