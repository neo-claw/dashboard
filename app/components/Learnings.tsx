import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';
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

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  improvement: { bg: 'bg-accent/20', text: 'text-accent', border: 'border-accent/30' },
  automation: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  discovery: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
};

export default function Learnings() {
  return (
    <Card className="border border-border bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-accent" size={20} />
          Recent Learnings
        </CardTitle>
        <p className="text-xs text-muted mt-1">
          Captured insights from brain repo
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {mockLearnings.map((l, i) => (
              <div key={i} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-3 top-1.5 w-3 h-3 rounded-full bg-accent ring-4 ring-surface shadow-glow-sm" />
                
                <div className="group">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-bg border-border">
                      {l.date}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs border', categoryColors[l.category]?.border || 'border-gray-700', categoryColors[l.category]?.bg || 'bg-gray-500/10', categoryColors[l.category]?.text || 'text-gray-300')}
                    >
                      {l.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-fg leading-relaxed group-hover:text-accent transition-colors">
                    {l.text}
                  </p>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs text-accent hover:underline flex items-center gap-1">
                      View in brain <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

