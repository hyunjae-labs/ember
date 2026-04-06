import type Database from "better-sqlite3";
import { archiveTodo } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export async function handleArchiveTodo(
  db: Database.Database,
  params: { uuid: string }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!params.uuid?.trim()) return toolError("uuid is required");

  const result = archiveTodo(db, params.uuid);
  if (!result) return toolError(`uuid '${params.uuid}' not found`);

  return toolResult({
    status: "ok",
    todo: {
      uuid: result.uuid,
      title: result.title,
      status: result.status,
      archived_at: result.archived_at,
    },
  });
}
