const fs = require('fs');
const path = require('path');

class PheromoneAdapter {
  constructor(storagePath = path.join(__dirname, '../pheromone_store.json'), decayRate = 0.1) {
    this.storagePath = storagePath;
    this.decayRate = decayRate;
    this.facts = {}; // id -> { text, strength, last_updated }
    this._nextId = 1;
  }

  _currentTime() {
    return Date.now() / 1000; // seconds
  }

  _load() {
    if (fs.existsSync(this.storagePath)) {
      const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      this.facts = data.facts || {};
      this._nextId = data.next_id || 1;
    } else {
      this.facts = {};
      this._nextId = 1;
    }
  }

  _save() {
    const data = { facts: this.facts, next_id: this._nextId };
    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async load() {
    this._load();
  }

  _effectiveStrength(fact) {
    const now = this._currentTime();
    const last = fact.last_updated;
    const daysElapsed = (now - last) / 86400;
    return fact.strength * Math.exp(-this.decayRate * daysElapsed);
  }

  _keywordScore(query, text) {
    const qwords = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
    const twords = new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
    if (qwords.size === 0) return 0;
    let overlap = 0;
    for (let w of qwords) {
      if (twords.has(w)) overlap++;
    }
    return overlap / qwords.size;
  }

  async addFact(text, initialStrength = 1.0) {
    // Check duplicate (case-insensitive)
    const lowerText = text.toLowerCase().trim();
    for (let fid of Object.keys(this.facts)) {
      if (this.facts[fid].text.toLowerCase().trim() === lowerText) {
        this.reinforceFact(fid);
        return fid;
      }
    }
    const fid = String(this._nextId++);
    this.facts[fid] = {
      text,
      strength: initialStrength,
      last_updated: this._currentTime()
    };
    this._save();
    return fid;
  }

  async reinforceFact(factId, increment = 0.2) {
    if (this.facts[factId]) {
      this.facts[factId].strength += increment;
      this.facts[factId].last_updated = this._currentTime();
      this._save();
    }
  }

  async query(query, topK = 5) {
    const results = [];
    for (let fid of Object.keys(this.facts)) {
      const fact = this.facts[fid];
      const kwScore = this._keywordScore(query, fact.text);
      const effStrength = this._effectiveStrength(fact);
      const score = kwScore * effStrength;
      if (score > 0) {
        results.push({
          id: fid,
          text: fact.text,
          score,
          source: 'pheromone',
          strength: fact.strength,
          effective_strength: effStrength,
          timestamp: new Date(fact.last_updated * 1000)
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

module.exports = PheromoneAdapter;
