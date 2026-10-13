// POST /api/checks — отметить пункт в чек-листе документов { list, key, val }.
const { query } = require('../lib/db');
const { send, body, requireUser, handler } = require('../lib/http');

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'e_method' });
  const u = await requireUser(req, res);
  if (!u) return;
  const b = await body(req);
  const list = b.list === 'transfer' ? 'transfer' : 'admission';
  const item = String(b.key || '').slice(0, 60);
  if (!item) return send(res, 400, { error: 'e_key' });
  await query(`INSERT INTO checks (user_id, list, item, done) VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, list, item) DO UPDATE SET done = EXCLUDED.done`, [u.id, list, item, !!b.val]);
  send(res, 200, { ok: true });
});
