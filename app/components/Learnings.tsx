import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Sparkles, Zap, BookOpen, ListTodo, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Learning {
  date: string;
  text: string;
  category: string;
  source: string;
}

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
  general: {
    icon: <BookOpen size={14} />,
    gradient: 'bg-gradient-to-r from-orange-500/30 to-amber-500/30',
    label: 'General',
  },
  tasks: {
    icon: <ListTodo size={14} />,
    gradient: 'bg-gradient-to-r from-indigo-500/30 to-blue-500/30',
    label: 'Task',
  },
  notes: {
    icon: <StickyNote size={14} />,
    gradient: 'bg-gradient-to-r from-pink-500/30 to-rose-500/30',
    label: 'Note',
  },
};

export default function Learnings() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLearnings() {
      try {
        const res = await fetch('/api/v1/learnings');
        if (res.ok) {
          const data = await res.json();
          setLearnings(data);
        }
      } catch (e) {
        console.error('Failed to fetch learnings:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLearnings();
  }, []);

  if (loading) {
    return (
      <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="h-8 w-1/3 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-1/2 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent/30 via-border to-transparent" />
            <div className="space-y-10">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-2 w-5 h-5 rounded-full bg-muted animate-pulse" />
                  <div className="h-32 rounded-2xl bg-muted/50 animate-pulse border border-border/30" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (learnings.length === 0) {
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
          <div className="text-center py-12 text-muted">
            <Lightbulb size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No learnings captured yet.</p>
            <p className="text-sm mt-2">Start adding entries to LEARNINGS.md or memory files.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {learnings.map((l, i) => {
              const categoryKey = l.category.toLowerCase().replace(/\s+/g, '_');
              const config = categoryConfig[categoryKey] || categoryConfig.general;
              return (
                <div key={`${l.date}-${i}`} className="relative group">
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
                      <Badge variant="secondary" className="text-sm">
                        {l.source}
                      </Badge>
                    </div>
                    <p className="text-lg text-fg leading-relaxed">
                      {l.text}
                    </p>
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
