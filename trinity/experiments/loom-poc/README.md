# Loom Framework - Proof of Concept

Multi-agent context management system that enables structured workflows with explicit context propagation between workers.

## Concept

Loom treats context as a shared artifact that flows through pipeline stages. Each stage (worker) receives input derived from the current context via mapping rules, processes it, and writes its result back to context. This creates an explicit, auditable chain of reasoning.

## Structure

```
loom-poc/
├── loom.js              # Runtime engine
├── package.json         # Dependencies
├── configs/
│   ├── workers/
│   │   ├── extractor.yaml
│   │   └── classifier.yaml
│   └── orchestrators/
│       └── extract_classify.yaml
└── README.md
```

## How It Works

1. **Load Configs**: Reads worker definitions (max tokens, schemas, prompts) and orchestrator pipelines (stage sequence + input mapping).
2. **Context Mapping**: Each stage declares which parts of the context it needs via dot-path mappings (e.g., `goal.context.text`).
3. **Execution**: Runtime builds input, calls worker (simulated here), stores result under stage name.
4. **Result**: Final context contains all intermediate results, forming a trace.

## Running

```bash
npm install
npm start
```

## Example Output

```
[Loom] Starting orchestrator: extract_classify
[Loom] Executing stage: extract (worker: extractor)
[Loom] Running worker extractor with input: {"text":"..."}
[Loom] Stage extract completed: {"result":"Extracted: ..."}
[Loom] Executing stage: classify (worker: classifier)
[Loom] Running worker classifier with input: {"text":"Extracted: ..."}
[Loom] Stage classify completed: {"result":"Classified as: example_category"}
[Loom] Orchestrator extract_classify complete.

=== FINAL CONTEXT ===
{
  "goal": { ... },
  "extract": { "result": "Extracted: ..." },
  "classify": { "result": "Classified as: example_category" }
}
```

## Why This Fits Neo's Needs

- **Problem Fit**: Provides structured workflow execution for systems like Netic where classification happens in stages. Enables explicit context passing instead of black-box chains.
- **Simplicity**: Config-driven, minimal code. Workers can be swapped or replaced with real model calls.
- **Maintenance**: Easy to extend with new workers and orchestrators. No complex state machines.
- **No Bloat**: ~100 lines of core logic. No external orchestration dependencies beyond YAML parsing.
- **Utility Score**: 8/10 - delivers immediate value for multi-step agent pipelines.

## Next Steps

- Connect real OpenRouter API calls based on worker config's `default_model_tier`
- Add context persistence (Redis) for cross-run memory
- Implement conditional branching in orchestrators
- Add metrics and tracing
