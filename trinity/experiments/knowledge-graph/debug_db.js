#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/home/ubuntu/.openclaw/workspace/trinity/experiments/knowledge-graph/kg.db');

db.serialize(() => {
  console.log('=== NODES ===');
  db.all('SELECT * FROM nodes', (err, rows) => {
    if (err) throw err;
    console.log(rows);
    console.log('\n=== EDGES ===');
    db.all('SELECT * FROM edges', (err2, rows2) => {
      if (err2) throw err2;
      console.log(rows2);
      db.close();
    });
  });
});
