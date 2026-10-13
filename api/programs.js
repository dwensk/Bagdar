// GET /api/programs?pair=fiz-mat&score=95&sort=salary&grant=1
// Специальности по паре предметов ЕНТ: мин. балл на грант, зарплата, трудоустройство, число вузов.
// Данные лежат в таблице programs; при первом запросе туда загружается lib/programs.js (источник: joo.kz).
const { query } = require('../lib/db');
const { send, handler } = require('../lib/http');
const PAIRS = require('../lib/programs');

let seeded = false;
async function seed() {
  if (seeded) return;
  const rows = PAIRS.flatMap(p => p.items.map(r => [r[0], p.id, p.kz, p.ru, r[1], r[2], r[3], r[4], r[5], r[6]]));
  const values = rows.map((_, i) => `(${Array.from({ length: 10 }, (_, j) => '$' + (i * 10 + j + 1)).join(', ')})`).join(', ');
  await query(`INSERT INTO programs (code, pair, pair_kz, pair_ru, name_kz, name_ru, min_score, salary, employment, unis)
    VALUES ${values}
    ON CONFLICT (pair, code) DO UPDATE SET name_kz = EXCLUDED.name_kz, name_ru = EXCLUDED.name_ru, min_score = EXCLUDED.min_score,
      salary = EXCLUDED.salary, employment = EXCLUDED.employment, unis = EXCLUDED.unis`, rows.flat());
  seeded = true;
}

// сортировка — только из белого списка, чтобы в SQL нельзя было подставить своё
const SORT = { salary: 'salary DESC NULLS LAST', employment: 'employment DESC NULLS LAST', unis: 'unis DESC NULLS LAST', score: 'min_score ASC NULLS LAST' };

module.exports = handler(async (req, res) => {
  await seed();
  const q = new URL(req.url, 'http://x').searchParams;
  const pair = q.get('pair') || '';
  const score = q.get('score') === null || q.get('score') === '' ? null : Math.max(0, Math.min(140, parseInt(q.get('score')) || 0));
  const onlyGrant = q.get('grant') === '1' && score !== null;

  const order = PAIRS.map(p => p.id); // пары в том же порядке, что на joo.kz
  const pairs = (await query(`SELECT pair AS id, pair_kz AS kz, pair_ru AS ru, COUNT(*)::int AS count
    FROM programs GROUP BY pair, pair_kz, pair_ru`)).rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const where = ['pair = $1'], params = [pair];
  if (onlyGrant) { params.push(score); where.push(`min_score IS NOT NULL AND min_score <= $${params.length}`); }
  const { rows } = await query(`SELECT code, name_kz, name_ru, min_score, salary, employment, unis FROM programs
    WHERE ${where.join(' AND ')} ORDER BY ${SORT[q.get('sort')] || SORT.salary}, code`, params);

  send(res, 200, {
    source: 'joo.kz',
    pairs,
    items: rows.map(r => ({
      code: r.code, kz: r.name_kz, ru: r.name_ru, minScore: r.min_score, salary: r.salary, employment: r.employment, unis: r.unis,
      grant: score !== null && r.min_score !== null ? score >= r.min_score : null // хватает ли балла на грантовый конкурс
    }))
  });
});
