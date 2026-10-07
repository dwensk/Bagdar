/* Bagdar — демо-бэкенд в браузере.
   Пароли хранятся как PBKDF2-SHA256 (150 000 итераций) с солью, не в открытом виде.
   Все данные — только в этом браузере. Для реального продукта замените этот модуль на сервер (README). */
window.Store = (() => {
  const KEY = 'bagdar:v1';
  const DAY = 864e5;
  const empty = () => ({ users: [], payments: [], session: null, checks: {} });
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || empty(); } catch (e) { db = empty(); }
  for (const k of Object.keys(empty())) if (db[k] === undefined) db[k] = empty()[k];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const salt = () => hex(crypto.getRandomValues(new Uint8Array(16)));

  async function hashPw(pw, s) {
    if (!(crypto && crypto.subtle)) throw 'e_crypto';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(s), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return hex(bits);
  }
  const norm = e => String(e || '').trim().toLowerCase();
  const pub = u => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, paidUntil: u.paidUntil || 0, blocked: !!u.blocked });
  const byId = i => db.users.find(u => u.id === i);

  function me() {
    const s = db.session;
    if (!s || s.exp < Date.now()) return null;
    const u = byId(s.userId);
    if (!u || u.blocked) return null;
    return pub(u);
  }
  const isPaid = u => !!u && (u.role === 'admin' || (u.paidUntil || 0) > Date.now());
  const daysLeft = u => u && u.paidUntil > Date.now() ? Math.ceil((u.paidUntil - Date.now()) / DAY) : 0;

  async function register({ name, email, password, role, code }) {
    const errs = {};
    email = norm(email); name = String(name || '').trim();
    if (name.length < 2) errs.name = 'e_name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.email = 'e_email';
    else if (db.users.some(u => u.email === email)) errs.email = 'e_taken';
    if (String(password || '').length < 8) errs.password = 'e_pw';
    if (role === 'admin' && code !== window.BAGDAR_CONFIG.ADMIN_INVITE_CODE) errs.code = 'e_code';
    if (Object.keys(errs).length) return { errs };
    const s = salt();
    const u = { id: id(), name, email, role: role === 'admin' ? 'admin' : 'user', salt: s, hash: await hashPw(password, s), createdAt: Date.now(), paidUntil: 0, blocked: false };
    db.users.push(u);
    db.session = { userId: u.id, exp: Date.now() + 7 * DAY };
    save();
    return { user: pub(u) };
  }
  async function login({ email, password }) {
    const u = db.users.find(x => x.email === norm(email));
    if (!u) return { errs: { form: 'e_login' } };
    const h = await hashPw(String(password || ''), u.salt);
    if (h !== u.hash) return { errs: { form: 'e_login' } };
    if (u.blocked) return { errs: { form: 'e_blocked' } };
    db.session = { userId: u.id, exp: Date.now() + 7 * DAY };
    save();
    return { user: pub(u) };
  }
  function logout() { db.session = null; save(); }

  function pay(method) {
    const m = me(); if (!m) return null;
    const u = byId(m.id);
    const cfg = window.BAGDAR_CONFIG;
    u.paidUntil = Math.max(Date.now(), u.paidUntil || 0) + cfg.PERIOD_DAYS * DAY;
    const p = { id: id(), userId: u.id, email: u.email, amount: cfg.PRICE_KZT, method, status: 'demo', createdAt: Date.now() };
    db.payments.unshift(p); save();
    return p;
  }
  const myPayments = () => { const m = me(); return m ? db.payments.filter(p => p.userId === m.id) : []; };

  // ── admin ──
  const guard = () => { const m = me(); if (!m || m.role !== 'admin') throw 'e_forbidden'; return m; };
  const users = () => { guard(); return db.users.map(pub); };
  const payments = () => { guard(); return db.payments.slice(); };
  function grant(uid, days) { guard(); const u = byId(uid); if (!u) return; u.paidUntil = Math.max(Date.now(), u.paidUntil || 0) + days * DAY; save(); }
  function revoke(uid) { guard(); const u = byId(uid); if (!u) return; u.paidUntil = 0; save(); }
  function toggleBlock(uid) { const m = guard(); const u = byId(uid); if (!u || u.id === m.id) return; u.blocked = !u.blocked; save(); }
  function remove(uid) { const m = guard(); if (uid === m.id) return; db.users = db.users.filter(u => u.id !== uid); delete db.checks[uid]; save(); }
  function stats() {
    guard();
    const now = Date.now(), monthAgo = now - 30 * DAY;
    return {
      users: db.users.filter(u => u.role === 'user').length,
      active: db.users.filter(u => u.role === 'user' && u.paidUntil > now).length,
      revenue: db.payments.filter(p => p.createdAt > monthAgo).reduce((s, p) => s + p.amount, 0),
      admins: db.users.filter(u => u.role === 'admin').length
    };
  }
  // ── per-user checklists ──
  function getChecks(list) { const m = me(); return (m && db.checks[m.id] && db.checks[m.id][list]) || {}; }
  function setCheck(list, key, val) { const m = me(); if (!m) return; db.checks[m.id] = db.checks[m.id] || {}; db.checks[m.id][list] = db.checks[m.id][list] || {}; db.checks[m.id][list][key] = !!val; save(); }

  return { me, isPaid, daysLeft, register, login, logout, pay, myPayments, users, payments, grant, revoke, toggleBlock, remove, stats, getChecks, setCheck };
})();
