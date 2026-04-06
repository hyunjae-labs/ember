import type Database from "better-sqlite3";
import { deleteTodos } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export async function handleDeleteTodo(
  db: Database.Database,
  params: { uuid: string | string[] }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const uuids = Array.isArray(params.uuid) ? params.uuid : [params.uuid];
  if (uuids.length === 0 || uuids.some(u => !u?.trim())) return toolError("uuid is required");

  const { deleted, skipped } = deleteTodos(db, uuids);

  return toolResult({
    status: "ok",
    deleted_count: deleted.length,
    deleted,
    ...(skipped.length > 0 ? { skipped_count: skipped.length, skipped, skipped_reason: "must be archived before deleting" } : {}),
  });
}
