# Migrating from SQLite to Postgres / Turso

Arth uses `better-sqlite3` locally (`server/src/db.js`). Schema lives in that module as `CREATE TABLE IF NOT EXISTS` statements. Keep **schema parity** when moving off SQLite.

## Options

| Target | Driver ideas | Notes |
|--------|----------------|-------|
| **Postgres** | `pg` + thin wrapper, or Drizzle/Kysely | Best for Render/Neon/Supabase |
| **Turso (libSQL)** | `@libsql/client` | SQLite-compatible SQL; easiest mental model |

## Env vars (suggested)

```bash
# SQLite (current)
DATABASE_PATH=./data/arth.db

# Postgres
DATABASE_URL=postgres://user:pass@host:5432/arth
# or
PGHOST=...
PGUSER=...
PGPASSWORD=...
PGDATABASE=arth

# Turso
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Adapter sketch

Keep call sites using a small façade so routes stay unchanged:

```js
// db.js — conceptual
export const db = {
  prepare(sql) {
    return {
      get: (...params) => /* one row */,
      all: (...params) => /* rows */,
      run: (...params) => /* { changes, lastInsertRowid } */,
    }
  },
  exec(sql) { /* migrate / DDL */ },
  transaction(fn) { /* BEGIN … COMMIT */ return fn },
}
```

- Map `?` placeholders to `$1…$n` for `pg`, or keep `?` for Turso/libSQL.
- Replace `INTEGER` epoch millis with `BIGINT` / `TIMESTAMPTZ` as needed; keep the same column names.
- SQLite `COLLATE NOCASE` → `LOWER(email) = LOWER($1)` or a citext column.
- Run the same seed / demo-user path after migrate.

## Migration steps

1. Dump schema from `initDb()` into `schema.sql` (Postgres-flavored).
2. Export rows (`sqlite3 .dump` or a one-off script).
3. Load into Postgres/Turso; fix types (booleans `0/1` → `boolean` if desired).
4. Flip `DATABASE_URL` / Turso env; remove `better-sqlite3` when stable.
5. Add connection pooling (`pg.Pool`) for serverless/multi-instance deploys.

## Keep in mind

- SQLite is single-writer; Postgres unlocks horizontal API replicas.
- Sessions/cookies stay the same; only the persistence layer changes.
- Audit log (`server/data/audit.log`) is file-based — move to a `audit_events` table if you need multi-instance audit.
