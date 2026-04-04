"""
Netic Transfer Router — Benchmark Suite

Algorithms:
  - ACO: Ant Colony Optimization (refactored from original)
  - PSO: Particle Swarm Optimization (continuous → assignment decoder)
  - Greedy: load-aware specialty-priority matching
  - Random: baseline

Each algorithm solves: assign NUM_TASKS to NUM_AGENTS respecting capacity,
optimizing for specialty match and load balance.
"""

import random
import math
import json
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple

# ----------------------
# Problem Definition
# ----------------------

@dataclass
class Agent:
    id: int
    name: str
    specialty: str
    capacity: int
    success_rate: float
    load: int = 0

@dataclass
class Task:
    id: int
    job_type: str
    priority: int  # 1=high, 3=low
    assigned_to: int = None

def generate_problem(num_agents=5, max_capacity=4, num_tasks=15, job_types=None, seed=None):
    if seed is not None:
        random.seed(seed)
    if job_types is None:
        job_types = ['HVAC', 'Plumbing', 'Electrical', 'Appliance', 'General']
    agents = []
    for i in range(num_agents):
        spec = random.choice(job_types)
        agents.append(Agent(
            id=i,
            name=f'CSR-{i+1}',
            specialty=spec,
            capacity=max_capacity,
            success_rate=random.uniform(0.6, 0.9)
        ))
    tasks = []
    for t in range(num_tasks):
        job_type = random.choice(job_types)
        priority = random.randint(1, 3)
        tasks.append(Task(id=t, job_type=job_type, priority=priority))
    return agents, tasks

# ----------------------
# Common Evaluation
# ----------------------

def evaluate_assignment(agents: List[Agent], tasks: List[Task], assignments: Dict[int, int]) -> Tuple[float, dict]:
    """Fitness: higher is better. Returns (fitness, metrics)."""
    # Reset loads
    for a in agents:
        a.load = 0
    # Apply assignments
    for t_idx, a_idx in assignments.items():
        tasks[t_idx].assigned_to = a_idx
        agents[a_idx].load += 1
    # Specialty match count
    specialty_match = 0
    for t_idx, a_idx in assignments.items():
        task = tasks[t_idx]
        agent = agents[a_idx]
        if agent.specialty == task.job_type:
            specialty_match += 1
    # Load imbalance penalty (variance)
    loads = [a.load for a in agents]
    avg_load = sum(loads) / len(loads)
    variance = sum((l - avg_load)**2 for l in loads) / len(loads) if loads else 0
    # Fitness: maximize matches, minimize variance
    fitness = specialty_match - 0.1 * variance
    metrics = {
        'specialty_match': specialty_match,
        'load_variance': variance,
        'total_tasks': len(tasks),
        'agent_loads': {a.name: a.load for a in agents}
    }
    return fitness, metrics

def assignments_to_dict(assignments: Dict[int, int], tasks: List[Task], agents: List[Agent]) -> List[Dict]:
    """Convert assignments to serializable list."""
    out = []
    for t_idx, a_idx in sorted(assignments.items()):
        task = tasks[t_idx]
        agent = agents[a_idx]
        out.append({
            'task_id': task.id,
            'job_type': task.job_type,
            'priority': task.priority,
            'assigned_to': agent.name,
            'agent_specialty': agent.specialty
        })
    return out

# ----------------------
# ACO Implementation
# ----------------------

class ACO:
    def __init__(self, agents, tasks,
                 alpha=1.0, beta=2.0, evaporation=0.5, Q=100.0,
                 iterations=50):
        self.agents = agents
        self.tasks = tasks
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.Q = Q
        self.iterations = iterations
        self.num_tasks = len(tasks)
        self.num_agents = len(agents)
        self.pheromone = [[1.0 for _ in range(self.num_agents)] for _ in range(self.num_tasks)]
        self.history = []

    def heuristic(self, task_idx, agent_idx):
        task = self.tasks[task_idx]
        agent = self.agents[agent_idx]
        # Capability
        capability = 1.0 if agent.specialty == task.job_type else 0.5
        # Load factor (agent capacity remaining)
        load_factor = (agent.capacity - agent.load) / agent.capacity if agent.capacity > 0 else 0.0
        # Success weight
        success_weight = agent.success_rate
        # Priority factor (higher priority → more weight)
        priority_factor = (4 - task.priority) / 3.0
        eta = (capability * 0.5 + load_factor * 0.3 + success_weight * 0.2) * priority_factor
        return max(eta, 0.01)

    def assign_tasks(self):
        # Reset loads
        for a in self.agents:
            a.load = 0
        assignments = {}
        for t_idx in range(self.num_tasks):
            feasible = [a.id for a in self.agents if a.load < a.capacity]
            if not feasible:
                feasible = [a.id for a in self.agents]
            probs = []
            for a_idx in feasible:
                tau = self.pheromone[t_idx][a_idx]
                eta = self.heuristic(t_idx, a_idx)
                probs.append((tau ** self.alpha) * (eta ** self.beta))
            total = sum(probs)
            if total == 0:
                chosen = random.choice(feasible)
            else:
                probs = [p/total for p in probs]
                chosen = random.choices(feasible, weights=probs, k=1)[0]
            assignments[t_idx] = chosen
            self.agents[chosen].load += 1
        return assignments

    def update_pheromones(self, assignments, fitness):
        # Evaporate
        for i in range(self.num_tasks):
            for j in range(self.num_agents):
                self.pheromone[i][j] *= (1 - self.evaporation)
        # Deposit
        for t_idx, a_idx in assignments.items():
            deposit = self.Q * (fitness / (self.num_tasks * 1.0))
            self.pheromone[t_idx][a_idx] += deposit

    def run(self):
        best_fitness = -float('inf')
        best_assignments = None
        for it in range(self.iterations):
            assignments = self.assign_tasks()
            fitness, _ = evaluate_assignment(self.agents, self.tasks, assignments)
            self.history.append(fitness)
            if fitness > best_fitness:
                best_fitness = fitness
                best_assignments = assignments.copy()
            self.update_pheromones(assignments, fitness)
        # Final load reset for consistency
        for a in self.agents:
            a.load = 0
        return best_fitness, best_assignments, self.history

# ----------------------
# PSO Implementation (Discrete Decoding)
# ----------------------

class PSO:
    def __init__(self, agents, tasks,
                 swarm_size=30, iterations=50,
                 w=0.7, c1=1.5, c2=1.5):
        self.agents = agents
        self.tasks = tasks
        self.swarm_size = swarm_size
        self.iterations = iterations
        self.w = w  # inertia
        self.c1 = c1  # cognitive
        self.c2 = c2  # social
        self.num_tasks = len(tasks)
        self.num_agents = len(agents)
        self.history = []

    def decode(self, particle: List[float]) -> Dict[int, int]:
        """Convert continuous particle to discrete assignments respecting capacity."""
        # For each task, pick agent based on weighted scores
        scores = []
        for t_idx, task in enumerate(self.tasks):
            task_scores = []
            for a_idx, agent in enumerate(self.agents):
                # Base score from particle + heuristic bias
                base = particle[t_idx * self.num_agents + a_idx]
                # Add heuristic: specialty match, capacity, success rate
                capability = 1.0 if agent.specialty == task.job_type else 0.5
                load_factor = (agent.capacity - agent.load) / agent.capacity if agent.capacity > 0 else 0.0
                priority_factor = (4 - task.priority) / 3.0
                heuristic_score = capability * 0.5 + load_factor * 0.3 + agent.success_rate * 0.2
                score = base + heuristic_score * priority_factor
                task_scores.append(score)
            scores.append(task_scores)
        # Greedy assignment respecting capacity
        assignments = {}
        loads = [0] * self.num_agents
        # Sort tasks by priority (high first) to assign important tasks first
        task_order = sorted(range(self.num_tasks), key=lambda i: self.tasks[i].priority)
        for t_idx in task_order:
            # Feasible agents: capacity not exceeded
            feasible = [a_idx for a_idx in range(self.num_agents) if loads[a_idx] < self.agents[a_idx].capacity]
            if not feasible:
                feasible = list(range(self.num_agents))
            # Pick agent with highest score among feasible
            best_a = max(feasible, key=lambda a: scores[t_idx][a])
            assignments[t_idx] = best_a
            loads[best_a] += 1
        # Update agent loads for evaluation
        for a in self.agents:
            a.load = loads[a.id]
        return assignments

    def run(self):
        # Initialize particles randomly in [0,1]
        dimension = self.num_tasks * self.num_agents
        swarm = []
        velocities = []
        for _ in range(self.swarm_size):
            particle = [random.random() for _ in range(dimension)]
            swarm.append(particle)
            velocities.append([random.uniform(-0.5, 0.5) for _ in range(dimension)])
        # Evaluate initial
        pbest = [None] * self.swarm_size
        pbest_fitness = [-float('inf')] * self.swarm_size
        gbest_particle = None
        gbest_fitness = -float('inf')
        for i, particle in enumerate(swarm):
            assignments = self.decode(particle)
            fitness, _ = evaluate_assignment(self.agents, self.tasks, assignments)
            if fitness > pbest_fitness[i]:
                pbest_fitness[i] = fitness
                pbest[i] = particle.copy()
            if fitness > gbest_fitness:
                gbest_fitness = fitness
                gbest_particle = particle.copy()
        # PSO loop
        for it in range(self.iterations):
            for i, particle in enumerate(swarm):
                for d in range(dimension):
                    r1, r2 = random.random(), random.random()
                    velocities[i][d] = (self.w * velocities[i][d] +
                                        self.c1 * r1 * (pbest[i][d] - particle[d]) +
                                        self.c2 * r2 * (gbest_particle[d] - particle[d]))
                    particle[d] += velocities[i][d]
                    # Clamp to [0,1]
                    if particle[d] < 0: particle[d] = 0
                    if particle[d] > 1: particle[d] = 1
                assignments = self.decode(particle)
                fitness, _ = evaluate_assignment(self.agents, self.tasks, assignments)
                if fitness > pbest_fitness[i]:
                    pbest_fitness[i] = fitness
                    pbest[i] = particle.copy()
                if fitness > gbest_fitness:
                    gbest_fitness = fitness
                    gbest_particle = particle.copy()
            self.history.append(gbest_fitness)
        # Decode global best
        best_assignments = self.decode(gbest_particle)
        for a in self.agents:
            a.load = 0
        for t_idx, a_idx in best_assignments.items():
            self.agents[a_idx].load += 1
        return gbest_fitness, best_assignments, self.history

# ----------------------
# Greedy Baseline
# ----------------------

def greedy_assign(agents, tasks):
    agents = [a for a in agents]  # copy reset not needed if we reset loads
    for a in agents:
        a.load = 0
    assignments = {}
    # Sort tasks by priority descending
    sorted_tasks = sorted(enumerate(tasks), key=lambda x: x[1].priority)
    for t_idx, task in sorted_tasks:
        # Find best feasible agent: highest (specialty_match * success_rate) with capacity
        candidates = [a for a in agents if a.load < a.capacity]
        if not candidates:
            candidates = agents  # overload fallback
        def score(agent):
            capability = 1.0 if agent.specialty == task.job_type else 0.5
            load_remaining = agent.capacity - agent.load
            return capability * agent.success_rate * (1 + 0.1*load_remaining)
        best = max(candidates, key=score)
        assignments[t_idx] = best.id
        best.load += 1
    # Evaluate
    fitness, metrics = evaluate_assignment(agents, tasks, assignments)
    return fitness, assignments, [fitness]  # single iteration history

# ----------------------
# Random Baseline
# ----------------------

def random_assign(agents, tasks):
    for a in agents:
        a.load = 0
    assignments = {}
    for t_idx, task in enumerate(tasks):
        feasible = [a for a in agents if a.load < a.capacity]
        if not feasible:
            feasible = agents
        chosen = random.choice(feasible)
        assignments[t_idx] = chosen.id
        chosen.load += 1
    fitness, metrics = evaluate_assignment(agents, tasks, assignments)
    return fitness, assignments, [fitness]

# ----------------------
# Main Benchmark Runner
# ----------------------

def run_benchmark(seeds=None, algorithms=None):
    if seeds is None:
        seeds = [42, 123, 2024, 777, 999]
    if algorithms is None:
        algorithms = ['aco', 'pso', 'greedy', 'random']
    results = []
    for seed in seeds:
        agents, tasks = generate_problem(seed=seed)
        for algo in algorithms:
            # Reset agent/task copies
            agents_copy = [Agent(**asdict(a)) for a in agents]
            tasks_copy = [Task(**asdict(t)) for t in tasks]
            if algo == 'aco':
                runner = ACO(agents_copy, tasks_copy, iterations=50)
            elif algo == 'pso':
                runner = PSO(agents_copy, tasks_copy, swarm_size=30, iterations=50)
            elif algo == 'greedy':
                fitness, assignments, history = greedy_assign(agents_copy, tasks_copy)
                result = {
                    'seed': seed,
                    'algorithm': algo,
                    'fitness': fitness,
                    'history': history,
                    'assignments': assignments_to_dict(assignments, tasks_copy, agents_copy)
                }
                results.append(result)
                continue
            elif algo == 'random':
                fitness, assignments, history = random_assign(agents_copy, tasks_copy)
                result = {
                    'seed': seed,
                    'algorithm': algo,
                    'fitness': fitness,
                    'history': history,
                    'assignments': assignments_to_dict(assignments, tasks_copy, agents_copy)
                }
                results.append(result)
                continue
            else:
                continue
            fitness, assignments, history = runner.run()
            result = {
                'seed': seed,
                'algorithm': algo,
                'fitness': fitness,
                'history': history,
                'assignments': assignments_to_dict(assignments, tasks_copy, agents_copy)
            }
            results.append(result)
    return results

if __name__ == '__main__':
    out_dir = '/home/ubuntu/.openclaw/workspace/trinity/experiments/netic_benchmark'
    import os
    os.makedirs(out_dir, exist_ok=True)
    results = run_benchmark()
    out_path = os.path.join(out_dir, 'results.json')
    with open(out_path, 'w') as f:
        json.dump({
            'timestamp': datetime.utcnow().isoformat()+'Z',
            'results': results
        }, f, indent=2)
    # Summary stats
    summary = {}
    for algo in set(r['algorithm'] for r in results):
        fitnesses = [r['fitness'] for r in results if r['algorithm']==algo]
        summary[algo] = {
            'mean_fitness': sum(fitnesses)/len(fitnesses),
            'max_fitness': max(fitnesses),
            'min_fitness': min(fitnesses),
            'trials': len(fitnesses)
        }
    summary_path = os.path.join(out_dir, 'summary.json')
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"Benchmark complete. Results: {out_path}")
    print("Summary:")
    print(json.dumps(summary, indent=2))
