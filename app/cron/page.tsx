'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Panel from '@/components/ui/panel';
import Modal from '@/components/Modal';
import { Clock, CheckCircle, XCircle, AlertTriangle, Play, Edit, History, ExternalLink } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    expr?: string;
    kind: string;
    tz?: string;
  };
  state: {
    nextRunAtMs: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastStatus?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
  };
}

interface CronRun {
  ts: number;
  jobId: string;
  action: string;
  status: 'ok' | 'error';
  summary?: string;
  error?: string;
  runAtMs: number;
  durationMs: number;
  nextRunAtMs: number;
  sessionKey?: string;
}

function formatRelativeTime(ms: number): string {
  const now = Date.now();
  const diff = ms - now;
  const sign = diff > 0 ? '+' : '';
  const seconds = Math.round(Math.abs(diff) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 60) return `${sign}${seconds}s`;
  if (minutes < 60) return `${sign}${minutes}m`;
  if (hours < 24) return `${sign}${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatAbsoluteTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status?: string): 'success' | 'error' | 'warning' | 'default' {
  switch (status) {
    case 'ok': return 'success';
    case 'error': return 'error';
    case 'degraded': return 'warning';
    default: return 'default';
  }
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runsMap, setRunsMap] = useState<Record<string, CronRun[]>>({});
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [editSchedule, setEditSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedRun, setSelectedRun] = useState<{ job: CronJob; run: CronRun } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes] = await Promise.all([
        fetch('/api/v1/cron'),
      ]);
      const jobsData = await jobsRes.json();

      if (jobsData.error) throw new Error(jobsData.error);
      const jobsList = jobsData.jobs || [];

      // Fetch runs for each job (limit 10 for history)
      const runsByJob: Record<string, CronRun[]> = {};
      await Promise.all(
        jobsList.map(async (job: CronJob) => {
          try {
            const runsRes = await fetch(`/api/v1/cron/${job.id}/runs?limit=10`);
            const runsData = await runsRes.json();
            runsByJob[job.id] = runsData.entries || [];
          } catch {
            runsByJob[job.id] = [];
          }
        })
      );

      setJobs(jobsList);
      setRunsMap(runsByJob);
    } catch (err: any) {
      console.error('Failed to fetch cron data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunNow = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const res = await fetch(`/api/v1/cron/${jobId}/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run job');
      // Wait a moment then refresh data
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunningJobId(null);
    }
  };

  const openEditModal = (job: CronJob) => {
    setEditingJob(job);
    setEditSchedule(job.schedule.expr || '');
  };

  const closeEditModal = () => {
    setEditingJob(null);
    setEditSchedule('');
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/cron/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: editSchedule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule');
      closeEditModal();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Compute overall cron health (similar to backend logic)
  const cronHealth = useMemo(() => {
    const now = Date.now();
    let lastSuccessMs = 0;
    for (const job of jobs) {
      if (job.enabled && job.state?.lastRunStatus === 'ok' && job.state.lastRunAtMs) {
        if (job.state.lastRunAtMs > lastSuccessMs) lastSuccessMs = job.state.lastRunAtMs;
      }
    }
    if (lastSuccessMs === 0) return { status: 'down', message: 'No successful runs from enabled jobs.' };
    const diffHours = (now - lastSuccessMs) / (1000 * 60 * 60);
    if (diffHours < 2) return { status: 'ok', message: `Last success was ${Math.round(diffHours * 10) / 10}h ago.` };
    if (diffHours < 6) return { status: 'degraded', message: `Last success was ${Math.round(diffHours)}h ago.` };
    return { status: 'down', message: `Last success was ${Math.round(diffHours)}h ago.` };
  }, [jobs]);

  // Jobs scheduled in next 24h
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const upcomingJobs = useMemo(() => {
    return jobs
      .filter(job => job.enabled && job.state.nextRunAtMs > now && job.state.nextRunAtMs <= now + twentyFourHoursMs)
      .sort((a, b) => a.state.nextRunAtMs - b.state.nextRunAtMs);
  }, [jobs]);

  if (loading) {
    return (
      <Panel className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted">Loading cron jobs...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Panel */}
      <Card className="bg-gradient-to-br from-surface-card to-accent/5 border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {cronHealth.status === 'ok' && <CheckCircle className="text-emerald-400" size={24} />}
            {cronHealth.status === 'degraded' && <AlertTriangle className="text-amber-400" size={24} />}
            {cronHealth.status === 'down' && <XCircle className="text-red-400" size={24} />}
            <div>
              <CardTitle>Cron Health: {cronHealth.status.charAt(0).toUpperCase() + cronHealth.status.slice(1)}</CardTitle>
              <CardDescription>{cronHealth.message}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline: Next 24h */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          Upcoming (Next 24h)
        </h3>
        {upcomingJobs.length === 0 ? (
          <Card className="border-border/30">
            <CardContent className="py-8 text-center text-muted">
              No upcoming scheduled runs in the next 24 hours.
            </CardContent>
          </Card>
        ) : (
          <div className="relative bg-surface-card border border-border/30 rounded-lg p-6 overflow-x-auto">
            {/* Timeline ruler */}
            <div className="relative h-8 mb-6 border-b border-border/20">
              {[0, 6, 12, 18, 24].map(h => (
                <div key={h} className="absolute bottom-0 text-xs text-muted" style={{ left: `${(h / 24) * 100}%` }}>
                  <div className="h-2 w-px bg-border" style={{ marginLeft: '50%' }} />
                  <span className="mt-1 inline-block" style={{ transform: 'translateX(-50%)' }}>{h}h</span>
                </div>
              ))}
            </div>
            {/* Job markers */}
            <div className="relative h-12">
              {upcomingJobs.map(job => {
                const offset = ((job.state.nextRunAtMs - now) / twentyFourHoursMs) * 100;
                return (
                  <div
                    key={job.id}
                    className="absolute top-2 h-8 rounded-md bg-accent/80 hover:bg-accent transition-colors flex items-center px-2 text-xs text-bg font-medium cursor-pointer group"
                    style={{ left: `${offset}%`, transform: 'translateX(-50%)' }}
                    title={`${job.name} at ${formatAbsoluteTime(job.state.nextRunAtMs)}`}
                  >
                    <span className="truncate max-w-[8rem]">{job.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Job List & Controls */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History size={20} />
          Jobs & Recent Runs
        </h3>
        {jobs.length === 0 ? (
          <Card className="border-border/30">
            <CardContent className="py-8 text-center text-muted">
              No cron jobs configured.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map(job => {
            const lastRun = runsMap[job.id]?.[0];
            const status = lastRun?.status || (job.state.lastRunStatus as any) || 'unknown';
            const statusColor = getStatusColor(status);
            return (
              <Card key={job.id} className="border-border/30 flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{job.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {job.schedule.expr || job.schedule.kind}
                        {job.schedule.tz && ` (${job.schedule.tz})`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.enabled ? 'success' : 'secondary'}>
                        {job.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Status summary */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted">Next run:</span>
                    <span className="font-mono">
                      {formatRelativeTime(job.state.nextRunAtMs)} ({formatAbsoluteTime(job.state.nextRunAtMs)})
                    </span>
                  </div>
                  {lastRun && (
                    <div className="flex items-start gap-3 text-sm">
                      <Badge variant={statusColor} className="mt-0.5">
                        {status}
                      </Badge>
                      <div className="flex-1 cursor-pointer" onClick={() => status === 'error' && setSelectedRun({ job, run: lastRun })}>
                        <p className="text-muted truncate" title={lastRun.summary || lastRun.error || 'No summary'}>
                          {lastRun.summary ? lastRun.summary.slice(0, 120) + (lastRun.summary.length > 120 ? '...' : '') : lastRun.error || 'No details'}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatAbsoluteTime(lastRun.runAtMs)} · {Math.round(lastRun.durationMs / 1000)}s
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleRunNow(job.id)}
                      disabled={runningJobId === job.id || !job.enabled}
                      className="flex-1"
                      aria-label={`Run ${job.name} now`}
                    >
                      <Play size={14} className="mr-1" />
                      {runningJobId === job.id ? 'Running...' : 'Run now'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditModal(job)} aria-label={`Edit schedule for ${job.name}`}>
                      <Edit size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Edit Schedule Modal */}
      {editingJob && (
        <Modal open={true} onClose={closeEditModal} title={`Edit Schedule: ${editingJob.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Enter schedule in natural language, e.g., &quot;every 15 minutes&quot;, &quot;at 3pm daily&quot;, or a cron expression like &quot;*/15 * * * *&quot;.
            </p>
            <input
              type="text"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="every 15 min"
              value={editSchedule}
              onChange={e => setEditSchedule(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={closeEditModal} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editSchedule.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drill-down Modal for Failed Run */}
      {selectedRun && (
        <Modal open={true} onClose={() => setSelectedRun(null)} title="Run Failure Details">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="error">Failed</Badge>
              <span className="text-sm text-muted">{formatAbsoluteTime(selectedRun.run.runAtMs)}</span>
            </div>
            <div className="bg-background border border-border rounded-md p-3 text-sm">
              <p className="font-semibold mb-2">Error:</p>
              <pre className="whitespace-pre-wrap text-error font-mono text-xs">{selectedRun.run.error || 'Unknown error'}</pre>
            </div>
            <div className="bg-background border border-border rounded-md p-3 text-sm">
              <p className="font-semibold mb-2">Summary:</p>
              <p className="text-muted">{selectedRun.run.summary || 'No summary available.'}</p>
            </div>
            {selectedRun.run.sessionKey && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/sessions?key=${encodeURIComponent(selectedRun.run.sessionKey)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <ExternalLink size={14} />
                  View Session Trace
                </a>
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
