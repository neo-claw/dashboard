const EventEmitter = require('events');

/**
 * PheromoneSignalBus
 *
 * A lightweight coordination system for multi-agent systems inspired by
 * ant colony trail pheromones. Signals decay over time and can be followed
 * by any agent to discover emergent pathways.
 *
 * Core concepts:
 * - deposit(signalType, strength): Leave a signal with initial strength
 * - follow(signalType, threshold): Check current strength of a signal
 * - decay(rate): Apply exponential decay to all signals periodically
 *
 * Signals automatically decay based on elapsed time.
 */

class PheromoneSignalBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.signals = new Map(); // signalType -> { strength, lastUpdate }
    this.defaultDecayRate = options.decayRate || 0.01; // per ms
    this.decayInterval = options.decayInterval || 1000; // ms
    this._startDecayLoop();
  }

  /**
   * Deposit a signal with given initial strength (0-1)
   */
  deposit(signalType, strength = 1.0) {
    const now = Date.now();
    const existing = this.signals.get(signalType);

    if (existing) {
      // Reinforce existing signal (sum, capped at 1)
      existing.strength = Math.min(1.0, existing.strength + strength);
      existing.lastUpdate = now;
    } else {
      this.signals.set(signalType, {
        strength: Math.min(1.0, strength),
        lastUpdate: now,
      });
    }

    this.emit('deposit', { signalType, strength, total: this.signals.get(signalType).strength });
    return this.signals.get(signalType).strength;
  }

  /**
   * Follow a signal - returns current strength if above threshold, else 0
   */
  follow(signalType, threshold = 0.1) {
    const signal = this.signals.get(signalType);
    if (!signal) return 0;

    const strength = this._computeCurrentStrength(signal);
    if (strength >= threshold) {
      this.emit('follow', { signalType, strength, threshold });
      return strength;
    }
    return 0;
  }

  /**
   * Check strength without threshold
   */
  getStrength(signalType) {
    const signal = this.signals.get(signalType);
    if (!signal) return 0;
    return this._computeCurrentStrength(signal);
  }

  /**
   * Get all active signals above threshold
   */
  listActive(threshold = 0.01) {
    const now = Date.now();
    const active = [];
    for (const [type, signal] of this.signals.entries()) {
      const strength = this._computeCurrentStrength(signal, now);
      if (strength >= threshold) {
        active.push({ type, strength });
      }
    }
    return active.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Manually trigger decay of all signals
   */
  decay(rate = this.defaultDecayRate) {
    const now = Date.now();
    for (const [type, signal] of this.signals.entries()) {
      const age = now - signal.lastUpdate;
      const decayFactor = Math.exp(-rate * age);
      signal.strength *= decayFactor;
      if (signal.strength < 0.001) {
        this.signals.delete(type);
        this.emit('fade', { signalType: type });
      }
    }
  }

  /**
   * Clear all signals
   */
  clear() {
    this.signals.clear();
    this.emit('clear');
  }

  _computeCurrentStrength(signal, now = Date.now()) {
    const age = now - signal.lastUpdate;
    const decayFactor = Math.exp(-this.defaultDecayRate * age);
    return signal.strength * decayFactor;
  }

  _startDecayLoop() {
    setInterval(() => {
      this.decay();
    }, this.decayInterval);
  }
}

// Example usage demonstration
if (require.main === module) {
  const bus = new PheromoneSignalBus({ decayRate: 0.001, decayInterval: 500 });

  console.log('PheromoneSignalBus Demo');
  console.log('-----------------------');

  // Agent A deposits a "workflow:customer-intake" signal
  bus.deposit('workflow:customer-intake', 0.8);
  console.log('Agent A deposited workflow:customer-intake (0.8)');

  // Agent B checks if the signal is active
  setTimeout(() => {
    const strength = bus.follow('workflow:customer-intake');
    console.log(`Agent B followed signal: ${strength.toFixed(3)}`);
  }, 1000);

  // Show decay over time
  setInterval(() => {
    const strength = bus.getStrength('workflow:customer-intake');
    console.log(`Current strength: ${strength.toFixed(3)}`);
  }, 2000);

  // After 10 seconds, show what remains
  setTimeout(() => {
    const active = bus.listActive(0.01);
    console.log('Active signals:', active);
    bus.clear();
    console.log('All signals cleared.');
    process.exit(0);
  }, 10000);
}

module.exports = PheromoneSignalBus;
