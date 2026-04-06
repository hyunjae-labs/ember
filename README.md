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
| `complete_todo` | Mark a todo as done (idempotent) |
| `archive_todo` | Soft-delete a todo (hidden from default queries) |
| `unarchive_todo` | Restore an archived todo |
| `search_todos` | Semantic hybrid search over todos |

## Data

Stored in `~/.ember/ember.db` (SQLite + sqlite-vec).

## License

MIT
