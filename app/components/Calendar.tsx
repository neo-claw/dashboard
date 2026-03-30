import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { Calendar as CalendarIcon, MapPin, Clock, FileText, Video, Link } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  meetNotes?: Array<{
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
    webViewLink?: string;
  }>;
}

function getEventType(ev: CalendarEvent): string {
  const summary = ev.summary.toLowerCase();
  if (summary.includes('class') || summary.includes('buad') || summary.includes('phil')) return 'class';
  if (summary.includes('holiday')) return 'holiday';
  return 'meeting';
}

function formatDate(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (timeZone) options.timeZone = timeZone;
  return d.toLocaleDateString('en-US', options);
}

function formatTime(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (timeZone) options.timeZone = timeZone;
  return d.toLocaleTimeString('en-US', options);
}

export default async function Calendar() {
  let events: CalendarEvent[] = [];
  try {
    const calendarRes = await fetch('/api/calendar', {
      next: { revalidate: 300 },
    });

    if (calendarRes.ok) {
      const data = await calendarRes.json();
      events = data.events;
    } else {
      console.error('Failed to load calendar events:', calendarRes.status, calendarRes.statusText);
    }
  } catch (err) {
    console.error('Error fetching calendar:', err);
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
                          {formatDate(ev.start.dateTime, ev.start.timeZone)}
                        </span>
                        <span className={cn('px-3 py-1 rounded-full text-sm uppercase', config.class)}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-sm text-muted flex items-center gap-2 shrink-0">
                        <Clock size={16} /> {formatTime(ev.start.dateTime, ev.start.timeZone)}
                      </span>
                    </div>
                    <p className="text-xl text-fg font-medium">{ev.summary}</p>
                    {ev.location && (
                      <div className="mt-3 flex items-center gap-2.5 text-base text-muted">
                        <MapPin size={18} />
                        <span>{ev.location}</span>
                      </div>
                    )}
                    
                    {/* Meet Notes Section */}
                    {ev.meetNotes && ev.meetNotes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <p className="text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                          <FileText size={16} data-testid="FileTextIcon" />
                          Meeting Notes & Recordings
                        </p>
                        <div className="space-y-2">
                          {ev.meetNotes.map(note => {
                            const isVideo = note.mimeType.includes('video');
                            const Icon = isVideo ? Video : FileText;
                            return (
                              <a
                                key={note.id}
                                href={note.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-bg/60 border border-border/30 hover:border-accent/50 hover:bg-bg transition-all group"
                                data-testid={isVideo ? "video-note-link" : "doc-note-link"}
                              >
                                <Icon size={18} className="text-accent shrink-0" data-testid={isVideo ? "Video" : "FileText"} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-fg truncate group-hover:text-accent transition-colors">
                                    {note.name}
                                  </p>
                                  <p className="text-xs text-muted truncate">
                                    {new Date(note.createdTime).toLocaleDateString()}
                                  </p>
                                </div>
                                <Link size={14} className="text-muted group-hover:text-accent transition-colors" />
                              </a>
                            );
                          })}
                        </div>
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