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
    <div className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
