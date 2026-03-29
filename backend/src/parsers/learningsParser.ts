import { promises as fs } from 'fs';
import path from 'path';
import type { Learning } from '../types';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';
const LEARNINGS_PATH = path.join(WORKSPACE_ROOT, 'LEARNINGS.md');

export async function parseLearnings(): Promise<Learning[]> {
  let content: string;
  try {
    content = await fs.readFile(LEARNINGS_PATH, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  // Parse markdown: entries separated by date headings (## YYYY-MM-DD)
  // Under each heading, bullet list items start with "- ".
  const lines = content.split('\n');
  const entries: Learning[] = [];
  let currentDate: string | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }
    const bulletMatch = line.match(/^-\s+(.*)/);
    if (bulletMatch && currentDate) {
      const bullet = bulletMatch[1].trim();
      if (bullet) {
        entries.push({
          id: `${currentDate}-${entries.length}`,
          entryDate: currentDate,
          bullet,
          sourceFile: 'LEARNINGS.md',
          lineNumber,
        });
      }
    }
  }
  // Reverse to have latest first
  return entries.reverse();
}
