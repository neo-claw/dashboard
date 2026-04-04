#!/usr/bin/env node

/**
 * Trinity Overnight: Task Prioritizer
 * Takes tasks JSON from auto-notes-analyzer and adds priority scoring.
 * Outputs prioritized list and markdown report.
 */

const fs = require('fs');
const path = require('path');

// Find latest tasks JSON in auto-notes-analyzer directory
const analyzerDir = path.resolve(__dirname, '..', 'auto-notes-analyzer');
const files = fs.readdirSync(analyzerDir).filter(f => f.startsWith('tasks_') && f.endsWith('.json'));
if (files.length === 0) {
  console.error('No tasks JSON found in auto-notes-analyzer directory');
  process.exit(1);
}
// Sort by date (filename format tasks_YYYY-MM-DD.json)
files.sort().reverse(); // latest first
const latestTasksFile = path.join(analyzerDir, files[0]);

const tasks = JSON.parse(fs.readFileSync(latestTasksFile, 'utf-8'));
console.log(`🔍 Loaded ${tasks.length} tasks from ${files[0]}`);

// Scoring heuristics
const urgencyKeywords = ['ASAP', 'URGENT', 'IMMEDIATE', 'TODAY', 'TOMORROW', 'THIS WEEK', 'NEXT WEEK'];
const importantKeywords = ['NETIC', 'NEO', 'CRITICAL', 'MAJOR', 'LAUNCH', 'INVESTOR', 'FUNDRAISING', 'DEADLINE', 'MEETING', 'SYNC', 'REVIEW', 'FOLLOW UP', 'CALL', 'EMAIL'];
const strongActionKeywords = ['MUST', 'NEED TO', 'HAVE TO', 'REQUIRED', 'SHOULD', 'WILL', 'PLAN TO'];

function scoreTask(task) {
  const text = task.text.toUpperCase();
  let score = 0;

  // Urgency
  if (urgencyKeywords.some(kw => text.includes(kw))) score += 3;

  // Important context
  if (importantKeywords.some(kw => text.includes(kw))) score += 2;

  // Action strength
  if (strongActionKeywords.some(kw => text.includes(kw))) score += 1;

  // Date proximity: if line contains a date within next 7 days (very rough)
  // We'll just check for any date pattern; if present, add 1 (since parsing is heavy)
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})|(\d{4}-\d{2}-\d{2})|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;
  if (datePattern.test(task.text)) score += 1;

  // Length penalty? maybe if very long, less clear -> not needed.

  return score;
}

// Score each task
const scoredTasks = tasks.map(t => ({
  ...t,
  priorityScore: scoreTask(t),
  priorityLevel: '' // to be set
}));

// Assign levels
scoredTasks.forEach(t => {
  if (t.priorityScore >= 5) t.priorityLevel = 'HIGH';
  else if (t.priorityScore >= 3) t.priorityLevel = 'MEDIUM';
  else t.priorityLevel = 'LOW';
});

// Sort by priority (score desc), then by file/line
scoredTasks.sort((a, b) => {
  if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
  // Secondary: by file name then line
  if (a.file < b.file) return -1;
  if (a.file > b.file) return 1;
  return a.line - b.line;
});

// Output
const dateStr = new Date().toISOString().split('T')[0];
const outputDir = __dirname;
const prioritizedPath = path.join(outputDir, `prioritized_${dateStr}.json`);
const reportPath = path.join(outputDir, `report_${dateStr}.md`);

fs.writeFileSync(prioritizedPath, JSON.stringify(scoredTasks, null, 2), 'utf-8');
console.log(`✅ Prioritized tasks written to ${prioritizedPath}`);

// Generate markdown report
let report = `# Task Prioritization Report\n\n`;
report += `**Generated:** ${new Date().toISOString()}\n\n`;
report += `**Source:** ${files[0]}\n\n`;
report += `**Total Tasks:** ${scoredTasks.length}\n\n`;

const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
scoredTasks.forEach(t => counts[t.priorityLevel]++);

report += `**Priority Distribution:**\n- HIGH: ${counts.HIGH}\n- MEDIUM: ${counts.MEDIUM}\n- LOW: ${counts.LOW}\n\n`;

report += `## High Priority Tasks\n\n`;
const highTasks = scoredTasks.filter(t => t.priorityLevel === 'HIGH');
if (highTasks.length === 0) {
  report += `*None*\n\n`;
} else {
  highTasks.forEach(t => {
    report += `- **[${t.file}:${t.line}]** ${t.text} (score: ${t.priorityScore})\n`;
  });
  report += `\n`;
}

report += `## Medium Priority Tasks\n\n`;
const medTasks = scoredTasks.filter(t => t.priorityLevel === 'MEDIUM');
if (medTasks.length === 0) {
  report += `*None*\n\n`;
} else {
  // List first 20 to keep report manageable
  medTasks.slice(0, 20).forEach(t => {
    report += `- **[${t.file}:${t.line}]** ${t.text} (score: ${t.priorityScore})\n`;
  });
  if (medTasks.length > 20) {
    report += `*...and ${medTasks.length - 20} more*\n`;
  }
  report += `\n`;
}

report += `## Low Priority Tasks\n\n`;
report += `Total: ${counts.LOW} tasks (omitted from detailed list)\n\n`;

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`📄 Report written to ${reportPath}`);
