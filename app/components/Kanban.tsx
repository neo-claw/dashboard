import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockKanban = {
  todo: [
    { id: 1, title: 'Review GWS skill', tag: 'ops' },
    { id: 2, title: 'Add Vercel deployment', tag: 'deploy' },
  ],
  inprogress: [
    { id: 3, title: 'SWE evaluator loop', tag: 'core' },
    { id: 4, title: 'TypeScript template', tag: 'tooling' },
  ],
  done: [
    { id: 5, title: 'Set up Trinity cron', tag: 'done' },
    { id: 6, title: 'Create brain repo', tag: 'done' },
  ],
};

export default function Kanban() {
  const columns = [
    { key: 'todo', title: 'To Do' },
    { key: 'inprogress', title: 'In Progress' },
    { key: 'done', title: 'Done' },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => (
        <Card key={col.key}>
          <CardHeader>
            <CardTitle className="text-lg">{col.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockKanban[col.key].map(task => (
                <div key={task.id} className="border border-border rounded p-3 bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{task.tag}</Badge>
                  </div>
                  <p>{task.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
