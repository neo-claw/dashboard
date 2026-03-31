"""
Netic Transfer Router — ACO-based assignment of transferred calls to CSRs.

Heuristic factors:
  - Job type match (agent specialization)
  - Agent load (fewer active calls better)
  - Historical success rate (randomized for simulation)
"""

import random
import math
import json
from datetime import datetime

# Simulation parameters
NUM_AGENTS = 5
MAX_CAPACITY = 4  # max concurrent calls per CSR
NUM_TASKS = 15
ACO_ITERATIONS = 50
ALPHA = 1.0  # pheromone importance
BETA = 2.0   # heuristic importance
EVAPORATION = 0.5
Q = 100.0     # pheromone deposit quantity

# Mock job types from Netic taxonomy
JOB_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance', 'General']

# Generate agents with random specializations and baseline success rates
agents = []
for i in range(NUM_AGENTS):
    spec = random.choice(JOB_TYPES)
    agents.append({
        'id': i,
        'name': f'CSR-{i+1}',
        'specialty': spec,
        'capacity': MAX_CAPACITY,
        'load': 0,
        'success_rate': random.uniform(0.6, 0.9)
    })

# Generate transfer tasks (calls needing human CSR) with random job types and priority
tasks = []
for t in range(NUM_TASKS):
    job_type = random.choice(JOB_TYPES)
    priority = random.randint(1, 3)  # 1=high, 3=low
    tasks.append({
        'id': t,
        'job_type': job_type,
        'priority': priority,
        'assigned_to': None
    })

# Pheromone matrix: tasks x agents
pheromone = [[1.0 for _ in range(NUM_AGENTS)] for _ in range(NUM_TASKS)]

def heuristic(task_idx, agent_idx):
    """Compute heuristic desirability η_ij."""
    task = tasks[task_idx]
    agent = agents[agent_idx]

    # Capability: 1 if agent specialty matches task job type, else 0.5 (soft)
    if agent['specialty'] == task['job_type']:
        capability = 1.0
    else:
        capability = 0.5

    # Load factor: inverse of current load (more capacity = better)
    load_factor = (agent['capacity'] - agent['load']) / agent['capacity']

    # Success rate weight
    success_weight = agent['success_rate']

    # Priority factor: higher priority tasks get slightly stronger pull to capable agents
    priority_factor = (4 - task['priority']) / 3  # normalize 1..3 to 1.0..0.33

    # Combined heuristic
    eta = capability * 0.5 + load_factor * 0.3 + success_weight * 0.2
    eta *= priority_factor
    return max(eta, 0.01)  # avoid zero

def assign_tasks():
    """Construct solutions: assign each task to an agent respecting capacity."""
    # Reset loads
    for a in agents:
        a['load'] = 0
    assignments = {}
    for t_idx, task in enumerate(tasks):
        # Determine feasible agents (with available capacity)
        feasible = [a['id'] for a in agents if a['load'] < a['capacity']]
        if not feasible:
            # fallback: assign to least loaded even if over capacity (simulate overload)
            feasible = [a['id'] for a in agents]
        probs = []
        for a_idx in feasible:
            tau = pheromone[t_idx][a_idx]
            eta = heuristic(t_idx, a_idx)
            prob = (tau ** ALPHA) * (eta ** BETA)
            probs.append(prob)
        total = sum(probs)
        if total == 0:
            chosen = random.choice(feasible)
        else:
            probs = [p/total for p in probs]
            chosen = random.choices(feasible, weights=probs, k=1)[0]
        task['assigned_to'] = chosen
        agents[chosen]['load'] += 1
        assignments[t_idx] = chosen
    return assignments

def evaluate(assignments):
    """Fitness function: weighted sum of specialty matches and load balance."""
    specialty_match = 0
    load_balance = 0
    total = NUM_TASKS
    for t_idx, a_idx in assignments.items():
        task = tasks[t_idx]
        agent = agents[a_idx]
        if agent['specialty'] == task['job_type']:
            specialty_match += 1
    # Load imbalance penalty: variance of loads
    loads = [a['load'] for a in agents]
    avg_load = sum(loads)/len(loads)
    variance = sum((l - avg_load)**2 for l in loads)/len(loads)
    # Fitness: specialty matches minus penalty
    fitness = specialty_match - 0.1 * variance
    return fitness, specialty_match, variance

def update_pheromones(assignments, fitness):
    """Global pheromone update: evaporate then deposit Q * (fitness contribution)."""
    for i in range(NUM_TASKS):
        for j in range(NUM_AGENTS):
            pheromone[i][j] *= (1 - EVAPORATION)
    for t_idx, a_idx in assignments.items():
        # deposit proportional to fitness
        deposit = Q * (fitness / (NUM_TASKS * 1.0))
        pheromone[t_idx][a_idx] += deposit

# Run ACO
best_fitness = -float('inf')
best_assignments = None
history = []

for it in range(ACO_ITERATIONS):
    assignments = assign_tasks()
    fitness, matches, var = evaluate(assignments)
    history.append(fitness)
    if fitness > best_fitness:
        best_fitness = fitness
        best_assignments = assignments.copy()
    update_pheromones(assignments, fitness)

# Output results
print(f"\nBest solution (iteration {ACO_ITERATIONS}):")
print(f"Fitness: {best_fitness:.3f}")
print("Assignments:")
for t_idx, a_idx in sorted(best_assignments.items()):
    task = tasks[t_idx]
    agent = agents[a_idx]
    print(f"  Task {t_idx} (job={task['job_type']}, prio={task['priority']}) -> {agent['name']} (specialty={agent['specialty']}, load now={agent['load']})")

print("\nAgent final loads:")
for a in agents:
    print(f"  {a['name']}: {a['load']}/{a['capacity']} (success_rate={a['success_rate']:.2f})")

# Write results to file
out_path = '/home/ubuntu/.openclaw/workspace/trinity/experiments/netic_transfer_router/run.json'
out = {
    'timestamp': datetime.utcnow().isoformat()+'Z',
    'params': {'agents': NUM_AGENTS, 'tasks': NUM_TASKS, 'capacity': MAX_CAPACITY, 'alpha': ALPHA, 'beta': BETA, 'evap': EVAPORATION, 'iterations': ACO_ITERATIONS},
    'agents': agents,
    'tasks': [{'id': t['id'], 'job_type': t['job_type'], 'priority': t['priority'], 'assigned_to': t['assigned_to']} for t in tasks],
    'best_fitness': best_fitness,
    'fitness_history': history
}
with open(out_path, 'w') as f:
    json.dump(out, f, indent=2)
print(f"\nResults written to {out_path}")
