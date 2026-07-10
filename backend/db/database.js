const initSqlJs = require('sql.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), 'tasks.db')
  : path.join(__dirname, '..', 'tasks.db');

let db = null;
let initError = null;

// Exported API placeholder – will be assigned after DB init
let dbApi = null;

/**
 * Persist the in-memory sql.js database to disk.
 */
function persistDb() {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dbDir = path.dirname(DB_PATH);
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    fs.writeFileSync(DB_PATH, buffer);
    console.log('✅ Database persisted to', DB_PATH);
  } catch (error) {
    console.warn('⚠️ Failed to persist database:', error.message);
    // On Vercel or read-only filesystems, this might fail — continue anyway
  }
}

/**
 * Initialize (or load) the database.
 * Returns a promise that resolves with an object exposing
 * prepare / run / get / all / exec — mirroring the better-sqlite3 API
 * so the rest of the codebase doesn't change.
 */
async function getDb() {
  // If the DB is already initialized, return the API object
  if (db) return dbApi;
  if (initError) throw initError;

  try {
    console.log('📦 Initializing sql.js...');
    
    let SQL;
    try {
      SQL = await initSqlJs();
      console.log('✅ sql.js initialized successfully');
    } catch (sqlErr) {
      console.error('❌ sql.js initialization failed:', sqlErr.message, sqlErr);
      throw new Error(`sql.js init failed: ${sqlErr.message}`);
    }

    // Try to load existing database
    let dbLoaded = false;
    if (fs.existsSync(DB_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Loaded existing database from', DB_PATH);
        dbLoaded = true;
      } catch (readErr) {
        console.warn('⚠️ Could not load database file:', readErr.message);
      }
    }

    // Create new database if load failed
    if (!dbLoaded) {
      try {
        db = new SQL.Database();
        console.log('✅ Created new in-memory database');
      } catch (createErr) {
        console.error('❌ Failed to create database:', createErr.message);
        throw new Error(`Database creation failed: ${createErr.message}`);
      }
    }

    // Enable foreign keys
    try {
      db.run('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('⚠️ Could not enable foreign keys:', e.message);
    }

    // Schema — exactly as per spec
    try {
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
      console.log('✅ Schema tables created/verified');
    } catch (e) {
      console.warn('⚠️ Could not create schema tables:', e.message);
    }

    // Migrate existing table to add priority column if it doesn't exist
    try {
      db.run("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium';");
    } catch (e) {
      // Column already exists or error is acceptable
    }

    // Persist immediately after schema creation
    persistDb();
    console.log('✅ Database initialized successfully');

    // Assign the API object now that db is ready
    dbApi = {
      get,
      all,
      run,
      exec
    };

    return dbApi;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message, error.stack);
    initError = error;
    throw error;
  }
}

/**
 * A thin synchronous-style wrapper around sql.js so route handlers
 * don't need to change.
 */
function get(sql, ...params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return row;
  } catch (error) {
    console.error('❌ Database get() error:', { sql, params, error: error.message });
    throw error;
  }
}

function all(sql, ...params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (error) {
    console.error('❌ Database all() error:', { sql, params, error: error.message });
    throw error;
  }
}

function run(sql, ...params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params.flat());
    stmt.step();
    stmt.free();

    const lastIdResult = db.exec('SELECT last_insert_rowid()')[0];
    const changesResult = db.exec('SELECT changes()')[0];

    const lastInsertRowid = lastIdResult?.values?.[0]?.[0];
    const changes = changesResult?.values?.[0]?.[0];

    persistDb();
    return { lastInsertRowid, changes };
  } catch (error) {
    console.error('❌ Database run() error:', { sql, params, error: error.message });
    throw error;
  }
}

function exec(sql) {
  try {
    db.run(sql);
    persistDb();
  } catch (error) {
    console.error('❌ Database exec() error:', { sql, error: error.message });
    throw error;
  }
}

module.exports = { getDb };
