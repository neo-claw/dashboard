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
    icon: <Bell size={16} />,
    gradient: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30',
    border: 'border-blue-500/40',
    label: 'Class',
  },
  holiday: {
    icon: <CalendarIcon size={16} />,
    gradient: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30',
    border: 'border-purple-500/40',
    label: 'Holiday',
  },
  meeting: {
    icon: <Clock size={16} />,
    gradient: 'bg-gradient-to-r from-orange-500/30 to-amber-500/30',
    border: 'border-orange-500/40',
    label: 'Meeting',
  },
};

export default function Calendar() {
  return (
    <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="p-2.5 rounded-lg bg-accent/10">
            <CalendarIcon className="text-accent" size={24} />
          </div>
          Calendar
        </CardTitle>
        <p className="text-base text-muted mt-2">
          Upcoming events and schedule
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {mockEvents.map(section => (
            <div key={section.day}>
              <h4 className="text-lg font-semibold text-accent uppercase tracking-wider mb-4">
                {section.day}
              </h4>
              {section.items.length === 0 ? (
                <div className="text-center py-10 text-base text-muted bg-bg/50 rounded-2xl border border-border/30">
                  <CalendarIcon size={32} className="mx-auto mb-3 opacity-20" />
                  <p>No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {section.items.map((ev, i) => {
                    const config = eventConfig[ev.type] || eventConfig.meeting;
                    return (
                      <div
                        key={i}
                        className="group p-5 rounded-2xl bg-bg border border-border/50 hover:border-accent/40 hover:bg-surface-hover transition-all hover:shadow-glow-sm"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn('text-base border-0', config.gradient, 'text-fg')}
                            >
                              {ev.date}
                            </Badge>
                            <span className={cn('px-3 py-1 rounded-full text-sm uppercase font-semibold', config.gradient)}>
                              {config.icon}
                              {config.label}
                            </span>
                          </div>
                          <span className="text-sm text-muted flex items-center gap-2 shrink-0">
                            <Clock size={16} /> {ev.time}
                          </span>
                        </div>
                        <p className="text-xl text-fg group-hover:text-accent transition-colors font-medium">
                          {ev.title}
                        </p>
                        <div className="mt-3 flex items-center gap-2.5 text-base text-muted">
                          <MapPin size={18} />
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
