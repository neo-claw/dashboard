import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockEvents = [
  { day: 'Today (Mar 28)', items: [] },
  { day: 'Upcoming', items: [
    { date: 'Mar 30', title: 'BUAD 497', location: 'Class', time: '10:00 AM', type: 'class' },
    { date: 'Mar 31', title: 'PHIL 246', location: 'Class', time: '02:00 PM', type: 'class' },
    { date: 'Apr 5', title: 'Easter Sunday', location: 'Holiday', time: 'All day', type: 'holiday' },
  ]},
];

const eventConfig: Record<string, { icon: React.ReactNode; gradient: string; border: string; label: string }> = {
  class: {
    icon: <Bell size={12} />,
    gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    label: 'Class',
  },
  holiday: {
    icon: <CalendarIcon size={12} />,
    gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    label: 'Holiday',
  },
  meeting: {
    icon: <Clock size={12} />,
    gradient: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20',
    border: 'border-orange-500/30',
    label: 'Meeting',
  },
};

export default function Calendar() {
  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-accent/10">
            <CalendarIcon className="text-accent" size={20} />
          </div>
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
                <div className="text-center py-6 text-sm text-muted bg-bg/50 rounded-xl border border-border/30">
                  <CalendarIcon size={28} className="mx-auto mb-2 opacity-20" />
                  <p>No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {section.items.map((ev, i) => {
                    const config = eventConfig[ev.type] || eventConfig.meeting;
                    return (
                      <div
                        key={i}
                        className="group p-4 rounded-xl bg-bg border border-border/50 hover:border-accent/40 hover:bg-surface-hover transition-all hover:shadow-glow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('text-xs border-0', config.gradient, 'text-fg')}
                            >
                              {ev.date}
                            </Badge>
                            <span className={cn('px-2 py-0.5 rounded text-[10px] uppercase font-semibold', config.gradient)}>
                              {config.icon}
                              {config.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted flex items-center gap-1 shrink-0">
                            <Clock size={12} /> {ev.time}
                          </span>
                        </div>
                        <p className="text-sm text-fg group-hover:text-accent transition-colors font-medium">
                          {ev.title}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <MapPin size={12} />
                          <span>{ev.location}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

