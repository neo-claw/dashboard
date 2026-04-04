#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const graphPath = path.join(__dirname, 'graph.json');

function loadGraph() {
  if (!fs.existsSync(graphPath)) {
    console.error('Graph not found. Run build.js first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
}

function printEntity(e) {
  console.log(`- ${e.name} (id: ${e.id})`);
  console.log(`  source: ${e.sourceFile}`);
  if (e.content) {
    const preview = e.content.length > 200 ? e.content.slice(0, 200) + '...' : e.content;
    console.log(`  ${preview.split('\n')[0]}`); // first line
  }
  if (e.properties && e.properties.length) {
    console.log(`  properties: ${e.properties.length}`);
  }
  console.log();
}

function main() {
  const args = process.argv.slice(2);
  const graph = loadGraph();

  if (args.includes('--list') || args.length === 0) {
    console.log(`Entities (${graph.entities.length}):`);
    graph.entities.forEach(printEntity);
    console.log(`Relationships (${graph.relationships.length}):`);
    graph.relationships.forEach(r => {
      console.log(`- ${r.from} -> ${r.to} (${r.type}) [${r.sourceFile}]`);
    });
  } else if (args.includes('--name')) {
    const idx = args.indexOf('--name') + 1;
    const query = args[idx];
    const matches = graph.entities.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));
    console.log(`Found ${matches.length} entities matching "${query}":`);
    matches.forEach(printEntity);
  } else if (args.includes('--id')) {
    const idx = args.indexOf('--id') + 1;
    const id = args[idx];
    const e = graph.entities.find(e => e.id === id);
    if (e) {
      console.log(`Entity: ${e.name}`);
      console.log(`Source: ${e.sourceFile}`);
      console.log(`Content:\n${e.content}`);
      const rels = graph.relationships.filter(r => r.from === id);
      if (rels.length) {
        console.log('Relationships:');
        rels.forEach(r => console.log(`  -> ${r.to} (${r.type})`));
      }
    } else {
      console.log(`No entity with id "${id}"`);
    }
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node query.js [options]

Options:
  --list         List all entities and relationships (default)
  --name <text>  Search entities by name (case-insensitive)
  --id <id>      Show entity by exact id
  --help         Show this help
`);
  }
}

main();
