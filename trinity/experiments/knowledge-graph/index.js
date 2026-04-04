/**
 * OpenClaw Tool Plugin: Knowledge Graph Operations
 * Allows agents to store and retrieve shared knowledge.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Get db path from config or default
const getDbPath = () => {
  const configPath = path.join(process.env.HOME || '.', '.openclaw', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.plugins?.knowledgeGraph?.dbPath) {
        return config.plugins.knowledgeGraph.dbPath;
      }
    } catch (e) {}
  }
  return path.join(process.env.HOME || '.', '.openclaw', 'workspace', 'trinity', 'experiments', 'knowledge-graph', 'kg.db');
};

class KGClient {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new sqlite3.Database(dbPath);
    this._ensureSchema();
  }

  _ensureSchema() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        properties TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        src_id INTEGER NOT NULL,
        dst_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        properties TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(src_id) REFERENCES nodes(id),
        FOREIGN KEY(dst_id) REFERENCES nodes(id)
      )`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_label ON nodes(label)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id)`);
    });
  }

  addNode(label, properties) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO nodes (label, properties) VALUES (?, ?)',
        [label, JSON.stringify(properties)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  addEdge(srcId, dstId, type, properties = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO edges (src_id, dst_id, type, properties) VALUES (?, ?, ?, ?)',
        [srcId, dstId, type, properties ? JSON.stringify(properties) : null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  simpleQuery(cypher) {
    const srcMatch = cypher.match(/\((\w+):(\w+)(?:\s*\{([^}]+)\})?\)/);
    const edgeMatch = cypher.match(/-\[:([^\]]+)\]->/);
    const dstMatch = cypher.match(/->\s*\((\w+):(\w+)(?:\s*\{([^}]+)\})?\)/);

    if (!srcMatch || !edgeMatch || !dstMatch) {
      throw new Error(`Could not parse query: ${cypher}`);
    }

    const srcLabel = srcMatch[2];
    const srcPropsStr = srcMatch[3];
    const edgeType = edgeMatch[1];
    const dstLabel = dstMatch[2];
    const dstPropsStr = dstMatch[3];

    const srcProps = srcPropsStr ? this._parseProps(srcPropsStr) : {};

    return new Promise((resolve, reject) => {
      // Build conditions for source node
      const srcConditions = ['label = ?'];
      const srcParams = [srcLabel];
      for (const [key, value] of Object.entries(srcProps)) {
        srcConditions.push(`json_extract(properties, '$.${key}') = ?`);
        srcParams.push(value);
      }
      const srcWhere = srcConditions.join(' AND ');

      this.db.get(
        `SELECT id, properties FROM nodes WHERE ${srcWhere}`,
        srcParams,
        (err, srcRow) => {
          console.log(`[DEBUG] source query: SELECT id, properties FROM nodes WHERE ${srcWhere}`, 'params:', srcParams);
          console.log('[DEBUG] source result:', srcRow);
          if (err) return reject(err);
          if (!srcRow) return resolve([]);

          this.db.all(
            `SELECT e.id, e.type, e.properties, n2.id as dst_id, n2.label as dst_label, n2.properties as dst_properties
             FROM edges e
             JOIN nodes n2 ON e.dst_id = n2.id
             WHERE e.src_id = ? AND e.type = ?`,
            [srcRow.id, edgeType],
            (err2, rows) => {
              if (err2) return reject(err2);

              const results = rows
                .filter(r => r.dst_label === dstLabel)
                .map(r => ({
                  src: { id: srcRow.id, label: srcLabel, properties: JSON.parse(srcRow.properties) },
                  edge: { id: r.id, type: r.type, properties: r.properties ? JSON.parse(r.properties) : {} },
                  dst: { id: r.dst_id, label: r.dst_label, properties: JSON.parse(r.dst_properties) }
                }));

              // Apply destination filters if any
              if (dstPropsStr) {
                const dstProps = this._parseProps(dstPropsStr);
                // Filter results in place
                for (let i = results.length - 1; i >= 0; i--) {
                  const r = results[i];
                  let keep = true;
                  for (const [k, v] of Object.entries(dstProps)) {
                    if (r.dst.properties[k] !== v) {
                      keep = false;
                      break;
                    }
                  }
                  if (!keep) results.splice(i, 1);
                }
              }

              resolve(results);
            }
          );
        }
      );
    });
  }

  _parseProps(str) {
    const props = {};
    str.split(',').forEach(pair => {
      const [k, v] = pair.trim().split(':').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      props[k] = v;
    });
    return props;
  }

  close() {
    if (this.db) this.db.close();
  }
}

let kg;

module.exports = {
  name: 'knowledge-graph-tools',
  description: 'Knowledge graph integration for shared agent memory',
  version: '0.1.0',

  async init() {
    const dbPath = getDbPath();
    kg = new KGClient(dbPath);
    console.log(`[knowledge-graph] Connected to ${dbPath}`);
    return true;
  },

  async shutdown() {
    if (kg) kg.close();
  },

  tools: [
    {
      name: 'kg_add_node',
      description: 'Add a node to the knowledge graph. Args: label (string), properties (object)',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          properties: { type: 'object' }
        },
        required: ['label', 'properties']
      },
      async execute(args) {
        const id = await kg.addNode(args.label, args.properties);
        return { success: true, nodeId: id, message: `Added ${args.label} node ${id}` };
      }
    },
    {
      name: 'kg_add_edge',
      description: 'Add an edge between nodes. Args: src_id, dst_id, type, properties (optional)',
      parameters: {
        type: 'object',
        properties: {
          src_id: { type: 'number' },
          dst_id: { type: 'number' },
          type: { type: 'string' },
          properties: { type: 'object' }
        },
        required: ['src_id', 'dst_id', 'type']
      },
      async execute(args) {
        const id = await kg.addEdge(args.src_id, args.dst_id, args.type, args.properties);
        return { success: true, edgeId: id, message: `Added ${args.type} edge ${id}` };
      }
    },
    {
      name: 'kg_query',
      description: 'Query knowledge graph with Cypher-like pattern. Args: query (string). Example: MATCH (a:Agent {name:"Neo"})-[:HAS_TOOL]->(t:Tool)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      },
      async execute(args) {
        try {
          const results = await kg.simpleQuery(args.query);
          return { success: true, count: results.length, results };
        } catch (err) {
          return { success: false, error: err.message };
        }
      }
    },
    {
      name: 'kg_find_nodes',
      description: 'Find nodes by label and property filters. Args: label (string), filters (object, optional)',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          filters: { type: 'object' }
        },
        required: ['label']
      },
      async execute(args) {
        const filters = args.filters || {};
        const conditions = ['label = ?'];
        const params = [args.label];

        for (const [key, value] of Object.entries(filters)) {
          conditions.push(`json_extract(properties, '$.${key}') = ?`);
          params.push(value);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const query = `SELECT id, label, properties FROM nodes ${whereClause}`;

        return new Promise((resolve, reject) => {
          kg.db.all(query, params, (err, rows) => {
            if (err) {
              console.error('kg_find_nodes error:', err.message, 'query:', query, 'params:', params);
              return reject(err);
            }
            const results = rows.map(r => ({
              id: r.id,
              label: r.label,
              properties: JSON.parse(r.properties)
            }));
            resolve({ success: true, count: results.length, results });
          });
        });
      }
    }
  ]
};
