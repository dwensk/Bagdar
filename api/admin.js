// /api/admin — только для администраторов.
// GET — пользователи, оплаты и статистика. POST { action, id } — grant | revoke | block | delete.
const { query } = require('../lib/db');
const { DAY, send, body, pub, requireUser, handler } = require('../lib/http');
const { payment } = require('./me');
const CFG = require('../lib/config');

async function overview() {
  const [us, ps] = await Promise.all([
    query('SELECT * FROM users ORDER BY created_at DESC'),
    query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 500')
  ]);
  const users = us.rows.map(pub), payments = ps.rows.map(payment), now = Date.now();
  return {
    users, payments,
    stats: {
      users: users.filter(u => u.role === 'user').length,
      active: users.filter(u => u.role === 'user' && u.paidUntil > now).length,
      revenue: payments.filter(p => p.createdAt > now - 30 * DAY).reduce((s, p) => s + p.amount, 0),
      admins: users.filter(u => u.role === 'admin').length
    }
  };
}

module.exports = handler(async (req, res) => {
  const me = await requireUser(req, res, 'admin');
  if (!me) return;

  if (req.method === 'POST') {
    const { action, id } = await body(req);
    if (id === me.id) return send(res, 400, { error: 'e_self' }); // себя блокировать и удалять нельзя
    if (action === 'grant')
      await query('UPDATE users SET paid_until = GREATEST(paid_until, $1) + $2 WHERE id = $3', [Date.now(), CFG.PERIOD_DAYS * DAY, id]);
    else if (action === 'revoke') await query('UPDATE users SET paid_until = 0 WHERE id = $1', [id]);
    else if (action === 'block') {
      await query('UPDATE users SET blocked = NOT blocked WHERE id = $1', [id]);
      await query('DELETE FROM sessions WHERE user_id = $1', [id]); // заблокированного сразу выкидывает из аккаунта
    }
    else if (action === 'delete') await query('DELETE FROM users WHERE id = $1', [id]);
    else return send(res, 400, { error: 'e_action' });
  }

  send(res, 200, await overview());
});
