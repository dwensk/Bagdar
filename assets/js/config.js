/* Bagdar — настройки сайта. Меняйте здесь, а не в коде. */
window.BAGDAR_CONFIG = {
  // 'demo' — оплата тестовая: подписка оформляется на сервере, но деньги не списываются.
  MODE: 'demo',
  PRICE_KZT: 2000,          // цена подписки Pro (для показа; сервер берёт цену из lib/config.js — меняйте в обоих местах)
  PERIOD_DAYS: 30,          // срок подписки (так же: lib/config.js)
  // Код администратора теперь хранится только на сервере (lib/config.js и переменная ADMIN_INVITE_CODE в Vercel).
  SUPPORT: 'Telegram:@dimashqwk'
};
