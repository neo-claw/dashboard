#!/usr/bin/env python3
"""
Multi-Pheromone Simulator for Ant Colony Context Memory
Demonstrates how two pheromones with different decay rates (short-term and long-term)
can be used together to balance recent feedback with lasting memory.
"""

import random
import math

# Parameters
N_ANTS = 10
N_ITER = 100
DECAY_ST = 0.90   # short-term evaporation rate
DECAY_LT = 0.99   # long-term evaporation rate (slower)
DEPOSIT = 1.0     # amount deposited per ant for each pheromone type
W_ST = 1.0        # weight for short-term pheromone in decision
W_LT = 1.0        # weight for long-term pheromone

class Trail:
    def __init__(self, name):
        self.name = name
        self.st = 0.0  # short-term pheromone
        self.lt = 0.0  # long-term pheromone

    def score(self):
        return W_ST * self.st + W_LT * self.lt

def choose_trail(trails):
    """Choose a trail probabilistically based on scores (softmax)."""
    scores = [t.score() for t in trails]
    max_score = max(scores)
    # subtract max for numerical stability
    exps = [math.exp(s - max_score) for s in scores]
    total = sum(exps)
    if total == 0:
        return random.choice(trails)
    r = random.random() * total
    cumulative = 0.0
    for t, exp_val in zip(trails, exps):
        cumulative += exp_val
        if r <= cumulative:
            return t
    return trails[-1]

def main():
    random.seed(42)
    trails = [Trail("Short Trail"), Trail("Long Trail")]
    # Initially, give a tiny random pheromone to avoid zero probabilities
    for t in trails:
        t.st = 0.1
        t.lt = 0.1

    print("# Multi-Pheromone Simulator")
    print("Iter | Short(ST/LT)        | Long(ST/LT)         | Chosen")
    print("-" * 60)

    for it in range(1, N_ITER + 1):
        # Each ant makes a choice and deposits after return
        choices = []
        for _ in range(N_ANTS):
            chosen = choose_trail(trails)
            choices.append(chosen)
        # Deposit: all ants that chose a trail deposit both pheromones
        for t in trails:
            count = sum(1 for c in choices if c is t)
            if count > 0:
                t.st += count * DEPOSIT
                t.lt += count * DEPOSIT
        # Evaporate
        for t in trails:
            t.st *= DECAY_ST
            t.lt *= DECAY_LT
        # Log every 10 iterations
        if it % 10 == 0:
            short_counts = sum(1 for c in choices if c is trails[0])
            long_counts = N_ANTS - short_counts
            chosen_str = f"Short:{short_counts} Long:{long_counts}"
            print(f"{it:4d} | {trails[0].st:5.2f}/{trails[0].lt:5.2f}        | {trails[1].st:5.2f}/{trails[1].lt:5.2f}        | {chosen_str}")

    print("\n# Done.")
    # Final scores
    print("\nFinal scores (weighted sum):")
    for t in trails:
        print(f"  {t.name}: {t.score():.3f}")

if __name__ == "__main__":
    main()
