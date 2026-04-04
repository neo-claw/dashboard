# Netic Outcome Taxonomy Simplifier
Explore and simplify the massive outcome/transfer matrix.

## Goal
- Visualize the outcome tree
- Identify redundant or rarely-used outcomes
- Suggest flattening/grouping opportunities
- Keep as a static analysis tool (no runtime deps)

## Approach
Parse the inbound.md table structure or a canonical YAML/JSON source if exists.
Generate:
- A directed graph of outcomes -> subreasons
- Frequency estimates (if logs available; else leave as placeholder)
- Summary stats: count of outcomes, subreasons, depth

## Implementation Plan
1. Locate the source of truth for outcome definitions (likely a YAML in the Netic project)
2. Write a Python script to parse and output Graphviz DOT + markdown summary
3. Run it, review output, note potential simplifications
