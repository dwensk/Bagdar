// POST /api/pay — заявка на оплату подписки Pro переводом на Kaspi.
// Пользователь переводит деньги и указывает имя отправителя; заявка ждёт, пока админ сверит перевод
// и подтвердит его в админ-панели (api/admin.js, action: confirm). Только после этого включается подписка.
// Сумму берёт сервер из lib/config.js, а не из браузера — подменить её нельзя.
const { query } = require('../lib/db');
const { send, body, newId, requireUser, handler } = require('../lib/http');
const { payment } = require('./me');
const CFG = require('../lib/config');

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'e_method' });
  const u = await requireUser(req, res);
  if (!u) return;
  const b = await body(req);
  const sender = String(b.sender || '').trim().slice(0, 80);
  if (sender.length < 2) return send(res, 400, { error: 'kp_e_sender' });

  // одна открытая заявка на пользователя: если уже есть — обновляем имя отправителя
  const open = await query(`SELECT * FROM payments WHERE user_id = $1 AND status = 'pending'`, [u.id]);
  if (open.rows.length) {
    const { rows } = await query('UPDATE payments SET note = $1 WHERE id = $2 RETURNING *', [sender, open.rows[0].id]);
    return send(res, 200, { payment: payment(rows[0]) });
  }
  const { rows } = await query(
    `INSERT INTO payments (id, user_id, email, amount, method, status, created_at, note)
     VALUES ($1, $2, $3, $4, 'kaspi', 'pending', $5, $6) RETURNING *`,
    [newId(), u.id, u.email, CFG.PRICE_KZT, Date.now(), sender]);
  send(res, 201, { payment: payment(rows[0]) });
});
