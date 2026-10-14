// /api/admin — только для администраторов.
// GET — пользователи, оплаты и статистика.
// POST { action, id } — для пользователя: grant | revoke | block | delete | reset (новый пароль);
//   для заявки на оплату: confirm | reject; create { name, email, days } — админ сам создаёт аккаунт.
const { query } = require('../lib/db');
const { DAY, send, body, pub, requireUser, handler, newId, hashPassword, makeSalt, tempPassword, validEmail } = require('../lib/http');
const { payment } = require('./me');
const CFG = require('../lib/config');

async function overview() {
  const [us, ps] = await Promise.all([
    query('SELECT * FROM users ORDER BY created_at DESC'),
    query(`SELECT * FROM payments ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 500`)
  ]);
  const users = us.rows.map(pub), payments = ps.rows.map(payment), now = Date.now();
  return {
    users, payments,
    stats: {
      users: users.filter(u => u.role === 'user').length,
      active: users.filter(u => u.role === 'user' && u.paidUntil > now).length,
      revenue: payments.filter(p => p.status !== 'pending' && p.status !== 'rejected' && p.createdAt > now - 30 * DAY).reduce((s, p) => s + p.amount, 0),
      pending: payments.filter(p => p.status === 'pending').length,
      admins: users.filter(u => u.role === 'admin').length
    }
  };
}

module.exports = handler(async (req, res) => {
  const me = await requireUser(req, res, 'admin');
  if (!me) return;

  if (req.method === 'POST') {
    const b = await body(req), { action, id } = b;
    if (action === 'create') {
      // ручное добавление клиента: админ вводит имя и e-mail, сервер придумывает временный пароль
      const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase(), errs = {};
      if (name.length < 2 || name.length > 60) errs.name = 'e_name';
      if (!validEmail(email)) errs.email = 'e_email';
      else if ((await query('SELECT 1 FROM users WHERE email = $1', [email])).rows.length) errs.email = 'e_taken';
      if (Object.keys(errs).length) return send(res, 400, { errs });
      const password = tempPassword(), salt = makeSalt(), now = Date.now();
      await query(`INSERT INTO users (id, name, email, role, salt, hash, created_at, paid_until) VALUES ($1, $2, $3, 'user', $4, $5, $6, $7)`,
        [newId(), name, email, salt, hashPassword(password, salt), now, b.days ? now + CFG.PERIOD_DAYS * DAY : 0]);
      return send(res, 201, { ...(await overview()), created: { email, password } }); // пароль показываем один раз
    }
    if (action === 'confirm' || action === 'reject') {
      // заявка на оплату: подтверждаем только ту, что ещё ждёт
      const { rows } = await query(`UPDATE payments SET status = $1 WHERE id = $2 AND status = 'pending' RETURNING *`,
        [action === 'confirm' ? 'paid' : 'rejected', id]);
      if (rows[0] && action === 'confirm' && rows[0].user_id) // подписка: от сегодня или от конца текущей
        await query('UPDATE users SET paid_until = GREATEST(paid_until, $1) + $2 WHERE id = $3', [Date.now(), CFG.PERIOD_DAYS * DAY, rows[0].user_id]);
      return send(res, 200, await overview());
    }
    if (id === me.id) return send(res, 400, { error: 'e_self' }); // себя блокировать и удалять нельзя
    if (action === 'grant')
      await query('UPDATE users SET paid_until = GREATEST(paid_until, $1) + $2 WHERE id = $3', [Date.now(), CFG.PERIOD_DAYS * DAY, id]);
    else if (action === 'revoke') await query('UPDATE users SET paid_until = 0 WHERE id = $1', [id]);
    else if (action === 'block') {
      await query('UPDATE users SET blocked = NOT blocked WHERE id = $1', [id]);
      await query('DELETE FROM sessions WHERE user_id = $1', [id]); // заблокированного сразу выкидывает из аккаунта
    }
    else if (action === 'delete') await query('DELETE FROM users WHERE id = $1', [id]);
    else if (action === 'reset') { // забыл пароль: выдаём новый временный, старые входы закрываем
      const password = tempPassword(), salt = makeSalt();
      const { rows } = await query('UPDATE users SET salt = $1, hash = $2 WHERE id = $3 RETURNING email', [salt, hashPassword(password, salt), id]);
      await query('DELETE FROM sessions WHERE user_id = $1', [id]);
      if (rows[0]) return send(res, 200, { ...(await overview()), created: { email: rows[0].email, password } });
    }
    else return send(res, 400, { error: 'e_action' });
  }

  send(res, 200, await overview());
});
