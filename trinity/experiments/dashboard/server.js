const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
const sharedFile = path.join(workspaceRoot, 'memory', 'shared_context.md');

function parseSharedContext(content) {
  const entries = [];
  const blocks = content.split(/\n\n(?=## \[)/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    const header = lines[0];
    const match = header.match(/^## \[(.*?)\] (.*)$/);
    if (!match) continue;
    
    const agent = match[1];
    const timestamp = match[2];
    
    const catLine = lines.find(l => l.startsWith('- Category:'));
    const contentLine = lines.find(l => l.startsWith('- Content:'));
    
    if (catLine && contentLine) {
      entries.push({
        agent,
        timestamp,
        category: catLine.replace('- Category:', '').trim(),
        content: contentLine.replace('- Content:', '').trim(),
      });
    }
  }
  
  return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/contexts') {
    try {
      if (!fs.existsSync(sharedFile)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      const content = fs.readFileSync(sharedFile, 'utf8');
      const entries = parseSharedContext(content);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entries));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
    }[ext] || 'text/plain';
    
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Shared Context Dashboard running at http://localhost:${PORT}`);
  console.log(`Serving from ${__dirname}`);
});
