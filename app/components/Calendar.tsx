import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
}

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

export default async function Calendar() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.BACKEND_API_KEY;

  const calendarRes = await fetch(`${baseUrl}/api/v1/calendar`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  let events: CalendarEvent[] = [];
  if (calendarRes.ok) {
    const data = await calendarRes.json();
    events = data.events;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(ev => new Date(ev.start.dateTime).toISOString().split('T')[0] === today);
  const upcomingEvents = events.filter(ev => new Date(ev.start.dateTime) > new Date());

  const sections = [
    { day: `Today (${formatDate(new Date().toISOString())})`, items: todayEvents },
    { day: 'Upcoming', items: upcomingEvents },
  ];

  return (
    <div className="space-y-8">
      {sections.map(section => (
        <Panel key={section.day}>
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
                const config = {
                  class: { label: 'Class', class: 'text-blue-300' },
                  holiday: { label: 'Holiday', class: 'text-purple-300' },
                  meeting: { label: 'Meeting', class: 'text-orange-300' },
                }[type] || { label: 'Event', class: 'text-muted' };
                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl bg-bg border border-border/40 hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-sm font-mono bg-accent/10 text-accent border border-accent/30">
                          {formatDate(ev.start.dateTime)}
                        </span>
                        <span className={cn('px-3 py-1 rounded-full text-sm uppercase', config.class)}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-sm text-muted flex items-center gap-2 shrink-0">
                        <Clock size={16} /> {formatTime(ev.start.dateTime)}
                      </span>
                    </div>
                    <p className="text-xl text-fg font-medium">{ev.summary}</p>
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
        </Panel>
      ))}
    </div>
  );
}