"""AntContext: Distributed context sharing inspired by ant pheromone trails.

Core concepts:
- Trail: A shared context registry where agents deposit messages.
- Pheromones: Messages with strength that decay over time.
- Agents can deposit, sense, and reinforce trails.

Designed for simplicity: no external dependencies, pure Python.
"""

import time
import threading
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class Pheromone:
    """A unit of context deposited by an agent."""
    message: str
    strength: float  # 0.0 to 1.0 initial strength
    deposited: float = field(default_factory=time.time)
    agent_id: str = "agent"

    def current_strength(self, decay_rate: float = 0.01) -> float:
        """Return strength after exponential decay."""
        age = time.time() - self.deposited
        return self.strength * (1 - decay_rate * age)


class Trail:
    """A shared context trail that holds pheromones."""
    def __init__(self, decay_rate: float = 0.01):
        self._lock = threading.Lock()
        self.pheromones: List[Pheromone] = []
        self.decay_rate = decay_rate

    def deposit(self, message: str, strength: float = 1.0, agent_id: str = "agent"):
        """Add a new pheromone to the trail."""
        with self._lock:
            self.pheromones.append(Pheromone(message, strength, agent_id=agent_id))

    def sense(self, threshold: float = 0.1, max_results: int = 10) -> List[Dict[str, Any]]:
        """Return active pheromones above threshold, sorted by current strength."""
        with self._lock:
            active = []
            for p in self.pheromones:
                cur = p.current_strength(self.decay_rate)
                if cur >= threshold:
                    active.append({
                        "message": p.message,
                        "strength": cur,
                        "agent": p.agent_id,
                        "age": time.time() - p.deposited
                    })
            # Sort descending by strength
            active.sort(key=lambda x: x["strength"], reverse=True)
            return active[:max_results]

    def reinforce(self, message: str, boost: float = 0.2):
        """Deposit a new pheromone on an existing message to boost its strength."""
        with self._lock:
            # Find existing pheromones with similar message and reinforce (by adding new)
            # Simple implementation: just deposit with higher strength
            self.deposit(message, strength=min(1.0, boost), agent_id="reinforcer")


class Agent:
    """An agent that uses a trail for context."""
    def __init__(self, agent_id: str, trail: Trail):
        self.agent_id = agent_id
        self.trail = trail

    def announce(self, message: str):
        """Deposit a message onto the trail."""
        self.trail.deposit(message, agent_id=self.agent_id)

    def observe(self) -> List[Dict[str, Any]]:
        """Read current context from the trail."""
        return self.trail.sense()

    def respond_to(self, message: str, strength: float = 0.8):
        """Deposit a response that reinforces an existing message."""
        self.trail.reinforce(message, boost=strength)


def demo():
    """Demonstrate AntContext basics."""
    trail = Trail(decay_rate=0.1)  # faster decay for demo
    alice = Agent("alice", trail)
    bob = Agent("bob", trail)

    print("=== AntContext Demo ===")
    alice.announce("Food source at coordinates (12, 34)")
    time.sleep(0.1)
    bob.announce("Food source at coordinates (12, 34) - confirmed")
    time.sleep(0.1)
    alice.respond_to("Food source at coordinates (12, 34) - confirmed", strength=0.9)
    time.sleep(0.1)

    print("\nContext sensed by Bob:")
    for ctx in bob.observe():
        print(f"- {ctx['message'][:50]}... (strength: {ctx['strength']:.2f})")

    print("\n(Waiting for decay ...)")
    time.sleep(1.0)
    print("After decay, Bob senses:")
    for ctx in bob.observe():
        print(f"- {ctx['message'][:50]}... (strength: {ctx['strength']:.2f})")


if __name__ == "__main__":
    demo()
