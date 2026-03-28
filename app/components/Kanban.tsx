import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const mockKanban = {
  todo: [
    { id: 1, title: 'Review GWS skill', tag: 'ops', priority: 'high' },
    { id: 2, title: 'Add Vercel deployment', tag: 'deploy', priority: 'medium' },
  ],
  inprogress: [
    { id: 3, title: 'SWE evaluator loop', tag: 'core', priority: 'high' },
    { id: 4, title: 'TypeScript template', tag: 'tooling', priority: 'low' },
  ],
  done: [
    { id: 5, title: 'Set up Trinity cron', tag: 'done', priority: 'high' },
    { id: 6, title: 'Create brain repo', tag: 'done', priority: 'medium' },
  ],
};

const tagColors: Record<string, string> = {
  ops: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  deploy: 'bg-green-500/20 text-green-300 border-green-500/30',
  core: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  tooling: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  done: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-green-500/20 text-green-300',
};

export default function Kanban() {
  const columns = [
    { key: 'todo', title: 'To Do', color: 'text-red-400' },
    { key: 'inprogress', title: 'In Progress', color: 'text-yellow-400' },
    { key: 'done', title: 'Done', color: 'text-green-400' },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => (
        <Card
          key={col.key}
          className="flex flex-col border border-border bg-surface"
        >
          <CardHeader className="pb-3">
            <CardTitle className={cn('text-lg font-semibold', col.color)}>
              {col.title}
            </CardTitle>
            <p className="text-xs text-muted mt-1">
              {mockKanban[col.key].length} tasks
            </p>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {mockKanban[col.key].map(task => (
              <div
                key={task.id}
                className="group p-3 rounded-lg border border-border bg-bg hover:bg-surface-hover hover:border-accent/30 transition-all cursor-pointer shadow-sm hover:shadow-glow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] uppercase tracking-wider border', tagColors[task.tag] || 'bg-gray-500/20')}
                  >
                    {task.tag}
                  </Badge>
                  <div className={cn('w-2 h-2 rounded-full mt-1', priorityColors[task.priority] || 'bg-gray-500')} />
                </div>
                <p className="text-sm text-fg leading-relaxed">{task.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

