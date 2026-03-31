"""
ACO-based Context Retrieval Router with Diversity Optimization

Extends the base ACO router to promote diversity among selected context nodes.
Prevents selecting multiple nodes that are too similar to each other,
improving information gain from the retrieved set.

Diversity is enforced by penalizing the heuristic for candidates that are
very similar to already-selected nodes. The penalty is based on the maximum
cosine similarity to any selected node: diversity_factor = 1 - max_sim.
"""

import random
import math
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class Node:
    id: int
    vector: List[float]  # embedding
    relevance: float = 0.0  # similarity to query (precomputed)

class DiversityACORouter:
    def __init__(self, nodes: List[Node], n_ants: int = 10, capacity: int = 5,
                 alpha: float = 1.0, beta: float = 2.0, gamma: float = 1.0,
                 evaporation: float = 0.5, n_iterations: int = 100, q: float = 0.1):
        self.nodes = nodes
        self.n_ants = n_ants
        self.capacity = capacity
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.evaporation = evaporation
        self.n_iterations = n_iterations
        self.q = q
        self.pheromones = [0.1] * len(nodes)
        self.fitness_history = []

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        dot = sum(x*y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x*x for x in a))
        norm_b = math.sqrt(sum(y*y for y in b))
        return dot / (norm_a * norm_b + 1e-8)

    def _choose_node(self, available_indices: List[int], selected_vectors: List[List[float]]) -> int:
        """Select a node using pheromone, relevance, and diversity."""
        if not available_indices:
            return -1
        phero = [self.pheromones[i] ** self.alpha for i in available_indices]
        heur_relevance = [self.nodes[i].relevance ** self.beta for i in available_indices]

        # Compute diversity factor for each candidate
        diversity_factors = []
        for i in available_indices:
            if not selected_vectors:
                diversity = 1.0  # no diversity constraint for first pick
            else:
                # max similarity to any already selected node
                max_sim = max(self._cosine_similarity(self.nodes[i].vector, v) for v in selected_vectors)
                diversity = 1.0 - max_sim
                # Ensure non-negative
                diversity = max(diversity, 1e-6)
            diversity_factors.append(diversity ** self.gamma)

        prob = [p * h * d for p, h, d in zip(phero, heur_relevance, diversity_factors)]
        prob_sum = sum(prob)
        if prob_sum == 0:
            prob = [1.0/len(available_indices)] * len(available_indices)
        else:
            prob = [p / prob_sum for p in prob]
        chosen_idx = random.choices(range(len(available_indices)), weights=prob, k=1)[0]
        return available_indices[chosen_idx]

    def _construct_solution(self) -> Tuple[List[int], float, List[List[float]]]:
        """Construct a solution: select nodes up to capacity, also return selected vectors."""
        available = list(range(len(self.nodes)))
        chosen = []
        selected_vectors = []
        for _ in range(self.capacity):
            if not available:
                break
            node_id = self._choose_node(available, selected_vectors)
            chosen.append(node_id)
            selected_vectors.append(self.nodes[node_id].vector)
            available.remove(node_id)
        fitness = sum(self.nodes[i].relevance for i in chosen)
        return chosen, fitness, selected_vectors

    def _update_pheromones(self, solutions: List[Tuple[List[int], float, List[List[float]]]]):
        """Evaporate and deposit pheromone based on best solutions."""
        self.pheromones = [p * (1 - self.evaporation) for p in self.pheromones]
        for chosen, fitness, _ in solutions:
            deposit = self.q * fitness
            for idx in chosen:
                self.pheromones[idx] += deposit

    def run(self) -> Tuple[List[int], float]:
        """Run ACO iterations and return best solution found."""
        best_solution = []
        best_fitness = -1
        for it in range(self.n_iterations):
            solutions = [self._construct_solution() for _ in range(self.n_ants)]
            for sol, fit, _ in solutions:
                if fit > best_fitness:
                    best_fitness = fit
                    best_solution = sol.copy()
            self._update_pheromones(solutions)
            self.fitness_history.append(best_fitness)
        return best_solution, best_fitness

def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x*y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x*x for x in a))
    norm_b = math.sqrt(sum(y*y for y in b))
    return dot / (norm_a * norm_b + 1e-8)

def main():
    random.seed(42)
    N = 20
    dim = 10
    vectors = []
    for _ in range(N):
        vec = [random.gauss(0, 1) for _ in range(dim)]
        norm = math.sqrt(sum(x*x for x in vec))
        vec = [x / norm for x in vec]
        vectors.append(vec)

    # Query vector
    query = [random.gauss(0, 1) for _ in range(dim)]
    norm_q = math.sqrt(sum(x*x for x in query))
    query = [x / norm_q for x in query]

    # Nodes with relevance (cosine to query)
    nodes = [Node(id=i, vector=vectors[i], relevance=cosine_similarity(query, vectors[i])) for i in range(N)]

    # Baseline: top-K by pure relevance (oracle)
    sorted_nodes = sorted(nodes, key=lambda x: x.relevance, reverse=True)
    capacity = 5
    oracle_fitness = sum(n.relevance for n in sorted_nodes[:capacity])
    print(f"Oracle top-{capacity} total relevance: {oracle_fitness:.4f}")

    # Run standard ACO (no diversity) for baseline
    print("\n--- Standard ACO (no diversity) ---")
    # Use original ACORouter logic inline or import? For simplicity, we'll inline a simple version.
    # We'll use the same class but with gamma=0 (which would cause division by zero if not handled)
    # Instead we can set gamma=0 to effectively ignore diversity: i.e., diversity factor = 1.
    # But our implementation computes diversity and raises to gamma. If gamma=0, diversity_factor**0 = 1.
    # So we can just use DiversityACORouter with gamma=0.
    aco_std = DiversityACORouter(nodes, n_ants=15, capacity=capacity, n_iterations=80,
                                 alpha=1.0, beta=2.0, gamma=0.0, evaporation=0.6, q=0.1)
    std_solution, std_fitness = aco_std.run()
    print(f"Standard ACO fitness: {std_fitness:.4f}")
    # Compute intra-set average pairwise similarity for diversity metric (lower is more diverse)
    std_vectors = [nodes[i].vector for i in std_solution]
    std_pairwise_sim = 0
    count = 0
    for i in range(len(std_vectors)):
        for j in range(i+1, len(std_vectors)):
            std_pairwise_sim += cosine_similarity(std_vectors[i], std_vectors[j])
            count += 1
    std_avg_sim = std_pairwise_sim / count if count > 0 else 0
    print(f"Standard ACO average pairwise similarity: {std_avg_sim:.4f}")

    # Run diversity-aware ACO
    print("\n--- Diversity-Aware ACO (gamma=1.0) ---")
    aco_div = DiversityACORouter(nodes, n_ants=15, capacity=capacity, n_iterations=80,
                                 alpha=1.0, beta=2.0, gamma=1.0, evaporation=0.6, q=0.1)
    div_solution, div_fitness = aco_div.run()
    print(f"Diversity ACO fitness: {div_fitness:.4f}")
    div_vectors = [nodes[i].vector for i in div_solution]
    div_pairwise_sim = 0
    count = 0
    for i in range(len(div_vectors)):
        for j in range(i+1, len(div_vectors)):
            div_pairwise_sim += cosine_similarity(div_vectors[i], div_vectors[j])
            count += 1
    div_avg_sim = div_pairwise_sim / count if count > 0 else 0
    print(f"Diversity ACO average pairwise similarity: {div_avg_sim:.4f}")

    # Write results
    with open('diverse_results.txt', 'w') as f:
        f.write("Diversity-Optimized ACO Context Router\n")
        f.write(f"Oracle top-{capacity} total relevance: {oracle_fitness:.4f}\n\n")
        f.write("Standard ACO (gamma=0):\n")
        f.write(f"  Fitness: {std_fitness:.4f}\n")
        f.write(f"  Avg pairwise similarity: {std_avg_sim:.4f}\n")
        f.write(f"  Selected IDs: {std_solution}\n\n")
        f.write("Diversity ACO (gamma=1.0):\n")
        f.write(f"  Fitness: {div_fitness:.4f}\n")
        f.write(f"  Avg pairwise similarity: {div_avg_sim:.4f}\n")
        f.write(f"  Selected IDs: {div_solution}\n")
        f.write("\nFitness history (diversity version) - first, last: ")
        f.write(f"{aco_div.fitness_history[0]}, {aco_div.fitness_history[-1]}\n")

    print("\nResults written to diverse_results.txt")

if __name__ == "__main__":
    main()
