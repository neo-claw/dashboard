import random
import math
from collections import defaultdict

class Graph:
    def __init__(self):
        self.nodes = set()
        self.edges = defaultdict(dict)  # node -> {neighbor: weight}
        self.agent_nests = {}  # agent_name -> nest_node

    def add_node(self, node):
        self.nodes.add(node)

    def add_edge(self, a, b, weight):
        self.edges[a][b] = weight
        self.edges[b][a] = weight

    def set_agent_nest(self, agent, nest_node):
        self.agent_nests[agent] = nest_node

    def neighbors(self, node):
        return list(self.edges[node].keys())

    def edge_weight(self, a, b):
        return self.edges[a].get(b, 0)

    def set_pheromone(self, a, b, value):
        # Store pheromone as overlay on edge; weight remains static
        if not hasattr(self, 'pheromones'):
            self.pheromones = defaultdict(dict)
        self.pheromones[a][b] = value
        self.pheromones[b][a] = value

    def get_pheromone(self, a, b):
        if not hasattr(self, 'pheromones'):
            return 0.0
        return self.pheromones[a].get(b, 0.0)

    def all_pheromones(self):
        if not hasattr(self, 'pheromones'):
            return {}
        return dict(self.pheromones)
