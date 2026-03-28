import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const mockStats = [
  { label: 'Cron health', value: '✅ 5/5 succeeded' },
  { label: 'Brain commits', value: '12 today' },
  { label: 'Trinity cycles', value: '8/32 runs' },
  { label: 'GWS scanned', value: '3 new notes' },
];

export default function Overview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mockStats.map(s => (
          <Card key={s.label}>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">{s.value}</CardTitle>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>OpenClaw gateway running. All agents healthy. Morning digest scheduled for 07:30 PT.</p>
        </CardContent>
      </Card>
    </div>
  );
}
