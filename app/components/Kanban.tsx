import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Task {
  id: string;
  title: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
}

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  ops: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  deploy: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  core: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  tooling: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  done: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
  general: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
};

const priorityIcons: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

export default function Kanban() {
  const [tasks, setTasks] = useState<{ todo: Task[]; inprogress: Task[]; done: Task[] }>({
    todo: [],
    inprogress: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/v1/kanban/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (e) {
        console.error('Failed to fetch kanban tasks:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const columns = [
    { key: 'todo', title: 'To Do', color: 'text-red-400', gradient: 'from-red-500/20 to-transparent' },
    { key: 'inprogress', title: 'In Progress', color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-transparent' },
    { key: 'done', title: 'Done', color: 'text-green-400', gradient: 'from-green-500/20 to-transparent' },
  ] as const;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <Card key={col.key} className="flex flex-col border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="h-6 w-24 rounded bg-muted animate-pulse" />
              <div className="mt-1.5 h-4 w-16 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-border/30 bg-bg/50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                    <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(col => (
        <Card
          key={col.key}
          className="flex flex-col border border-border/50 bg-surface-card rounded-2xl overflow-hidden group"
        >
          <CardHeader className="pb-4 relative">
            <div className={cn('absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity', col.gradient)} />
            <CardTitle className={cn('text-xl font-semibold relative z-10', col.color)}>
              {col.title}
            </CardTitle>
            <p className="text-sm text-muted mt-1.5 relative z-10">
              {tasks[col.key].length} tasks
            </p>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 relative z-10">
            {tasks[col.key].map(task => {
              const tagKey = task.tags[0]?.toLowerCase() || 'general';
              const tagColor = tagColors[tagKey] || tagColors.general;
              return (
                <div
                  key={task.id}
                  className="group p-5 rounded-xl border border-border/50 bg-bg hover:bg-surface-hover hover:border-accent/40 transition-all cursor-pointer shadow-sm hover:shadow-glow-sm relative"
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded hover:bg-border/50">
                      <MoreHorizontal size={16} className="text-muted" />
                    </button>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'px-3 py-1 rounded-full text-xs uppercase font-semibold border',
                        tagColor.bg,
                        tagColor.text,
                        tagColor.border
                      )}
                    >
                      {tagKey}
                    </div>
                    <div className="text-sm" title={task.priority}>
                      {priorityIcons[task.priority]}
                    </div>
                  </div>
                  <p className="text-base text-fg leading-relaxed">{task.title}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
