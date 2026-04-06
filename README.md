# ember

Personal todo MCP server for Claude Code. Hybrid semantic search (Vector + FTS5 + RRF).

## Install

Add to your Claude Code plugin marketplace or run directly:

```bash
npx getember@latest
```

### Pre-download embedding model

```bash
npx getember warmup
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `add_todo` | Add a todo. Required: `title`. Optional: `note`, `priority`, `tags` |
| `list_todos` | List todos. Defaults to incomplete only. `status='all'` includes completed |
| `update_todo` | Update a todo by `uuid`. Pass only fields to change |
| `complete_todo` | Mark todo(s) as done (single uuid or array) |
| `archive_todo` | Soft-delete todo(s) (single uuid or array) |
| `unarchive_todo` | Restore archived todo(s) |
| `delete_todo` | Permanently delete archived todo(s) |
| `search_todos` | Semantic hybrid search over todos |

## Data

Stored in `~/.ember/ember.db` (SQLite + sqlite-vec).

## License

MIT
