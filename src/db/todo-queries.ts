import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

// better-sqlite3 accepted binding parameter types
type BindingParameter = string | number | bigint | Buffer | null;

export interface TodoRow {
  id: number;
  uuid: string;
  title: string;
  note: string | null;
  status: string;
  priority: string;
  tags: string; // JSON string
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

export interface TodoSearchResult extends TodoRow {
  score: number;
}

export function insertTodo(
  db: Database.Database,
  params: {
    title: string;
    note?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    embedding: Float32Array;
  }
): string {
  const uuid = randomUUID();
  const now = new Date().toISOString();

  const insertRow = db.prepare(`
    INSERT INTO todos (uuid, title, note, status, priority, tags, created_at, updated_at)
    VALUES (@uuid, @title, @note, @status, @priority, @tags, @created_at, @updated_at)
  `);

  const insertVec = db.prepare(`
    INSERT INTO vec_todos (rowid, embedding) VALUES (?, ?)
  `);

  const transaction = db.transaction(() => {
    const result = insertRow.run({
      uuid,
      title: params.title,
      note: params.note ?? null,
      status: params.status ?? "todo",
      priority: params.priority ?? "medium",
      tags: JSON.stringify(params.tags ?? []),
      created_at: now,
      updated_at: now,
    });
    insertVec.run(BigInt(result.lastInsertRowid), Buffer.from(params.embedding.buffer));
    return uuid;
  });

  return transaction();
}

export function getTodoByUuid(
  db: Database.Database,
  uuid: string
): TodoRow | null {
  return (
    (db
      .prepare("SELECT * FROM todos WHERE uuid = ?")
      .get(uuid) as TodoRow | undefined) ?? null
  );
}

export function listTodos(
  db: Database.Database,
  params: {
    status?: string;
    priority?: string;
    includeArchived?: boolean;
    limit?: number;
  }
): TodoRow[] {
  const conditions: string[] = [];
  const args: BindingParameter[] = [];

  if (!params.includeArchived) {
    conditions.push("archived_at IS NULL");
  }

  if (params.status && params.status !== "all") {
    conditions.push("status = ?");
    args.push(params.status);
  } else if (!params.status) {
    conditions.push("status IN ('todo', 'in_progress')");
  }

  if (params.priority) {
    conditions.push("priority = ?");
    args.push(params.priority);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 100;

  return db
    .prepare(`SELECT * FROM todos ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...args, limit) as TodoRow[];
}

export function updateTodo(
  db: Database.Database,
  params: {
    uuid: string;
    title?: string;
    note?: string | null;
    status?: string;
    priority?: string;
    tags?: string[];
    embedding: Float32Array;
  }
): TodoRow | null {
  const existing = getTodoByUuid(db, params.uuid);
  if (!existing) return null;

  const now = new Date().toISOString();

  const updateRow = db.prepare(`
    UPDATE todos SET
      title      = COALESCE(@title, title),
      note       = CASE WHEN @note_provided = 1 THEN @note ELSE note END,
      status     = COALESCE(@status, status),
      priority   = COALESCE(@priority, priority),
      tags       = COALESCE(@tags, tags),
      updated_at = @updated_at
    WHERE uuid = @uuid
  `);

  const updateVec = db.prepare(`
    UPDATE vec_todos SET embedding = ? WHERE rowid = ?
  `);

  const transaction = db.transaction(() => {
    updateRow.run({
      uuid: params.uuid,
      title: params.title ?? null,
      note_provided: params.note !== undefined ? 1 : 0,
      note: params.note !== undefined ? (params.note ?? null) : null,
      status: params.status ?? null,
      priority: params.priority ?? null,
      tags: params.tags ? JSON.stringify(params.tags) : null,
      updated_at: now,
    });
    updateVec.run(Buffer.from(params.embedding.buffer), BigInt(existing.id));
  });

  transaction();
  return getTodoByUuid(db, params.uuid);
}

export function completeTodo(
  db: Database.Database,
  uuid: string
): TodoRow | null {
  const existing = getTodoByUuid(db, uuid);
  if (!existing) return null;
  if (existing.status === "done") return existing;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE todos SET status = 'done', completed_at = @now, updated_at = @now
    WHERE uuid = @uuid
  `).run({ uuid, now });

  return getTodoByUuid(db, uuid);
}

export function archiveTodo(
  db: Database.Database,
  uuid: string
): TodoRow | null {
  const existing = getTodoByUuid(db, uuid);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE todos SET archived_at = @now, updated_at = @now WHERE uuid = @uuid
  `).run({ uuid, now });

  return getTodoByUuid(db, uuid);
}

export function todoHybridSearch(
  db: Database.Database,
  params: {
    embedding: Float32Array;
    query: string;
    limit: number;
    status?: string;
    includeArchived?: boolean;
  }
): TodoSearchResult[] {
  const overFetchLimit = params.limit * 5;
  const RRF_K = 60;

  const vecRows = db
    .prepare(
      `SELECT rowid, distance FROM vec_todos
       WHERE embedding MATCH ?
       ORDER BY distance ASC LIMIT ?`
    )
    .all(Buffer.from(params.embedding.buffer), overFetchLimit) as {
    rowid: bigint;
    distance: number;
  }[];

  let ftsRows: { rowid: number; rank: number }[] = [];
  try {
    ftsRows = db
      .prepare(
        `SELECT rowid, rank FROM todos_fts
         WHERE todos_fts MATCH ?
         ORDER BY rank ASC LIMIT ?`
      )
      .all(params.query, overFetchLimit) as { rowid: number; rank: number }[];
  } catch {
    // FTS special character error — fall back to vector only
  }

  const rrfScores = new Map<number, number>();
  vecRows.forEach((r, i) => {
    const key = Number(r.rowid);
    rrfScores.set(key, (rrfScores.get(key) || 0) + 1 / (RRF_K + i));
  });
  ftsRows.forEach((r, i) => {
    rrfScores.set(r.rowid, (rrfScores.get(r.rowid) || 0) + 1 / (RRF_K + i));
  });

  if (rrfScores.size === 0) return [];

  const allRowids = [...rrfScores.keys()];
  const placeholders = allRowids.map(() => "?").join(",");
  const conditions: string[] = [`id IN (${placeholders})`];
  const args: BindingParameter[] = [...allRowids];

  if (!params.includeArchived) {
    conditions.push("archived_at IS NULL");
  }
  if (params.status && params.status !== "all") {
    conditions.push("status = ?");
    args.push(params.status);
  }

  const rows = db
    .prepare(`SELECT * FROM todos WHERE ${conditions.join(" AND ")}`)
    .all(...args) as TodoRow[];

  const maxRrf = Math.max(...rows.map((r) => rrfScores.get(r.id) || 0), 0.001);

  return rows
    .map((row) => ({
      ...row,
      score: Math.round(((rrfScores.get(row.id) || 0) / maxRrf) * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit);
}
