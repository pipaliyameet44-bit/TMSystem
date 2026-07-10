const initSqlJs = require('sql.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), 'tasks.db')
  : path.join(__dirname, '..', 'tasks.db');

let db = null;

/**
 * Persist the in-memory sql.js database to disk.
 */
function persistDb() {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.warn('⚠️ Failed to persist database to disk:', error.message);
  }
}

/**
 * Initialize (or load) the database.
 * Returns a promise that resolves with an object exposing
 * prepare / run / get / all / exec — mirroring the better-sqlite3 API
 * so the rest of the codebase doesn't change.
 */
async function getDb() {
  if (db) return dbApi;

  try {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('✅ Loaded existing database from', DB_PATH);
    } else {
      db = new SQL.Database();
      console.log('✅ Created new database at', DB_PATH);
    }

    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name  TEXT NOT NULL,
        password   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'todo'
                    CHECK(status IN ('todo', 'in_progress', 'completed')),
        priority    TEXT NOT NULL DEFAULT 'Medium',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    try {
      db.run("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium';");
    } catch (e) {
      // Column already exists
    }

    persistDb();
    return dbApi;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * A thin synchronous-style wrapper around sql.js so route handlers
 * don't need to change.
 */
const dbApi = {
  /**
   * Execute a statement that returns rows (SELECT).
   * Returns the first row as a plain object, or undefined.
   */
  get(sql, ...params) {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return row;
  },

  /**
   * Execute a statement that returns multiple rows.
   * Returns an array of plain objects.
   */
  all(sql, ...params) {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },

  /**
   * Execute a mutating statement (INSERT / UPDATE / DELETE).
   * Returns { lastInsertRowid, changes }.
   */
  run(sql, ...params) {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    stmt.step();
    stmt.free();
    const lastInsertRowid = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0];
    const changes = db.exec('SELECT changes()')[0]?.values[0][0];
    persistDb();
    return { lastInsertRowid, changes };
  },

  /**
   * Execute raw SQL (e.g. multi-statement DDL).
   */
  exec(sql) {
    db.run(sql);
    persistDb();
  },
};

module.exports = { getDb };
