export const TODO_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS todos (
  id          INTEGER PRIMARY KEY,
  uuid        TEXT    UNIQUE NOT NULL,
  title       TEXT    NOT NULL,
  note        TEXT,
  status      TEXT    NOT NULL DEFAULT 'todo',
  priority    TEXT    NOT NULL DEFAULT 'medium',
  tags        TEXT    NOT NULL DEFAULT '[]',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  archived_at  TEXT
);
`;

export const TODO_VEC_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS vec_todos USING vec0(
  embedding FLOAT[384]
);
`;

export const TODO_FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS todos_fts USING fts5(
  title,
  note,
  content=todos,
  content_rowid=id
);

CREATE TRIGGER IF NOT EXISTS todos_ai AFTER INSERT ON todos BEGIN
  INSERT INTO todos_fts(rowid, title, note)
  VALUES (new.id, new.title, COALESCE(new.note, ''));
END;

CREATE TRIGGER IF NOT EXISTS todos_ad AFTER DELETE ON todos BEGIN
  INSERT INTO todos_fts(todos_fts, rowid, title, note)
  VALUES('delete', old.id, old.title, COALESCE(old.note, ''));
END;

CREATE TRIGGER IF NOT EXISTS todos_au AFTER UPDATE ON todos BEGIN
  INSERT INTO todos_fts(todos_fts, rowid, title, note)
  VALUES('delete', old.id, old.title, COALESCE(old.note, ''));
  INSERT INTO todos_fts(rowid, title, note)
  VALUES (new.id, new.title, COALESCE(new.note, ''));
END;
`;
