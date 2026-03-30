import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';

interface Task {
  id: string;
  title: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
}

const tagColors: Record<string, { bg: string; text: string }> = {
  ops: { bg: 'bg-blue-500/15', text: 'text-blue-300' },
  deploy: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  core: { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  tooling: { bg: 'bg-orange-500/15', text: 'text-orange-300' },
  done: { bg: 'bg-gray-500/15', text: 'text-gray-300' },
  general: { bg: 'bg-slate-500/15', text: 'text-slate-300' },
};

const priorityMap: Record<string, { label: string; class: string }> = {
  high: { label: 'High', class: 'text-red-400' },
  medium: { label: 'Medium', class: 'text-yellow-400' },
  low: { label: 'Low', class: 'text-emerald-400' },
};

export default async function Kanban() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY;

  const tasksRes = await fetch(`${baseUrl}/api/v1/kanban/tasks`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  let tasks: { todo: Task[]; inprogress: Task[]; done: Task[] } = { todo: [], inprogress: [], done: [] };
  if (tasksRes.ok) {
    const data = await tasksRes.json();
    tasks = data;
  }

  const columns = [
    { key: 'todo', title: 'To Do', accent: 'border-red-500/40', accentBg: 'bg-red-500/10' },
    { key: 'inprogress', title: 'In Progress', accent: 'border-yellow-500/40', accentBg: 'bg-yellow-500/10' },
    { key: 'done', title: 'Done', accent: 'border-emerald-500/40', accentBg: 'bg-emerald-500/10' },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(col => (
        <Panel key={col.key} className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn('text-lg font-semibold', col.accent.replace('border-', 'text-'))}>
              {col.title}
            </h3>
            <span className="text-sm text-muted">{tasks[col.key].length}</span>
          </div>
          <div className="flex-1 space-y-3">
            {tasks[col.key].map(task => {
              const tagKey = task.tags[0]?.toLowerCase() || 'general';
              const tagColor = tagColors[tagKey] || tagColors.general;
              const priority = priorityMap[task.priority];
              return (
                <div
                  key={task.id}
                  className="p-4 rounded-xl border border-border/30 bg-bg hover:bg-surface-hover hover:border-accent/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={cn('text-xs border-0', tagColor.bg, tagColor.text)}>
                      {tagKey}
                    </Badge>
                    <span className={cn('text-xs font-mono', priority.class)}>{priority.label}</span>
                  </div>
                  <p className="text-base text-fg leading-relaxed">{task.title}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}