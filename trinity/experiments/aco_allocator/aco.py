"""
ACO-based Task Allocator for Multi-Agent Systems (pure Python prototype)

No external dependencies beyond standard library.
"""

import random
import math
import statistics

def dot(a, b):
    return sum(x*y for x, y in zip(a, b))

def norm(vec):
    return math.sqrt(dot(vec, vec))

def cosine_similarity(a, b):
    na, nb = norm(a), norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return dot(a, b) / (na * nb)

class Task:
    def __init__(self, tid, req_vector):
        self.id = tid
        self.req = req_vector

class Agent:
    def __init__(self, aid, cap_vector, capacity):
        self.id = aid
        self.cap = cap_vector
        self.capacity = capacity
        self.assigned = []

def init_pheromone(n_tasks, n_agents, init=1.0):
    return [[init for _ in range(n_agents)] for _ in range(n_tasks)]

def compute_heuristic(tasks, agents):
    n_tasks = len(tasks)
    n_agents = len(agents)
    eta = [[0.0]*n_agents for _ in range(n_tasks)]
    for i, task in enumerate(tasks):
        for j, agent in enumerate(agents):
            remaining = agent.capacity - len(agent.assigned)
            if remaining <= 0:
                eta[i][j] = 0.0
                continue
            sim = cosine_similarity(task.req, agent.cap)
            load_factor = 1.0 / (len(agent.assigned) + 1)
            eta[i][j] = sim * load_factor
    # normalize per task
    for i in range(n_tasks):
        row = eta[i]
        max_val = max(row)
        if max_val > 0:
            eta[i] = [v/max_val for v in row]
    return eta

def choose_agent(task_idx, available_agents, pheromone, eta, alpha, beta, rng):
    """Return the chosen agent index from available list."""
    tau_row = [pheromone[task_idx][j] for j in available_agents]
    eta_row = [eta[task_idx][j] for j in available_agents]
    probs = [(tau**alpha) * (e**beta) for tau, e in zip(tau_row, eta_row)]
    sum_probs = sum(probs)
    if sum_probs == 0:
        # uniform
        probs = [1.0/len(available_agents)] * len(available_agents)
    else:
        probs = [p/sum_probs for p in probs]
    return rng.choices(available_agents, weights=probs, k=1)[0]

def assign_task_ant(tasks, agents, pheromone, alpha, beta, rng):
    # Reset agents
    for a in agents:
        a.assigned = []
    task_order = list(range(len(tasks)))
    rng.shuffle(task_order)
    for idx in task_order:
        available = [j for j, a in enumerate(agents) if len(a.assigned) < a.capacity]
        if not available:
            continue
        eta = compute_heuristic(tasks, agents)  # recompute heuristic based on current loads
        chosen = choose_agent(idx, available, pheromone, eta, alpha, beta, rng)
        agents[chosen].assigned.append(tasks[idx].id)
    # return assignment mapping
    return {a.id: a.assigned.copy() for a in agents}

def evaluate_fitness(tasks, agents, assignment):
    # Build task lookup
    task_lookup = {t.id: t for t in tasks}
    total_fit = 0.0
    for aid, tids in assignment.items():
        agent = next(a for a in agents if a.id == aid)
        for tid in tids:
            task = task_lookup[tid]
            sim = cosine_similarity(task.req, agent.cap)
            total_fit += sim
    # load variance bonus
    loads = [len(assignment[aid]) for aid in assignment]
    if loads:
        mean = statistics.mean(loads)
        if len(loads) > 1:
            var = statistics.variance(loads) if len(loads) > 1 else 0.0
        else:
            var = 0.0
        bonus = 1.0 / (1.0 + var)
        total_fit *= bonus
    return total_fit

def update_pheromone(pheromone, assignments, fitnesses, rho, Q, best_idx):
    # evaporate
    for i in range(len(pheromone)):
        for j in range(len(pheromone[0])):
            pheromone[i][j] *= (1 - rho)
    # deposit from best ant
    best_assign = assignments[best_idx]
    best_fit = fitnesses[best_idx]
    # map agent id to index
    agent_index = {a.id: idx for idx, a in enumerate(agents)}
    task_index = {t.id: idx for idx, t in enumerate(tasks)}
    for aid, tids in best_assign.items():
        a_idx = agent_index[aid]
        for tid in tids:
            t_idx = task_index[tid]
            pheromone[t_idx][a_idx] += Q * best_fit
    return pheromone

def run_aco(tasks, agents, n_ants=10, n_iter=100, alpha=1.0, beta=2.0, rho=0.1, Q=1.0, seed=None):
    rng = random.Random(seed)
    pheromone = init_pheromone(len(tasks), len(agents))
    best_fitness = -float('inf')
    best_assignment = None
    history = []
    for it in range(n_iter):
        assignments = []
        fitnesses = []
        for ant in range(n_ants):
            assignment = assign_task_ant(tasks, agents, pheromone, alpha, beta, rng)
            fitness = evaluate_fitness(tasks, agents, assignment)
            assignments.append(assignment)
            fitnesses.append(fitness)
            if fitness > best_fitness:
                best_fitness = fitness
                best_assignment = assignment
        best_idx = fitnesses.index(max(fitnesses))
        update_pheromone(pheromone, assignments, fitnesses, rho, Q, best_idx)
        history.append(best_fitness)
        if it % 10 == 0:
            print(f"Iter {it}: best fitness = {best_fitness:.4f}")
    return best_assignment, best_fitness, history

def print_assignment(assignment):
    print("\nFinal Assignment (Agent -> Tasks):")
    for aid in sorted(assignment.keys()):
        print(f"  Agent {aid}: {assignment[aid]}")

if __name__ == "__main__":
    # Config
    n_tasks = 20
    n_agents = 5
    dim = 5
    capacity = 4
    seed = 123

    # Create tasks
    tasks = [Task(i, [random.random() for _ in range(dim)]) for i in range(n_tasks)]
    # Create agents
    agents = [Agent(j, [random.random() for _ in range(dim)], capacity) for j in range(n_agents)]

    # Run
    best_assignment, best_fitness, history = run_aco(tasks, agents, n_ants=10, n_iter=100, alpha=1.0, beta=2.0, rho=0.1, Q=1.0, seed=seed)

    print(f"\nBest fitness: {best_fitness:.4f}")
    print_assignment(best_assignment)
    print("\nFitness history (last 10):", history[-10:])

    # Optionally write history to file
    with open('history.txt', 'w') as f:
        for val in history:
            f.write(f"{val}\n")
    print("History written to history.txt")
