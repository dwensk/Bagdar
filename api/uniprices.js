// GET /api/uniprices?uni=<id> — стоимость обучения по программам бакалавриата в вузе,
// разложенная по направлениям (6B01 педагогика, 6B06 IT и т.д.). Источник — univision.kz.
// Данные лежат в таблице uni_prices; при первом запросе туда загружается lib/uniprices.js.
const { query } = require('../lib/db');
const { send, handler } = require('../lib/http');
const DATA = require('../lib/uniprices');

let seeded = false;
async function seed() {
  if (seeded) return;
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM uni_prices');
  const total = Object.values(DATA).reduce((s, d) => s + d.rows.length, 0);
  if (rows[0].n !== total) { // данные поменялись — перезаливаем таблицу
    await query('DELETE FROM uni_prices');
    const all = Object.entries(DATA).flatMap(([id, d]) => d.rows.map(r => [+id, r[0], r[1], r[2]]));
    for (let i = 0; i < all.length; i += 400) { // вставляем пачками по 400 строк
      const part = all.slice(i, i + 400);
      await query(`INSERT INTO uni_prices (uni_id, code, name, price) VALUES ${part.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(', ')} ON CONFLICT DO NOTHING`, part.flat());
    }
  }
  seeded = true;
}

module.exports = handler(async (req, res) => {
  await seed();
  const uni = parseInt(new URL(req.url, 'http://x').searchParams.get('uni'));
  if (!uni) return send(res, 400, { error: 'e_uni' });
  const { rows } = await query('SELECT code, name, price FROM uni_prices WHERE uni_id = $1 ORDER BY code, price', [uni]);
  // группируем по направлению: первые 4 символа кода (6B01, 6B06…)
  const areas = {};
  for (const r of rows) {
    const a = (areas[r.code.slice(0, 4)] = areas[r.code.slice(0, 4)] || { area: r.code.slice(0, 4), min: r.price, max: r.price, items: [] });
    a.min = Math.min(a.min, r.price); a.max = Math.max(a.max, r.price);
    a.items.push({ code: r.code, name: r.name, price: r.price });
  }
  send(res, 200, { uni, source: (DATA[uni] || {}).url || null, count: rows.length, areas: Object.values(areas) });
});
