const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE nodes (id INTEGER PRIMARY KEY, label TEXT, properties TEXT)`);
  const props = JSON.stringify({name: "Neo"});
  db.run(`INSERT INTO nodes (label, properties) VALUES (?, ?)`, ['Agent', props]);

  // Test json_extract
  db.get(`SELECT json_extract(properties, '$.name') as name_json FROM nodes WHERE label = 'Agent'`, (err, row) => {
    console.log('Stored properties:', props);
    console.log('json_extract result:', row.name_json);
    console.log('Type:', typeof row.name_json);
    console.log('Equals "Neo"?', row.name_json === 'Neo');
    console.log('Equals "\"Neo\""?', row.name_json === '"Neo"');
    db.close();
  });
});
