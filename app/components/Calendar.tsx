import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockEvents = [
  { day: 'Today (Mar 28)', items: [] },
  { day: 'Upcoming', items: [
    { date: 'Mar 30', title: 'BUAD 497', location: 'Class', time: '10:00 AM' },
    { date: 'Mar 31', title: 'PHIL 246', location: 'Class', time: '02:00 PM' },
    { date: 'Apr 5', title: 'Easter Sunday', location: 'Holiday', time: 'All day' },
  ]},
];

const eventColors: Record<string, string> = {
  Class: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Holiday: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Meeting: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export default function Calendar() {
  return (
    <Card className="border border-border bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="text-accent" size={20} />
          Calendar
        </CardTitle>
        <p className="text-xs text-muted mt-1">
          Upcoming events and schedule
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {mockEvents.map(section => (
            <div key={section.day}>
              <h4 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
                {section.day}
              </h4>
              {section.items.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted bg-bg rounded-lg border border-dashed border-border">
                  <CalendarIcon size={24} className="mx-auto mb-2 opacity-30" />
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-2">
                  {section.items.map((ev, i) => (
                    <div
                      key={i}
                      className="group p-3 rounded-lg border border-border bg-bg hover:border-accent/40 hover:bg-surface-hover transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg">{ev.date}</span>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] border', eventColors[ev.location] || eventColors.Default)}
                          >
                            {ev.location}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock size={12} /> {ev.time}
                        </span>
                      </div>
                      <p className="text-sm text-fg group-hover:text-accent transition-colors">
                        {ev.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

