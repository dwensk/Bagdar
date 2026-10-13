/* Bagdar — специальности по парам предметов ЕНТ.
   Данные приходят с сервера: GET /api/programs (таблица programs в базе, источник — joo.kz).
   Пользователь выбирает пару предметов и свой балл, сервер фильтрует и сортирует. */
window.Programs = (() => {
  const TEXTS = {
    ru: { title: 'Специальности', lead: 'Выбери пару профильных предметов и свой балл ЕНТ — покажем специальности, порог на грант, зарплаты и трудоустройство.',
          pair: 'Пара предметов', score: 'Мой балл ЕНТ (необязательно)', sort: 'Сортировать', only: 'Только где хватает балла на грант', btn: 'Показать',
          s_salary: 'по зарплате', s_employment: 'по трудоустройству', s_unis: 'по числу вузов', s_score: 'по порогу на грант',
          code: 'Код', name: 'Специальность', min: 'Порог на грант', salary: 'Зарплата', emp: 'Трудоустройство', unis: 'Вузов',
          yes: 'хватает', no: 'не хватает', found: 'Найдено', none: 'По этим условиям ничего не нашлось.', src: 'Источник данных: joo.kz', err: 'Не удалось загрузить данные. Проверь интернет.' },
    kz: { title: 'Мамандықтар', lead: 'Бейіндік пәндер жұбын және ҰБТ балыңды таңда — мамандықтарды, грант шегін, жалақы мен жұмысқа орналасуды көрсетеміз.',
          pair: 'Пәндер жұбы', score: 'Менің ҰБТ балым (міндетті емес)', sort: 'Сұрыптау', only: 'Тек грантқа балым жететіндер', btn: 'Көрсету',
          s_salary: 'жалақы бойынша', s_employment: 'жұмысқа орналасу бойынша', s_unis: 'ЖОО саны бойынша', s_score: 'грант шегі бойынша',
          code: 'Код', name: 'Мамандық', min: 'Грант шегі', salary: 'Жалақы', emp: 'Жұмысқа орналасу', unis: 'ЖОО',
          yes: 'жетеді', no: 'жетпейді', found: 'Табылды', none: 'Бұл шарттар бойынша ештеңе табылмады.', src: 'Дерек көзі: joo.kz', err: 'Деректерді жүктеу мүмкін болмады. Интернетті тексер.' }
  };
  const isKz = () => document.documentElement.lang === 'kk';
  const t = k => TEXTS[isKz() ? 'kz' : 'ru'][k];

  let pairs = []; // список пар с сервера, загружается один раз

  function view() {
    return `<section class="panel glass rv"><p class="muted" style="margin-bottom:16px">${t('lead')}</p>
      <div class="grid2">
        <div class="field"><label for="pg-pair">${t('pair')}</label><select class="input" id="pg-pair"><option value="fiz-mat">…</option></select></div>
        <div class="field"><label for="pg-score">${t('score')}</label><input class="input" id="pg-score" type="number" min="0" max="140" inputmode="numeric" placeholder="0–140"></div>
        <div class="field"><label for="pg-sort">${t('sort')}</label><select class="input" id="pg-sort">
          ${['salary', 'employment', 'unis', 'score'].map(s => `<option value="${s}">${t('s_' + s)}</option>`).join('')}</select></div>
        <div class="field" style="justify-content:end"><label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" id="pg-only"> ${t('only')}</label></div>
      </div>
      <button class="btn btn-accent" id="pg-btn" style="margin-top:16px">${t('btn')}</button></section>
      <section id="pg-res" aria-live="polite"></section>`;
  }

  // запрос к серверу и таблица результатов
  async function load(B) {
    const pair = document.getElementById('pg-pair').value, score = document.getElementById('pg-score').value.trim();
    const qs = new URLSearchParams({ pair, sort: document.getElementById('pg-sort').value });
    if (score !== '') qs.set('score', score);
    if (document.getElementById('pg-only').checked) qs.set('grant', '1');
    const box = document.getElementById('pg-res');
    box.innerHTML = '<p class="hint" style="margin-left:6px"><span class="spinner"></span></p>';
    let d;
    try { d = await window.Store.api('/api/programs?' + qs); } catch (e) { box.innerHTML = `<p class="panel glass">${t('err')}</p>`; return; }
    if (!pairs.length) fillPairs(d.pairs, pair);
    const money = v => (v == null ? '—' : B.money(v));
    box.innerHTML = `<p class="hint" style="margin:0 0 10px 6px">${t('found')}: ${d.items.length}</p>` + (d.items.length ? `<section class="panel glass"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${t('code')}</th><th>${t('name')}</th><th class="r">${t('min')}</th><th class="r">${t('salary')}</th><th class="r">${t('emp')}</th><th class="r">${t('unis')}</th></tr></thead>
      <tbody>${d.items.map(x => `<tr><td>${B.esc(x.code)}</td><td><b>${B.esc(isKz() ? x.kz : x.ru)}</b></td>
        <td class="r">${x.minScore ?? '—'}${x.grant === null ? '' : ` <span class="badge ${x.grant ? 'b-ok' : 'b-bad'}">${x.grant ? t('yes') : t('no')}</span>`}</td>
        <td class="r">${money(x.salary)}</td><td class="r">${x.employment == null ? '—' : x.employment + '%'}</td><td class="r">${x.unis ?? '—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint" style="margin-top:10px">${t('src')}</p></section>` : `<p class="panel glass">${t('none')}</p>`);
  }

  function fillPairs(list, selected) {
    pairs = list;
    const sel = document.getElementById('pg-pair');
    if (sel) sel.innerHTML = pairs.map(p => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${isKz() ? p.kz : p.ru} (${p.count})</option>`).join('');
  }

  function bind(B) {
    if (pairs.length) fillPairs(pairs, pairs[0].id);
    document.getElementById('pg-btn').onclick = () => load(B);
    ['pg-pair', 'pg-sort', 'pg-only'].forEach(id => document.getElementById(id).onchange = () => load(B));
    load(B); // сразу показать первую пару
  }

  return { t, view, bind };
})();
