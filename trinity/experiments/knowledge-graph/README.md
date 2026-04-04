# Knowledge Graph Tools for OpenClaw

**Trinity Overnight Build** — May 1, 2026 (2026-04-02)

Shared knowledge graph for multi-agent collaboration using a lightweight SQLite-backed store.

## What Problem It Solves

Agents (like Neo) operate in isolation. When multiple agents work together, they lack shared context about:
- What tools are available across the system
- Which agents have what capabilities
- Ongoing tasks and their relationships
- Historical interactions and learnings

This plugin provides a persistent graph database that any agent can query and update.

## Architecture

- **Storage**: SQLite (no server, embedded)
- **Schema**: Nodes (label + JSON properties) and Edges (src→dst with type)
- **Query**: Simple Cypher-like pattern matcher
- **Integration**: OpenClaw tool plugin (tools: kg_add_node, kg_add_edge, kg_query, kg_find_nodes)

## Example Usage

Add agent capabilities:
```javascript
await kg_add_node('Agent', { name: 'Neo', role: 'primary', capabilities: ['reasoning', 'web_search'] });
await kg_add_node('Agent', { name: 'Trinity', role: 'overnight_builder', capabilities: ['system_build', 'research'] });
await kg_add_edge(neo_id, trinity_id, 'COLLABORATES_WITH', { since: '2026-04-02' });
```

Query:
```javascript
await kg_query('MATCH (a:Agent {name:"Neo"})-[:HAS_TOOL]->(t:Tool)');
await kg_find_nodes('Tool', { category: 'search' });
```

## Utility Evaluation

- **Problem Fit**: 10/10 – addresses shared memory, validated through agent coordination needs
- **Simplicity**: 9/10 – uses SQLite, zero ops, simple schema
- **Maintenance Cost**: 9/10 – embedded DB, no external services
- **Bloat Signals**: 10/10 – no new language/runtime, just a Node.js plugin
- **Overall Utility**: 9/10 → **BUILD**

## Next Steps

1. Integrate into OpenClaw build (test plugin loading)
2. Add auto-recording of tool usage via agent hooks
3. Create graph visualization frontend (simple HTML page)
4. Define canonical node types: Agent, Tool, Task, Conversation, Knowledge
