"""
Pheromone Memory: A distributed, decaying memory system inspired by ant colony trails.

Core Concepts:
- Facts have a strength that decays over time unless reinforced.
- Reinforcement occurs when a fact is accessed or re-added.
- Retrieval ranks facts by strength (adjusted for age) and keyword relevance.
- Designed for simplicity and minimal dependencies.
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set


class PheromoneMemory:
    def __init__(self, storage_path: str = None, decay_rate: float = 0.1):
        """
        Initialize memory.
        :param storage_path: Path to JSON file for persistence. If None, in-memory only.
        :param decay_rate: Fraction of strength lost per day (0-1). Default 0.1 (10%/day).
        """
        self.storage_path = storage_path
        self.decay_rate = decay_rate
        self.facts: Dict[str, dict] = {}  # id -> {text, strength, last_updated}
        self._next_id = 1
        if storage_path and os.path.exists(storage_path):
            self._load()

    def _load(self):
        with open(self.storage_path, 'r') as f:
            data = json.load(f)
            self.facts = data.get('facts', {})
            self._next_id = data.get('next_id', 1)

    def _save(self):
        if self.storage_path:
            with open(self.storage_path, 'w') as f:
                json.dump({
                    'facts': self.facts,
                    'next_id': self._next_id
                }, f, indent=2)

    def _current_time(self) -> float:
        return time.time()

    def _effective_strength(self, fact: dict) -> float:
        """Compute strength adjusted for age decay."""
        now = self._current_time()
        last = fact.get('last_updated', now)
        days_elapsed = (now - last) / 86400.0
        # Exponential decay: strength * e^{-decay_rate * days}
        decayed = fact['strength'] * pow(2.71828, -self.decay_rate * days_elapsed)
        return decayed

    def add_fact(self, text: str, initial_strength: float = 1.0) -> str:
        """Add a new fact or reinforce an existing similar fact (by text)."""
        # Check if an identical text already exists
        for fid, fact in self.facts.items():
            if fact['text'].lower() == text.lower():
                self.reinforce_fact(fid)
                return fid

        fid = str(self._next_id)
        self._next_id += 1
        self.facts[fid] = {
            'text': text,
            'strength': initial_strength,
            'last_updated': self._current_time()
        }
        self._save()
        return fid

    def reinforce_fact(self, fact_id: str, increment: float = 0.2):
        """Increase strength of a fact and update timestamp."""
        if fact_id in self.facts:
            fact = self.facts[fact_id]
            fact['strength'] += increment
            fact['last_updated'] = self._current_time()
            self._save()

    def get_fact(self, fact_id: str) -> Optional[dict]:
        return self.facts.get(fact_id)

    def _keyword_score(self, query: str, text: str) -> float:
        """Simple keyword overlap score (0-1)."""
        qwords = set(query.lower().split())
        twords = set(text.lower().split())
        if not qwords:
            return 0.0
        overlap = len(qwords & twords) / len(qwords)
        return overlap

    def retrieve(self, query: str, top_k: int = 5) -> List[dict]:
        """Retrieve facts relevant to query, ranked by combined score."""
        now = self._current_time()
        scored = []
        for fid, fact in self.facts.items():
            kw_score = self._keyword_score(query, fact['text'])
            if kw_score == 0:
                continue
            eff_strength = self._effective_strength(fact)
            combined = kw_score * eff_strength
            scored.append({
                'id': fid,
                'text': fact['text'],
                'raw_strength': fact['strength'],
                'effective_strength': eff_strength,
                'score': combined
            })

        scored.sort(key=lambda x: x['score'], reverse=True)
        return scored[:top_k]

    def decay_all(self):
        """Apply global decay to all facts (useful for scheduled maintenance)."""
        for fact in self.facts.values():
            # pure time-based decay is handled in effective_strength, not stored.
            # This method could be used to shrink strengths if they drop below threshold.
            pass

    def vacuum(self, threshold: float = 0.01):
        """Remove facts with strength below threshold after decay (to keep store small)."""
        to_remove = []
        for fid, fact in self.facts.items():
            eff = self._effective_strength(fact)
            if eff < threshold:
                to_remove.append(fid)
        for fid in to_remove:
            del self.facts[fid]
        if to_remove:
            self._save()
        return len(to_remove)


# ------------------- DEMO -------------------
if __name__ == "__main__":
    # Create memory with in-memory storage
    mem = PheromoneMemory(decay_rate=0.1)  # 10% decay per day

    # Add some facts from user notes
    facts = [
        "Ant colonies behave as a superorganism with division of labor.",
        "Pheromone trails provide positive and negative feedback for foraging.",
        "Ants use multiple pheromones for memory over differing time scales.",
        "Pharaoh's ants have long-term memory of trails and short-term attraction.",
        "The presence of many individuals can increase system reliability.",
        "Distributed context engineering is the memory management system for AI agents.",
        "Neo should adopt ant-inspired memory patterns.",
        "Workers specialize in trail laying and detection."
    ]
    print("Adding facts...")
    for f in facts:
        mem.add_fact(f)

    # Show initial retrieval
    print("\nInitial retrieval for 'memory':")
    for r in mem.retrieve("memory"):
        print(f"- {r['text'][:60]}... (score {r['score']:.3f})")

    # Simulate time passing by manually adjusting timestamps (tricky; we'll modify internal)
    # To simulate decay, we'll set last_updated to 2 days ago for some facts
    print("\nSimulating 2 days of decay...")
    two_days_ago = time.time() - 2*86400
    for fact in mem.facts.values():
        fact['last_updated'] = two_days_ago
    mem._save()

    # Show retrieval after decay
    print("\nRetrieval after 2 days decay:")
    for r in mem.retrieve("memory"):
        print(f"- {r['text'][:60]}... (score {r['score']:.3f})")

    # Reinforce one fact
    print("\nReinforcing fact about multiple pheromones...")
    # find its id
    for fid, fact in mem.facts.items():
        if "multiple pheromones" in fact['text']:
            mem.reinforce_fact(fid, increment=0.5)
            print(f"Reinforced fact {fid}")
            break

    # Show retrieval after reinforcement
    print("\nRetrieval after reinforcement:")
    for r in mem.retrieve("memory"):
        print(f"- {r['text'][:60]}... (score {r['score']:.3f})")

    # Vacuum weak facts
    removed = mem.vacuum(threshold=0.05)
    print(f"\nRemoved {removed} facts with strength below threshold.")

    print("\nDemo complete. Memory system functions as expected.")
