import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';
import yaml from 'js-yaml';
import { exec } from 'child_process';

interface Task {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
  updated: string;
  assignee?: string;
  project: string;
  source: 'memory' | 'tasks';
}

export function registerKanbanEndpoint(app: any, workspaceRoot: string) {
  // GET /api/v1/kanban/tasks - Returns merged tasks from MEMORY.md and tasks/*.md
  app.get('/api/v1/kanban/tasks', async (req: Request, res: Response) => {
    try {
      const [memoryTasks, filesystemTasks] = await Promise.all([
        parseTasksFromMemory(join(workspaceRoot, 'MEMORY.md')),
        parseTasksFromFilesystem(join(workspaceRoot, 'tasks')),
      ]);

      // Merge and sort by updated date (newest first)
      const allTasks = [...memoryTasks, ...filesystemTasks].sort((a, b) => {
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

      const result = {
        todo: allTasks.filter(t => t.status === 'todo'),
        inprogress: allTasks.filter(t => t.status === 'inprogress'),
        done: allTasks.filter(t => t.status === 'done'),
      };

      res.json(result);
    } catch (err: any) {
      console.error('Kanban GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/v1/kanban/tasks - Create a new task
  app.post('/api/v1/kanban/tasks', async (req: Request, res: Response) => {
    try {
      const { title, description, status, priority, tags, assignee, project } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const now = new Date().toISOString();
      const id = generateTaskId(title, now);
      const tasksDir = join(workspaceRoot, 'tasks');

      // Ensure tasks directory exists
      await mkdir(tasksDir, { recursive: true });

      const task: Task = {
        id,
        title,
        description: description || '',
        status: (status as Task['status']) || 'todo',
        priority: (priority as Task['priority']) || 'medium',
        tags: tags || ['general'],
        createdAt: now,
        updated: now,
        assignee: assignee || '',
        project: project || 'general',
        source: 'tasks',
      };

      const filename = `${id}.md`;
      const filepath = join(tasksDir, filename);

      const content = `---\n${yaml.dump(task)}---\n\n# ${title}\n\n${task.description}\n`;
      await writeFile(filepath, content, 'utf-8');

      // Touch marker for cache refresh
      try {
        await writeFile(join(tasksDir, '.last_updated'), now, 'utf-8');
      } catch (e) {
        // ignore
      }

      // Git: stage and commit but don't fail if git fails
      try {
        await stageCommit(`task: create "${title}"`, tasksDir);
      } catch (e) {
        console.warn('Git commit failed:', e);
      }

      res.status(201).json(task);
    } catch (err: any) {
      console.error('Kanban POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// Parse tasks from tasks/*.md files
async function parseTasksFromFilesystem(tasksDir: string): Promise<Task[]> {
  try {
    const files = await readdir(tasksDir);
    const taskFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
    const tasks: Task[] = [];

    for (const file of taskFiles) {
      try {
        const content = await readFile(join(tasksDir, file), 'utf-8');
        const parts = content.split('---');
        if (parts.length >= 3) {
          const frontmatter = yaml.load(parts[1]) as any;
          if (frontmatter && frontmatter.id && frontmatter.title) {
            tasks.push({
              ...frontmatter,
              source: 'tasks',
              tags: frontmatter.tags || [],
              priority: frontmatter.priority || 'medium',
              status: frontmatter.status || 'todo',
              createdAt: frontmatter.created || new Date().toISOString(),
              updated: frontmatter.updated || frontmatter.created || new Date().toISOString(),
              project: frontmatter.project || 'general',
            } as Task);
          }
        }
      } catch (err) {
        console.warn(`Failed to parse task file ${file}:`, err instanceof Error ? err.message : String(err));
      }
    }

    return tasks;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

// Parse tasks from MEMORY.md (Projects section)
async function parseTasksFromMemory(memoryPath: string): Promise<Task[]> {
  try {
    const content = await readFile(memoryPath, 'utf-8');
    const tasks: Task[] = [];

    const lines = content.split('\n');
    let inProjects = false;

    for (const line of lines) {
      if (line.match(/^## Projects/i)) {
        inProjects = true;
        continue;
      }
      if (inProjects && line.match(/^## /)) {
        inProjects = false;
        break;
      }
      if (!inProjects) continue;

      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
      const bulletMatch = line.match(/^-\s+(.+)$/);

      if (checkboxMatch || bulletMatch) {
        const checked = checkboxMatch ? checkboxMatch[1] === 'x' : false;
        const title = checkboxMatch ? checkboxMatch[2] : bulletMatch![1];

        let status: Task['status'] = 'todo';
        if (checked) status = 'done';

        const tags: string[] = [];
        const tagMatch = title.match(/\[([^\]]+)\]/);
        let cleanTitle = title;
        if (tagMatch) {
          tags.push(tagMatch[1].toLowerCase());
          cleanTitle = title.replace(/\[[^\]]+\]\s*/, '');
        }

        let priority: Task['priority'] = 'medium';
        if (cleanTitle.includes('!') || cleanTitle.toLowerCase().includes('urgent')) {
          priority = 'high';
        } else if (cleanTitle.toLowerCase().includes('low')) {
          priority = 'low';
        }

        const now = new Date().toISOString();
        tasks.push({
          id: generateTaskId(cleanTitle, now),
          title: cleanTitle.trim(),
          tags,
          priority,
          status,
          createdAt: now,
          updated: now,
          project: 'general',
          source: 'memory',
        });
      }
    }

    return tasks;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function generateTaskId(title: string, date: Date | string): string {
  const timestamp = typeof date === 'string' ? date : date.toISOString();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
  const ts = timestamp.replace(/[:.]/g, '-').substring(0, 19);
  return `${ts}-${slug}`;
}

// Simple git commit helper (stages tasks directory)
async function stageCommit(message: string, tasksDir: string): Promise<void> {
  try {
    // Stage tasks directory
    await execAsync('git add .', { cwd: tasksDir });
    // Check for changes
    const output = await execAsync('git diff --cached --quiet || echo "has-changes"', { cwd: tasksDir });
    if (output.includes('has-changes')) {
      const escapedMsg = message.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${escapedMsg}"`, { cwd: tasksDir });
    }
  } catch (err) {
    // Silently ignore git errors; it's optional
    console.warn('Git commit failed:', err);
  }
}

function execAsync(command: string, options?: any): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(String(stdout));
    });
  });
}
