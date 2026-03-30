'use client';

import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/panel';
import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
}

const tagColors: Record<string, { bg: string; text: string }> = {
  ops: { bg: 'bg-blue-500/15', text: 'text-blue-300' },
  deploy: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  core: { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  tooling: { bg: 'bg-orange-500/15', text: 'text-orange-300' },
  done: { bg: 'bg-gray-500/15', text: 'text-gray-300' },
  general: { bg: 'bg-slate-500/15', text: 'text-slate-300' },
};

const priorityMap: Record<string, { label: string; class: string }> = {
  high: { label: 'High', class: 'text-red-400' },
  medium: { label: 'Medium', class: 'text-yellow-400' },
  low: { label: 'Low', class: 'text-emerald-400' },
};

export default function Kanban() {
  const [tasks, setTasks] = useState<{ todo: Task[]; inprogress: Task[]; done: Task[] }>({
    todo: [],
    inprogress: [],
    done: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    tags: '',
    assignee: '',
    project: 'general',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      // Use the Next.js API proxy route
      const res = await fetch('/api/v1/kanban/tasks', { next: { revalidate: 0 } });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      console.error('Fetch tasks error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        assignee: formData.assignee,
        project: formData.project,
      };
      const res = await fetch('/api/v1/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      // Reset form and refresh tasks
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        tags: '',
        assignee: '',
        project: 'general',
      });
      setShowForm(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'todo', title: 'To Do', accent: 'border-red-500/40', accentBg: 'bg-red-500/10' },
    { key: 'inprogress', title: 'In Progress', accent: 'border-yellow-500/40', accentBg: 'bg-yellow-500/10' },
    { key: 'done', title: 'Done', accent: 'border-emerald-500/40', accentBg: 'bg-emerald-500/10' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Kanban Board</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors'
          )}
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {showForm && (
        <Panel className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="e.g., dashboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  rows={2}
                  placeholder="Detailed description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="e.g., backend, infra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="todo">Todo</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assignee (optional)</label>
                <input
                  type="text"
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full p-2 rounded bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="Assignee name"
                />
              </div>
            </div>
            {error && <div className="text-red-400 text-sm">Error: {error}</div>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded bg-surface hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <Panel key={col.key} className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('text-lg font-semibold', col.accent.replace('border-', 'text-'))}>
                {col.title}
              </h3>
              <span className="text-sm text-muted">{tasks[col.key].length}</span>
            </div>
            <div className="flex-1 space-y-3">
              {tasks[col.key].map(task => {
                const tagKey = task.tags[0]?.toLowerCase() || 'general';
                const tagColor = tagColors[tagKey] || tagColors.general;
                const priority = priorityMap[task.priority];
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-border/30 bg-bg hover:bg-surface-hover hover:border-accent/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className={cn('text-xs border-0', tagColor.bg, tagColor.text)}>
                        {tagKey}
                      </Badge>
                      <span className={cn('text-xs font-mono', priority.class)}>{priority.label}</span>
                    </div>
                    <p className="text-base text-fg leading-relaxed">{task.title}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
