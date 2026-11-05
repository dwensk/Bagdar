// Bagdar — подключение к базе данных PostgreSQL (Neon).
// Адрес базы берётся из переменной окружения DATABASE_URL, которую задаём в Vercel.
const { Pool } = require('pg');

let pool = null;
let driver = null; // для локальной проверки можно подставить другую базу через setDriver

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL не задан');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
}

// выполнить SQL-запрос; $1, $2 … — параметры (защита от SQL-инъекций)
async function query(text, params = []) {
  if (driver) return driver(text, params);
  return getPool().query(text, params);
}

// All operations that consume a code and change credentials must commit together.
async function transaction(fn) {
  if (driver) return driver.transaction ? driver.transaction(fn) : fn(query);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn((text, params = []) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

// таблицы создаются сами при первом запросе — ничего не нужно запускать вручную
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'user',
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  paid_until  BIGINT NOT NULL DEFAULT 0,
  blocked     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  email       TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  method      TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS history (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  created_at  BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS checks (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list        TEXT NOT NULL,
  item        TEXT NOT NULL,
  done        BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, list, item)
);
CREATE TABLE IF NOT EXISTS programs (
  code        TEXT NOT NULL,
  pair        TEXT NOT NULL,
  pair_kz     TEXT NOT NULL,
  pair_ru     TEXT NOT NULL,
  name_kz     TEXT NOT NULL,
  name_ru     TEXT NOT NULL,
  min_score   INTEGER,
  salary      INTEGER,
  employment  INTEGER,
  unis        INTEGER,
  PRIMARY KEY (pair, code)
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;
CREATE TABLE IF NOT EXISTS uni_prices (
  uni_id      INTEGER NOT NULL,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  PRIMARY KEY (uni_id, code, price)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at BIGINT;
CREATE TABLE IF NOT EXISTS auth_email_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'recovery', 'verify_email')),
  code_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at BIGINT,
  reset_token_hash TEXT,
  reset_expires_at BIGINT
);
CREATE INDEX IF NOT EXISTS auth_email_challenges_email_idx ON auth_email_challenges(email,purpose);
CREATE TABLE IF NOT EXISTS auth_email_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at BIGINT NOT NULL
)`;

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await query(stmt);
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

module.exports = { query, transaction, ensureSchema, setDriver: fn => { driver = fn; ready = null; } };
