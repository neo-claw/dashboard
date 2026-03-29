import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Clock, Bell, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
}

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

function getEventType(ev: CalendarEvent): string {
  const summary = ev.summary.toLowerCase();
  if (summary.includes('class') || summary.includes('buad') || summary.includes('phil')) return 'class';
  if (summary.includes('holiday')) return 'holiday';
  return 'meeting';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    try {
      setError(null);
      const res = await fetch('/api/v1/calendar');
      if (res.ok) {
        const data: CalendarResponse = await res.json();
        setEvents(data.events);
      } else {
        setError('Failed to load calendar');
      }
    } catch (e) {
      console.error('Calendar fetch error:', e);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Group events: Today (based on current date) and Upcoming
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(ev => new Date(ev.start.dateTime).toISOString().split('T')[0] === today);
  const upcomingEvents = events.filter(ev => new Date(ev.start.dateTime) > new Date());

  if (loading) {
    return (
      <Card className="border border-border/50 bg-surface-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="h-8 w-1/3 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-1/2 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
                <div className="space-y-4">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="p-5 rounded-2xl border border-border/30 bg-bg/50">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                        <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                      </div>
                      <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { day: `Today (${formatDate(new Date().toISOString())})`, items: todayEvents },
    { day: 'Upcoming', items: upcomingEvents },
  ];

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
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-8">
          {sections.map(section => (
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
                  {section.items.map((ev) => {
                    const type = getEventType(ev);
                    const config = eventConfig[type] || eventConfig.meeting;
                    return (
                      <div
                        key={ev.id}
                        className="group p-5 rounded-2xl bg-bg border border-border/50 hover:border-accent/40 hover:bg-surface-hover transition-all hover:shadow-glow-sm"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn('text-base border-0', config.gradient, 'text-fg')}
                            >
                              {formatDate(ev.start.dateTime)}
                            </Badge>
                            <span className={cn('px-3 py-1 rounded-full text-sm uppercase font-semibold border', config.border, config.gradient)}>
                              {config.icon}
                              {config.label}
                            </span>
                          </div>
                          <span className="text-sm text-muted flex items-center gap-2 shrink-0">
                            <Clock size={16} /> {formatTime(ev.start.dateTime)}
                          </span>
                        </div>
                        <p className="text-xl text-fg group-hover:text-accent transition-colors font-medium">
                          {ev.summary}
                        </p>
                        {ev.location && (
                          <div className="mt-3 flex items-center gap-2.5 text-base text-muted">
                            <MapPin size={18} />
                            <span>{ev.location}</span>
                          </div>
                        )}
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
