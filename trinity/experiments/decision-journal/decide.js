#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const JOURNAL_DIR = path.join(__dirname, 'entries');
const JOURNAL_FILE = path.join(JOURNAL_DIR, 'all-decisions.md');

// Ensure directory exists
if (!fs.existsSync(JOURNAL_DIR)) {
  fs.mkdirSync(JOURNAL_DIR, { recursive: true });
}

function appendEntry(entry) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 8);
  const entryText = `## ${date} ${time}\n\n${entry}\n\n---\n\n`;
  fs.appendFileSync(JOURNAL_FILE, entryText, 'utf8');
  console.log('Entry recorded.');
}

function listRecent(n = 5) {
  if (!fs.existsSync(JOURNAL_FILE)) {
    console.log('No entries yet.');
    return;
  }
  const content = fs.readFileSync(JOURNAL_FILE, 'utf8');
  const entries = content.split('---\n\n');
  // Last entries first
  entries.slice(-n).reverse().forEach((e, i) => {
    console.log(`--- Entry ${n - i} ---\n${e}\n`);
  });
}

// Simple command parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter your decision/reflection:\n> ', (answer) => {
    appendEntry(answer);
    rl.close();
  });
} else if (args[0] === 'list') {
  const n = parseInt(args[1]) || 5;
  listRecent(n);
} else {
  // Treat all args as the entry
  const entry = args.join(' ');
  appendEntry(entry);
}