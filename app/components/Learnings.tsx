import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockLearnings = [
  { date: '2026-03-28', text: 'Added SWE evaluator to filter bloat; Trinity now scores utility before building.' },
  { date: '2026-03-28', text: 'Implemented auto-commit to brain repo for learnings and Trinity logs.' },
  { date: '2026-03-27', text: 'Discovered movie screening in USC calendar via gws q search.' },
];

export default function Learnings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Learnings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockLearnings.map((l, i) => (
            <div key={i} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{l.date}</Badge>
              </div>
              <p>{l.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
