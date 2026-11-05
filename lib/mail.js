const nodemailer = require('nodemailer');

let transport;
function assertMailConfigured() {
  const ready = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD &&
    String(process.env.EMAIL_CODE_SECRET || '').length >= 32;
  if (!ready) { const error = new Error('Email service is not configured'); error.code = 'e_mail_unavailable'; error.status = 503; throw error; }
}

function mailConfigured() { try { assertMailConfigured(); return true; } catch { return false; } }

async function sendCode(email, code, purpose) {
  assertMailConfigured();
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true,
      logger: false, debug: false
    });
  }
  const recovery = purpose === 'recovery';
  const ru = recovery ? 'Восстановление пароля' : 'Подтверждение почты';
  const kk = recovery ? 'Құпиясөзді қалпына келтіру' : 'Электрондық поштаны растау';
  const text = `Bagdar / Бағдар\n\n${kk}\nКодыңыз: ${code}\nКод 10 минут бойы жарамды. Оны ешкімге айтпаңыз.\n\n${ru}\nВаш код: ${code}\nКод действует 10 минут. Никому его не сообщайте.\n\nЕгер сіз бұл әрекетті сұрамаған болсаңыз, хатты елемеңіз.\nЕсли вы не запрашивали это действие, проигнорируйте письмо.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#17243a"><h1>Bagdar / Бағдар</h1><h2>${kk}</h2><p>Сайтта төмендегі кодты енгізіңіз. Код 10 минут бойы жарамды.</p><h2>${ru}</h2><p>Введите код на сайте. Он действует 10 минут.</p><p style="font-size:36px;font-weight:bold;letter-spacing:6px;padding:20px;background:#eef6f2;text-align:center">${code}</p><p>Кодты ешкімге айтпаңыз. Никому не сообщайте код.</p><hr><p>Егер сіз бұл әрекетті сұрамаған болсаңыз, хатты елемеңіз.<br>Если вы не запрашивали это действие, проигнорируйте письмо.</p></div>`;
  try {
    const info = await transport.sendMail({
      from: { name: 'Bagdar / Бағдар', address: process.env.SMTP_FROM || process.env.SMTP_USER },
      to: { address: email }, subject: `Bagdar — ${kk} / ${ru}`, text, html
    });
    if (info.rejected?.length || !info.accepted?.length) throw new Error('SMTP did not accept recipient');
  } catch {
    // Do not log credentials, codes, or full SMTP errors.
    const error = new Error('Email delivery failed'); error.code = 'e_mail_unavailable'; error.status = 503; throw error;
  }
}
module.exports = { assertMailConfigured, mailConfigured, sendCode };
