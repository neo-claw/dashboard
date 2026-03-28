import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  GitCommit,
  Cpu,
  Scan,
  Activity,
} from 'lucide-react';

const stats = [
  {
    label: 'Cron Health',
    value: '5/5 succeeded',
    icon: CheckCircle2,
    color: 'text-accent',
    trend: 'up',
  },
  {
    label: 'Brain Commits',
    value: '12 today',
    icon: GitCommit,
    color: 'text-blue-400',
    trend: 'up',
  },
  {
    label: 'Trinity Cycles',
    value: '8/32 runs',
    icon: Cpu,
    color: 'text-purple-400',
    trend: 'neutral',
  },
  {
    label: 'GWS Scanned',
    value: '3 new notes',
    icon: Scan,
    color: 'text-orange-400',
    trend: 'new',
  },
];

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden border border-border bg-surface hover:bg-surface-hover transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={stat.color} size={20} />
                <Badge
                  variant={stat.trend === 'up' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {stat.trend === 'up' ? '↑' : stat.trend === 'new' ? '•' : '−'}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-fg">{stat.value}</CardTitle>
              <p className="text-xs uppercase tracking-wider text-muted mt-1">
                {stat.label}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-accent" size={20} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-fg">OpenClaw gateway running</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-fg">All agents healthy</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-fg">Morning digest scheduled for 07:30 PT</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="text-accent" size={20} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 rounded-lg border border-border bg-bg hover:bg-surface-hover hover:border-accent/30 transition-all text-sm text-center text-fg">
                Run Digest
              </button>
              <button className="p-3 rounded-lg border border-border bg-bg hover:bg-surface-hover hover:border-accent/30 transition-all text-sm text-center text-fg">
                Sync Brain
              </button>
              <button className="p-3 rounded-lg border border-border bg-bg hover:bg-surface-hover hover:border-accent/30 transition-all text-sm text-center text-fg">
                View Logs
              </button>
              <button className="p-3 rounded-lg border border-border bg-bg hover:bg-surface-hover hover:border-accent/30 transition-all text-sm text-center text-fg">
                Settings
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

