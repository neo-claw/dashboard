const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const outputFile = path.join(__dirname, 'graph.json');

const entities = [];
const relationships = [];

function slugify(text) {
  return text.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-');
}

function parseEntityBlock(lines, startIdx, fileName) {
  const nameLine = lines[startIdx];
  const nameMatch = nameLine.match(/^\s*\*\*(.+?)\*\*\s*$/);
  if (!nameMatch) return null;
  const name = nameMatch[1].trim();
  const id = slugify(name);

  // Collect following lines until next entity heading or a markdown heading
  const contentLines = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\*\*(.+?)\*\*\s*$/.test(line)) break;
    if (/^#+\s/.test(line)) break;
    contentLines.push(line);
    i++;
  }

  const content = contentLines.join('\n').trim();

  // Extract properties (list items) from content
  const properties = [];
  const propRegex = /^-\s+(.+)$/gm;
  let propMatch;
  while ((propMatch = propRegex.exec(content)) !== null) {
    properties.push(propMatch[1].trim());
  }

  // Heuristic relationships: look for "X will be linked to Y" patterns in content
  // e.g., "It will be linked to all interactions" → weak; but "map to end_user" indicates relationship
  const relRegex = /(?:map to|linked to|related to|connected to|reference|attached to)\s+`?([^`\n]+)`?/gi;
  let relMatch;
  while ((relMatch = relRegex.exec(content)) !== null) {
    const target = relMatch[1].trim();
    // Clean target of punctuation
    const cleaned = target.replace(/[.,;:()\[\]{}`]/g, '').trim();
    if (cleaned && cleaned !== name) {
      relationships.push({
        from: id,
        to: slugify(cleaned),
        type: 'assoc',
        sourceFile: fileName,
        snippet: relMatch[0]
      });
    }
  }

  return {
    id,
    name,
    sourceFile: fileName,
    content,
    properties
  };
}

function parseFile(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\*\*(.+?)\*\*\s*$/.test(line)) {
      const entity = parseEntityBlock(lines, i, fileName);
      if (entity) {
        if (!entities.find(e => e.id === entity.id)) {
          entities.push(entity);
        }
        // Skip ahead past this block
        const contentLineCount = entity.content ? entity.content.split('\n').length : 0;
        i += contentLineCount + 1;
        continue;
      }
    }
    i++;
  }
}

// Process all markdown files in data dir
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));
files.forEach(f => parseFile(path.join(dataDir, f)));

const graph = {
  generated: new Date().toISOString(),
  entityCount: entities.length,
  relationshipCount: relationships.length,
  entities,
  relationships
};

fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));
console.log(`Built graph with ${entities.length} entities, ${relationships.length} relationships → ${outputFile}`);
