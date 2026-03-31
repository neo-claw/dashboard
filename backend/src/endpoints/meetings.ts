import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';
import { createCache } from '../cache/simpleCache';

const execAsync = promisify(exec);

const CACHE_TTL = 10 * 60_000; // 10 minutes
const driveCache = createCache<any[]>(CACHE_TTL, 100);

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime?: string;
  mimeType: string;
  webViewLink?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri: string; entryPointType: string }>;
  };
}

interface EventNoteMatch {
  event: CalendarEvent;
  notes: Array<{
    file: DriveFile;
    matchType: 'title' | 'time' | 'link';
    relevance: number; // 0-1 score
  }>;
}

function parseEventDate(event: CalendarEvent): Date {
  const dateStr = event.start.dateTime || event.start.date || '';
  return new Date(dateStr);
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractKeywords(summary: string): string[] {
  const normalized = normalizeText(summary);
  // Extract meaningful keywords (alphanumeric sequences of 3+ chars)
  const words = normalized.match(/\b[a-z0-9]{3,}\b/g) || [];
  // Remove common stop words
  const stopWords = new Set(['the', 'and', 'or', 'with', 'for', 'call', 'meeting', 'sync', 'zoom', 'google', 'meet']);
  return words.filter(w => !stopWords.has(w));
}

function titleMatchScore(eventSummary: string, fileName: string): number {
  const eventKeywords = extractKeywords(eventSummary);
  const fileNameNorm = normalizeText(fileName);
  
  if (fileNameNorm.includes('meeting notes') || fileNameNorm.includes('meeting') || fileNameNorm.includes('transcript')) {
    return 0.5; // Base score for being a meeting-related file
  }
  
  let matches = 0;
  for (const kw of eventKeywords) {
    if (fileNameNorm.includes(kw)) matches++;
  }
  
  if (eventKeywords.length === 0) return 0;
  return matches / eventKeywords.length * 0.5; // Max 0.5 from keyword overlap
}

function timeMatchScore(event: CalendarEvent, file: DriveFile): number {
  const eventTime = parseEventDate(event);
  const fileTime = new Date(file.createdTime);
  
  // Check if file was created within 24 hours of the event
  const hoursDiff = Math.abs(eventTime.getTime() - fileTime.getTime()) / (1000 * 60 * 60);
  if (hoursDiff <= 24) return 0.3;
  if (hoursDiff <= 48) return 0.15;
  if (hoursDiff <= 168) return 0.05; // within a week
  return 0;
}

function linkMatchScore(event: CalendarEvent, fileName: string): number {
  // If event has a Meet link and filename contains something from the Meet ID
  const meetLink = event.hangoutLink || 
    (event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri);
  
  if (!meetLink) return 0;
  
  // Extract Meet ID from URL (e.g., meet.google.com/abc-def-hij)
  const meetIdMatch = meetLink.match(/meet\.google\.com\/([a-z0-9-]+)/);
  if (!meetIdMatch) return 0;
  
  const meetId = meetIdMatch[1].replace(/-/g, '');
  const fileNameNorm = normalizeText(fileName).replace(/[-_]/g, '');
  
  if (fileNameNorm.includes(meetId)) return 0.2;
  return 0;
}

export function registerMeetingsEndpoint(app: any) {
  app.get('/api/v1/meetings/notes', async (req: Request, res: Response) => {
    try {
      const { days = 7, minScore = 0.2 } = req.query;
      const daysAgo = typeof days === 'number' ? days : parseInt(days as string) || 7;
      
      // Calculate time range
      const now = new Date();
      const timeMin = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = now.toISOString();
      
      // Fetch calendar events (reuse existing logic but inline for simplicity)
      const calendarId = process.env.CALENDAR_ID || 'bonato@usc.edu';
      const calendarParams = JSON.stringify({
        calendarId,
        timeMin,
        timeMax,
        maxResults: 200,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const { stdout: calendarStdout, stderr: calendarStderr } = await execAsync(
        `gws calendar events list --params '${calendarParams}'`,
        { env: { ...process.env, GOOGLE_WORKSPACE_CLI_LOG: 'error' } }
      );
      
      if (calendarStderr && !calendarStdout) {
        throw new Error(`gws calendar failed: ${calendarStderr}`);
      }
      
      const calendarData = JSON.parse(calendarStdout);
      const events: CalendarEvent[] = calendarData.items || [];
      
      // Fetch Drive files that might be meeting notes
      // Use a broader query and filter client-side
      const driveQuery = JSON.stringify({
        // Search for files with relevant names OR recent files
        // Drive API doesn't support full-text search well, so we fetch recent files and filter
        pageSize: 200,
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,createdTime,modifiedTime,mimeType,webViewLink)',
      });
      
      const cacheKey = `drive-files-${daysAgo}`;
      let files: DriveFile[] = driveCache.get(cacheKey) || [];
      
      if (files.length === 0) {
        // Fetch files modified since timeMin (last N days)
        const driveParams = JSON.stringify({
          pageSize: 200,
          orderBy: 'modifiedTime desc',
          fields: 'files(id,name,createdTime,modifiedTime,mimeType,webViewLink)',
        });
        
        const { stdout: driveStdout, stderr: driveStderr } = await execAsync(
          `gws drive files list --params '${driveParams}'`,
          { env: { ...process.env, GOOGLE_WORKSPACE_CLI_LOG: 'error' } }
        );
        
        if (driveStderr && !driveStdout) {
          throw new Error(`gws drive failed: ${driveStderr}`);
        }
        
        const driveData = JSON.parse(driveStdout);
        files = driveData.files || [];
        
        // Filter files that might be meeting-related
        const normalizedNow = now.getTime();
        const cutoff = now.getTime() - daysAgo * 24 * 60 * 60 * 1000;
        
        files = files.filter(f => {
          const modified = new Date(f.modifiedTime || f.createdTime).getTime();
          if (modified < cutoff) return false;
          
          const nameNorm = normalizeText(f.name);
          // Include files with meeting-related keywords
          return nameNorm.includes('meeting') || 
                 nameNorm.includes('transcript') || 
                 nameNorm.includes('notes') ||
                 nameNorm.includes('recap') ||
                 nameNorm.includes('summary') ||
                 f.mimeType === 'text/plain' ||
                 f.mimeType === 'text/markdown' ||
                 f.mimeType === 'application/vnd.google-apps.document';
        });
        
        // Cache the filtered set
        driveCache.set(cacheKey, files);
      }
      
      // Match events to notes
      const matches: EventNoteMatch[] = events.map(event => {
        const scoredNotes = files
          .map(file => {
            const titleScore = titleMatchScore(event.summary, file.name);
            const timeScore = timeMatchScore(event, file);
            const linkScore = linkMatchScore(event, file.name);
            const relevance = titleScore + timeScore + linkScore;
            const matchType: 'title' | 'time' | 'link' = relevance >= 0.5 ? 'title' : relevance >= 0.3 ? 'time' : 'link';
            
            return { file, relevance, matchType };
          })
          .filter(item => item.relevance >= parseFloat(minScore as string))
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 3); // Top 3 matches per event
        
        return {
          event,
          notes: scoredNotes,
        };
      }).filter(m => m.notes.length > 0); // Only events with matches
      
      res.json({
        success: true,
        period: { from: timeMin, to: timeMax },
        totalEvents: events.length,
        totalFiles: files.length,
        matches,
      });
      
    } catch (err: any) {
      console.error('Error in /api/v1/meetings/notes:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
