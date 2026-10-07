/* Bagdar — приложение: роутер, экраны, эффекты. Без фреймворков, работает на GitHub Pages. */
(() => {
'use strict';
const CFG = window.BAGDAR_CONFIG, S = window.Store, U = window.UNIS, RU = window.RULES, D = window.DOCS, PRICE_SRC = window.PRICE_SRC;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = $('#root');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = (() => { try { return localStorage.getItem('bagdar:lang') === 'kz' ? 'kz' : 'ru'; } catch (e) { return 'ru'; } })();
const t = (k, v) => { let s = (I18N[lang][k] ?? I18N.ru[k] ?? k); if (v) for (const [a, b] of Object.entries(v)) s = String(s).replace('{' + a + '}', b); return s; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Math.round(n).toLocaleString('ru-RU') + ' ₸';
const date = ts => new Date(ts).toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const g = (o) => typeof o === 'object' && o ? (o[lang] || o.ru) : o;

// ── icons (Lucide-style outline) ──
const P = {
  transfer: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  compare: '<path d="M3 3v18h18"/><path d="M8 17V9"/><path d="M13 17V5"/><path d="M18 17v-4"/>',
  catalog: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  finder: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  docs: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="m9 15 2 2 4-4"/>',
  rules: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  admin: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'
};
const ic = (k, c = 'ico') => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;

// ── helpers ──
function ask(msg, okLabel) {
  return new Promise(res => {
    const m = $('#modal'), last = document.activeElement;
    m.innerHTML = `<div class="modal-box glass" role="alertdialog" aria-modal="true" aria-describedby="ask-t" style="max-width:440px"><p id="ask-t" style="font-size:1.05rem;margin-bottom:20px">${esc(msg)}</p><div class="actions" style="justify-content:flex-end"><button class="btn btn-ghost" data-r="0">${t('close')}</button><button class="btn btn-danger" data-r="1">${esc(okLabel)}</button></div></div>`;
    m.classList.add('open');
    const done = v => { m.classList.remove('open'); m.innerHTML = ''; document.removeEventListener('keydown', k); last && last.focus && last.focus(); res(v); };
    const k = e => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', k);
    m.onclick = e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); else if (e.target === m) done(false); };
    $('[data-r="0"]', m).focus();
  });
}
function toast(msg) {
  const box = $('#toasts'); const el = document.createElement('div');
  el.className = 'toast glass'; el.setAttribute('role', 'status'); el.textContent = msg;
  box.append(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2600);
}
const go = h => { if (location.hash === h) route(); else location.hash = h; };
function theme(next) {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (next) { const v = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = v; try { localStorage.setItem('bagdar:theme', v); } catch (e) {} }
}
try { const th = localStorage.getItem('bagdar:theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
function setLang(l) { lang = l; try { localStorage.setItem('bagdar:lang', l); } catch (e) {} document.documentElement.lang = l === 'kz' ? 'kk' : 'ru'; route(); }
const langSeg = () => `<div class="seg" role="group" aria-label="Язык / Тіл"><button data-lang="ru" class="${lang === 'ru' ? 'on' : ''}" aria-pressed="${lang === 'ru'}">RU</button><button data-lang="kz" class="${lang === 'kz' ? 'on' : ''}" aria-pressed="${lang === 'kz'}">ҚАЗ</button></div>`;
const themeBtn = () => { const dark = (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'; return `<button class="icon-btn" data-theme-toggle aria-label="${t('theme')}">${ic(dark ? 'sun' : 'moon')}</button>`; };
// логотип: компас (тот же, что в assets/img/logo.svg). Хвост стрелки — currentColor,
// чтобы он был виден и в светлой, и в тёмной теме
const brand = (href = '#/') => `<a class="brand" href="${href}"><svg class="brand-mark" viewBox="-50 -50 100 100" aria-hidden="true"><circle r="36" fill="none" stroke="#2563EB" stroke-width="12"/><polygon points="25,-25 6,6 -6,-6" fill="#EA580C"/><polygon points="-25,25 6,6 -6,-6" fill="currentColor"/><circle r="4" fill="var(--bg)"/></svg>Bagdar</a>`;
const home = u => !u ? '#/login' : u.role === 'admin' ? '#/admin' : S.isPaid(u) ? '#/app/transfer' : '#/pay';

// ── effects ──
function effects() {
  // reveal on scroll
  const els = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) els.forEach(e => e.classList.add('in'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 }); els.forEach(e => io.observe(e)); }
  // count up
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count, run = () => {
      if (reduce) { el.textContent = to.toLocaleString('ru-RU'); return; }
      const t0 = performance.now(), d = 1200;
      const step = n => { const p = Math.min(1, (n - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e).toLocaleString('ru-RU'); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { run(); io.disconnect(); } }); io.observe(el); } else run();
  });
}
document.addEventListener('pointermove', e => {
  const s = e.target.closest && e.target.closest('.spot'); if (!s) return;
  const r = s.getBoundingClientRect(); s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
window.addEventListener('scroll', () => {
  const p = $('#progress'); if (!p) return;
  const h = document.documentElement.scrollHeight - innerHeight; p.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
}, { passive: true });

function grid(done, acc, anim) {
  let h = '';
  for (let i = 0; i < 240; i++) { const c = i < acc ? 'k' : i < done ? 'x' : 'n'; h += `<i class="${c}"${anim ? ` style="animation-delay:${Math.round(i * 5)}ms"` : ''}></i>`; }
  return `<div class="cgrid${anim ? ' anim' : ''}" role="img" aria-label="${t('lg_k')}: ${acc}, ${t('lg_x')}: ${done - acc}, ${t('lg_n')}: ${240 - done}">${h}</div>
  <div class="legend"><span style="--c:var(--primary)">${t('lg_k')}: ${acc}</span>${done - acc > 0 ? `<span style="--c:#EA580C">${t('lg_x')}: ${done - acc}</span>` : ''}<span class="o">${t('lg_n')}: ${240 - done}</span></div>`;
}

// ════════ PUBLIC: landing ════════
function vLanding() {
  const u = S.me();
  const words = t('hero_t1').split(' ').map((w, i) => `<span class="w" style="animation-delay:${i * 90}ms">${esc(w)}</span>`).join(' ');
  const cities = new Set(U.map(x => x.city)).size;
  const docsN = D.ru.admission.length + D.ru.transfer.length;
  const feat = (k, icon, wide, o) => `<article class="feature glass spot rv${wide ? ' wide' : ''}${o ? ' o' : ''}"><div class="fi">${ic(icon, 'ico ico-lg')}</div><h3>${t(k + '_t')}</h3><p>${t(k + '_d')}</p></article>`;
  return `<div class="progress" id="progress"></div>
  <header class="topnav"><nav class="topnav-in glass" aria-label="Bagdar">${brand()}
    <div class="links"><a href="#features">${t('nav_features')}</a><a href="#how">${t('nav_how')}</a><a href="#price">${t('nav_price')}</a><a href="#faq">${t('nav_faq')}</a></div>
    <div class="right">${langSeg()}${themeBtn()}${u ? `<a class="btn btn-primary btn-sm" href="${home(u)}">Bagdar ${ic('arrow')}</a>` : `<a class="btn btn-ghost btn-sm" href="#/login">${t('login')}</a>`}</div>
  </nav></header>
  <main id="main" tabindex="-1">
  <section class="wrap hero">
    <div>
      <span class="pill glass"><b>${t('hero_pill_b')}</b>${t('hero_pill')}</span>
      <h1>${words}<br><span class="grad">${esc(t('hero_t2'))}</span></h1>
      <p class="lead">${t('hero_lead')}</p>
      <div class="actions"><a class="btn btn-accent" href="${u ? home(u) : '#/register'}">${t('hero_cta')} ${ic('arrow')}</a><a class="btn btn-ghost" href="#how">${t('hero_cta2')}</a></div>
      <p class="hero-note">${ic('shield')} ${t('hero_note')}</p>
    </div>
    <div class="demo-wrap">
      <div class="demo-card glass" aria-hidden="true">
        <div class="demo-head"><b>${t('demo_h')}</b><span>${t('demo_s')}</span></div>
        ${grid(120, 95, true)}
        <div class="demo-verdict"><div><small>${t('demo_stay')}</small><strong>1 000 000 ₸</strong></div><div><small>${t('demo_go')}</small><strong style="color:var(--accent)">2 900 000 ₸</strong></div></div>
      </div>
      <div class="float-chip glass a">${ic('check')} ${t('chip_a')}</div>
      <div class="float-chip glass b">${ic('spark')} ${t('chip_b')}</div>
    </div>
  </section>
  <section class="wrap section" id="features">
    <div class="section-h rv"><span class="kicker">${t('f_kicker')}</span><h2>${t('f_h')}</h2><p>${t('f_p')}</p></div>
    <div class="features">${feat('f1', 'transfer', true)}${feat('f2', 'docs', false, true)}${feat('f3', 'catalog')}${feat('f4', 'finder')}${feat('f5', 'rules', false, true)}</div>
    <div class="stats">
      <div class="stat glass rv"><div class="n" data-count="${U.length}">0</div><div class="l">${t('s_unis')}</div></div>
      <div class="stat glass rv"><div class="n" data-count="${cities}">0</div><div class="l">${t('s_cities')}</div></div>
      <div class="stat glass rv"><div class="n" data-count="240">0</div><div class="l">${t('s_credits')}</div></div>
      <div class="stat glass rv"><div class="n" data-count="${docsN}">0</div><div class="l">${t('s_docs')}</div></div>
    </div>
  </section>
  <section class="wrap section" id="how">
    <div class="section-h rv"><span class="kicker">${t('how_kicker')}</span><h2>${t('how_h')}</h2></div>
    <ol class="steps3"><li class="step3 glass rv"><h3>${t('h1_t')}</h3><p>${t('h1_d')}</p></li><li class="step3 glass rv"><h3>${t('h2_t')}</h3><p>${t('h2_d')}</p></li><li class="step3 glass rv"><h3>${t('h3_t')}</h3><p>${t('h3_d')}</p></li></ol>
  </section>
  <section class="wrap section" id="price">
    <div class="price glass spot rv">
      <div><span class="kicker">${t('price_kicker')}</span><h2 style="font-size:clamp(1.6rem,3vw,2.2rem);margin-bottom:12px">${t('price_h')}</h2>
        <div class="amount">${CFG.PRICE_KZT.toLocaleString('ru-RU')} ₸ <small>${t('per_month')}</small></div>
        <div class="actions" style="margin-top:20px"><a class="btn btn-accent" href="${u ? home(u) : '#/register'}">${t('hero_cta')} ${ic('arrow')}</a></div></div>
      <ul class="checks">${['p1', 'p2', 'p3', 'p4'].map(k => `<li>${ic('check')}<span>${t(k)}</span></li>`).join('')}</ul>
    </div>
  </section>
  <section class="wrap section faq" id="faq">
    <div class="section-h rv"><h2>${t('faq_h')}</h2></div>
    ${[1, 2, 3].map(i => `<details class="glass rv"><summary>${t('q' + i)}</summary><p>${t('a' + i)}</p></details>`).join('')}
  </section>
  <footer class="wrap footer"><span>© 2026 ${t('footer')}</span>${CFG.MODE === 'demo' ? `<span class="demo-badge">${t('demo_mode')}</span>` : ''}</footer>
  </main>`;
}

// ════════ PUBLIC: auth ════════
function vAuth(mode) {
  const reg = mode === 'register';
  return `<header class="topnav"><div class="topnav-in glass">${brand()}<div class="right">${langSeg()}${themeBtn()}</div></div></header>
  <main id="main" tabindex="-1" class="auth">
    <div class="auth-side rv"><h1>${t('auth_h')}</h1><p>${t('auth_p')}</p>
      <div class="glass" style="padding:20px;border-radius:18px">${grid(120, 95, true)}</div></div>
    <section class="auth-card glass rv" aria-labelledby="auth-h">
      <h2 id="auth-h" class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${reg ? t('tab_reg') : t('tab_login')}</h2>
      <div class="tabs" role="tablist"><button role="tab" aria-selected="${!reg}" class="${!reg ? 'on' : ''}" data-href="#/login">${t('tab_login')}</button><button role="tab" aria-selected="${reg}" class="${reg ? 'on' : ''}" data-href="#/register">${t('tab_reg')}</button></div>
      ${CFG.MODE === 'demo' ? `<p class="alert info">${t('demo_mode')}</p>` : ''}
      <div id="f-form" class="alert bad" role="alert" hidden></div>
      <form id="auth-form" novalidate>
        ${reg ? `<fieldset class="role"><legend class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${t('c_role')}</legend>
          <label><input type="radio" name="role" value="user" checked> ${ic('account')} ${t('role_user')}</label>
          <label><input type="radio" name="role" value="admin"> ${ic('admin')} ${t('role_admin')}</label></fieldset>
        <div class="field"><label for="f-name">${t('f_name')}</label><input class="input" id="f-name" name="name" autocomplete="name" aria-describedby="e-name"><p class="err" id="e-name"></p></div>` : ''}
        <div class="field"><label for="f-email">${t('f_email')}</label><input class="input" id="f-email" name="email" type="email" inputmode="email" autocomplete="email" aria-describedby="e-email"><p class="err" id="e-email"></p></div>
        <div class="field"><label for="f-password">${t('f_pw')}</label><div class="pw"><input class="input" id="f-password" name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" aria-describedby="h-pw e-password"><button type="button" data-pw aria-label="${t('show_pw')}">${ic('eye')}</button></div>
          ${reg ? `<div class="meter" aria-hidden="true"><i id="pw-meter"></i></div><p class="hint" id="h-pw">${t('f_pw_h')} <span id="pw-label"></span></p>` : ''}<p class="err" id="e-password"></p></div>
        ${reg ? `<div class="field" id="code-field" hidden><label for="f-code">${t('f_code')}</label><input class="input" id="f-code" name="code" autocomplete="off" aria-describedby="h-code e-code"><p class="hint" id="h-code">${t('f_code_h')}</p><p class="err" id="e-code"></p></div>` : ''}
        <button class="btn btn-accent btn-block" type="submit" id="auth-submit">${reg ? t('do_reg') : t('do_login')}</button>
      </form>
      <p class="hint" style="text-align:center;margin-top:16px">${reg ? t('have_acc') : t('no_acc')} <a href="${reg ? '#/login' : '#/register'}">${reg ? t('login') : t('register')}</a></p>
    </section>
  </main>`;
}
function bindAuth(mode) {
  const reg = mode === 'register', f = $('#auth-form');
  $$('[data-href]').forEach(b => b.onclick = () => go(b.dataset.href));
  $('[data-pw]').onclick = e => { const b = e.currentTarget, i = $('#f-password'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = ic(show ? 'eyeoff' : 'eye'); b.setAttribute('aria-label', t(show ? 'hide_pw' : 'show_pw')); };
  if (reg) {
    $$('input[name=role]').forEach(r => r.onchange = () => { $('#code-field').hidden = f.role.value !== 'admin'; });
    $('#f-password').oninput = e => { const v = e.target.value; let s = 0; if (v.length >= 8) s++; if (v.length >= 12) s++; if (/[A-ZА-ЯӘҒҚҢӨҰҮҺІ]/.test(v) && /[a-zа-яәғқңөұүһі]/.test(v)) s++; if (/\d/.test(v) && /[^\w\s]/.test(v)) s++;
      const m = $('#pw-meter'), lvl = !v ? 0 : s <= 1 ? 1 : s <= 2 ? 2 : 3; m.style.width = [0, 34, 67, 100][lvl] + '%'; m.style.background = ['', 'var(--danger)', 'var(--warn)', 'var(--ok)'][lvl]; $('#pw-label').textContent = lvl ? '· ' + t(['', 'pw_weak', 'pw_ok', 'pw_strong'][lvl]) : ''; };
  }
  f.onsubmit = async e => {
    e.preventDefault();
    $$('.err', f).forEach(x => x.textContent = ''); $$('.input', f).forEach(x => x.removeAttribute('aria-invalid')); $('#f-form').hidden = true;
    const btn = $('#auth-submit'), label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    let res;
    try {
      res = reg ? await S.register({ name: f.name.value, email: f.email.value, password: f.password.value, role: f.role.value, code: f.code ? f.code.value.trim() : '' })
                : await S.login({ email: f.email.value, password: f.password.value });
    } catch (err) { res = { errs: { form: typeof err === 'string' ? err : 'e_generic' } }; }
    btn.disabled = false; btn.innerHTML = label;
    if (res.errs) {
      let first = null;
      for (const [k, v] of Object.entries(res.errs)) {
        if (k === 'form') { const b = $('#f-form'); b.textContent = t(v); b.hidden = false; continue; }
        const inp = $('#f-' + k), er = $('#e-' + k); if (inp) { inp.setAttribute('aria-invalid', 'true'); first = first || inp; } if (er) er.textContent = t(v);
      }
      (first || $('#f-email')).focus(); return;
    }
    go(home(res.user));
  };
}

// ════════ PAYWALL ════════
function vPay(u) {
  return `<header class="topnav"><div class="topnav-in glass">${brand()}<div class="right">${langSeg()}${themeBtn()}<button class="icon-btn" data-logout aria-label="${t('logout')}">${ic('logout')}</button></div></div></header>
  <main id="main" tabindex="-1" class="paywall">
    <section class="rv"><span class="kicker">${ic('lock')} Bagdar Pro</span><h1 style="font-size:clamp(1.9rem,3.6vw,2.8rem);margin:8px 0 12px">${t('pay_h')}</h1><p class="muted" style="font-size:1.08rem;margin-bottom:20px">${t('pay_p')}</p>
      <ul class="checks">${['p1', 'p2', 'p3', 'p4'].map(k => `<li>${ic('check')}<span>${t(k)}</span></li>`).join('')}</ul></section>
    <section class="pay-card glass spot rv" id="pay-box" aria-live="polite">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="muted">${t('total')}</span><span class="amount" style="font-size:2.6rem">${CFG.PRICE_KZT.toLocaleString('ru-RU')} ₸ <small>${t('per_month')}</small></span></div>
      <fieldset class="methods"><legend style="font-weight:600;margin-bottom:6px">${t('pay_method')}</legend>
        <label class="method"><input type="radio" name="pm" value="kaspi" checked>${ic('phone')}<span>${t('m_kaspi')}<small>${t('m_kaspi_s')}</small></span></label>
        <label class="method"><input type="radio" name="pm" value="card">${ic('card')}<span>${t('m_card')}<small>${t('m_card_s')}</small></span></label>
      </fieldset>
      <button class="btn btn-accent btn-block" id="pay-btn">${ic('lock')} ${t('pay_btn')} ${CFG.PRICE_KZT.toLocaleString('ru-RU')} ₸</button>
      ${CFG.MODE === 'demo' ? `<p class="hint" style="margin-top:12px"><span class="demo-badge">${t('demo_mode')}</span><br>${t('pay_secure')}</p>` : ''}
    </section>
  </main>`;
}
function bindPay() {
  $('#pay-btn').onclick = () => {
    const btn = $('#pay-btn'); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${t('paying')}`;
    const m = $('input[name=pm]:checked').value;
    setTimeout(() => {
      S.pay(m); const u = S.me();
      $('#pay-box').innerHTML = `<div class="success"><svg viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="38"/><path d="M28 45l11 11 21-23"/></svg><h2>${t('paid_h')}</h2><p class="muted" style="margin:8px 0 20px">${t('paid_p')} ${date(u.paidUntil)}</p><a class="btn btn-accent" href="#/app/transfer">${t('go_app')} ${ic('arrow')}</a></div>`;
      toast(t('t_paid'));
    }, reduce ? 200 : 1400);
  };
}

// ════════ APP SHELL ════════
const NAV = [['transfer', 'n_transfer'], ['compare', 'n_compare'], ['catalog', 'n_catalog'], ['finder', 'n_finder'], ['docs', 'n_docs'], ['rules', 'n_rules']];
function shell(u, cur, title, body) {
  const adm = u.role === 'admin';
  const link = (href, icon, label, on) => `<a class="nav-a${on ? ' on' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}>${ic(icon)}${label}</a>`;
  const subBox = adm ? `<div class="sub"><b>${t('sub_admin')}</b></div>` : `<div class="sub"><b>${t('sub_active')}</b>${S.daysLeft(u)} ${t('sub_days')}</div>`;
  return `<div class="shell">
    <aside class="side glass" aria-label="Bagdar">${brand(home(u))}
      ${NAV.map(([k, l]) => link('#/app/' + k, k, t(l), cur === k)).join('')}
      <hr>${link('#/app/account', 'account', t('n_account'), cur === 'account')}${adm ? link('#/admin', 'admin', t('n_admin'), cur === 'admin') : ''}
      ${subBox}</aside>
    <div>
      <header class="topbar glass"><h1>${esc(title)}</h1>${langSeg()}${themeBtn()}<a class="avatar" href="#/app/account" aria-label="${t('n_account')}: ${esc(u.name)}">${esc(u.name.slice(0, 1).toUpperCase())}</a><button class="icon-btn" data-logout aria-label="${t('logout')}">${ic('logout')}</button></header>
      <main id="main" tabindex="-1" class="view">${body}</main>
    </div>
    <nav class="bottomnav glass" aria-label="Bagdar">${(adm ? [['transfer', 'n_transfer'], ['catalog', 'n_catalog'], ['docs', 'n_docs'], ['rules', 'n_rules']] : NAV).map(([k, l]) => `<a href="#/app/${k}" class="${cur === k ? 'on' : ''}"${cur === k ? ' aria-current="page"' : ''}>${ic(k)}${t(l)}</a>`).join('')}${adm ? `<a href="#/admin" class="${cur === 'admin' ? 'on' : ''}">${ic('admin')}Admin</a>` : ''}</nav>
  </div>`;
}

// ── transfer ──
const uniLabel = u => g(u.name) + ' (' + u.city + ')';
const findUni = v => U.find(u => uniLabel(u) === v || u.name.ru + ' (' + u.city + ')' === v || u.name.kz + ' (' + u.city + ')' === v);
function tuition(u) { if (u && u.price) return u.price.min; if (!u || typeof u.tuition !== 'string') return null; const n = u.tuition.replace(/\s/g, '').match(/\d+/g); if (!n) return null; const a = +n[0], b = +(n[1] || n[0]); return Math.round((a + b) / 2 / 10000) * 10000; }
// общие функции для assets/js/compare.js
window.Bagdar = { U, esc, money, uniLabel, findUni, tuition };
function vTransfer() {
  const opts = [...U].sort((a, b) => g(a.name).localeCompare(g(b.name), 'ru')).map(u => `<option value="${esc(uniLabel(u))}">${esc((u.abbr || []).slice(0, 3).join(', '))}</option>`).join('');
  const side = (n, cls, lbl) => `<div class="side-box ${cls}"><label for="u${n}">${t(lbl)}</label><input class="input" id="u${n}" list="uni-list" autocomplete="off" placeholder="${t('tr_pick')}" aria-describedby="u${n}-e"><p class="err" id="u${n}-e"></p>
    <label for="p${n}" class="hint" style="font-weight:600;color:var(--fg)">${t('tr_price')}</label><input class="input" id="p${n}" type="number" min="0" step="10000" inputmode="numeric" aria-describedby="p${n}-e r${n}"><p class="err" id="p${n}-e"></p><p class="hint" id="r${n}"></p></div>`;
  return `<section class="panel glass rv" id="tr-form"><datalist id="uni-list">${opts}</datalist>
    <div class="grid2">${side(1, '', 'tr_from')}${side(2, 'to', 'tr_to')}</div>
    <div class="grid2" style="margin-top:16px">
      <div class="field"><label for="done">${t('tr_done')}</label><div class="range"><input type="range" id="done-r" min="0" max="239" step="1" value="60" aria-label="${t('tr_done')}"><input class="input" type="number" id="done" min="0" max="239" value="60" aria-describedby="done-e done-h"></div><p class="hint" id="done-h">${t('tr_done_h')}</p><p class="err" id="done-e"></p></div>
      <div class="field"><label for="acc">${t('tr_acc')}</label><input class="input" type="number" id="acc" min="0" max="239" value="60" aria-describedby="acc-h"><p class="hint" id="acc-h">${t('tr_acc_h')}</p></div>
    </div>
    <div class="grid2" style="align-items:end">
      <div class="field"><label for="fld">${t('tr_field')}</label><select class="input" id="fld"><option value="other">${t('trf_other')}</option><option value="ped">${t('trf_ped')}</option><option value="med">${t('trf_med')}</option><option value="art">${t('trf_art')}</option></select></div>
      <div class="field"><button class="btn btn-accent btn-block" id="calc">${t('tr_btn')} ${ic('arrow')}</button></div>
    </div>
    <p class="err" id="calc-e" role="alert"></p>
  </section>
  <section class="panel glass" id="tr-res" hidden aria-live="polite"></section>`;
}
function bindTransfer(pref) {
  const pick = n => { const u = findUni($('#u' + n).value), r = $('#r' + n); if (!u) { r.textContent = ''; return; } const m = tuition(u); if (u.price) { $('#p' + n).value = m; r.textContent = t('ref_ver', { y: u.price.year, r: u.tuition, n: g(u.price.note) }) + (u.price.min !== u.price.max ? ' ' + t('ref_range') : ''); } else if (m) { $('#p' + n).value = m; r.textContent = t('ref_base', { r: u.tuition }); } else r.textContent = typeof u.tuition === 'object' ? t('ref_budget') : t('ref_none'); };
  [1, 2].forEach(n => $('#u' + n).addEventListener('input', () => pick(n)));
  const sync = v => { v = Math.max(0, Math.min(239, parseInt(v) || 0)); const a = $('#acc'), prev = +$('#done').value; if (+a.value === prev || +a.value > v) a.value = v; $('#done').value = v; $('#done-r').value = v; };
  $('#done-r').oninput = e => sync(e.target.value); $('#done').oninput = e => sync(e.target.value);
  if (pref) { $('#u' + pref.n).value = uniLabel(pref.u); pick(pref.n); }
  $('#calc').onclick = () => {
    const n1 = $('#u1').value.trim(), n2 = $('#u2').value.trim(), p1 = +$('#p1').value, p2 = +$('#p2').value, done = parseInt($('#done').value);
    let acc = parseInt($('#acc').value); const bad = [];
    const fe = (id, msg) => { const el = $('#' + id); el.setAttribute('aria-invalid', msg ? 'true' : 'false'); $('#' + id + '-e').textContent = msg || ''; if (msg) bad.push(el); };
    fe('u1', n1 ? '' : t('e_uni')); fe('u2', !n2 ? t('e_uni') : n1 === n2 ? t('e_same') : ''); fe('p1', p1 > 0 ? '' : t('e_price')); fe('p2', p2 > 0 ? '' : t('e_price')); fe('done', isNaN(done) || done < 0 || done > 239 ? t('e_done') : '');
    $('#calc-e').textContent = bad.length ? t('e_sum') : '';
    if (bad.length) { bad[0].focus(); return; }
    if (isNaN(acc) || acc < 0) acc = 0; if (acc > done) acc = done; $('#acc').value = acc;
    const c1 = p1 / 60, c2 = p2 / 60, l1 = 240 - done, l2 = 240 - acc, stay = l1 * c1, gov = l2 * c2, d = gov - stay, rel = Math.abs(d) / stay;
    const [cls, big, txt] = rel < .03 ? ['v-mid', t('v_mid', { x: money(Math.abs(d)) }), t('v_mid_t')] : d < 0 ? ['v-good', t('v_good', { x: money(-d) }), t('v_good_t')] : ['v-bad', t('v_bad', { x: money(d) }), t('v_bad_t')];
    const w = [], diff = done - acc, u2 = findUni(n2), fld = $('#fld').value;
    if (diff > 0) w.push(['', t('w_diff', { n: diff, s: Math.max(1, Math.ceil(diff / 30)) })]);
    if (done < 30) w.push(['', t('w_period')]);
    if (u2 && u2.type === 'Ұлттық') w.push(['', t('w_nat')]);
    if (fld === 'ped' || fld === 'med') w.push(['', t('w_pedmed')]);
    if (fld === 'art') w.push(['', t('w_art')]);
    w.push(['i', t('w_holiday')]);
    const mx = Math.max(stay, gov), box = $('#tr-res');
    box.hidden = false;
    box.innerHTML = `<div class="verdict ${cls}"><div class="big">${big}</div><p>${txt}</p></div>
      <div class="bars"><div class="bar"><span>${t('col_stay')}</span><div class="tr"><div class="fl" data-w="${stay / mx * 100}"></div></div><b>${money(stay)}</b></div><div class="bar"><span>${t('col_go')}</span><div class="tr"><div class="fl go" data-w="${gov / mx * 100}"></div></div><b>${money(gov)}</b></div></div>
      ${grid(done, acc, true)}
      <div class="tbl-wrap" style="margin-top:18px"><table class="tbl"><thead><tr><th></th><th class="r">${t('col_stay')}<br><span class="muted" style="font-weight:400">${esc(n1)}</span></th><th class="r">${t('col_go')}<br><span class="muted" style="font-weight:400">${esc(n2)}</span></th></tr></thead>
      <tbody><tr><td>${t('r_credit')}</td><td class="r">${money(c1)}</td><td class="r">${money(c2)}</td></tr><tr><td>${t('r_left')}</td><td class="r">${l1}</td><td class="r">${l2}</td></tr><tr><td><b>${t('r_total')}</b></td><td class="r"><b>${money(stay)}</b></td><td class="r"><b>${money(gov)}</b></td></tr></tbody></table></div>
      <ul class="warns">${w.map(([c, x]) => `<li class="${c}">${x}</li>`).join('')}</ul>
      <div class="actions" style="margin-top:16px"><a class="btn btn-primary" href="#/app/docs?tab=transfer">${ic('docs')} ${t('to_docs')}</a><button class="btn btn-ghost" onclick="window.print()">${ic('download')} ${t('print')}</button><button class="btn btn-ghost" id="save-calc">${ic('check')} ${History.t('save')}</button></div>
      <p class="note">${t('tr_note')}</p>`;
    // сохранение расчёта в историю (assets/js/history.js)
    $('#save-calc').onclick = e => {
      History.save({ from: n1, to: n2, p1, p2, done, acc, stay, go: gov });
      e.currentTarget.disabled = true; // чтобы не сохранить один расчёт дважды
      toast(History.t('saved'));
    };
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.fl[data-w]', box).forEach(f => f.style.width = Math.max(2, +f.dataset.w) + '%')));
    box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
}

// ── catalog ──
function vCatalog() {
  const cities = [...new Set(U.map(u => u.city))].sort((a, b) => a.localeCompare(b, 'ru'));
  const types = [...new Set(U.map(u => u.type))];
  const F = I18N[lang].fields;
  return `<section class="panel glass rv"><div class="filters">
      <label class="sr" for="cq" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${t('cat_search')}</label>
      <input class="input q" id="cq" type="search" placeholder="${t('cat_search')}">
      <select class="input" id="cc" aria-label="${t('m_city')}"><option value="">${t('all_cities')}</option>${cities.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <select class="input" id="ct" aria-label="${t('m_type')}"><option value="">${t('all_types')}</option>${types.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <label class="method" style="min-height:48px;padding:8px 14px;font-weight:600"><input type="checkbox" id="cv"> ${t('only_ver')}</label>
      <select class="input" id="cf" aria-label="${t('fd_field')}"><option value="">${t('all_fields')}</option>${Object.entries(F).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
    </div><p class="hint" id="ccount" aria-live="polite"></p></section>
    <div class="unis" id="cgrid"></div>`;
}
function bindCatalog() {
  const draw = () => {
    const q = $('#cq').value.trim().toLowerCase(), c = $('#cc').value, ty = $('#ct').value, f = $('#cf').value;
    const ov = $('#cv').checked; const list = U.filter(u => (!ov || u.price) && (!c || u.city === c) && (!ty || u.type === ty) && (!f || u.fields.includes(f)) &&
      (!q || [u.name.ru, u.name.kz, u.full.ru, u.full.kz, u.city, ...(u.abbr || [])].some(s => String(s).toLowerCase().includes(q))));
    $('#ccount').textContent = `${t('found')}: ${list.length}`;
    $('#cgrid').innerHTML = list.length ? list.map(u => `<button class="uni glass spot" data-uni="${u.id}"><h3>${esc(g(u.name))}</h3><span class="city">${esc(u.city)} · ${u.founded}</span>
      <span class="tags"><span class="tag${u.type === 'Ұлттық' ? ' p' : ''}">${esc(u.type)}</span>${u.code && u.code !== '—' ? `<span class="tag">${t('m_code')} ${esc(u.code)}</span>` : ''}</span>
      <span class="price-line">${u.price ? `<span class="badge b-ok">${t('badge_ver')}</span> ${esc(u.tuition)}` : `<span class="badge b-no">${t('badge_est')}</span> ${esc(g(u.tuition) || '—')}`}</span>
      <span class="nums"><span><b>${u.minS}+</b><small>${t('minS')}</small></span><span><b>${u.grantS}+</b><small>${t('grantS')}</small></span><span><b>${u.founded}</b><small>${t('year')}</small></span></span></button>`).join('')
      : `<p class="panel glass">${t('none')}</p>`;
  };
  ['cq', 'cc', 'ct', 'cf', 'cv'].forEach(i => $('#' + i).addEventListener(i === 'cv' ? 'change' : 'input', draw)); draw();
  $('#cgrid').addEventListener('click', e => { const b = e.target.closest('[data-uni]'); if (b) openUni(+b.dataset.uni); });
}
function openUni(id) {
  const u = U.find(x => x.id === id); if (!u) return;
  const m = $('#modal'); const last = document.activeElement;
  m.innerHTML = `<div class="modal-box glass" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <div class="modal-head"><div><h2 id="m-title" style="font-size:1.3rem">${esc(g(u.full))}</h2><p class="muted">${esc(u.city)} · ${esc(u.type)}</p></div><button class="icon-btn" data-close aria-label="${t('close')}">${ic('x')}</button></div>
    <div class="modal-grid">${[[t('minS'), u.minS], [t('grantS'), u.grantS], [t('m_cost'), g(u.tuition)], [t('m_code'), u.code], [t('m_founded'), u.founded], [t('m_city'), u.city]].map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>
    ${u.price ? `<div class="verdict v-good" style="padding:14px 16px;margin-bottom:14px"><b>${t('badge_ver')} · ${esc(u.price.year)}</b><br>${esc(g(u.price.note))}<br><a href="${PRICE_SRC.url}" target="_blank" rel="noopener" style="color:inherit">${t('src_price')}: ${esc(PRICE_SRC.name)}</a></div>` : `<p class="hint" style="margin-bottom:12px">${t('est_note')}</p>`}
    <p style="margin-bottom:18px">${esc(g(u.specs))}</p>
    <div class="actions"><button class="btn btn-ghost" data-use="1">${t('use_from')}</button><button class="btn btn-accent" data-use="2">${t('use_to')} ${ic('arrow')}</button></div></div>`;
  m.classList.add('open'); document.body.style.overflow = 'hidden';
  const close = () => { m.classList.remove('open'); m.innerHTML = ''; document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); last && last.focus && last.focus(); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  m.onclick = e => { if (e.target === m || e.target.closest('[data-close]')) close(); const b = e.target.closest('[data-use]'); if (b) { close(); pending = { n: +b.dataset.use, u }; go('#/app/transfer'); } };
  $('[data-close]', m).focus();
}
let pending = null;

// ── finder ──
function vFinder() {
  const F = I18N[lang].fields, cities = [...new Set(U.map(u => u.city))].sort((a, b) => a.localeCompare(b, 'ru'));
  return `<section class="panel glass rv"><div class="grid2">
    <div class="field"><label for="fs">${t('fd_score')}</label><input class="input" id="fs" type="number" min="0" max="140" inputmode="numeric" placeholder="0–140" aria-describedby="fd-e"></div>
    <div class="field"><label for="ff">${t('fd_field')}</label><select class="input" id="ff"><option value=""></option>${Object.entries(F).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
    <div class="field"><label for="fc">${t('fd_city')}</label><select class="input" id="fc"><option value="">${t('all_cities')}</option>${cities.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field" style="justify-content:end"><button class="btn btn-accent btn-block" id="fb">${t('fd_btn')} ${ic('arrow')}</button></div></div>
    <p class="err" id="fd-e" role="alert"></p></section><section id="fr" aria-live="polite"></section>`;
}
function bindFinder() {
  $('#fb').onclick = () => {
    const s = parseInt($('#fs').value), f = $('#ff').value, c = $('#fc').value;
    if (isNaN(s) || s < 0 || s > 140 || !f) { $('#fd-e').textContent = t('fd_err'); $('#fs').focus(); return; }
    $('#fd-e').textContent = '';
    const list = U.filter(u => u.fields.includes(f) && (!c || u.city === c) && s >= u.minS).sort((a, b) => b.grantS - a.grantS);
    $('#fr').innerHTML = `<p class="hint" style="margin:0 0 10px 6px">${t('found')}: ${list.length}</p>` + (list.length ? list.map(u => {
      const d = s - u.grantS, ch = d >= 15 ? 95 : d >= 5 ? 80 : d >= 0 ? 65 : d >= -10 ? 45 : d >= -20 ? 25 : 10;
      const cls = ch >= 65 ? 'v-good' : ch >= 40 ? 'v-mid' : 'v-bad';
      return `<button class="res glass spot" data-uni="${u.id}"><span class="grow"><b>${esc(g(u.full))}</b><br><small>${esc(u.city)} · ${esc(g(u.tuition))}${s >= u.grantS ? ` · <span class="badge b-ok">${t('grant')}</span>` : ''}</small></span><span class="chance ${cls}">${ch}%<br><small style="font-weight:500">${t('chance')}</small></span></button>`;
    }).join('') : `<p class="panel glass">${t('none')}</p>`);
  };
  $('#fr').addEventListener('click', e => { const b = e.target.closest('[data-uni]'); if (b) openUni(+b.dataset.uni); });
}

// ── documents ──
function vDocs(tab) {
  const list = D[lang][tab === 'transfer' ? 'transfer' : 'admission'], key = tab === 'transfer' ? 'transfer' : 'admission', ch = S.getChecks(key);
  const done = list.filter(([k]) => ch[k]).length, pct = Math.round(done / list.length * 100);
  const srcs = key === 'admission'
    ? [['https://egov.kz/cms/ru/services/pass_pryem1', 'eGov — приём документов в вузы'], ['https://welcome.kaznu.kz/ru/24371/page', 'КазНУ — перечень документов'], ['https://www.ablaikhan.kz/ru/for-applicants/for-applicants/documents1.html', 'КазУМОиМЯ — перечень документов']]
    : [['https://www.inform.kz/ru/pravila-perevoda-i-vosstanovleniya-studentov-izmenili-v-kazahstane-08bdc2d0', 'Kazinform — правила перевода, 27.08.2026'], ['https://egov.kz/cms/ru/articles/university_degree/20students', 'eGov — перевод и восстановление']];
  return `<div class="tabs" role="tablist" style="max-width:420px"><button role="tab" aria-selected="${key === 'admission'}" class="${key === 'admission' ? 'on' : ''}" data-tab="admission">${t('doc_adm')}</button><button role="tab" aria-selected="${key === 'transfer'}" class="${key === 'transfer' ? 'on' : ''}" data-tab="transfer">${t('doc_tr')}</button></div>
  <section class="panel glass rv">
    <div class="doc-top"><div class="ring" id="ring" style="--deg:${pct * 3.6}deg" role="img" aria-label="${done} / ${list.length}"><span id="ring-n">${done}/${list.length}</span></div><div><h2 style="margin:0">${key === 'admission' ? t('doc_adm') : t('doc_tr')}</h2><p class="muted">${pct}% ${t('doc_ready')}</p></div></div>
    <ul class="checklist">${list.map(([k, title, desc]) => `<li><label><input type="checkbox" data-doc="${k}"${ch[k] ? ' checked' : ''}><span><span class="dt">${esc(title)}</span><small>${esc(desc)}</small></span></label></li>`).join('')}</ul>
    <p class="note">${esc(D[lang].note)}</p>
  </section>
  <section class="panel glass src rv"><h2>${t('doc_src')}</h2>${srcs.map(([h, l]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join('')}</section>`;
}
function bindDocs(tab) {
  const key = tab === 'transfer' ? 'transfer' : 'admission';
  $$('[data-tab]').forEach(b => b.onclick = () => go('#/app/docs?tab=' + b.dataset.tab));
  $$('[data-doc]').forEach(c => c.onchange = () => {
    S.setCheck(key, c.dataset.doc, c.checked);
    const all = $$('[data-doc]'), d = all.filter(x => x.checked).length, pct = Math.round(d / all.length * 100);
    $('#ring').style.setProperty('--deg', pct * 3.6 + 'deg'); $('#ring-n').textContent = `${d}/${all.length}`; $('#ring').nextElementSibling.querySelector('p').textContent = `${pct}% ${t('doc_ready')}`;
  });
}

// ── rules ──
const ckA = {};
function vRules() {
  const R = RU[lang];
  return `<section class="panel glass rv"><h2>${t('ck_title')}</h2><div id="ck"></div><div id="ckv" style="margin-top:14px" aria-live="polite"></div></section>
  <section class="panel glass rv"><h2>${t('ru_main')}</h2><ul class="rules">${R.rules.map(r => `<li>${r}</li>`).join('')}</ul></section>
  <section class="panel glass rv"><h2>${t('ru_steps')}</h2><ol class="olist">${R.steps.map(r => `<li><span>${esc(r)}</span></li>`).join('')}</ol>
    <div class="actions" style="margin-top:18px"><a class="btn btn-primary" href="#/app/docs?tab=transfer">${ic('docs')} ${t('to_docs')}</a></div></section>`;
}
function bindRules() {
  const draw = () => {
    $('#ck').innerHTML = RU[lang].ck.map(([id, q]) => `<div class="q-row"><span>${esc(q)}</span><span class="yn" role="group" aria-label="${esc(q)}"><button data-ck="${id}" data-v="1" class="${ckA[id] === true ? 'y' : ''}" aria-pressed="${ckA[id] === true}">${t('yes')}</button><button data-ck="${id}" data-v="0" class="${ckA[id] === false ? 'n' : ''}" aria-pressed="${ckA[id] === false}">${t('no')}</button></span></div>`).join('');
    const need = ['q1', 'q2', 'q3', 'q5'].concat(ckA.q3 ? ['q4'] : []);
    if (need.some(k => ckA[k] === undefined)) { $('#ckv').innerHTML = `<p class="hint">${t('ck_wait')}</p>`; return; }
    const m = []; if (!ckA.q1) m.push(['v-bad', t('ck_q1')]); if (!ckA.q2) m.push(['v-mid', t('ck_q2')]); if (ckA.q3 && !ckA.q4) m.push(['v-bad', t('ck_q34')]); if (ckA.q5) m.push(['v-mid', t('ck_q5')]); if (!m.length) m.push(['v-good', t('ck_ok')]);
    $('#ckv').innerHTML = m.map(([c, x]) => `<div class="verdict ${c}" style="padding:14px 18px;margin-bottom:8px">${x}</div>`).join('');
  };
  $('#ck').parentElement.addEventListener('click', e => { const b = e.target.closest('[data-ck]'); if (!b) return; ckA[b.dataset.ck] = b.dataset.v === '1'; draw(); const nb = $(`[data-ck="${b.dataset.ck}"][data-v="${b.dataset.v}"]`); nb && nb.focus(); });
  draw();
}

// ── account ──
function vAccount(u) {
  const pays = S.myPayments(), adm = u.role === 'admin';
  return `<section class="panel glass rv"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="avatar" style="width:56px;height:56px;font-size:1.3rem">${esc(u.name.slice(0, 1).toUpperCase())}</span><div><h2 style="margin:0">${esc(u.name)}</h2><p class="muted">${esc(u.email)} · <span class="badge ${adm ? 'b-adm' : 'b-no'}">${adm ? t('role_admin') : t('role_user')}</span></p></div></div></section>
  <section class="panel glass rv"><h2>${t('acc_plan')}</h2>${adm ? `<p>${t('sub_admin')}</p>` : `<p>${u.paidUntil > Date.now() ? `<span class="badge b-ok">${t('sub_active')}</span> ${t('acc_until')} ${date(u.paidUntil)}` : `<span class="badge b-no">${t('acc_none')}</span>`}</p><div class="actions" style="margin-top:14px"><a class="btn btn-accent" href="#/pay?extend=1">${t('acc_extend')}</a></div>`}</section>
  ${History.render(money, esc)}
  ${adm ? '' : `<section class="panel glass rv"><h2>${t('acc_hist')}</h2>${pays.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('c_date')}</th><th>${t('c_method')}</th><th class="r">${t('c_amount')}</th></tr></thead><tbody>${pays.map(p => `<tr><td>${date(p.createdAt)}</td><td>${p.method === 'kaspi' ? 'Kaspi Pay' : t('m_card')}${p.status === 'demo' ? ' <span class="demo-badge">demo</span>' : ''}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('acc_empty')}</p>`}</section>`}`;
}

// ── admin ──
let adQ = '';
function vAdmin() {
  const st = S.stats();
  return `<div class="kpis">${[['k_users', st.users], ['k_active', st.active], ['k_rev', st.revenue], ['k_admins', st.admins]].map(([k, v], i) => `<div class="kpi glass spot rv"><small>${t(k)}</small><b><span data-count="${v}">0</span>${i === 2 ? ' ₸' : ''}</b></div>`).join('')}</div>
  <section class="panel glass rv"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><h2 style="margin:0">${t('ad_users')}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="adq" type="search" placeholder="${t('ad_q')}" aria-label="${t('ad_q')}" value="${esc(adQ)}" style="width:260px"><button class="btn btn-ghost btn-sm" id="adexp">${ic('download')} ${t('export')}</button></div></div>
    <div class="tbl-wrap"><table class="tbl" id="adt"></table></div></section>
  <section class="panel glass rv"><h2>${t('ad_pay')}</h2><div class="tbl-wrap"><table class="tbl" id="adp"></table></div></section>`;
}
function bindAdmin(me) {
  const draw = () => {
    const q = adQ.toLowerCase(), now = Date.now();
    const us = S.users().filter(u => !q || u.name.toLowerCase().includes(q) || u.email.includes(q)).sort((a, b) => b.createdAt - a.createdAt);
    $('#adt').innerHTML = `<thead><tr><th>${t('c_user')}</th><th>${t('c_role')}</th><th>${t('c_status')}</th><th>${t('c_created')}</th><th>${t('c_actions')}</th></tr></thead><tbody>` + us.map(u => {
      const self = u.id === me.id, status = u.blocked ? `<span class="badge b-bad">${t('st_blocked')}</span>` : u.role === 'admin' ? `<span class="badge b-adm">Pro</span>` : u.paidUntil > now ? `<span class="badge b-ok">${t('st_paid', { d: date(u.paidUntil) })}</span>` : `<span class="badge b-no">${t('st_unpaid')}</span>`;
      const acts = self ? `<span class="muted">${t('you')}</span>` : `<div class="row-actions">${u.role === 'user' ? `<button class="btn btn-ghost btn-sm" data-a="grant" data-id="${u.id}">${t('a_grant')}</button>${u.paidUntil > now ? `<button class="btn btn-ghost btn-sm" data-a="revoke" data-id="${u.id}">${t('a_revoke')}</button>` : ''}` : ''}<button class="btn btn-ghost btn-sm" data-a="block" data-id="${u.id}">${u.blocked ? t('a_unblock') : t('a_block')}</button><button class="btn btn-danger btn-sm" data-a="del" data-id="${u.id}" data-e="${esc(u.email)}">${t('a_del')}</button></div>`;
      return `<tr><td><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></td><td><span class="badge ${u.role === 'admin' ? 'b-adm' : 'b-no'}">${u.role === 'admin' ? t('role_admin') : t('role_user')}</span></td><td>${status}</td><td>${date(u.createdAt)}</td><td>${acts}</td></tr>`;
    }).join('') + '</tbody>';
    const ps = S.payments();
    $('#adp').innerHTML = ps.length ? `<thead><tr><th>${t('c_date')}</th><th>${t('c_user')}</th><th>${t('c_method')}</th><th class="r">${t('c_amount')}</th></tr></thead><tbody>${ps.map(p => `<tr><td>${date(p.createdAt)}</td><td>${esc(p.email)}</td><td>${p.method === 'kaspi' ? 'Kaspi Pay' : t('m_card')} <span class="demo-badge">demo</span></td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody>` : `<tbody><tr><td class="muted">${t('acc_empty')}</td></tr></tbody>`;
  };
  $('#adq').oninput = e => { adQ = e.target.value; draw(); };
  $('#adt').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const id = b.dataset.id;
    if (b.dataset.a === 'grant') { S.grant(id, CFG.PERIOD_DAYS); toast(t('t_granted')); }
    if (b.dataset.a === 'revoke') { S.revoke(id); toast(t('t_revoked')); }
    if (b.dataset.a === 'block') { S.toggleBlock(id); toast(t('t_saved')); }
    if (b.dataset.a === 'del') { if (!(await ask(t('confirm_del', { e: b.dataset.e }), t('a_del')))) return; S.remove(id); toast(t('t_deleted')); }
    draw();
  };
  $('#adexp').onclick = () => {
    const rows = [['name', 'email', 'role', 'paid_until', 'blocked', 'created']].concat(S.users().map(u => [u.name, u.email, u.role, u.paidUntil ? new Date(u.paidUntil).toISOString() : '', u.blocked, new Date(u.createdAt).toISOString()]));
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'bagdar-users.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  draw();
}

// ════════ ROUTER ════════
function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(qs || '');
  const u = S.me();
  let html, bind, focusMain = true;
  const need = () => { if (!u) { go('#/login'); return false; } return true; };
  if (path === '/' || path === '') { html = vLanding(); focusMain = false; }
  else if (path === '/login' || path === '/register') { if (u) return go(home(u)); html = vAuth(path.slice(1)); bind = () => bindAuth(path.slice(1)); }
  else if (path === '/pay') { if (!need()) return; if (u.role === 'admin') return go('#/admin'); if (S.isPaid(u) && !params.get('extend')) return go('#/app/transfer'); html = vPay(u); bind = bindPay; }
  else if (path === '/admin') { if (!need()) return; if (u.role !== 'admin') return go(home(u)); html = shell(u, 'admin', t('ad_title'), vAdmin()); bind = () => bindAdmin(u); }
  else if (path.startsWith('/app/')) {
    if (!need()) return; if (!S.isPaid(u)) return go('#/pay');
    const v = path.slice(5);
    const map = {
      transfer: [t('tr_title'), vTransfer, () => { bindTransfer(pending); pending = null; }],
      compare: [Compare.t('title'), () => Compare.view(window.Bagdar), () => Compare.bind(window.Bagdar)],
      catalog: [t('cat_title'), vCatalog, bindCatalog], finder: [t('fd_title'), vFinder, bindFinder],
      docs: [t('doc_title'), () => vDocs(params.get('tab')), () => bindDocs(params.get('tab'))],
      rules: [t('ru_title'), vRules, bindRules], account: [t('acc_title'), () => vAccount(u), null]
    };
    const m = map[v]; if (!m) return go('#/app/transfer');
    html = shell(u, v, m[0], m[1]()); bind = m[2];
  } else return go('#/');
  const paint = () => {
    root.innerHTML = html; bind && bind();
    $$('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
    $$('[data-theme-toggle]').forEach(b => b.onclick = () => { theme(true); route(); });
    $$('[data-logout]').forEach(b => b.onclick = () => { S.logout(); toast(t('t_bye')); go('#/'); });
    effects();
    document.title = 'Bagdar — ' + (path === '/' ? (lang === 'kz' ? 'ЖОО-ға түсу және ауысу' : 'поступление и перевод в вузы') : (($('.topbar h1') || $('h1') || {}).textContent || ''));
    if (focusMain) { const m = $('#main'); m && m.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  };
  if (document.startViewTransition && !reduce) document.startViewTransition(paint); else paint();
}
// in-page anchors on landing (#features) shouldn't trigger router
window.addEventListener('hashchange', () => { const h = location.hash; if (h && !h.startsWith('#/')) { const el = document.getElementById(h.slice(1)); if (el) { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', '#/'); } return; } route(); });
document.documentElement.lang = lang === 'kz' ? 'kk' : 'ru';
route();
})();
