import type Database from "better-sqlite3";
import { getEmbedder } from "../embedder/index.js";
import { insertTodo } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export interface AddTodoParams {
  title: string;
  note?: string;
  priority?: string;
  tags?: string[];
}

export async function handleAddTodo(
  db: Database.Database,
  params: AddTodoParams
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!params.title?.trim()) {
    return toolError("title is required");
  }

  const embedder = await getEmbedder();
  const text = [params.title, params.note].filter(Boolean).join(" ");
  const embedding = await embedder.embed("passage: " + text);

  const uuid = insertTodo(db, {
    title: params.title.trim(),
    note: params.note,
    priority: params.priority,
    tags: params.tags,
    embedding,
  });

  return toolResult({ status: "ok", uuid, title: params.title.trim() });
}
