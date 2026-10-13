/* Bagdar — история расчётов перевода.
   Расчёты хранятся на сервере, в таблице history базы PostgreSQL (см. api/history.js).
   Здесь — копия списка для отрисовки и вызовы API. */
window.History = (() => {
  const MAX = 50; // сколько последних расчётов храним на одного пользователя

  // тексты этой функции на двух языках
  const TEXTS = {
    ru: { save: 'Сохранить расчёт', saved: 'Расчёт сохранён в аккаунте', title: 'Мои расчёты', empty: 'Сохранённых расчётов пока нет. Посчитай перевод и нажми «Сохранить расчёт».',
          date: 'Дата', route: 'Откуда → куда', credits: 'Кредиты', stay: 'Остаться', go: 'Перевестись', result: 'Итог', cheaper: 'выгоднее на', dearer: 'дороже на', del: 'Удалить' },
    kz: { save: 'Есепті сақтау', saved: 'Есеп аккаунтта сақталды', title: 'Менің есептерім', empty: 'Сақталған есеп әзірге жоқ. Ауысуды есептеп, «Есепті сақтау» батырмасын бас.',
          date: 'Күні', route: 'Қайдан → қайда', credits: 'Кредиттер', stay: 'Қалу', go: 'Ауысу', result: 'Қорытынды', cheaper: 'арзан:', dearer: 'қымбат:', del: 'Жою' }
  };
  // язык берём из <html lang>: app.js ставит 'kk' для казахского
  const t = k => TEXTS[document.documentElement.lang === 'kk' ? 'kz' : 'ru'][k];

  // копия расчётов текущего пользователя; приходит с сервера в /api/me (Store.init)
  let items = [];
  const setAll = list => { items = (list || []).slice(0, MAX); };

  // все расчёты текущего пользователя, новые сверху
  const list = () => items;

  // сохранить расчёт на сервере; calc = { from, to, p1, p2, done, acc, stay, go }
  async function save(calc) {
    if (!window.Store.me()) return false;
    const d = await window.Store.api('/api/history', { method: 'POST', body: calc });
    items.unshift(d.item);
    items = items.slice(0, MAX); // старые сверх лимита отбрасываем
    return true;
  }

  // удалить один расчёт по его id
  async function remove(itemId) {
    items = items.filter(x => x.id !== itemId);
    await window.Store.api('/api/history?id=' + encodeURIComponent(itemId), { method: 'DELETE' });
  }

  // HTML-блок «Мои расчёты» для страницы аккаунта.
  // money и esc передаёт app.js: форматирование суммы и защита от HTML в названиях.
  function render(money, esc) {
    const items = list();
    const body = items.length ? `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${t('date')}</th><th>${t('route')}</th><th class="r">${t('credits')}</th><th class="r">${t('stay')}</th><th class="r">${t('go')}</th><th>${t('result')}</th><th></th></tr></thead>
      <tbody>${items.map(x => {
        const d = x.go - x.stay; // > 0 — перевод дороже, < 0 — выгоднее
        const res = d < 0
          ? `<span class="badge b-ok">${t('cheaper')} ${money(-d)}</span>`
          : `<span class="badge b-bad">${t('dearer')} ${money(d)}</span>`;
        return `<tr><td>${new Date(x.at).toLocaleDateString('ru-RU')}</td><td>${esc(x.from)} → ${esc(x.to)}</td><td class="r">${x.done} / ${x.acc}</td>
          <td class="r">${money(x.stay)}</td><td class="r">${money(x.go)}</td><td>${res}</td>
          <td><button class="btn btn-danger btn-sm" data-hdel="${esc(x.id)}">${t('del')}</button></td></tr>`;
      }).join('')}</tbody></table></div>` : `<p class="muted">${t('empty')}</p>`;
    return `<section class="panel glass rv"><h2>${t('title')}</h2><div id="hist-box">${body}</div></section>`;
  }

  // кнопка «Удалить»: один обработчик на весь документ, потому что таблица перерисовывается
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-hdel]');
    if (!b) return;
    remove(b.dataset.hdel).catch(() => {});
    b.closest('tr').remove();
    if (!list().length) document.getElementById('hist-box').innerHTML = `<p class="muted">${t('empty')}</p>`;
  });

  return { t, list, setAll, save, remove, render };
})();
