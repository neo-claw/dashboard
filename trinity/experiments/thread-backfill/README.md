# Thread Backfill Summarizer

An experiment to compress conversation threads into concise summaries, preserving context for continued collaboration.

## Problem
Long conversation threads (e.g., Linear tickets, Slack DMs) can exceed LLM context windows or become unwieldy. This tool summarizes them while retaining key facts, decisions, and action items.

## Approach
- Input: JSON array of messages `[{role, content}]`
- Output: Plain text summary (~200-300 words)
- Uses OpenRouter API with step-3.5-flash (low temp).
- No external dependencies beyond Node.js.

## Usage
```bash
export OPENROUTER_API_KEY=your_key
node summarize.js sample-thread.json
```

## Evaluation Criteria
- Accuracy: Does summary capture essential info?
- Brevity: Fits within ~300 words.
- Latency: < 2s for 30-message thread.

## Status
Prototype built; testing needed with real threads.

## Next Steps
- Integrate as OpenClaw skill.
- Add token-based truncation for large threads.
- Support customizable prompts per workspace.