import type Database from "better-sqlite3";
import { getEmbedder } from "../embedder/index.js";
import { todoHybridSearch } from "../db/todo-queries.js";
import { toolResult, toolError } from "./helpers.js";

export interface SearchTodosParams {
  query: string;
  status?: string;
  includeArchived?: boolean;
  limit?: number;
}

export async function handleSearchTodos(
  db: Database.Database,
  params: SearchTodosParams
): Promise<{ content: Array<{ type: string; text: string }> }> {
  if (!params.query?.trim()) return toolError("query is required");

  const limit = Math.min(params.limit ?? 10, 50);
  const embedder = await getEmbedder();
  const embedding = await embedder.embed("query: " + params.query.trim());

  const results = todoHybridSearch(db, {
    embedding,
    query: params.query,
    limit,
    status: params.status,
    includeArchived: params.includeArchived,
  });

  return toolResult({
    status: "ok",
    query: params.query,
    result_count: results.length,
    results: results.map((t) => ({
      uuid: t.uuid,
      score: t.score,
      title: t.title,
      note: t.note,
      status: t.status,
      priority: t.priority,
      tags: JSON.parse(t.tags) as string[],
      created_at: t.created_at,
      completed_at: t.completed_at,
    })),
  });
}
