# Web Clipper + Knowledge Base Sync

Lightweight tool to capture web research directly into markdown notes.

## Components

- `server.js` – Node HTTP server that saves clips as markdown files
- Bookmarklet – JavaScript to send current page to server

## Setup

```bash
cd ~/.openclaw/workspace/trinity/experiments/web-clipper
node server.js   # listens on http://localhost:3456
```

Notes saved to: `trinity/experiments/web-clipper/notes/`

Format: `YYYY-MM-DD-slug.md` with YAML frontmatter and optional blockquote of selection.

## Bookmarklet

Drag this link to your bookmarks bar:

<a href="javascript:(function(){
  const url=encodeURIComponent(location.href);
  const title=encodeURIComponent(document.title);
  const sel=encodeURIComponent(window.getSelection().toString().trim());
  fetch('http://localhost:3456/clip',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url:location.href,title:document.title,selection:window.getSelection().toString(),tags:[]})
  }).then(r=>r.json()).then(d=>alert('Clipped: '+d.file)).catch(e=>alert('Error: '+e));
})();">Clip to Trinity</a>

Or create manually with the above code.

## Example Output

```markdown
---
title: "My Research Article"
url: https://example.com/article
captured: "2026-04-02 23:15:00"
tags: []
---

> Selected text goes here with blockquote formatting.

[Source](https://example.com/article)
```

## Integration

These markdown files are automatically readable by OpenClaw via file tools and can be indexed by RAG or semantic search.

Keep server running in background during research sessions.
