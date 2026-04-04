"""
Distributed Context Library (DCL)
Inspired by ant colony pheromone trails for managing LLM context windows.
"""

import time
import math
import uuid
from typing import Optional, Callable, List, Tuple, Dict, Any


class ContextItem:
    """A single piece of context with activation that decays over time."""
    def __init__(self, content: str, initial_activation: float = 1.0, metadata: Optional[Dict[str, Any]] = None):
        self.id = str(uuid.uuid4())
        self.content = content
        self.activation = float(initial_activation)
        self.metadata = metadata or {}
        self.created_at = time.time()
        self.last_updated = self.created_at

    def __repr__(self):
        return f"ContextItem(id={self.id[:8]}, act={self.activation:.3f}, content={self.content[:30]}...)"


class DistributedContext:
    """
    Manages a colony of context items with pheromone-like activation dynamics.
    
    - Items decay over time unless reinforced.
    - Reinforcement increases activation (e.g., when item is retrieved or mentioned).
    - select_for_budget returns the highest-activated items that fit within a token budget.
    """
    def __init__(self, decay_rate_per_min: float = 0.01, reinforcement: float = 1.0):
        """
        decay_rate_per_min: multiplicative factor per minute (e.g., 0.01 means 1% decay per minute).
        reinforcement: activation boost when an item is reinforced.
        """
        self.items: Dict[str, ContextItem] = {}
        self.decay_rate = decay_rate_per_min
        self.reinforcement = reinforcement
        self._last_tick = time.time()

    def add(self, content: str, activation: float = 1.0, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Add a new context item and return its ID."""
        item = ContextItem(content, activation, metadata)
        self.items[item.id] = item
        return item.id

    def reinforce(self, item_id: str, amount: Optional[float] = None):
        """Increase activation of an item, simulating pheromone reinforcement."""
        if item_id in self.items:
            self.items[item_id].activation += amount or self.reinforcement
            self.items[item_id].last_updated = time.time()

    def _apply_decay(self, elapsed_seconds: float):
        """Apply exponential decay to all items."""
        if elapsed_seconds <= 0:
            return
        # Convert to minutes for decay_rate scaling
        elapsed_min = elapsed_seconds / 60.0
        decay_factor = math.exp(-self.decay_rate * elapsed_min)
        for item in self.items.values():
            item.activation *= decay_factor
            # Ensure non-negative
            if item.activation < 0:
                item.activation = 0.0

    def tick(self):
        """Advance global clock and decay all items. Call periodically."""
        now = time.time()
        elapsed = now - self._last_tick
        self._last_tick = now
        if elapsed > 0:
            self._apply_decay(elapsed)

    def select_for_budget(self, token_budget: int, token_estimator: Optional[Callable[[str], int]] = None) -> Tuple[List[ContextItem], int]:
        """
        Select the highest-activation items that fit within the token budget.
        Returns (selected_items, total_tokens_used).
        """
        self.tick()  # ensure decay is up-to-date

        if token_estimator is None:
            # Rough approximation: 1 token ~= 4 characters for English text
            token_estimator = lambda text: max(1, len(text) // 4)

        sorted_items = sorted(self.items.values(), key=lambda x: x.activation, reverse=True)
        selected = []
        used = 0
        for item in sorted_items:
            tokens = token_estimator(item.content)
            if used + tokens <= token_budget:
                selected.append(item)
                used += tokens
            else:
                break
        return selected, used

    def prune(self, threshold: float = 0.001):
        """Remove items with activation below threshold to keep colony size manageable."""
        before = len(self.items)
        self.items = {iid: item for iid, item in self.items.items() if item.activation >= threshold}
        return before - len(self.items)


# --- Simple simulation to demonstrate usage ---

if __name__ == "__main__":
    print("=== Distributed Context Library Demo ===\n")
    ctx = DistributedContext(decay_rate_per_min=0.05, reinforcement=1.0)

    # Simulate a long conversation with many topics
    messages = [
        ("user", "What's the capital of France?"),
        ("assistant", "The capital of France is Paris."),
        ("user", "Who wrote 'Pride and Prejudice'?"),
        ("assistant", "Jane Austen wrote 'Pride and Prejudice'."),
        ("user", "Can you explain quantum entanglement?"),
        ("assistant", "Quantum entanglement is a phenomenon where particles become correlated such that the state of one instantly affects the other, regardless of distance."),
        ("user", "Let's talk about ants."),
        ("assistant", "Ants are social insects that live in colonies. They communicate using pheromones."),
        ("user", "How do ant colonies maintain context?"),
        ("assistant", "Ant colonies act as a superorganism. Pheromone trails serve as external memory, reinforcing successful paths and decaying unused ones."),
        ("user", "That's similar to a distributed context system."),
    ]

    # Add all messages as context items
    for role, text in messages:
        ctx.add(f"{role}: {text}", activation=1.0)
        # Simulate that the most recent message gets reinforced by "mentioning" it
        # But in a real system, reinforcement would happen when an item is retrieved for the prompt.
        pass

    # Simulate that the assistant's answers about ants were heavily reinforced (important)
    # Let's reinforce those: we'll find items containing "ants" or "pheromone"
    for item in ctx.items.values():
        if "ants" in item.content.lower() or "pheromone" in item.content.lower():
            ctx.reinforce(item.id, amount=3.0)

    # Simulate time passing (decay)
    print("Simulating 60 minutes of decay...")
    ctx.tick()  # normally tick would be called over time; here we just advance once
    # But tick uses elapsed since last tick; we can cheat by setting _last_tick in the past
    ctx._last_tick -= 60 * 60  # pretend 1 hour passed

    # Now select for a budget of, say, 100 tokens
    selected, tokens = ctx.select_for_budget(100)
    print(f"Selected {len(selected)} items within 100 tokens ({tokens} tokens used):")
    for i, item in enumerate(selected, 1):
        print(f"{i}. [{item.activation:.3f}] {item.content[:70]}...")

    print("\n=== End Demo ===")
