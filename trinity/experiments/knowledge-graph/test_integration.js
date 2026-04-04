#!/usr/bin/env node
/**
 * Integration test for knowledge-graph-tools plugin
 * Simulates OpenClaw tool execution
 */

const path = require('path');
const fs = require('fs');

// Simple test harness using the plugin code directly
const pluginCode = require('./index.js');

async function runTest() {
  console.log('=== Knowledge Graph Plugin Integration Test ===\n');

  // Initialize plugin
  await pluginCode.init();
  console.log('Plugin initialized.\n');

  // Test: Add a tool node representing web_search
  console.log('Test 1: Adding Tool node...');
  const addTool = await pluginCode.tools[0].execute({
    label: 'Tool',
    properties: {
      name: 'web_search',
      description: 'Search the web for information',
      version: '1.0',
      category: 'search'
    }
  });
  console.log(JSON.stringify(addTool, null, 2));

  const toolId = addTool.nodeId;

  // Test: Add an Agent node for Neo
  console.log('\nTest 2: Adding Agent node...');
  const addAgent = await pluginCode.tools[0].execute({
    label: 'Agent',
    properties: {
      name: 'Neo',
      role: 'primary_assistant',
      capabilities: ['reasoning', 'tool_use', 'planning'],
      version: '2026.04'
    }
  });
  console.log(JSON.stringify(addAgent, null, 2));

  const neoId = addAgent.nodeId;

  // Test: Add edge linking Neo to the tool
  console.log('\nTest 3: Adding HAS_TOOL edge...');
  const addEdge = await pluginCode.tools[1].execute({
    src_id: neoId,
    dst_id: toolId,
    type: 'HAS_TOOL',
    properties: { confidence: 1.0, granted_by: 'Trinity' }
  });
  console.log(JSON.stringify(addEdge, null, 2));

  // Test: Query the graph
  console.log('\nTest 4: Querying for Neo\'s tools...');
  const query = await pluginCode.tools[2].execute({
    query: 'MATCH (a:Agent {name:"Neo"})-[:HAS_TOOL]->(t:Tool)'
  });
  console.log(JSON.stringify(query, null, 2));

  // Test: Find nodes
  console.log('\nTest 5: Finding all Tool nodes...');
  const find = await pluginCode.tools[3].execute({
    label: 'Tool'
  });
  console.log(JSON.stringify(find, null, 2));

  // Summary
  console.log('\n=== Test Summary ===');
  const allPassed = addTool.success && addAgent.success && addEdge.success && query.success && query.count > 0 && find.success;
  console.log(allPassed ? '✓ All tests passed' : '✗ Some tests failed');

  await pluginCode.shutdown();
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
