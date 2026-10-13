// POST /api/pay — оформить подписку Pro (демо-оплата: деньги не списываются).
// Сумму и срок берёт сервер из lib/config.js, а не из браузера — подменить их нельзя.
const { query } = require('../lib/db');
const { DAY, send, body, newId, pub, requireUser, handler } = require('../lib/http');
const CFG = require('../lib/config');

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'e_method' });
  const u = await requireUser(req, res);
  if (!u) return;
  const b = await body(req);
  const method = b.method === 'card' ? 'card' : 'kaspi';

  // подписка продлевается от текущей даты окончания, если она ещё не прошла
  const until = Math.max(Date.now(), u.paidUntil) + CFG.PERIOD_DAYS * DAY;
  const { rows } = await query('UPDATE users SET paid_until = $1 WHERE id = $2 RETURNING *', [until, u.id]);
  const p = { id: newId(), userId: u.id, email: u.email, amount: CFG.PRICE_KZT, method, status: 'demo', createdAt: Date.now() };
  await query('INSERT INTO payments (id, user_id, email, amount, method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [p.id, p.userId, p.email, p.amount, p.method, p.status, p.createdAt]);
  send(res, 200, { user: pub(rows[0]), payment: p });
});
