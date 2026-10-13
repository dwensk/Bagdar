/* Bagdar — связь сайта с сервером (API на Vercel, база PostgreSQL).
   Аккаунты, оплаты, история и чек-листы хранятся в базе на сервере.
   В браузере лежит только токен входа (bagdar:token) и копия данных для быстрой отрисовки. */
window.Store = (() => {
  const TOKEN = 'bagdar:token';
  const DAY = 864e5;
  let token = null;
  try { token = localStorage.getItem(TOKEN); } catch (e) {}

  // копия данных с сервера
  let st = { user: null, payments: [], checks: {}, admin: { users: [], payments: [], stats: { users: 0, active: 0, revenue: 0, admins: 0 } } };

  // запрос к API; при ошибке бросает код ошибки (ключ из i18n)
  async function api(path, opts = {}) {
    let r;
    try {
      r = await fetch(path, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) { throw 'e_generic'; } // нет интернета или сервер недоступен
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { setToken(null); st.user = null; }
    if (!r.ok && !data.errs) throw data.error || 'e_generic';
    return data;
  }
  function setToken(t) { token = t; try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch (e) {} }

  // загрузить всё о пользователе (вызывается при открытии сайта и после входа)
  async function init() {
    if (!token) return;
    try {
      const d = await api('/api/me');
      st.user = d.user; st.payments = d.payments; st.checks = d.checks;
      window.History && History.setAll(d.history);
      if (d.user.role === 'admin') await loadAdmin();
    } catch (e) { if (!token) st.user = null; }
  }
  async function loadAdmin() { try { st.admin = await api('/api/admin'); } catch (e) {} }

  const me = () => st.user;
  const isPaid = u => !!u && (u.role === 'admin' || (u.paidUntil || 0) > Date.now());
  const daysLeft = u => u && u.paidUntil > Date.now() ? Math.ceil((u.paidUntil - Date.now()) / DAY) : 0;

  async function auth(action, data) {
    const d = await api('/api/auth?action=' + action, { method: 'POST', body: data });
    if (d.errs) return { errs: d.errs };
    setToken(d.token);
    await init();
    return { user: d.user };
  }
  const register = data => auth('register', data);
  const login = data => auth('login', data);
  function logout() {
    if (token) api('/api/auth?action=logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    st.user = null; st.payments = []; st.checks = {};
    window.History && History.setAll([]);
  }

  // заявка на оплату через Kaspi: sender — имя отправителя перевода
  async function pay(sender) {
    const d = await api('/api/pay', { method: 'POST', body: { sender } });
    st.payments = [d.payment].concat(st.payments.filter(p => p.id !== d.payment.id));
    return d.payment;
  }
  const myPayments = () => st.payments;
  const pending = () => st.payments.find(p => p.status === 'pending') || null;

  // ── admin ──
  const users = () => st.admin.users;
  const payments = () => st.admin.payments;
  const stats = () => st.admin.stats;
  async function adminAction(action, id) { st.admin = await api('/api/admin', { method: 'POST', body: { action, id } }); }
  const grant = id => adminAction('grant', id);
  const revoke = id => adminAction('revoke', id);
  const toggleBlock = id => adminAction('block', id);
  const remove = id => adminAction('delete', id);
  const payAction = (action, id) => adminAction(action, id); // confirm | reject заявки на оплату

  // ── чек-листы документов ──
  const getChecks = list => st.checks[list] || {};
  function setCheck(list, key, val) {
    (st.checks[list] = st.checks[list] || {})[key] = !!val; // сразу на экране
    api('/api/checks', { method: 'POST', body: { list, key, val: !!val } }).catch(() => {}); // и на сервер
  }

  return { api, init, loadAdmin, me, isPaid, daysLeft, register, login, logout, pay, myPayments, pending, payAction, users, payments, stats, grant, revoke, toggleBlock, remove, getChecks, setCheck };
})();
