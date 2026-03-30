# Task Tracking System

A standardized task tracking system for humans and agents. Tasks are stored as YAML frontmatter Markdown files in `tasks/` and are exposed via a kanban API and UI.

## Features

- **Single source of truth**: All tasks in `tasks/*.md` files
- **CLI tool**: `npm run task` for creating, listing, updating tasks
- **Auto-commit**: Task changes are automatically committed and pushed
- **Kanban API**: REST endpoint to read and create tasks
- **Kanban UI**: Interactive board with drag-and-drop (coming soon)
- **CI validation**: Pre-commit hooks ensure task format is valid
- **Integration with MEMORY.md**: Tasks can also be parsed from MEMORY.md's Projects section

## Task Format

Tasks are Markdown files with YAML frontmatter:

```markdown
---
id: 2024-03-30T22-30-fix-bug-in-api
title: Fix bug in API endpoint
description: The POST /api/v1/users endpoint returns 500 when email is missing
status: todo
priority: high
tags:
  - backend
  - api
  - bug
assignee: john
project: dashboard
createdAt: 2024-03-30T22:30:00.000Z
updated: 2024-03-30T22:30:00.000Z
---

# Fix bug in API endpoint

The POST /api/v1/users endpoint returns 500 when email is missing.

## Steps to reproduce
1. Send POST request without email
2. Observe 500 error

## Expected behavior
Should return 400 with validation error.
```

### Required Fields

- `id`: Unique identifier (auto-generated)
- `title`: Short task title
- `status`: One of `todo`, `inprogress`, `done`
- `priority`: One of `low`, `medium`, `high`
- `tags`: Array of strings (default: `['general']`)
- `createdAt`: ISO 8601 timestamp
- `updated`: ISO 8601 timestamp

### Optional Fields

- `description`: Longer description (also in markdown body)
- `assignee`: Person assigned to the task
- `project`: Project name (default: `general`)

## CLI Tool

The task CLI provides convenient command-line access:

### Create a Task

```bash
# Using npm (note the `--` separator)
npm run task -- create --title "Implement feature X" --status todo --priority high --tags "backend,api" --project my-project

# Or run the script directly
node scripts/task.cjs create --title "Implement feature X" --status todo --priority high --tags "backend,api" --project my-project
```

### List Tasks

```bash
# List all tasks
npm run task -- list

# Filter by status
npm run task -- list --status todo

# Filter by project
npm run task -- list --project dashboard

# Filter by tag
npm run task -- list --tag backend
```

### Show Task Details

```bash
npm run task -- show 2024-03-30T22-30-fix-bug-in-api
```

### Update a Task

```bash
# Change status
npm run task -- update 2024-03-30T22-30-fix-bug-in-api --status inprogress

# Change priority
npm run task -- update 2024-03-30T22-30-fix-bug-in-api --priority high

# Add tags
npm run task -- update 2024-03-30T22-30-fix-bug-in-api --tags "backend,api,critical"

# Change project
npm run task -- update 2024-03-30T22-30-fix-bug-in-api --project dashboard

# Update multiple fields
npm run task -- update 2024-03-30T22-30-fix-bug-in-api --status done --priority low
```

### Delete a Task

```bash
npm run task -- delete 2024-03-30T22-30-fix-bug-in-api
```

### Validate Task Format

```bash
# Validate all tasks in tasks/
npm run task -- validate

# Validate a specific file
npm run task -- validate tasks/2024-03-30T22-30-fix-bug-in-api.md
```

## Git Integration

All task operations automatically commit and push changes to the `tasks/` directory:

1. Files are staged (`git add tasks/`)
2. Committed with message like `task: create "Fix bug in API endpoint"`
3. Pushed to remote (if configured)

This ensures tasks are always versioned and backed up.

## API Reference

### GET /api/v1/kanban/tasks

Returns all tasks grouped by status.

**Response:**

```json
{
  "todo": [
    {
      "id": "2024-03-30T22-30-fix-bug-in-api",
      "title": "Fix bug in API endpoint",
      "status": "todo",
      "priority": "high",
      "tags": ["backend", "api"],
      "project": "dashboard",
      "createdAt": "2024-03-30T22:30:00.000Z",
      "updated": "2024-03-30T22:30:00.000Z",
      "assignee": "john"
    }
  ],
  "inprogress": [],
  "done": []
}
```

### POST /api/v1/kanban/tasks

Create a new task.

**Request Body:**

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "status": "todo | inprogress | done (default: todo)",
  "priority": "low | medium | high (default: medium)",
  "tags": ["string"],
  "assignee": "string (optional)",
  "project": "string (default: general)"
}
```

**Response:** Created task object with `id`, `createdAt`, `updated`.

## Kanban UI

Access the kanban board at `/kanban` in the Next.js app. Features:

- View tasks organized in columns (Todo, In Progress, Done)
- Create new tasks via form
- Filter by project and tags
- Color-coded priority and tags
- Real-time updates

## CI/CD Validation

Task files are automatically validated on commit via `husky` + `lint-staged`. The pre-commit hook runs `npm run task -- validate` on any `tasks/*.md` files being committed.

To manually validate in CI:

```bash
npm run task -- validate
```

The command exits with code 0 if all tasks are valid, or code 1 if there are errors.

## Best Practices

1. **Descriptive titles**: Keep titles short but clear (50 chars max recommended)
2. **Use tags**: Apply consistent tags across tasks (e.g., `backend`, `frontend`, `ops`, `deploy`)
3. **Prioritize**: Use priority to signal urgency (`high` for blockers, `low` for nice-to-haves)
4. **Assign projects**: Group related tasks with the same project name
5. **Update status**: Move tasks through the workflow (`todo` → `inprogress` → `done`)
6. **Write descriptions**: For complex tasks, add a detailed description in the markdown body
7. **Link related work**: Reference issue numbers, PRs, or other task IDs in descriptions

## Examples

### Creating a task from the command line

```bash
# Using npm (note the `--` separator)
npm run task -- create \
  --title "Add authentication to dashboard" \
  --status todo \
  --priority high \
  --tags "frontend,auth,security" \
  --project dashboard \
  --description "Implement OAuth2 flow and protect admin routes"

# Or run the script directly
node scripts/task.cjs create \
  --title "Add authentication to dashboard" \
  --status todo \
  --priority high \
  --tags "frontend,auth,security" \
  --project dashboard \
  --description "Implement OAuth2 flow and protect admin routes"
```

### Updating multiple tasks

```bash
# Find all todo tasks in the dashboard project and move them to inprogress
for id in $(npm run task -- list --project dashboard --status todo | grep -oE '[0-9T-]+' | head -n 10); do
  npm run task -- update $id --status inprogress
done
```

### Exporting tasks to CSV

```bash
npm run task -- list --project dashboard | awk -F'|' '{print $1","$2","$3}' > tasks-dashboard.csv
```

## Troubleshooting

### "Error: Task not found"
Verify the task ID is correct. Use `npm run task -- list` to see all task IDs.

### "Git commit failed"
Git may not be configured in this environment. The task operation will still create the file but won't commit. Ensure you're in a git repository.

### Validation errors
Common issues:
- Missing required fields (`title`, `status`, `priority`)
- Invalid enum values (use `todo`, `inprogress`, `done`; `low`, `medium`, `high`)
- Malformed YAML frontmatter

Use `npm run task -- validate` to check all tasks.

### Task not appearing in Kanban
The kanban API caches for up to 5 minutes. Use `{ next: { revalidate: 0 } }` in fetch or restart the dev server.

## Extending the System

The task system is designed to be extensible:

- Add new CLI commands in `scripts/task.cjs`
- Extend the API in `backend/src/endpoints/kanban.ts`
- Customize the UI in `app/components/Kanban.tsx`
- Add automation (e.g., auto-assign based on tags) via GitHub Actions

## License

Part of the OpenClaw workspace.
