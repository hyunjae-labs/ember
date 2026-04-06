import type Database from "better-sqlite3";
import { getEmbedder } from "../embedder/index.js";
import { updateTodo, getTodoByUuid } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export interface UpdateTodoParams {
  uuid: string;
  title?: string;
  note?: string | null;
  status?: string;
  priority?: string;
  tags?: string[];
}

export async function handleUpdateTodo(
  db: Database.Database,
  params: UpdateTodoParams
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!params.uuid?.trim()) return toolError("uuid is required");

  const existing = getTodoByUuid(db, params.uuid);
  if (!existing) return toolError(`uuid '${params.uuid}' not found`);

  const embedder = await getEmbedder();
  const newTitle = params.title ?? existing.title;
  const newNote = params.note !== undefined ? params.note : existing.note;
  const text = [newTitle, newNote].filter(Boolean).join(" ");
  const embedding = await embedder.embed("passage: " + text);

  const updated = updateTodo(db, { ...params, embedding });
  if (!updated) return toolError(`uuid '${params.uuid}' not found`);

  return toolResult({
    status: "ok",
    todo: {
      uuid: updated.uuid,
      title: updated.title,
      note: updated.note,
      status: updated.status,
      priority: updated.priority,
      tags: JSON.parse(updated.tags) as string[],
      updated_at: updated.updated_at,
    },
  });
}
