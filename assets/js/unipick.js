/* Bagdar — выбор вуза из выпадающего списка с поиском.
   Заменяет стандартный <datalist>, который плохо работает на телефонах (особенно iPhone).
   Использование: UniPick.attach(input) — при выборе в поле ставится название вуза
   и срабатывает событие 'input', поэтому остальной код (подстановка цены) работает как раньше. */
window.UniPick = (() => {
  const MAX_ITEMS = 60; // сколько вариантов показывать за раз
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const kz = () => document.documentElement.lang === 'kk';
  const TEXT = { ru: { none: 'Ничего не найдено', ver: 'цена проверена' }, kz: { none: 'Ештеңе табылмады', ver: 'баға тексерілген' } };
  const tx = k => TEXT[kz() ? 'kz' : 'ru'][k];

  // по чему ищем: короткое и полное название на двух языках, сокращения, город
  const hay = u => norm([u.name.ru, u.name.kz, u.full && u.full.ru, u.full && u.full.kz, (u.abbr || []).join(' '), u.city].join(' '));

  function attach(input) {
    const B = window.Bagdar;
    if (!B || input.dataset.upick) return;
    input.dataset.upick = '1';
    input.removeAttribute('list');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const wrap = document.createElement('div');
    wrap.className = 'upick';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const list = document.createElement('ul');
    list.className = 'upick-list glass';
    list.id = input.id + '-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.appendChild(list);
    input.setAttribute('aria-controls', list.id);

    let items = [], active = -1;
    const sorted = () => [...B.U].sort((a, b) => B.uniLabel(a).localeCompare(B.uniLabel(b), 'ru'));

    function render() {
      const words = norm(input.value).split(/\s+/).filter(Boolean);
      // если в поле уже выбранный вуз — показываем весь список, чтобы можно было сменить
      const all = sorted();
      const q = norm(input.value).trim();
      // сначала самые точные совпадения: сокращение целиком → название с начала → остальное
      const rank = u => (u.abbr || []).some(a => norm(a) === q) ? 0 : norm(u.name.ru).startsWith(q) || norm(u.name.kz).startsWith(q) ? 1 : (u.abbr || []).some(a => norm(a).startsWith(q)) ? 2 : 3;
      items = (B.findUni(input.value) || !q ? all : all.filter(u => { const h = hay(u); return words.every(w => h.includes(w)); }).sort((a, b) => rank(a) - rank(b))).slice(0, MAX_ITEMS);
      active = -1;
      list.innerHTML = items.length
        ? items.map((u, i) => `<li role="option" id="${list.id}-${i}" data-i="${i}"><b>${B.esc(kz() ? u.name.kz : u.name.ru)}</b><small>${B.esc(u.city)}${u.price ? ` · <span class="upick-ver">${tx('ver')}</span>` : ''}</small></li>`).join('')
        : `<li class="upick-none">${tx('none')}</li>`;
      open(true);
    }
    function open(v) {
      list.hidden = !v;
      input.setAttribute('aria-expanded', String(v));
      if (!v) input.removeAttribute('aria-activedescendant');
    }
    function choose(i) {
      const u = items[i]; if (!u) return;
      input.value = B.uniLabel(u);
      open(false);
      input.dispatchEvent(new Event('input', { bubbles: true })); // чтобы подставилась цена
      input.removeAttribute('aria-invalid');
    }
    function move(d) {
      if (list.hidden) render();
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      [...list.children].forEach((li, i) => li.classList.toggle('on', i === active));
      const li = list.children[active];
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('focus', () => {
      render();
      // на телефоне поднимаем поле повыше, чтобы список не закрывала клавиатура
      if (window.innerWidth < 760) setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    });
    input.addEventListener('input', e => { if (e.isTrusted) render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') open(false);
    });
    // mousedown не даёт полю потерять фокус на компьютере; выбор — по click,
    // чтобы на телефоне прокрутка списка пальцем не выбирала вуз случайно
    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
    // закрываем, только если нажали или перешли куда-то вне поля и списка
    // (не по blur: на телефоне прокрутка списка пальцем снимает фокус с поля)
    const outside = e => { if (!wrap.isConnected) { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); return; } if (!wrap.contains(e.target)) open(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
  }

  return { attach };
})();
