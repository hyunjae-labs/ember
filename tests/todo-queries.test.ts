import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { TODO_SCHEMA_SQL, TODO_VEC_SQL, TODO_FTS_SQL } from "../src/db/todo-schema.js";
import {
  insertTodo,
  listTodos,
  getTodoByUuid,
  updateTodo,
  completeTodos,
  archiveTodos,
  unarchiveTodos,
  deleteTodos,
  todoHybridSearch,
} from "../src/db/todo-queries.js";

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  sqliteVec.load(db);
  db.pragma("journal_mode = WAL");
  db.exec(TODO_SCHEMA_SQL);
  db.exec(TODO_VEC_SQL);
  db.exec(TODO_FTS_SQL);
  return db;
}

const DUMMY_EMBEDDING = new Float32Array(384).fill(0.1);

describe("todo-queries", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeDb();
  });

  afterEach(() => {
    db.close();
  });

  describe("insertTodo", () => {
    it("returns uuid and todo is retrievable", () => {
      const uuid = insertTodo(db, {
        title: "Buy groceries",
        embedding: DUMMY_EMBEDDING,
      });
      expect(typeof uuid).toBe("string");
      expect(uuid.length).toBeGreaterThan(0);

      const todo = getTodoByUuid(db, uuid);
      expect(todo).not.toBeNull();
      expect(todo!.title).toBe("Buy groceries");
      expect(todo!.status).toBe("todo");
      expect(todo!.priority).toBe("medium");
    });

    it("stores note and tags", () => {
      const uuid = insertTodo(db, {
        title: "Write report",
        note: "Due by Friday",
        tags: ["work", "urgent"],
        embedding: DUMMY_EMBEDDING,
      });
      const todo = getTodoByUuid(db, uuid);
      expect(todo!.note).toBe("Due by Friday");
      expect(JSON.parse(todo!.tags)).toEqual(["work", "urgent"]);
    });
  });

  describe("listTodos", () => {
    it("defaults to incomplete (todo/in_progress) only", () => {
      const uuid1 = insertTodo(db, { title: "task1", embedding: DUMMY_EMBEDDING });
      const uuid2 = insertTodo(db, { title: "task2", embedding: DUMMY_EMBEDDING });
      completeTodos(db, [uuid2]);

      const results = listTodos(db, {});
      expect(results.map(r => r.uuid)).toContain(uuid1);
      expect(results.map(r => r.uuid)).not.toContain(uuid2);
    });

    it("status=all includes completed", () => {
      const uuid1 = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      completeTodos(db, [uuid1]);
      const results = listTodos(db, { status: "all" });
      expect(results.map(r => r.uuid)).toContain(uuid1);
    });

    it("archived hidden by default", () => {
      const uuid1 = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid1]);
      const results = listTodos(db, { status: "all" });
      expect(results.map(r => r.uuid)).not.toContain(uuid1);
    });

    it("includeArchived=true shows archived", () => {
      const uuid1 = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid1]);
      const results = listTodos(db, { includeArchived: true });
      expect(results.map(r => r.uuid)).toContain(uuid1);
    });
  });

  describe("updateTodo", () => {
    it("updates title and note", () => {
      const uuid = insertTodo(db, { title: "original", embedding: DUMMY_EMBEDDING });
      const updated = updateTodo(db, { uuid, title: "new title", note: "added note", embedding: DUMMY_EMBEDDING });
      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("new title");
      expect(updated!.note).toBe("added note");
    });

    it("clears note when set to null", () => {
      const uuid = insertTodo(db, { title: "task", note: "has note", embedding: DUMMY_EMBEDDING } as any);
      const updated = updateTodo(db, { uuid, note: null, embedding: DUMMY_EMBEDDING });
      expect(updated).not.toBeNull();
      expect(updated!.note).toBeNull();
    });

    it("returns null for nonexistent uuid", () => {
      const result = updateTodo(db, { uuid: "nonexistent", title: "x", embedding: DUMMY_EMBEDDING });
      expect(result).toBeNull();
    });

    it("skips vec update when embedding not provided", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      const updated = updateTodo(db, { uuid, status: "in_progress" });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("in_progress");
    });
  });

  describe("completeTodos", () => {
    it("sets status to done and completed_at", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      const results = completeTodos(db, [uuid]);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("done");
      expect(results[0].completed_at).not.toBeNull();
    });

    it("idempotent on already completed todo", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      completeTodos(db, [uuid]);
      const results = completeTodos(db, [uuid]);
      expect(results[0].status).toBe("done");
    });

    it("batch completes multiple todos", () => {
      const u1 = insertTodo(db, { title: "t1", embedding: DUMMY_EMBEDDING });
      const u2 = insertTodo(db, { title: "t2", embedding: DUMMY_EMBEDDING });
      const results = completeTodos(db, [u1, u2]);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === "done")).toBe(true);
    });
  });

  describe("archiveTodos", () => {
    it("sets archived_at", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      const results = archiveTodos(db, [uuid]);
      expect(results).toHaveLength(1);
      expect(results[0].archived_at).not.toBeNull();
    });

    it("batch archives multiple todos", () => {
      const u1 = insertTodo(db, { title: "t1", embedding: DUMMY_EMBEDDING });
      const u2 = insertTodo(db, { title: "t2", embedding: DUMMY_EMBEDDING });
      const results = archiveTodos(db, [u1, u2]);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.archived_at !== null)).toBe(true);
    });
  });

  describe("unarchiveTodos", () => {
    it("clears archived_at", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid]);
      const results = unarchiveTodos(db, [uuid]);
      expect(results).toHaveLength(1);
      expect(results[0].archived_at).toBeNull();
    });

    it("unarchived todo appears in default list again", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid]);
      expect(listTodos(db, {}).map(r => r.uuid)).not.toContain(uuid);
      unarchiveTodos(db, [uuid]);
      expect(listTodos(db, {}).map(r => r.uuid)).toContain(uuid);
    });
  });

  describe("deleteTodos", () => {
    it("deletes archived todo permanently", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid]);
      const { deleted, skipped } = deleteTodos(db, [uuid]);
      expect(deleted).toContain(uuid);
      expect(skipped).toHaveLength(0);
      expect(getTodoByUuid(db, uuid)).toBeNull();
    });

    it("skips non-archived todo", () => {
      const uuid = insertTodo(db, { title: "task", embedding: DUMMY_EMBEDDING });
      const { deleted, skipped } = deleteTodos(db, [uuid]);
      expect(deleted).toHaveLength(0);
      expect(skipped).toContain(uuid);
      expect(getTodoByUuid(db, uuid)).not.toBeNull();
    });

    it("batch: deletes archived, skips active", () => {
      const u1 = insertTodo(db, { title: "archived", embedding: DUMMY_EMBEDDING });
      const u2 = insertTodo(db, { title: "active", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [u1]);
      const { deleted, skipped } = deleteTodos(db, [u1, u2]);
      expect(deleted).toEqual([u1]);
      expect(skipped).toEqual([u2]);
    });
  });

  describe("todoHybridSearch", () => {
    it("finds by title keyword", () => {
      const uuid = insertTodo(db, {
        title: "quarterly budget review",
        embedding: DUMMY_EMBEDDING,
      });
      insertTodo(db, { title: "unrelated task", embedding: DUMMY_EMBEDDING });

      const results = todoHybridSearch(db, {
        embedding: DUMMY_EMBEDDING,
        query: "budget",
        limit: 10,
      });
      expect(results.map(r => r.uuid)).toContain(uuid);
    });

    it("excludes completed by default", () => {
      const uuid = insertTodo(db, { title: "budget review", embedding: DUMMY_EMBEDDING });
      completeTodos(db, [uuid]);

      const results = todoHybridSearch(db, {
        embedding: DUMMY_EMBEDDING,
        query: "budget",
        limit: 10,
      });
      expect(results.map(r => r.uuid)).not.toContain(uuid);
    });

    it("status=all includes completed", () => {
      const uuid = insertTodo(db, { title: "budget review", embedding: DUMMY_EMBEDDING });
      completeTodos(db, [uuid]);

      const results = todoHybridSearch(db, {
        embedding: DUMMY_EMBEDDING,
        query: "budget",
        limit: 10,
        status: "all",
      });
      expect(results.map(r => r.uuid)).toContain(uuid);
    });

    it("excludes archived by default", () => {
      const uuid = insertTodo(db, { title: "budget review", embedding: DUMMY_EMBEDDING });
      archiveTodos(db, [uuid]);

      const results = todoHybridSearch(db, {
        embedding: DUMMY_EMBEDDING,
        query: "budget",
        limit: 10,
      });
      expect(results.map(r => r.uuid)).not.toContain(uuid);
    });
  });
});
