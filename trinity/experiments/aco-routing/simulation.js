/**
 * Ant Colony Routing Simulation (ACO)
 *
 * Simulates a network of agents (nodes) where tasks must be routed from a start
 * to an end node. Ants (tasks) traverse the graph probabilistically based on
 * pheromone trails and heuristic (inverse distance to goal). Pheromone is
 * reinforced on successful shortest paths and evaporates over time.
 *
 * Goal: Observe convergence to shortest paths over iterations.
 *
 * Run: node simulation.js
 */

const N = 20; // number of agents/nodes
const EDGE_PROB = 0.2; // probability of an undirected edge between nodes
const ANT_COUNT = 20; // ants per iteration
const MAX_ITER = 1000;
const EVAPORATION = 0.9; // pheromone retention factor (0-1)
const ALPHA = 1; // pheromone influence
const BETA = 2; // heuristic influence
const PHEROMONE_INIT = 0.1;
const MAX_STEPS = N * 2; // max allowed path length (in edges)

// Create random undirected graph
function createRandomGraph(n, prob) {
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < prob) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  // Ensure connectivity: if any node isolated, connect to nearest neighbor
  for (let i = 0; i < n; i++) {
    if (adj[i].length === 0) {
      const j = (i + 1) % n;
      adj[i].push(j);
      adj[j].push(i);
    }
  }
  return adj;
}

// Floyd-Warshall all-pairs shortest path (in number of edges)
function computeAllPairsShortestPaths(adj) {
  const n = adj.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dist[i][i] = 0;
  for (let u = 0; u < n; u++) {
    for (const v of adj[u]) {
      dist[u][v] = 1; // unweighted
    }
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
  return dist;
}

// Initialize
console.log(`Initializing graph with ${N} nodes, edge prob ${EDGE_PROB}`);
const graph = createRandomGraph(N, EDGE_PROB);
const trueDist = computeAllPairsShortestPaths(graph);

// Pheromone matrix (symmetric because undirected graph)
let pheromone = Array.from({ length: N }, () => Array(N).fill(PHEROMONE_INIT));
for (let i = 0; i < N; i++) pheromone[i][i] = 0; // no self

// Metrics
let bestPath = null;
let bestLen = Infinity;
let lastImprovement = 0;

function runAnt(start, end) {
  const path = [start];
  let current = start;
  const visited = new Set([start]);
  while (current !== end && path.length < MAX_STEPS) {
    const neighbors = graph[current].filter(to => !visited.has(to));
    if (neighbors.length === 0) break; // dead end
    // Compute selection probabilities
    const probs = neighbors.map(to => {
      const ph = pheromone[current][to] ** ALPHA;
      const heuristic = 1 / (trueDist[to][end] || 1); // avoid division by zero
      return ph * (heuristic ** BETA);
    });
    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      // fallback: choose random
      const idx = Math.floor(Math.random() * neighbors.length);
      current = neighbors[idx];
    } else {
      const r = Math.random() * sum;
      let cum = 0;
      let chosenIdx = 0;
      for (let i = 0; i < neighbors.length; i++) {
        cum += probs[i];
        if (r <= cum) {
          chosenIdx = i;
          break;
        }
      }
      current = neighbors[chosenIdx];
    }
    visited.add(current);
    path.push(current);
  }
  return path;
}

console.log("Starting ACO iterations...");
for (let iter = 0; iter < MAX_ITER; iter++) {
  const successfulPaths = [];
  for (let a = 0; a < ANT_COUNT; a++) {
    // Random start and distinct end
    let start = Math.floor(Math.random() * N);
    let end;
    do {
      end = Math.floor(Math.random() * N);
    } while (end === start);
    const path = runAnt(start, end);
    if (path[path.length - 1] === end) {
      successfulPaths.push({ start, end, path });
    }
  }
  // Reinforce edges of successful paths
  for (const { path } of successfulPaths) {
    const len = path.length - 1;
    if (len < bestLen) {
      bestLen = len;
      bestPath = path.slice();
      lastImprovement = iter;
    }
    const quality = 1 / len; // shorter = better
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i], v = path[i + 1];
      pheromone[u][v] += quality;
      pheromone[v][u] += quality; // symmetric
    }
  }
  // Evaporate
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      pheromone[i][j] *= EVAPORATION;
    }
  }
  // Periodic logging
  if (iter % 100 === 0) {
    console.log(`Iter ${iter}: ants succeeded ${successfulPaths.length}/${ANT_COUNT}, current best length = ${bestLen}`);
  }
}

console.log("\n=== Simulation finished ===");
console.log(`Best path found length: ${bestLen} edges`);
if (bestPath) {
  console.log(`Path: ${bestPath.join(' -> ')}`);
  // Verify against trueDist
  const start = bestPath[0], end = bestPath[bestPath.length - 1];
  const shortest = trueDist[start][end];
  console.log(`True shortest distance between ${start} and ${end}: ${shortest}`);
  if (bestLen === shortest) {
    console.log("✓ Found optimal shortest path.");
  } else {
    console.log(`⚠ Suboptimal by ${bestLen - shortest} edge(s).`);
  }
} else {
  console.log("No successful path found.");
}
console.log(`Last improvement at iteration ${lastImprovement}`);
