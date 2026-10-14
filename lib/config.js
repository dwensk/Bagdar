// Bagdar — настройки сервера.
// Цена и срок должны совпадать с assets/js/config.js (там они только для показа на странице).
module.exports = {
  PRICE_KZT: 2000,      // сколько стоит подписка Pro
  PERIOD_DAYS: 30,      // на сколько дней она даётся
  SESSION_DAYS: 7,      // сколько живёт вход в аккаунт
  HISTORY_MAX: 50,      // сколько расчётов храним на одного пользователя
  // Администратор — только аккаунты с этими e-mail. Список задаётся переменной ADMIN_EMAILS в Vercel
  // (через запятую), поэтому в коде сайта его не видно. Все остальные — обычные пользователи.
  ADMIN_EMAILS: String(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
};
