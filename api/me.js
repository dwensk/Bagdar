// GET /api/me — всё о вошедшем пользователе одним запросом: профиль, оплаты, история, чек-листы.
const { query } = require('../lib/db');
const { send, requireUser, handler } = require('../lib/http');

const payment = r => ({ id: r.id, userId: r.user_id, email: r.email, amount: r.amount, method: r.method, status: r.status, note: r.note || '', createdAt: Number(r.created_at) });

module.exports = handler(async (req, res) => {
  const u = await requireUser(req, res);
  if (!u) return;
  const [pays, hist, checks] = await Promise.all([
    query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [u.id]),
    query('SELECT * FROM history WHERE user_id = $1 ORDER BY created_at DESC', [u.id]),
    query('SELECT list, item, done FROM checks WHERE user_id = $1', [u.id])
  ]);
  const ch = {};
  for (const r of checks.rows) (ch[r.list] = ch[r.list] || {})[r.item] = r.done;
  send(res, 200, {
    user: u,
    payments: pays.rows.map(payment),
    history: hist.rows.map(r => ({ ...r.data, id: r.id, at: Number(r.created_at) })),
    checks: ch
  });
});
module.exports.payment = payment;
