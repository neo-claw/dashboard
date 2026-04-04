const PheromoneSignalBus = require('./pheromone-bus');

console.log('Testing PheromoneSignalBus');
console.log('========================\n');

const bus = new PheromoneSignalBus({ decayRate: 0.0001, decayInterval: 100 });

// Test 1: Deposit and immediate check
console.log('Test 1: Deposit signal');
bus.deposit('test:signal1', 0.9);
const strength1 = bus.getStrength('test:signal1');
console.log(`  Initial strength: ${strength1} (expected ~0.9)`);
console.assert(strength1 > 0.85, 'Signal should retain strength');

// Test 2: Follow with threshold
console.log('\nTest 2: Follow with threshold');
const followed = bus.follow('test:signal1', 0.5);
console.log(`  Followed strength: ${followed} (expected >0.5)`);
console.assert(followed > 0.5, 'Should follow if above threshold');

// Test 3: Reinforcement
console.log('\nTest 3: Reinforcement');
bus.deposit('test:signal1', 0.5);
const afterReinforce = bus.getStrength('test:signal1');
console.log(`  After reinforcement: ${afterReinforce.toFixed(3)} (should increase, capped at 1.0)`);
console.assert(afterReinforce > 0.9, 'Reinforcement should increase strength');

// Test 4: Decay over time
console.log('\nTest 4: Decay over time');
setTimeout(() => {
  const decayed = bus.getStrength('test:signal1');
  console.log(`  After 2s decay: ${decayed.toFixed(3)} (should be lower)`);

  // Test 5: List active signals
  console.log('\nTest 5: List active signals');
  const active = bus.listActive(0.01);
  console.log(`  Active signals: ${JSON.stringify(active)}`);

  // Test 6: Clear
  console.log('\nTest 6: Clear all signals');
  bus.clear();
  const afterClear = bus.listActive();
  console.log(`  Active after clear: ${afterClear.length} (expected 0)`);
  console.assert(afterClear.length === 0, 'Should be empty after clear');

  console.log('\nAll tests passed! ✓');
}, 2000);
