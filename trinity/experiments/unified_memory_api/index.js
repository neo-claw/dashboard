const SharedContextAdapter = require('./adapters/sharedContextAdapter');
const PheromoneAdapter = require('./adapters/pheromoneAdapter');
const path = require('path');

class UnifiedMemory {
  constructor(options = {}) {
    this.sharedContextPath = options.sharedContextPath || path.join(__dirname, '../../memory/shared_context.md');
    this.pheromoneStorePath = options.pheromoneStorePath || path.join(__dirname, 'pheromone_store.json');
    this.sharedAdapter = new SharedContextAdapter(this.sharedContextPath);
    this.pheromoneAdapter = new PheromoneAdapter(this.pheromoneStorePath, options.decayRate || 0.1);
    this.adapters = {
      shared: this.sharedAdapter,
      pheromone: this.pheromoneAdapter
    };
  }

  async loadAll() {
    await Promise.all(Object.values(this.adapters).map(a => a.load()));
  }

  // Query a specific adapter by name ('shared' or 'pheromone') or 'all' to merge
  async query(search, options = {}) {
    const { adapter = 'all', topK = 5 } = options;
    if (adapter === 'all') {
      const results = [];
      for (let name of ['shared', 'pheromone']) {
        const adapterInst = this.adapters[name];
        console.log(`Adapter ${name}`, typeof adapterInst, adapterInst);
        if (typeof adapterInst.query !== 'function') {
          console.error(`Adapter ${name} has no query method:`, adapterInst);
          continue;
        }
        const res = await adapterInst.query(search, topK * 2); // fetch more to merge
        // Normalize score? We'll preserve original scores and later sort by score descending.
        // Note: scores differ in scale; shared gives 0/1, pheromone gives overlap*strength potentially >1.
        // For prototype we'll just combine and sort naively; shared scores are capped at 1, so pheromone scores may dominate.
        // We could scale shared to 10 or something, but not crucial.
        results.push(...res.map(r => ({ ...r, adapter: name })));
      }
      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);
    } else {
      const target = this.adapters[adapter];
      if (!target) throw new Error(`Unknown adapter: ${adapter}`);
      const res = await target.query(search, topK);
      return res.map(r => ({ ...r, adapter }));
    }
  }

  // Add entry to one or all adapters
  async add(entry, options = {}) {
    const { adapters = ['shared', 'pheromone'] } = options;
    const results = {};
    if (adapters.includes('shared')) {
      const lines = Array.isArray(entry.text) ? entry.text : [entry.text];
      results.shared = await this.sharedAdapter.addEntry(lines);
    }
    if (adapters.includes('pheromone')) {
      results.pheromone = await this.pheromoneAdapter.addFact(entry.text);
    }
    return results;
  }

  // Reinforce a fact in a specific adapter by id
  async reinforce(adapter, factId, increment = 0.2) {
    if (adapter === 'pheromone') {
      await this.pheromoneAdapter.reinforceFact(factId, increment);
      return true;
    }
    // Shared context doesn't support reinforcement currently.
    return false;
  }
}

module.exports = UnifiedMemory;
