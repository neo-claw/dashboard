import { readFile } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';

interface Task {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
}

export function registerKanbanEndpoint(app: any, workspaceRoot: string) {
  app.get('/api/v1/kanban/tasks', async (req: Request, res: Response) => {
    try {
      // Try to read from MEMORY.md Projects section first
      const memoryPath = join(workspaceRoot, 'MEMORY.md');
      const tasks = await parseTasksFromMemory(memoryPath);

      // If no tasks found, return empty structure
      const result = {
        todo: tasks.filter(t => t.status === 'todo'),
        inprogress: tasks.filter(t => t.status === 'inprogress'),
        done: tasks.filter(t => t.status === 'done')
      };

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

async function parseTasksFromMemory(memoryPath: string): Promise<Task[]> {
  try {
    const content = await readFile(memoryPath, 'utf-8');
    const tasks: Task[] = [];

    // Look for Projects section in MEMORY.md
    const lines = content.split('\n');
    let inProjects = false;
    let currentTag = 'general';
    
    for (const line of lines) {
      // Detect Projects section
      if (line.match(/^## Projects/i)) {
        inProjects = true;
        continue;
      }
      
      // Exit section on new header
      if (inProjects && line.match(/^## /)) {
        inProjects = false;
        break;
      }
      
      if (!inProjects) continue;
      
      // Look for task items (could be checkboxes or plain bullets)
      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
      const bulletMatch = line.match(/^-\s+(.+)$/);
      
      if (checkboxMatch || bulletMatch) {
        const checked = checkboxMatch ? checkboxMatch[1] === 'x' : false;
        const title = checkboxMatch ? checkboxMatch[2] : bulletMatch![1];
        
        // Determine status from checkbox
        let status: Task['status'] = 'todo';
        if (checked) status = 'done';
        
        // Extract tags if present in brackets like [tag]
        const tags: string[] = [];
        const tagMatch = title.match(/\[([^\]]+)\]/);
        let cleanTitle = title;
        if (tagMatch) {
          tags.push(tagMatch[1].toLowerCase());
          cleanTitle = title.replace(/\[[^\]]+\]\s*/, '');
        } else {
          cleanTitle = title;
        }
        
        // Detect priority from title keywords
        let priority: Task['priority'] = 'medium';
        if (cleanTitle.includes('!') || cleanTitle.toLowerCase().includes('urgent')) {
          priority = 'high';
        } else if (cleanTitle.toLowerCase().includes('low')) {
          priority = 'low';
        }
        
        tasks.push({
          id: generateTaskId(cleanTitle, tasks.length),
          title: cleanTitle.trim(),
          tags,
          priority,
          status,
          createdAt: new Date().toISOString().split('T')[0]
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

function generateTaskId(title: string, index: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  return `${slug}-${index}`;
}
