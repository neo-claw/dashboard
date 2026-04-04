#!/usr/bin/env node
/**
 * Trinity Web Clipper Server
 * Lightweight capture endpoint for research notes.
 * Saves clips as Markdown with frontmatter.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3456;
const NOTES_DIR = path.join(__dirname, 'notes'); // ~/.openclaw/workspace/trinity/experiments/web-clipper/notes

// Ensure notes dir exists
fs.mkdirSync(NOTES_DIR, { recursive: true });

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDate(newDate = Date.now()) {
  const d = new Date(newDate);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTimestamp(newDate = Date.now()) {
  const d = new Date(newDate);
  return d.toISOString().replace('T', ' ').slice(0, 19); // YYYY-MM-DD HH:MM:SS
}

function writeMarkdownClip(clip) {
  const { url, title, selection, tags = [] } = clip;
  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);
  const slug = generateSlug(title || 'untitled');
  const filename = `${date}-${slug}.md`;
  const filepath = path.join(NOTES_DIR, filename);

  const frontmatter = [
    '---',
    `title: "${title || ''}"`,
    `url: ${url || ''}`,
    `captured: "${timestamp}"`,
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    '---',
    '',
    ...(selection ? [`> ${selection.trim().replace(/\n/g, '\n> ')}`, ''] : []),
    `[Source](${url || '#'})`
  ].join('\n');

  fs.writeFileSync(filepath, frontmatter, 'utf8');
  return filepath;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/clip') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const clip = JSON.parse(body);
        if (!clip.url) throw new Error('url required');

        const filepath = writeMarkdownClip(clip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: path.basename(filepath) }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', notesDir: NOTES_DIR }));
  } else {
    res.writeHead(404);
    res.end('Trinity Web Clipper\nPOST /clip | GET /health');
  }
});

server.listen(PORT, () => {
  console.log(`Trinity Web Clipper server listening on http://localhost:${PORT}`);
  console.log(`Notes dir: ${NOTES_DIR}`);
  console.log('Ready to receive POST /clip with JSON: {url, title, selection, tags[]}');
});
