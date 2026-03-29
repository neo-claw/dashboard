import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';
import { createCache } from '../cache/simpleCache';

const learningsCache = createCache<any[]>(60_000); // 60s TTL

interface LearningEntry {
  date: string;
  text: string;
  category: string;
  source: string;
}

export function registerLearningsEndpoint(app: any, workspaceRoot: string) {
  app.get('/api/v1/learnings', async (req: Request, res: Response) => {
    const cached = learningsCache.get('learnings');
    if (cached) {
      console.log('[learnings] cache HIT');
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.json(cached);
    }
    console.log('[learnings] cache MISS');

    try {
      const learnings: LearningEntry[] = [];

      // Read LEARNINGS.md
      const learningsPath = join(workspaceRoot, 'LEARNINGS.md');
      try {
        const learningsContent = await readFile(learningsPath, 'utf-8');
        const entries = parseLearningsMd(learningsContent);
        learnings.push(...entries);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error reading LEARNINGS.md:', err.message);
        }
      }

      // Read memory/*.md files
      const memoryDir = join(workspaceRoot, 'memory');
      try {
        const files = await readdir(memoryDir);
        const mdFiles = files.filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/));
        
        for (const file of mdFiles) {
          const filePath = join(memoryDir, file);
          const content = await readFile(filePath, 'utf-8');
          const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})\.md/);
          const date = dateMatch ? dateMatch[1] : file.replace('.md', '');
          
          const entries = parseMemoryMd(content, date, file);
          learnings.push(...entries);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error reading memory dir:', err.message);
        }
      }

      // Sort by date descending
      learnings.sort((a, b) => b.date.localeCompare(a.date));

      learningsCache.set('learnings', learnings);
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json(learnings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

function parseLearningsMd(content: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  const lines = content.split('\n');
  
  let currentDate = '';
  let currentSection = '';
  
  for (const line of lines) {
    // Match date headers like "## 2026-03-28" or "## 2026-03-29 (Automated)"
    const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      currentSection = 'general';
      continue;
    }
    
    // Match section headers like "**Session 1:**" or "**Tasks**"
    const sectionMatch = line.match(/^\*\*([^*]+)\*\*/);
    if (sectionMatch && currentDate) {
      currentSection = sectionMatch[1].replace(':', '').trim().toLowerCase();
      continue;
    }
    
    // Match bullet points
    if (line.trim().startsWith('- ') && currentDate) {
      const text = line.trim().substring(2).trim();
      if (text && text.length > 0 && !text.startsWith('<!--')) {
        entries.push({
          date: currentDate,
          text: text,
          category: currentSection || 'general',
          source: 'LEARNINGS.md'
        });
      }
    }
  }
  
  return entries;
}

function parseMemoryMd(content: string, date: string, filename: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  const lines = content.split('\n');
  
  let currentCategory = 'general';
  
  for (const line of lines) {
    // Match section headers like "## Tasks" or "## Notes"
    const sectionMatch = line.match(/^##\s+([^\n]+)/);
    if (sectionMatch) {
      currentCategory = sectionMatch[1].trim().toLowerCase();
      continue;
    }
    
    // Match bullet points (tasks or notes)
    if (line.trim().startsWith('- ') || line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ')) {
      let text = line.trim();
      // Remove task checkbox prefix
      text = text.replace(/^-\s+\[[ x]\]\s+/, '- ');
      text = text.substring(2).trim();
      
      if (text && text.length > 0) {
        entries.push({
          date: date,
          text: text,
          category: currentCategory,
          source: filename
        });
      }
    }
  }
  
  return entries;
}