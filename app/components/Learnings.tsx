import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockLearnings = [
  {
    date: '2026-03-28',
    text: 'Added SWE evaluator to filter bloat; Trinity now scores utility before building.',
    category: 'improvement',
  },
  {
    date: '2026-03-28',
    text: 'Implemented auto-commit to brain repo for learnings and Trinity logs.',
    category: 'automation',
  },
  {
    date: '2026-03-27',
    text: 'Discovered movie screening in USC calendar via gws q search.',
    category: 'discovery',
  },
];

const categoryConfig: Record<string, { icon: React.ReactNode; gradient: string; label: string }> = {
  improvement: {
    icon: <Sparkles size={12} />,
    gradient: 'bg-gradient-to-r from-accent/20 to-emerald-500/20',
    label: 'Improvement',
  },
  automation: {
    icon: <Zap size={12} />,
    gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    label: 'Automation',
  },
  discovery: {
    icon: <Lightbulb size={12} />,
    gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
    label: 'Discovery',
  },
};

export default function Learnings() {
  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-accent/10">
            <Lightbulb className="text-accent" size={20} />
          </div>
          Recent Learnings
        </CardTitle>
        <p className="text-xs text-muted mt-1">
          Captured insights from brain repo
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent/30 via-border to-transparent" />

          <div className="space-y-8">
            {mockLearnings.map((l, i) => {
              const config = categoryConfig[l.category] || categoryConfig.discovery;
              return (
                <div key={i} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[17px] top-1.5 w-4 h-4 rounded-full bg-accent shadow-glow flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-bg" />
                  </div>

                  <div className="bg-bg/50 rounded-xl p-4 border border-border/30 group-hover:border-accent/30 transition-all">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-surface border-border/50">
                        {l.date}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs border-0 gap-1', config.gradient, 'text-fg')}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-fg leading-relaxed">
                      {l.text}
                    </p>
                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs text-accent hover:underline flex items-center gap-1">
                        View in brain <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

