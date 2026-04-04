# Ant Colony Routing (ACO) Simulation

## Overview

This experiment explores **Ant Colony Optimization (ACO)** for routing tasks in a multi-agent system, inspired by research on *AMRO-S* (Pheromone-Guided Routing for Multi-Agent LLM Systems) and ant colony behavior notes.

A network of agents (nodes) is modeled as an undirected graph. Tasks originate at a random start node and must reach a random destination. "Ants" (tasks) traverse the graph, choosing next hops probabilistically based on:

- **Pheromone intensity** on edges (reinforced by successful shortest traversals)
- **Heuristic**: inverse shortest-path distance to the goal (precomputed via Floyd-Warshall)

Over iterations, pheromone evaporation prevents stagnation, and the colony converges to shortest paths.

## Motivation

- Distributed context: ants leave externalized memory (pheromone) – parallels with shared context boards.
- Biomimetic systems: ant colonies as superorganisms for efficient coordination.
- Utility for Neo: If Neo uses multiple specialized agents, an ACO router could dynamically learn optimal delegation paths, reducing latency and inference cost (as shown in AMRO-S: 4.7× speedup).

## Running

```bash
node simulation.js
```

Output includes iteration logs, the best path found, its length, whether it matches the true shortest path, and the iteration of last improvement.

## Metrics

- Best path length vs. true shortest distance (optimality)
- Convergence speed (iteration when optimal path first found)
- Success rate (ants that reach destination)

## Files

- `simulation.js` – self-contained experiment (no dependencies)
- `README.md` – this file

## Next Steps

- Extend to directed graphs and weighted edges.
- Add agent capacities and task priorities to the routing decision.
- Integrate with a real multi-agent framework (e.g., LangGraph, AutoGen).
- Visualize pheromone evolution and path selection.

## References

- AMRO-S paper: https://arxiv.org/pdf/2603.12933
- Ant colony research (from explore.md): Jackson & Ratnieks, Wilson, etc.
