import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { getDb } from "./db/index.js";
import { CONFIG } from "./config.js";
import { handleAddTodo } from "./tools/todo-add.js";
import { handleListTodos } from "./tools/todo-list.js";
import { handleUpdateTodo } from "./tools/todo-update.js";
import { handleCompleteTodo } from "./tools/todo-complete.js";
import { handleArchiveTodo } from "./tools/todo-archive.js";
import { handleUnarchiveTodo } from "./tools/todo-unarchive.js";
import { handleDeleteTodo } from "./tools/todo-delete.js";
import { handleSearchTodos } from "./tools/todo-search.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolResult = any;

export async function startServer(): Promise<void> {
  const db = getDb(CONFIG.dbPath);

  const server = new McpServer({
    name: "ember",
    version: "0.3.0",
  });

  server.registerTool(
    "add_todo",
    {
      description: "Add a new todo. title is required. Optional: note, priority (low/medium/high/urgent), tags.",
      inputSchema: {
        title:    z.string(),
        note:     z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        tags:     z.array(z.string()).optional(),
      },
    },
    async (args): Promise<ToolResult> => handleAddTodo(db, args)
  );

  server.registerTool(
    "list_todos",
    {
      description: "List todos. Defaults to incomplete (todo/in_progress) only. status='all' includes completed. includeArchived=true includes archived.",
      inputSchema: {
        status:          z.enum(["todo", "in_progress", "done", "cancelled", "all"]).optional(),
        priority:        z.enum(["low", "medium", "high", "urgent"]).optional(),
        includeArchived: z.boolean().optional(),
        limit:           z.number().optional(),
      },
    },
    async (args): Promise<ToolResult> => handleListTodos(db, args)
  );

  server.registerTool(
    "update_todo",
    {
      description: "Update a todo by uuid. Pass only the fields to change. Set note to null to clear it.",
      inputSchema: {
        uuid:     z.string(),
        title:    z.string().optional(),
        note:     z.string().nullable().optional(),
        status:   z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        tags:     z.array(z.string()).optional(),
      },
    },
    async (args): Promise<ToolResult> => handleUpdateTodo(db, args)
  );

  server.registerTool(
    "complete_todo",
    {
      description: "Mark todo(s) as done. Accepts a single uuid or array. If already completed, preserves completed_at.",
      inputSchema: { uuid: z.union([z.string(), z.array(z.string())]) },
    },
    async (args): Promise<ToolResult> => handleCompleteTodo(db, args)
  );

  server.registerTool(
    "archive_todo",
    {
      description: "Soft-delete todo(s). Data is kept but hidden from default queries. Accepts a single uuid or array.",
      inputSchema: { uuid: z.union([z.string(), z.array(z.string())]) },
    },
    async (args): Promise<ToolResult> => handleArchiveTodo(db, args)
  );

  server.registerTool(
    "unarchive_todo",
    {
      description: "Restore archived todo(s). Accepts a single uuid or array.",
      inputSchema: { uuid: z.union([z.string(), z.array(z.string())]) },
    },
    async (args): Promise<ToolResult> => handleUnarchiveTodo(db, args)
  );

  server.registerTool(
    "delete_todo",
    {
      description: "Permanently delete todo(s). Only archived todos can be deleted. Accepts a single uuid or array.",
      inputSchema: { uuid: z.union([z.string(), z.array(z.string())]) },
    },
    async (args): Promise<ToolResult> => handleDeleteTodo(db, args)
  );

  server.registerTool(
    "search_todos",
    {
      description: "Semantic search over todos (hybrid: vector + FTS5 + RRF). Separate from any other search tools.",
      inputSchema: {
        query:           z.string(),
        status:          z.enum(["todo", "in_progress", "done", "cancelled", "all"]).optional(),
        includeArchived: z.boolean().optional(),
        limit:           z.number().optional(),
      },
    },
    async (args): Promise<ToolResult> => handleSearchTodos(db, args)
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
