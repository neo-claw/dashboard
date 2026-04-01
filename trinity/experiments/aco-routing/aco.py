import random
import math
from collections import defaultdict

class AntColony:
    def __init__(self, graph, alpha=1.0, beta=2.0, evaporation=0.5, iterations=10):
        self.g = graph
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.iterations = iterations

    def _choose_next(self, current, targets):
        """Choose next node using pheromone + heuristic."""
        neighbors = self.g.neighbors(current)
        probs = []
        for n in neighbors:
            tau = self.g.get_pheromone(current, n) ** self.alpha
            eta = self.g.edge_weight(current, n) ** self.beta
            probs.append(tau * eta)
        total = sum(probs)
        if total == 0:
            return random.choice(neighbors)
        r = random.random() * total
        cum = 0
        for n, p in zip(neighbors, probs):
            cum += p
            if r <= cum:
                return n
        return neighbors[-1]

    def _build_path(self, start, target_agent):
        """Ant walks from start to agent's nest; return path."""
        path = [start]
        current = start
        target_nest = self.g.agent_nests[target_agent]
        visited = set([start])
        while current != target_nest:
            current = self._choose_next(current, [target_nest])
            if current in visited:
                break  # prevent cycle
            visited.add(current)
            path.append(current)
        return path

    def _deposit_pheromone(self, path, amount):
        """Add pheromone along the path."""
        for i in range(len(path)-1):
            a, b = path[i], path[i+1]
            existing = self.g.get_pheromone(a, b)
            self.g.set_pheromone(a, b, existing + amount)

    def simulate_ants(self, context_node, target_agent, n_ants=5):
        """Run ant simulation to reinforce path to target agent for this context."""
        for _ in range(n_ants):
            path = self._build_path(context_node, target_agent)
            # Deposit proportional to path quality: shorter = more
            deposit = 1.0 / len(path)
            self._deposit_pheromone(path, deposit)

    def evaporate(self):
        """Evaporate all pheromones globally."""
        if hasattr(self.g, 'pheromones'):
            new_pheromones = defaultdict(dict)
            for a, neighbors in self.g.pheromones.items():
                for b, val in neighbors.items():
                    evaporated = val * (1 - self.evaporation)
                    if evaporated > 0.001:
                        new_pheromones[a][b] = evaporated
            self.g.pheromones = new_pheromones

    def _greedy_path_score(self, start, target, max_hops=10):
        """Greedily walk from start towards target picking neighbor with highest (pheromone * weight). Return score (sum of pheromones along taken edges)."""
        current = start
        visited = set([current])
        score = 0.0
        for _ in range(max_hops):
            if current == target:
                break
            neighbors = self.g.neighbors(current)
            # Evaluate each neighbor
            best_n = None
            best_val = -1
            for n in neighbors:
                if n in visited:
                    continue
                tau = self.g.get_pheromone(current, n)
                w = self.g.edge_weight(current, n)
                val = tau * w
                if val > best_val:
                    best_val = val
                    best_n = n
            if best_n is None:
                break  # dead end
            visited.add(best_n)
            current = best_n
            score += best_val
        return score

    def route(self, context_node, agents):
        """Given context_node, choose best agent nest based on greedy pheromone trail."""
        scores = {}
        for agent in agents:
            nest = self.g.agent_nests[agent]
            score = self._greedy_path_score(context_node, nest)
            scores[agent] = score
        # If all zero, random
        if all(s == 0 for s in scores.values()):
            return random.choice(agents)
        return max(scores, key=scores.get)
