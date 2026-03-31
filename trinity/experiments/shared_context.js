#!/usr/bin/env node

// Shared Context Publisher for OpenClaw agents
// Appends a formatted entry to memory/shared_context.md

const fs = require('fs');
const path = require('path');

// Parse simple flags: --agent, --category, --content
const args = process.argv.slice(2);
let agent = 'Trinity';
let category = 'Note';
let content = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--agent' && i + 1 < args.length) {
    agent = args[i+1];
    i++;
  } else if (args[i] === '--category' && i + 1 < args.length) {
    category = args[i+1];
    i++;
  } else if (args[i] === '--content' && i + 1 < args.length) {
    content = args.slice(i+1).join(' '); // rest as content
    break;
  }
}

if (!content) {
  console.error('Usage: shared_context.js --agent <name> --category <cat> --content <text>');
  process.exit(1);
}

const workspaceRoot = path.resolve(__dirname, '..', '..'); // ~/.openclaw/workspace
const memoryDir = path.join(workspaceRoot, 'memory');
const sharedFile = path.join(memoryDir, 'shared_context.md');

// Ensure memory directory exists
if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true });
}

// Generate entry
const now = new Date();
const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
const entry = `## [${agent}] ${timestamp}\n- Category: ${category}\n- Content: ${content}\n\n`;

fs.appendFileSync(sharedFile, entry, 'utf8');
console.log(`[SharedContext] Appended to ${sharedFile}`);
