---
name: ember-help
description: Explains ember's todo management tools and how to use them
triggers:
  - ember
  - todo
  - task
  - my todos
  - show todos
  - what can ember do
---

# ember — Personal Todo MCP Server

ember provides 6 MCP tools for managing personal todos with semantic search.

## Tools

### add_todo
Add a new todo item.
- `title` (required): The todo title
- `note` (optional): Additional details
- `priority` (optional): low / medium / high / urgent
- `tags` (optional): Array of tag strings

### list_todos
List todos. By default returns only incomplete items (todo/in_progress).
- `status`: Filter by status (todo / in_progress / done / cancelled / all)
- `priority`: Filter by priority
- `includeArchived`: Set true to include archived items
- `limit`: Max results (default 100)

### update_todo
Update a todo by UUID. Only pass fields you want to change.
- `uuid` (required): The todo's UUID
- `title`, `note`, `status`, `priority`, `tags`: Fields to update
- Set `note` to `null` to clear it

### complete_todo
Mark a todo as done. Idempotent — re-completing preserves the original completed_at.
- `uuid` (required): The todo's UUID

### archive_todo
Soft-delete a todo. Hidden from default queries but data is preserved.
- `uuid` (required): The todo's UUID

### search_todos
Semantic hybrid search (vector + FTS5 + Reciprocal Rank Fusion).
- `query` (required): Search text
- `status`, `includeArchived`, `limit`: Optional filters

## Data
Stored in `~/.ember/ember.db` (SQLite + sqlite-vec).
