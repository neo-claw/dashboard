# Entity Graph Prototype

A lightweight knowledge graph for Neo, extracting entities and relationships from markdown notes.

## Usage

```bash
# Build graph from markdown files in data/
npm run build

# Query entities
node query.js --list                # list all
node query.js --name <pattern>      # search by name
node query.js --id <slug>           # show by id
node query.js --help                # help
```

Graph is saved to `graph.json`. The graph includes:
- `entities`: array of { id, name, sourceFile, content, properties[] }
- `relationships`: inferred associations (e.g., "linked to", "map to")

## Design

- No external dependencies (Node.js native).
- Parses bold headings as entity names.
- Extracts bullet-point properties from entity content.
- Simple relationship heuristic: captures phrases like "map to", "linked to", etc.

## Extensibility

- Add more markdown sources to `data/`.
- Improve relationship extraction with more patterns.
- Provide an HTTP server or GraphQL interface for Neo agents.
