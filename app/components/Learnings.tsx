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
    icon: <Sparkles size={14} />,
    gradient: 'bg-gradient-to-r from-accent/30 to-emerald-500/30',
    label: 'Improvement',
  },
  automation: {
    icon: <Zap size={14} />,
    gradient: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30',
    label: 'Automation',
  },
  discovery: {
    icon: <Lightbulb size={14} />,
    gradient: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30',
    label: 'Discovery',
  },
};

export default function Learnings() {
  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="p-2.5 rounded-lg bg-accent/10">
            <Lightbulb className="text-accent" size={24} />
          </div>
          Recent Learnings
        </CardTitle>
        <p className="text-base text-muted mt-2">
          Captured insights from brain repo
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative pl-8">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent/30 via-border to-transparent" />

          <div className="space-y-10">
            {mockLearnings.map((l, i) => {
              const config = categoryConfig[l.category] || categoryConfig.discovery;
              return (
                <div key={i} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[21px] top-2 w-5 h-5 rounded-full bg-accent shadow-glow flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-bg" />
                  </div>

                  <div className="bg-bg/50 rounded-2xl p-6 border border-border/30 group-hover:border-accent/30 transition-all">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <Badge variant="outline" className="text-sm bg-surface border-border/50">
                        {l.date}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-sm border-0 gap-2 px-3 py-1', config.gradient, 'text-fg')}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-lg text-fg leading-relaxed">
                      {l.text}
                    </p>
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-base text-accent hover:underline flex items-center gap-2">
                        View in brain <ArrowRight size={16} />
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
