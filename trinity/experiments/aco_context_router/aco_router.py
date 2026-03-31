"""
ACO-based Context Retrieval Router

Simulates ant colony optimization for selecting relevant context nodes.
Each "node" represents a context item with an embedding vector.
Ants choose nodes based on pheromone and similarity to the query.
Goal: maximize total relevance of selected set under capacity constraint.
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

class ACORouter:
    def __init__(self, nodes: List[Node], n_ants: int = 10, capacity: int = 5,
                 alpha: float = 1.0, beta: float = 2.0, evaporation: float = 0.5,
                 n_iterations: int = 100, q: float = 0.1):
        self.nodes = nodes
        self.n_ants = n_ants
        self.capacity = capacity
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.n_iterations = n_iterations
        self.q = q  # pheromone deposit factor
        self.pheromones = [0.1] * len(nodes)
        self.fitness_history = []

    def _choose_node(self, available_indices: List[int]) -> int:
        """Select a node using pheromone and heuristic."""
        if not available_indices:
            return -1
        phero = [self.pheromones[i] ** self.alpha for i in available_indices]
        heur = [self.nodes[i].relevance ** self.beta for i in available_indices]
        prob = [p * h for p, h in zip(phero, heur)]
        prob_sum = sum(prob)
        if prob_sum == 0:
            prob = [1.0/len(available_indices)] * len(available_indices)
        else:
            prob = [p / prob_sum for p in prob]
        chosen_idx = random.choices(range(len(available_indices)), weights=prob, k=1)[0]
        return available_indices[chosen_idx]

    def _construct_solution(self) -> Tuple[List[int], float]:
        """One ant constructs a solution: a set of node indices up to capacity."""
        available = list(range(len(self.nodes)))
        chosen = []
        for _ in range(self.capacity):
            if not available:
                break
            node_id = self._choose_node(available)
            chosen.append(node_id)
            available.remove(node_id)
        # fitness = total relevance of chosen set
        fitness = sum(self.nodes[i].relevance for i in chosen)
        return chosen, fitness

    def _update_pheromones(self, solutions: List[Tuple[List[int], float]]):
        """Evaporate and deposit pheromone based on best solutions."""
        # evaporate
        self.pheromones = [p * (1 - self.evaporation) for p in self.pheromones]
        # deposit: quality-based deposit; each ant deposits Q * fitness on its nodes
        for chosen, fitness in solutions:
            deposit = self.q * fitness
            for idx in chosen:
                self.pheromones[idx] += deposit

    def run(self) -> Tuple[List[int], float]:
        """Run ACO iterations and return best solution found."""
        best_solution = []
        best_fitness = -1
        for it in range(self.n_iterations):
            solutions = [self._construct_solution() for _ in range(self.n_ants)]
            # Track global best
            for sol, fit in solutions:
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
    # Simulate context nodes: random vectors in 10D
    random.seed(42)
    N = 20
    dim = 10
    vectors = []
    for _ in range(N):
        vec = [random.gauss(0, 1) for _ in range(dim)]
        norm = math.sqrt(sum(x*x for x in vec))
        vec = [x / norm for x in vec]
        vectors.append(vec)

    # Query vector (also random)
    query = [random.gauss(0, 1) for _ in range(dim)]
    norm_q = math.sqrt(sum(x*x for x in query))
    query = [x / norm_q for x in query]

    # Compute relevance (cosine similarity) for each node
    nodes = [Node(id=i, vector=vectors[i], relevance=cosine_similarity(query, vectors[i])) for i in range(N)]

    # Sort by true relevance for baseline
    sorted_nodes = sorted(nodes, key=lambda x: x.relevance, reverse=True)
    best_possible_fitness = sum(n.relevance for n in sorted_nodes[:5])
    print(f"Oracle top-5 total relevance (oracle): {best_possible_fitness:.4f}")

    # Run ACO
    aco = ACORouter(nodes, n_ants=15, capacity=5, n_iterations=80, alpha=1.0, beta=2.0, evaporation=0.6, q=0.1)
    solution, fitness = aco.run()

    print(f"\nACO best fitness: {fitness:.4f}")
    print("Selected node IDs:", solution)
    print("Fitness progression (first, last):", aco.fitness_history[0], aco.fitness_history[-1])

    # Write results to file
    with open('results.txt', 'w') as f:
        f.write(f"Oracle top-5 total relevance: {best_possible_fitness:.4f}\n")
        f.write(f"ACO best fitness: {fitness:.4f}\n")
        f.write(f"Selected nodes: {solution}\n")
        f.write("Fitness history:\n")
        for i, fit in enumerate(aco.fitness_history):
            f.write(f"{i}: {fit:.4f}\n")

if __name__ == "__main__":
    main()
