import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const DEMO_EMAIL = 'demo@arth.app'
const LEGACY_DEMO_EMAIL = 'demo@ticklab.app'

const dbPath = path.join(dataDir, 'arth.db')

// Carry the database over from the pre-rebrand filename. WAL and shared-memory
// sidecars must move with the main file or committed pages would be orphaned.
const legacyDbPath = path.join(dataDir, 'ticklab.db')
if (fs.existsSync(legacyDbPath) && !fs.existsSync(dbPath)) {
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(legacyDbPath + suffix)) fs.renameSync(legacyDbPath + suffix, dbPath + suffix)
  }
}

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      cash REAL NOT NULL DEFAULT 0,
      kyc_step INTEGER NOT NULL DEFAULT 0,
      kyc_complete INTEGER NOT NULL DEFAULT 0,
      pan TEXT,
      aadhaar TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      bank_name TEXT,
      reset_token TEXT,
      reset_expires INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS session_refresh_history (
      token_hash TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      consumed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_history_session
      ON session_refresh_history(session_id);

    CREATE TABLE IF NOT EXISTS watchlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist_items (
      watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      PRIMARY KEY (watchlist_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL,
      fill_price REAL,
      status TEXT NOT NULL,
      product TEXT NOT NULL DEFAULT 'delivery',
      reserved_cash REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holdings (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      qty INTEGER NOT NULL,
      avg_price REAL NOT NULL,
      PRIMARY KEY (user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mf_holdings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fund_id TEXT NOT NULL,
      units REAL NOT NULL,
      avg_nav REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mf_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fund_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      units REAL NOT NULL,
      nav REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fund_id TEXT NOT NULL,
      amount REAL NOT NULL,
      day_of_month INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_run_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ipo_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ipo_id TEXT NOT NULL,
      lots INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      upi TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      target_price REAL NOT NULL,
      note TEXT,
      triggered_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `)

  migrateColumns()
  migrateDemoEmail()
}

function migrateColumns() {
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name)
  if (!orderCols.includes('reserved_cash')) {
    db.exec('ALTER TABLE orders ADD COLUMN reserved_cash REAL NOT NULL DEFAULT 0')
  }
  const sipCols = db.prepare('PRAGMA table_info(sips)').all().map((c) => c.name)
  if (!sipCols.includes('last_run_at')) {
    db.exec('ALTER TABLE sips ADD COLUMN last_run_at INTEGER')
  }
}

/** Move the seeded demo account to the post-rebrand address, keeping its data. */
function migrateDemoEmail() {
  const legacy = db.prepare('SELECT id FROM users WHERE email = ?').get(LEGACY_DEMO_EMAIL)
  if (!legacy) return
  const taken = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL)
  if (taken) return
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(DEMO_EMAIL, legacy.id)
}
