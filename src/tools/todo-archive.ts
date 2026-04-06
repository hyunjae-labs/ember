import type Database from "better-sqlite3";
import { archiveTodos } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export async function handleArchiveTodo(
  db: Database.Database,
  params: { uuid: string | string[] }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const uuids = Array.isArray(params.uuid) ? params.uuid : [params.uuid];
  if (uuids.length === 0 || uuids.some(u => !u?.trim())) return toolError("uuid is required");

  const results = archiveTodos(db, uuids);

  return toolResult({
    status: "ok",
    count: results.length,
    todos: results.map(r => ({
      uuid: r.uuid,
      title: r.title,
      status: r.status,
      archived_at: r.archived_at,
    })),
  });
}
