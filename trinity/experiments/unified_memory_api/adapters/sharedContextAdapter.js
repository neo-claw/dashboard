const fs = require('fs');
const path = require('path');

class SharedContextAdapter {
  constructor(filePath = path.join(__dirname, '../../../../../memory/shared_context.md')) {
    this.filePath = filePath;
    this.entries = [];
  }

  async load() {
    if (!fs.existsSync(this.filePath)) {
      this.entries = [];
      return;
    }
    const content = fs.readFileSync(this.filePath, 'utf8');
    // Split entries by lines starting with "## "
    const lines = content.split(/\r?\n/);
    this.entries = [];
    let current = null;
    for (let line of lines) {
      if (line.startsWith('## ')) {
        if (current) this.entries.push(current);
        // Parse heading: "## [Trinity] 2026-03-31 05:06:11"
        const match = line.match(/^## \[Trinity\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        const timestamp = match ? new Date(match[1]) : new Date();
        current = { id: `sc_${this.entries.length}`, timestamp, source: 'shared_context', lines: [] };
      } else if (current && line.trim()) {
        current.lines.push(line);
      }
    }
    if (current) this.entries.push(current);
  }

  // Simple case-insensitive substring search across entry content
  async query(search, topK = 5) {
    const results = this.entries.map(entry => {
      const text = entry.lines.join('\n');
      const score = text.toLowerCase().includes(search.toLowerCase()) ? 1.0 : 0.0;
      return { ...entry, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
    return results;
  }

  async addEntry(textLines) {
    const now = new Date();
    const formatted = now.toISOString().replace('T', ' ').replace(/:\d{2}\.\d{3}Z/, '');
    const heading = `## [Trinity] ${formatted}`;
    const content = textLines.map(l => l.startsWith('-') ? l : `- ${l}`).join('\n') + '\n';
    const entryText = `${heading}\n${content}`;
    fs.appendFileSync(this.filePath, entryText + '\n', 'utf8');
    // Refresh entries
    await this.load();
    // Return the newly added entry (last one)
    return this.entries[this.entries.length - 1];
  }
}

module.exports = SharedContextAdapter;
