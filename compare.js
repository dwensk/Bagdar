/* Bagdar — сравнение вузов для перевода.
   Студент указывает свой вуз и до трёх вузов, куда думает перевестись,
   и видит, где доучиться выйдет дешевле.
   Общие функции (список вузов, форматирование денег и т. д.) приходят из app.js через объект B. */
window.Compare = (() => {
  const MAX = 3; // сколько вузов можно сравнить за раз

  const TEXTS = {
    ru: { title: 'Сравнение вузов', lead: 'Сравни до трёх вузов для перевода сразу. Цены подставятся из базы — поправь их по договору.',
          mine: 'Мой вуз', target: 'Вариант', price: 'Стоимость за год, ₸', done: 'Освоено кредитов', acc: 'Перезачтут в новом вузе', btn: 'Сравнить',
          uni: 'Вуз', left: 'Осталось заплатить', diff: 'Разница', stay: 'Остаться', e_mine: 'Укажи свой вуз и его стоимость.', e_none: 'Добавь хотя бы один вариант с ценой.', e_done: 'Кредиты: от 0 до 239.',
          best: 'Самый выгодный', stay_best: 'Выгоднее всего остаться в своём вузе', go_best: 'Выгоднее всего перевестись в' },
    kz: { title: 'ЖОО салыстыру', lead: 'Ауысуға үш ЖОО-ны бірден салыстыр. Бағалар базадан қойылады — келісімшарт бойынша түзет.',
          mine: 'Менің ЖОО-м', target: 'Нұсқа', price: 'Жылдық құны, ₸', done: 'Игерілген кредиттер', acc: 'Жаңа ЖОО-да қайта есептеледі', btn: 'Салыстыру',
          uni: 'ЖОО', left: 'Төлеу қалды', diff: 'Айырма', stay: 'Қалу', e_mine: 'Өз ЖОО-ңды және құнын көрсет.', e_none: 'Бағасы бар кемінде бір нұсқа қос.', e_done: 'Кредиттер: 0-ден 239-ға дейін.',
          best: 'Ең тиімді', stay_best: 'Өз ЖОО-ңда қалған тиімді', go_best: 'Ең тиімдісі — мына ЖОО-ға ауысу:' }
  };
  const t = k => TEXTS[document.documentElement.lang === 'kk' ? 'kz' : 'ru'][k];

  // поле «вуз + цена»; n — номер поля (0 — мой вуз, 1..MAX — варианты)
  const uniField = (n, label) => `<div class="side-box${n ? ' to' : ''}">
    <label for="cu${n}">${label}</label>
    <input class="input" id="cu${n}" list="cmp-list" autocomplete="off" placeholder="ЮКУ, КазНУ, AITU…">
    <label for="cp${n}" class="hint" style="font-weight:600;color:var(--fg)">${t('price')}</label>
    <input class="input" id="cp${n}" type="number" min="0" step="10000" inputmode="numeric"></div>`;

  function view(B) {
    const opts = B.U.map(u => `<option value="${B.esc(B.uniLabel(u))}">${B.esc((u.abbr || []).slice(0, 3).join(', '))}</option>`).join('');
    const targets = Array.from({ length: MAX }, (_, i) => uniField(i + 1, `${t('target')} ${i + 1}`)).join('');
    return `<section class="panel glass rv"><p class="muted" style="margin-bottom:16px">${t('lead')}</p>
      <datalist id="cmp-list">${opts}</datalist>
      <div class="grid2">${uniField(0, t('mine'))}
        <div class="side-box"><label for="cdone">${t('done')}</label><input class="input" id="cdone" type="number" min="0" max="239" value="60">
          <label for="cacc">${t('acc')}</label><input class="input" id="cacc" type="number" min="0" max="239" value="60"></div></div>
      <div class="grid2" style="margin-top:16px">${targets}</div>
      <button class="btn btn-accent" id="cmp-btn" style="margin-top:16px">${t('btn')}</button>
      <p class="err" id="cmp-err" role="alert"></p></section>
      <section id="cmp-res" aria-live="polite"></section>`;
  }

  function bind(B) {
    // при выборе вуза подставляем его цену из базы
    for (let n = 0; n <= MAX; n++) {
      document.getElementById('cu' + n).addEventListener('input', e => {
        const u = B.findUni(e.target.value);
        const price = B.tuition(u);
        if (price) document.getElementById('cp' + n).value = price;
      });
    }
    document.getElementById('cmp-btn').onclick = () => calc(B);
  }

  // та же формула, что в калькуляторе перевода:
  // цена кредита = стоимость за год ÷ 60 (240 кредитов за 4 года)
  const left = (price, credits) => (240 - credits) * price / 60;

  function calc(B) {
    const $ = id => document.getElementById(id);
    const err = $('cmp-err'); err.textContent = '';
    const done = parseInt($('cdone').value);
    const acc = Math.min(parseInt($('cacc').value) || 0, done); // перезачесть больше освоенного нельзя
    const mine = { name: $('cu0').value.trim(), price: +$('cp0').value };
    if (!mine.name || !(mine.price > 0)) { err.textContent = t('e_mine'); return; }
    if (isNaN(done) || done < 0 || done > 239) { err.textContent = t('e_done'); return; }

    // собираем заполненные варианты
    const options = [];
    for (let n = 1; n <= MAX; n++) {
      const name = $('cu' + n).value.trim(), price = +$('cp' + n).value;
      if (name && price > 0) options.push({ name, price, cost: left(price, acc) });
    }
    if (!options.length) { err.textContent = t('e_none'); return; }

    const stay = left(mine.price, done);
    render(B, stay, options);
  }

  function render(B, stay, options) {
    // все варианты вместе с «остаться», от дешёвого к дорогому
    const all = [{ name: t('stay') + ': ' + document.getElementById('cu0').value, cost: stay, isStay: true }, ...options]
      .sort((a, b) => a.cost - b.cost);
    const best = all[0]; // самый дешёвый вариант
    const verdict = best.isStay
      ? `<div class="verdict v-bad"><div class="big">${t('stay_best')}</div></div>`
      : `<div class="verdict v-good"><div class="big">${t('go_best')} ${B.esc(best.name)}</div><p>−${B.money(stay - best.cost)}</p></div>`;
    const rows = all.map(o => {
      const d = o.cost - stay;
      const diff = o.isStay ? '—' : `${d > 0 ? '+' : '−'}${B.money(Math.abs(d))}`;
      const badge = o === best ? ` <span class="badge b-ok">${t('best')}</span>` : '';
      return `<tr${o === best ? ' style="background:var(--ok-bg)"' : ''}><td>${B.esc(o.name)}${badge}</td><td class="r"><b>${B.money(o.cost)}</b></td><td class="r">${diff}</td></tr>`;
    }).join('');
    document.getElementById('cmp-res').innerHTML = `<div class="panel glass">${verdict}<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>${t('uni')}</th><th class="r">${t('left')}</th><th class="r">${t('diff')}</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  return { t, view, bind };
})();
