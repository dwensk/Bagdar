// /api/history — история расчётов перевода.
// POST — сохранить расчёт, DELETE ?id=… — удалить. Список приходит в /api/me.
const { query } = require('../lib/db');
const { send, body, newId, requireUser, handler } = require('../lib/http');
const CFG = require('../lib/config');

const num = v => (Number.isFinite(+v) ? Math.round(+v) : 0);
const str = v => String(v || '').slice(0, 200);

module.exports = handler(async (req, res) => {
  const u = await requireUser(req, res);
  if (!u) return;

  if (req.method === 'POST') {
    const b = await body(req);
    // сохраняем только нужные поля и только числа/строки — лишнее отбрасываем
    const data = { from: str(b.from), to: str(b.to), p1: num(b.p1), p2: num(b.p2), done: num(b.done), acc: num(b.acc), stay: num(b.stay), go: num(b.go) };
    const item = { id: newId(), at: Date.now() };
    await query('INSERT INTO history (id, user_id, data, created_at) VALUES ($1, $2, $3, $4)', [item.id, u.id, JSON.stringify(data), item.at]);
    // храним не больше HISTORY_MAX последних расчётов, старые удаляем
    await query(`DELETE FROM history WHERE user_id = $1 AND id NOT IN
      (SELECT id FROM history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)`, [u.id, CFG.HISTORY_MAX]);
    return send(res, 201, { item: { ...data, ...item } });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    await query('DELETE FROM history WHERE id = $1 AND user_id = $2', [id, u.id]); // чужой расчёт удалить нельзя
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'e_method' });
});
