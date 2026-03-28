import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const mockEvents = [
  { day: 'Today (Mar 28)', items: [] },
  { day: 'Upcoming', items: [
    { date: 'Mar 30', title: 'BUAD 497', location: 'Class' },
    { date: 'Mar 31', title: 'PHIL 246', location: 'Class' },
    { date: 'Apr 5', title: 'Easter Sunday', location: 'Holiday' },
  ]},
];

export default function Calendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockEvents.map(section => (
            <div key={section.day}>
              <h4 className="text-accent font-semibold mb-2">{section.day}</h4>
              {section.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events.</p>
              ) : (
                <ul className="space-y-2">
                  {section.items.map((ev, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{ev.date}</span>: {ev.title}{' '}
                      <span className="text-muted-foreground">({ev.location})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
