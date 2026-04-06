import type Database from "better-sqlite3";
import { listTodos } from "../db/todo-queries.js";
import { toolResult } from "./helpers.js";

export interface ListTodosParams {
  status?: string;
  priority?: string;
  includeArchived?: boolean;
  limit?: number;
}

export async function handleListTodos(
  db: Database.Database,
  params: ListTodosParams
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const todos = listTodos(db, {
    status: params.status,
    priority: params.priority,
    includeArchived: params.includeArchived,
    limit: params.limit,
  });

  return toolResult({
    status: "ok",
    count: todos.length,
    todos: todos.map((t) => ({
      uuid: t.uuid,
      title: t.title,
      note: t.note,
      status: t.status,
      priority: t.priority,
      tags: JSON.parse(t.tags) as string[],
      created_at: t.created_at,
      completed_at: t.completed_at,
      archived_at: t.archived_at,
    })),
  });
}
