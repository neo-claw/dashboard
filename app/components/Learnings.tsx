import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, Zap, BookOpen, ListTodo, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';

interface Learning {
  date: string;
  text: string;
  category: string;
  source: string;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; textClass: string }> = {
  improvement: {
    icon: <Sparkles size={14} />,
    label: 'Improvement',
    textClass: 'text-emerald-300',
  },
  automation: {
    icon: <Zap size={14} />,
    label: 'Automation',
    textClass: 'text-cyan-300',
  },
  discovery: {
    icon: <Lightbulb size={14} />,
    label: 'Discovery',
    textClass: 'text-purple-300',
  },
  general: {
    icon: <BookOpen size={14} />,
    label: 'General',
    textClass: 'text-orange-300',
  },
  tasks: {
    icon: <ListTodo size={14} />,
    label: 'Task',
    textClass: 'text-indigo-300',
  },
  notes: {
    icon: <StickyNote size={14} />,
    label: 'Note',
    textClass: 'text-rose-300',
  },
};

export default async function Learnings() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY;

  const learningsRes = await fetch(`${baseUrl}/api/v1/learnings`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  let learnings: Learning[] = [];
  if (learningsRes.ok) {
    learnings = await learningsRes.json();
  }

  if (learnings.length === 0) {
    return (
      <Panel>
        <div className="text-center py-12 text-muted">
          <Lightbulb size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No learnings captured yet.</p>
          <p className="text-sm mt-2">Start adding entries to LEARNINGS.md or memory files.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="relative pl-8">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        <div className="space-y-16">
          {learnings.map((l, i) => {
            const categoryKey = l.category.toLowerCase().replace(/\s+/g, '_');
            const config = categoryConfig[categoryKey] || categoryConfig.general;
            return (
              <div key={`${l.date}-${i}`} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[21px] top-2 w-4 h-4 rounded-full bg-accent" />

                <div className="bg-bg/40 rounded-2xl p-6 border border-border/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="text-sm border-border/40 text-muted">
                      {l.date}
                    </Badge>
                    <Badge variant="outline" className={cn('text-sm border-0 px-3 py-1 gap-2', config.textClass, 'bg-white/5')}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xl text-fg leading-relaxed">
                    {l.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}