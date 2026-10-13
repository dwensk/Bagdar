// POST /api/auth?action=register | login | logout — регистрация, вход и выход.
const { query } = require('../lib/db');
const { send, body, newId, hashPassword, makeSalt, checkPassword, sha, createSession, pub, handler } = require('../lib/http');
const CFG = require('../lib/config');

const norm = e => String(e || '').trim().toLowerCase();

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'e_method' });
  const action = new URL(req.url, 'http://x').searchParams.get('action');
  const b = await body(req);

  if (action === 'register') {
    const name = String(b.name || '').trim(), email = norm(b.email), password = String(b.password || '');
    const role = b.role === 'admin' ? 'admin' : 'user';
    // проверки на сервере: обойти их из браузера нельзя
    const errs = {};
    if (name.length < 2 || name.length > 60) errs.name = 'e_name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) errs.email = 'e_email';
    if (password.length < 8 || password.length > 200) errs.password = 'e_pw';
    if (role === 'admin' && b.code !== CFG.ADMIN_INVITE_CODE) errs.code = 'e_code';
    if (!errs.email) {
      const { rows } = await query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (rows.length) errs.email = 'e_taken';
    }
    if (Object.keys(errs).length) return send(res, 400, { errs });

    const salt = makeSalt();
    const { rows } = await query(
      `INSERT INTO users (id, name, email, role, salt, hash, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [newId(), name, email, role, salt, hashPassword(password, salt), Date.now()]);
    const token = await createSession(rows[0].id, CFG.SESSION_DAYS);
    return send(res, 201, { token, user: pub(rows[0]) });
  }

  if (action === 'login') {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [norm(b.email)]);
    const u = rows[0];
    if (!u || !checkPassword(String(b.password || ''), u.salt, u.hash)) return send(res, 400, { errs: { form: 'e_login' } });
    if (u.blocked) return send(res, 403, { errs: { form: 'e_blocked' } });
    const token = await createSession(u.id, CFG.SESSION_DAYS);
    return send(res, 200, { token, user: pub(u) });
  }

  if (action === 'logout') {
    const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
    if (m) await query('DELETE FROM sessions WHERE token_hash = $1', [sha(m[1])]);
    return send(res, 200, { ok: true });
  }

  send(res, 400, { error: 'e_action' });
});
