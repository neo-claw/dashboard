# ACO Context Routing Prototype

Minimal implementation: Ant Colony Optimization to route context fragments to relevant agents.

## Design

- **Context Graph**: Nodes = context fragments (markdown blobs). Edges = semantic similarity (cosine from embeddings, but for prototype: random or TF-IDF heuristic).
- **Agents**: Each agent (Neo, Trinity, etc.) has a "nest" node.
- **Ants**: Construct probabilistic paths from context node to agent nest. Probability influenced by:
  - Edge weight (similarity)
  - Pheromone trail (historical retrieval count by that agent)
- **Pheromone Update**: When an agent retrieves/uses a context fragment, deposit additional pheromone on edges along that path.
- **Goal**: Maximize probability that a given context ends up at the agent most likely to use it.

## Files

- `graph.py`: Graph + edge management
- `aco.py`: Ant colony logic, pheromone update, routing decision
- `sim.py`: Simulation loop, generate synthetic agents/contexts, measure routing accuracy vs random
- `results.md`: Output of test runs

## Constraints

- Pure Python stdlib only (no numpy/scikit to keep it lean). Use `random`, `math`, `collections`.
- Target: <150 lines total across files.
