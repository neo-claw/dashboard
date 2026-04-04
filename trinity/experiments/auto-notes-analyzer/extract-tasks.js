#!/usr/bin/env node

/**
 * Trinity Overnight: Auto-Notes Analyzer
 * Scans note files and extracts potential action items.
 * Simple heuristic approach – can be extended with LLM later.
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..', '..', '..'); // auto-notes-analyzer -> trinity -> experiments -> workspace

// Determine source files: if directory arg provided, use all .md files in it; else use default list
let filesToScan = [];
if (process.argv.length >= 3) {
  const provided = process.argv[2];
  let dir;
  if (fs.existsSync(provided) && fs.statSync(provided).isDirectory()) {
    dir = provided;
  } else if (fs.existsSync(path.join(workspaceRoot, provided)) && fs.statSync(path.join(workspaceRoot, provided)).isDirectory()) {
    dir = path.join(workspaceRoot, provided);
  } else {
    console.error(`Directory not found: ${provided}`);
    process.exit(1);
  }
  const allFiles = fs.readdirSync(dir);
  filesToScan = allFiles.filter(f => f.toLowerCase().endsWith('.md')).map(f => path.join(dir, f));
  console.log(`📂 Scanning directory: ${dir} (${filesToScan.length} markdown files)`);
} else {
  // Default list of filenames relative to workspace root
  const defaults = [
    'found_drive.md',
    'explore.md',
    'hub.md',
    'people.md',
    'running_notes_phil.md',
    'uber_vs_lyft.md',
    'runnig_notes_netic.md',
    'inbound_drilldown_analytics_definitions.md'
  ];
  filesToScan = defaults.map(f => path.join(workspaceRoot, f));
}

// Keywords that often indicate a task or action
const actionKeywords = [
  'TODO', 'FIXME', 'NOTE', 'NEED', 'SHOULD', 'WILL', 'MUST', 'HAVE TO',
  'FINISH', 'COMPLETE', 'WRITE', 'UPDATE', 'CHECK', 'REVIEW', 'SEND',
  'MAKE', 'ADD', 'BUILD', 'TEST', 'RUN', 'CALL', 'FOLLOW UP', 'FOLLOW-UP',
  'MEETING', 'SYNC', 'BUMP', 'ASK', 'CONFIRM', 'GET', 'LOOK INTO',
  'INVESTIGATE', 'DEBUG', 'MERGE', 'PUSH', 'DEPLOY', 'BACKFILL'
];

const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})|(\d{4}-\d{2}-\d{2})|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;

let allTasks = [];

for (const file of filesToScan) {
  const filePath = file; // already absolute
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileTasks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check bullet lists
    const isBullet = line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s/.test(line);
    const hasKeyword = actionKeywords.some(kw => line.toUpperCase().includes(kw));
    const hasDate = datePattern.test(line);

    // Also include lines that are questions? Maybe not.

    if (isBullet || hasKeyword || hasDate) {
      // Normalize: remove bullet if present
      let normalized = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      // If it looks like a sub-bullet (indented), we still capture
      fileTasks.push({
        line: i + 1,
        text: normalized,
        file
      });
    }
  }

  if (fileTasks.length > 0) {
    allTasks.push(...fileTasks);
  }
}

// Generate summary
const dateStr = new Date().toISOString().split('T')[0];
const outputDir = path.join(__dirname);
const summaryPath = path.join(outputDir, `summary_${dateStr}.md`);
const tasksPath = path.join(outputDir, `tasks_${dateStr}.json`);

let summary = `# Auto-Notes Analyzer Summary\n\n`;
summary += `**Generated:** ${new Date().toISOString()}\n\n`;
summary += `**Files Scanned:** ${filesToScan.join(', ')}\n\n`;
summary += `**Total Action Items Found:** ${allTasks.length}\n\n`;
summary += `## Tasks by File\n\n`;

// Group by file
const tasksByFile = {};
allTasks.forEach(t => {
  if (!tasksByFile[t.file]) tasksByFile[t.file] = [];
  tasksByFile[t.file].push(t);
});

for (const [file, tasks] of Object.entries(tasksByFile)) {
  summary += `### ${file}\n\n`;
  tasks.forEach(t => {
    summary += `- Line ${t.line}: ${t.text}\n`;
  });
  summary += `\n`;
}

fs.writeFileSync(summaryPath, summary, 'utf-8');
fs.writeFileSync(tasksPath, JSON.stringify(allTasks, null, 2), 'utf-8');

console.log(`✅ Analyzed ${filesToScan.length} files, found ${allTasks.length} action items.`);
console.log(`📄 Summary written to: ${summaryPath}`);
console.log(`📝 Tasks JSON written to: ${tasksPath}`);
