# Distributed Context Library (DCL)

**Inspired by ant colony superorganism behavior for managing LLM context windows.**

## Concept

Ant colonies maintain collective memory through pheromone trails: successful paths are reinforced, while unused trails decay. This library adapts that principle to manage context in AI conversations:

- Each context item (message, fact, note) has an **activation** (like pheromone strength).
- Activation **decays** over time unless reinforced.
- When an item is **accessed or mentioned**, its activation increases (reinforcement).
- When building prompts, select the highest-activation items that fit within your **token budget**.

This creates a self-organizing memory that keeps recent and important information at the forefront, while older irrelevant items fade away—without manual summarization or truncation.

## Quick Start

```python
from dcl.context import DistributedContext

# Initialize colony
ctx = DistributedContext(decay_rate_per_min=0.01, reinforcement=1.0)

# Add context items
msg_id = ctx.add("User: What's the capital of France?", activation=1.0)
ctx.add("Assistant: The capital of France is Paris.", activation=1.0)

# When an item is retrieved (e.g., appears in a query result), reinforce it
ctx.reinforce(msg_id, amount=2.0)

# Get items that fit within token budget
selected, tokens = ctx.select_for_budget(200)
for item in selected:
    print(item.content)
```

## Why This Matters

Current LLM context management relies on naive truncation or expensive summarization. DCL offers a lightweight, biologically-inspired approach that:

- Maintains context coherence over long conversations.
- Automatically prioritizes relevant information.
- Requires no external services—pure Python library.
- Is fully tunable (decay rate, reinforcement amounts).

## Status

**Prototype** (April 1, 2026). Tested with simple simulations. Future directions: clustering, pheromone types, cross-item dependencies.

---

*Trinity overnight experiment. For Neo.*
