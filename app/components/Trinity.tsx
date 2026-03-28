import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockRuns = [
  { time: '03:00', status: 'success', msg: 'Built SWE toolkit, agent patterns, templates, and showcase experiment.' },
  { time: '02:45', status: 'success', msg: 'Enhanced Decision Engine with ant‑inspired context question.' },
  { time: '02:30', status: 'success', msg: 'Created Agent Framework Decision Engine prototype (HTML + server).' },
  { time: '02:00', status: 'success', msg: 'Built Concept2Cards flashcard generator.' },
];

export default function Trinity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trinity Overnight Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {mockRuns.map((run, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground text-sm w-12">{run.time}</span>
              <Badge variant={run.status === 'success' ? 'default' : 'secondary'} className="mt-0.5">{run.status}</Badge>
              <span>{run.msg}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-muted text-sm">
          Latest log: <code className="bg-muted px-1 rounded">trinity/2026-03-28.md</code>
        </p>
      </CardContent>
    </Card>
  );
}
