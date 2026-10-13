// Bagdar — общие функции для API: ответы, чтение запроса, пароли, вход.
const crypto = require('crypto');
const { query, ensureSchema } = require('./db');

const DAY = 864e5;

// отправить JSON-ответ
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

// тело запроса как объект (Vercel обычно уже разбирает JSON сам)
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { return {}; }
}

const newId = () => crypto.randomUUID();

// пароль: scrypt + случайная соль; в базе только хеш, сам пароль не хранится
const hashPassword = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const makeSalt = () => crypto.randomBytes(16).toString('hex');
function checkPassword(pw, salt, hash) {
  const a = Buffer.from(hashPassword(pw, salt), 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// токен входа: пользователю отдаём сам токен, в базе храним только его SHA-256
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
async function createSession(userId, days) {
  const token = crypto.randomBytes(32).toString('hex');
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [sha(token), userId, Date.now() + days * DAY]);
  return token;
}

// строка из базы → объект пользователя для сайта (без соли и хеша)
const pub = r => r && ({
  id: r.id, name: r.name, email: r.email, role: r.role,
  createdAt: Number(r.created_at), paidUntil: Number(r.paid_until), blocked: !!r.blocked
});

// кто делает запрос: ищем токен из заголовка Authorization: Bearer <токен>
async function currentUser(req) {
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  const { rows } = await query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2`, [sha(m[1]), Date.now()]);
  const u = rows[0];
  return u && !u.blocked ? pub(u) : null;
}

// обёртка для каждого эндпоинта: создаёт таблицы, ловит ошибки
const handler = fn => async (req, res) => {
  try {
    await ensureSchema();
    await fn(req, res);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'e_generic' });
  }
};

// пускать только вошедших (и, если нужно, только админов)
async function requireUser(req, res, role) {
  const u = await currentUser(req);
  if (!u) { send(res, 401, { error: 'e_auth' }); return null; }
  if (role && u.role !== role) { send(res, 403, { error: 'e_forbidden' }); return null; }
  return u;
}

module.exports = { DAY, send, body, newId, hashPassword, makeSalt, checkPassword, sha, createSession, pub, currentUser, requireUser, handler };
