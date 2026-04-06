---
name: ember
description: Personal todo MCP server for Claude Code. Invoke when the user mentions todos, tasks, or ember.
triggers:
  - ember
  - todo
  - task
  - my todos
  - show todos
---

# ember — Personal Todo MCP Server

8 MCP tools for managing personal todos with hybrid semantic search (Vector + FTS5 + RRF).

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
Mark todo(s) as done. Idempotent — re-completing preserves the original completed_at.
- `uuid` (required): Single UUID string or array of UUIDs

### archive_todo
Soft-delete todo(s). Hidden from default queries but data is preserved.
- `uuid` (required): Single UUID string or array of UUIDs

### unarchive_todo
Restore archived todo(s) so they appear in default queries again.
- `uuid` (required): Single UUID string or array of UUIDs

### delete_todo
Permanently delete todo(s). **Only archived todos can be deleted** (must archive first).
- `uuid` (required): Single UUID string or array of UUIDs

### search_todos
Semantic hybrid search (vector + FTS5 + Reciprocal Rank Fusion). Defaults to incomplete todos only.
- `query` (required): Search text
- `status`, `includeArchived`, `limit`: Optional filters

## Data
Stored in `~/.ember/ember.db` (SQLite + sqlite-vec).
