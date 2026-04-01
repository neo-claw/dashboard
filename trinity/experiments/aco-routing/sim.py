import random
from collections import defaultdict
from graph import Graph
from aco import AntColony

def generate_synthetic_network(num_agents=3, num_contexts=20, connectivity=0.2):
    g = Graph()
    # Create context nodes
    contexts = [f"C{i}" for i in range(num_contexts)]
    for c in contexts:
        g.add_node(c)
    # Create agent nest nodes
    nests = [f"Nest-{chr(65+i)}" for i in range(num_agents)]
    agents = [f"Agent-{chr(65+i)}" for i in range(num_agents)]
    for nest in nests:
        g.add_node(nest)
    for agent, nest in zip(agents, nests):
        g.set_agent_nest(agent, nest)

    # Connect contexts to each other and to some nests
    all_nodes = contexts + nests
    for i, a in enumerate(all_nodes):
        for j, b in enumerate(all_nodes):
            if i >= j:
                continue
            if random.random() < connectivity:
                weight = random.random()
                g.add_edge(a, b, weight)
    # Ensure each context has at least one edge
    for c in contexts:
        if not g.neighbors(c):
            target = random.choice(nests + [o for o in contexts if o != c])
            g.add_edge(c, target, random.random())
    return g, contexts, agents

def assign_usage_patterns(contexts, agents, bias=0.6):
    """For each context, assign a primary agent with probability bias; others share remainder."""
    usage = defaultdict(list)  # context -> list of agents who use it
    for c in contexts:
        primary = random.choice(agents)
        usage[c].append(primary)
        # Secondary agents with lower probability
        for a in agents:
            if a != primary and random.random() < (1-bias)/2:
                usage[c].append(a)
    return usage

def simulate(g, contexts, agents, usage, iterations=5):
    colony = AntColony(g, alpha=1.0, beta=2.0, evaporation=0.3, iterations=iterations)
    correct = 0
    total = 0
    history = []
    for it in range(iterations):
        # Pick a random context to route
        ctx = random.choice(contexts)
        true_agents = usage[ctx]
        # ACO route
        predicted = colony.route(ctx, agents)
        correct += 1 if predicted in true_agents else 0
        total += 1
        # Reinforce with true agent
        if predicted in true_agents:
            colony.simulate_ants(ctx, predicted, n_ants=1)
        colony.evaporate()
        history.append(correct/total)
        if (it+1) % 1 == 0:
            print(f"  Iter {it+1}/{iterations} - current accuracy: {correct/total:.3f}")
    return correct/total, history

def baseline_random(contexts, agents, usage, iterations=5):
    correct = 0
    total = 0
    for _ in range(iterations):
        ctx = random.choice(contexts)
        true_agents = usage[ctx]
        predicted = random.choice(agents)
        correct += 1 if predicted in true_agents else 0
        total += 1
    return correct/total

def main():
    random.seed(42)
    g, contexts, agents = generate_synthetic_network()
    usage = assign_usage_patterns(contexts, agents)
    print("Network: contexts=", len(contexts), "agents=", agents)
    baseline = baseline_random(contexts, agents, usage)
    aco_score, _ = simulate(g, contexts, agents, usage)
    print(f"Baseline random accuracy: {baseline:.3f}")
    print(f"ACO routing accuracy: {aco_score:.3f}")
    improvement = aco_score - baseline
    print(f"Improvement: {improvement:.3f}")
    return improvement

if __name__ == "__main__":
    main()
