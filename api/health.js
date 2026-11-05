// GET /api/health — проверка, что сервер и база работают. Удобно показать на защите.
const { query } = require('../lib/db');
const { send, handler } = require('../lib/http');
const { mailConfigured } = require('../lib/mail');

module.exports = handler(async (req, res) => {
  const { rows } = await query('SELECT COUNT(*)::int AS users FROM users');
  send(res, 200, { ok: true, server: 'Bagdar API', database: 'PostgreSQL (Neon)', users: rows[0].users,
    emailVerification:true, mailConfigured:mailConfigured(), time: new Date().toISOString() });
});
