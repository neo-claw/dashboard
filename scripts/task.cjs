#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');

const scriptDir = path.dirname(module.filename);
const workspaceRoot = path.join(scriptDir, '..');

function printHelp() {
  console.log(`
Task CLI - Standardized task tracking for the workspace

Usage: task <command> [options]

Commands:
  create   Create a new task
  list     List all tasks
  show <id> Show task details
  update <id> Update a task
  delete <id> Delete a task
  validate Validate task format

Examples:
  task create --title "Fix bug" --status todo --priority high
  task list
  task show <id>
  task update <id> --status inprogress
`);
}

function generateTaskId(title, date) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
  const ts = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `${ts}-${slug}`;
}

function execAsync(command, options) {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout) => {
      if (err) reject(err);
      else resolve(String(stdout));
    });
  });
}

async function stageCommit(message, tasksDir) {
  try {
    await execAsync('git add .', { cwd: tasksDir });
    const output = await execAsync('git diff --cached --quiet || echo "has-changes"', { cwd: tasksDir });
    if (output.includes('has-changes')) {
      const escapedMsg = message.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${escapedMsg}"`, { cwd: tasksDir });
      try {
        await execAsync('git push', { cwd: tasksDir });
      } catch (e) {
        console.warn('Push failed:', e.message);
      }
    }
  } catch (e) {
    console.warn('Git error:', e.message);
  }
}

async function createTask(args) {
  if (!args.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }
  const now = new Date();
  const id = generateTaskId(args.title, now);
  const tasksDir = path.join(workspaceRoot, 'tasks');
  await fs.mkdir(tasksDir, { recursive: true });
  const task = {
    id,
    title: args.title,
    description: args.description || '',
    tags: args.tags ? args.tags.split(',').map(t => t.trim()).filter(Boolean) : ['general'],
    priority: args.priority || 'medium',
    status: args.status || 'todo',
    createdAt: now.toISOString(),
    updated: now.toISOString(),
    assignee: args.assignee || '',
    project: args.project || 'general',
  };
  const filename = `${id}.md`;
  const filepath = path.join(tasksDir, filename);
  const content = `---\n${yaml.dump(task)}---\n\n# ${task.title}\n\n${task.description}\n`;
  await fs.writeFile(filepath, content, 'utf-8');
  console.log(`✓ Created task: ${id}`);
  await stageCommit(`task: create "${task.title}"`, tasksDir);
}

async function listTasks(args) {
  const tasksDir = path.join(workspaceRoot, 'tasks');
  const files = await fs.readdir(tasksDir).catch(() => []);
  const taskFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
  if (taskFiles.length === 0) {
    console.log('No tasks found.');
    return;
  }
  const tasks = [];
  for (const file of taskFiles) {
    try {
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
      const parts = content.split('---');
      if (parts.length >= 3) {
        const frontmatter = yaml.load(parts[1]);
        if (frontmatter && frontmatter.id) {
          tasks.push({
            ...frontmatter,
            tags: frontmatter.tags || [],
            priority: frontmatter.priority || 'medium',
            status: frontmatter.status || 'todo',
            project: frontmatter.project || 'general',
            updated: frontmatter.updated || frontmatter.updatedAt || new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.warn(`Warning: could not parse ${file}: ${e.message}`);
    }
  }
  let filtered = tasks;
  if (args.status) filtered = filtered.filter(t => t.status === args.status);
  if (args.project) filtered = filtered.filter(t => t.project === args.project);
  if (args.tag) filtered = filtered.filter(t => t.tags.includes(args.tag));
  filtered.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  console.log('\nID                          STATUS          PRI  PROJECT     TITLE');
  console.log('-'.repeat(80));
  for (const task of filtered) {
    const idShort = task.id.substring(0, 25) + (task.id.length > 25 ? '...' : '');
    const statusIcon = task.status === 'done' ? '✓' : task.status === 'inprogress' ? '⟳' : '○';
    const priorityAbbrev = { high: 'H', medium: 'M', low: 'L' }[task.priority];
    console.log(`${idShort.padEnd(28)} ${statusIcon} ${task.status.padEnd(10)} ${priorityAbbrev}    ${task.project.padEnd(10)} ${task.title}`);
  }
  console.log(`\nTotal: ${filtered.length} tasks\n`);
}

async function showTask(args) {
  if (!args.id) {
    console.error('Error: task ID required');
    process.exit(1);
  }
  const tasksDir = path.join(workspaceRoot, 'tasks');
  const filepath = path.join(tasksDir, `${args.id}.md`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    console.log('\n' + content + '\n');
  } catch (e) {
    console.error(`Error: Task not found: ${args.id}`);
    process.exit(1);
  }
}

async function updateTask(args) {
  if (!args.id) {
    console.error('Error: task ID required');
    process.exit(1);
  }
  const hasChanges = args.changes && Object.values(args.changes).some(v => v);
  if (!hasChanges) {
    console.error('Error: at least one change required');
    process.exit(1);
  }
  const tasksDir = path.join(workspaceRoot, 'tasks');
  const filepath = path.join(tasksDir, `${args.id}.md`);
  try {
    let content = await fs.readFile(filepath, 'utf-8');
    const parts = content.split('---');
    if (parts.length < 3) throw new Error('Invalid task format');
    const frontmatter = yaml.load(parts[1]);
    if (!frontmatter || !frontmatter.id) throw new Error('Invalid frontmatter');
    const now = new Date().toISOString();
    frontmatter.updated = now;
    if (args.changes.status) frontmatter.status = args.changes.status;
    if (args.changes.priority) frontmatter.priority = args.changes.priority;
    if (args.changes.project) frontmatter.project = args.changes.project;
    if (args.changes.assignee) frontmatter.assignee = args.changes.assignee;
    if (args.changes.tags) {
      frontmatter.tags = args.changes.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (args.changes.title) {
      frontmatter.title = args.changes.title;
      parts[2] = parts[3] ? `# ${args.changes.title}\n\n${parts[3]}` : `# ${args.changes.title}\n\n`;
    }
    const newContent = `---\n${yaml.dump(frontmatter)}---\n${parts.slice(2).join('---')}`;
    await fs.writeFile(filepath, newContent, 'utf-8');
    console.log(`✓ Updated task: ${args.id}`);
    await stageCommit(`task: update "${frontmatter.title}"`, tasksDir);
  } catch (e) {
    console.error(`Error: ${e.message}`); process.exit(1);
  }
}

async function deleteTask(args) {
  if (!args.id) {
    console.error('Error: task ID required');
    process.exit(1);
  }
  const tasksDir = path.join(workspaceRoot, 'tasks');
  const filepath = path.join(tasksDir, `${args.id}.md`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const parts = content.split('---');
    const frontmatter = yaml.load(parts[1]);
    const title = frontmatter.title || args.id;
    await fs.unlink(filepath);
    console.log(`✓ Deleted task: ${args.id} (${title})`);
    await stageCommit(`task: delete "${title}"`, tasksDir);
  } catch (e) {
    console.error(`Error: ${e.message}`); process.exit(1);
  }
}

async function validateTasks() {
  const tasksDir = path.join(workspaceRoot, 'tasks');
  const files = await fs.readdir(tasksDir).catch(() => []);
  const taskFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
  if (taskFiles.length === 0) {
    console.log('✓ No tasks to validate');
    return;
  }
  let errors = [], warnings = [];
  for (const file of taskFiles) {
    try {
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
      const parts = content.split('---');
      if (parts.length < 3) {
        errors.push(`${file}: missing YAML frontmatter delimiters`);
        continue;
      }
      const frontmatter = yaml.load(parts[1]);
      if (!frontmatter) {
        errors.push(`${file}: invalid YAML`);
        continue;
      }
      if (!frontmatter.title) errors.push(`${file}: missing title`);
      if (!frontmatter.id) warnings.push(`${file}: missing id`);
      if (!frontmatter.status) warnings.push(`${file}: missing status (default: todo)`);
      else if (!['todo', 'inprogress', 'done'].includes(frontmatter.status)) {
        errors.push(`${file}: invalid status '${frontmatter.status}'`);
      }
      if (!frontmatter.priority) warnings.push(`${file}: missing priority (default: medium)`);
      else if (!['low', 'medium', 'high'].includes(frontmatter.priority)) {
        errors.push(`${file}: invalid priority '${frontmatter.priority}'`);
      }
      if (!Array.isArray(frontmatter.tags)) {
        errors.push(`${file}: tags must be an array`);
      }
    } catch (e) {
      errors.push(`${file}: ${e.message}`);
    }
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✓ All task files are valid');
  } else {
    if (errors.length) {
      console.error('\n❌ Validation Errors:'); errors.forEach(e => console.error(`  - ${e}`));
    }
    if (warnings.length) {
      console.warn('\n⚠ Warnings:'); warnings.forEach(w => console.warn(`  - ${w}`));
    }
    if (errors.length) process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }
  const command = args[0];
  const rawArgs = args.slice(1);
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      parsed[key] = rawArgs[++i];
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsed[key] = rawArgs[++i];
    } else {
      parsed._ = parsed._ || [];
      parsed._.push(arg);
    }
  }
  try {
    switch (command) {
      case 'create': await createTask(parsed); break;
      case 'list': await listTasks(parsed); break;
      case 'show': await showTask({ id: parsed._[0] }); break;
      case 'update':
        await updateTask({
          id: parsed._[0],
          changes: {
            title: parsed.title,
            status: parsed.status,
            priority: parsed.priority,
            project: parsed.project,
            assignee: parsed.assignee,
            tags: parsed.tags,
          },
        });
        break;
      case 'delete': await deleteTask({ id: parsed._[0] }); break;
      case 'validate': await validateTasks(); break;
      default:
        console.error(`Unknown command: ${command}`); printHelp(); process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`); process.exit(1);
  }
}

main();
