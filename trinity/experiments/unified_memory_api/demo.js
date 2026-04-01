const path = require('path');
const UnifiedMemory = require('./index');

(async () => {
  const workspaceRoot = path.join(__dirname, '../../..'); // adjust to workspace root
  const memory = new UnifiedMemory({
    sharedContextPath: path.join(workspaceRoot, 'memory', 'shared_context.md'),
    pheromoneStorePath: path.join(__dirname, 'pheromone_store.json')
  });
  await memory.loadAll();

  console.log('=== Unified Memory API Demo ===\n');

  // Add sample entries if empty
  await memory.add({ text: 'User is interested in ant colony distributed context systems.' }, { adapters: ['shared', 'pheromone'] });
  await memory.add({ text: 'Netic call classification taxonomy defines outcomes like Booked, Unbooked, Handled.' }, { adapters: ['shared', 'pheromone'] });
  await memory.add({ text: 'Shared Context Board allows cross-agent knowledge sharing via markdown.' }, { adapters: ['shared', 'pheromone'] });

  console.log('Performing query for "context"...');
  const resultsContext = await memory.query('context', { adapter: 'all', topK: 5 });
  console.table(resultsContext.map(r => ({
    adapter: r.adapter,
    score: r.score ? r.score.toFixed(4) : r.score,
    snippet: r.text ? r.text.substring(0, 60) + '...' : (r.lines ? r.lines.slice(0,3).join(' ') : '')
  })));

  console.log('\nPerforming query for "Netic"...');
  const resultsNetic = await memory.query('Netic', { adapter: 'pheromone', topK: 3 });
  console.table(resultsNetic.map(r => ({
    adapter: r.adapter,
    id: r.id,
    score: r.score ? r.score.toFixed(4) : r.score,
    text: r.text.substring(0, 80) + '...'
  })));

  console.log('\nReinforcing a pheromone fact by ID (if any)...');
  // Just demo: get an ID if exists and reinforce
  if (resultsNetic.length > 0) {
    const factId = resultsNetic[0].id;
    await memory.reinforce('pheromone', factId, 0.5);
    console.log(`Reinforced fact ${factId}`);
  }

  console.log('\nDemo complete.');
})();
