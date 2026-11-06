const crypto = require('crypto');
const { query, transaction } = require('./db');
const { newId, sha, makeSalt, hashPassword, validEmail } = require('./http');
const { assertMailConfigured, sendCode } = require('./mail');

const TTL = 10 * 60 * 1000;
const norm = email => String(email || '').trim().toLowerCase();
const failure = (code, status = 400) => Object.assign(new Error(code), { code, status });
const digest = (id, purpose, code) => crypto.createHmac('sha256', process.env.EMAIL_CODE_SECRET).update(`${id}:${purpose}:${code}`).digest('hex');
const response = row => ({ needsVerification: true, challengeId: row.id, purpose: row.purpose,
  email: row.email, expiresAt: Number(row.expires_at), resendAt: Number(row.created_at) + 60000 });
const fakeResponse = (email, purpose) => response({ id: newId(), email, purpose, created_at: Date.now(), expires_at: Date.now() + TTL });

async function limit(key, windowMs, max) {
  const now = Date.now();
  const { rows } = await query(`INSERT INTO auth_email_limits (key,count,reset_at) VALUES ($1,1,$2)
    ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN auth_email_limits.reset_at <= $3 THEN 1 ELSE auth_email_limits.count+1 END,
      reset_at=CASE WHEN auth_email_limits.reset_at <= $3 THEN $2 ELSE auth_email_limits.reset_at END
    RETURNING count,reset_at`, [sha(key), now + windowMs, now]);
  if (Number(rows[0].count) > max) throw failure('e_email_rate', 429);
}
function ipOf(req) {
  return String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0,128);
}
async function sendLimits(req, email) {
  // Persistent limits work across all Vercel function instances.
  await limit('send-ip:' + ipOf(req), 3600000, 30);
  await limit('send-minute:' + email, 60000, 1);
  await limit('send-hour:' + email, 3600000, 6);
}

async function issue(email, purpose, payload = {}) {
  const now = Date.now(), id = newId();
  const code = String(crypto.randomInt(1000000)).padStart(6, '0');
  const row = { id, email, purpose, created_at: now, expires_at: now + TTL };
  await transaction(async q => {
    await q('UPDATE auth_email_challenges SET used_at=$1,reset_token_hash=NULL WHERE email=$2 AND purpose=$3 AND used_at IS NULL', [now,email,purpose]);
    await q(`INSERT INTO auth_email_challenges (id,email,purpose,code_hash,payload,created_at,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id,email,purpose,digest(id,purpose,code),JSON.stringify(payload),now,now+TTL]);
  });
  try { await sendCode(email, code, purpose); }
  catch (error) {
    await query('UPDATE auth_email_challenges SET used_at=$1 WHERE id=$2', [Date.now(),id]);
    throw error;
  }
  return response(row);
}

async function startRegistration(req, data) {
  assertMailConfigured();
  const email = norm(data.email);
  await sendLimits(req,email);
  if ((await query('SELECT 1 FROM users WHERE email=$1',[email])).rows.length) throw failure('e_taken');
  const salt = makeSalt();
  // The account is created only after email confirmation. No plaintext password is persisted.
  return issue(email,'signup',{ name:data.name,salt,hash:hashPassword(data.password,salt) });
}

async function requestRecovery(req, email) {
  assertMailConfigured(); email = norm(email);
  if (!validEmail(email)) throw failure('e_email');
  await sendLimits(req,email);
  const { rows } = await query('SELECT id,blocked FROM users WHERE email=$1',[email]);
  if (!rows[0] || rows[0].blocked) return fakeResponse(email,'recovery');
  return issue(email,'recovery');
}

async function requestVerification(req, email) {
  assertMailConfigured(); await sendLimits(req,email);
  return issue(email,'verify_email');
}

async function resend(req, data) {
  assertMailConfigured(); const email = norm(data.email);
  if (!validEmail(email)) throw failure('e_email');
  await sendLimits(req,email);
  const { rows } = await query('SELECT * FROM auth_email_challenges WHERE id=$1 AND email=$2',[String(data.challengeId||''),email]);
  const old = rows[0];
  if (!old) return fakeResponse(email,'recovery');
  if (old.used_at || Date.now() - Number(old.created_at) > 86400000) throw failure('e_email_code');
  if (old.purpose === 'signup' && (await query('SELECT 1 FROM users WHERE email=$1',[email])).rows.length) throw failure('e_taken');
  if (old.purpose !== 'signup') {
    const users = await query('SELECT id,blocked FROM users WHERE email=$1',[email]);
    if (!users.rows[0] || users.rows[0].blocked) return fakeResponse(email,'recovery');
  }
  return issue(email,old.purpose,old.payload);
}

async function verify(req, data) {
  assertMailConfigured();
  const id = String(data.challengeId || ''), email = norm(data.email), code = String(data.code || '').trim();
  if (!/^[0-9]{6}$/.test(code) || id.length > 100) throw failure('e_email_code');
  await limit('verify-ip:' + ipOf(req),600000,60);
  // Increment outside the credential transaction so failed attempts cannot roll back.
  const { rows } = await query(`UPDATE auth_email_challenges SET attempts=attempts+1
    WHERE id=$1 AND email=$2 AND used_at IS NULL AND expires_at>$3 AND attempts<5 RETURNING *`,[id,email,Date.now()]);
  const challenge = rows[0];
  if (!challenge) throw failure('e_email_code');
  const expected = Buffer.from(challenge.code_hash,'hex');
  const actual = Buffer.from(digest(id,challenge.purpose,code),'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected,actual)) throw failure('e_email_code');
  return transaction(async q => {
    const now = Date.now();
    const claimed = await q(`UPDATE auth_email_challenges SET used_at=$1 WHERE id=$2 AND used_at IS NULL
      AND expires_at>$1 RETURNING id`,[now,id]);
    if (!claimed.rows.length) throw failure('e_email_code');
    if (challenge.purpose === 'signup') {
      const p = challenge.payload;
      const inserted = await q(`INSERT INTO users(id,name,email,role,salt,hash,created_at,email_verified_at,last_login_at)
        VALUES ($1,$2,$3,'user',$4,$5,$6,$6,$6) ON CONFLICT (email) DO NOTHING RETURNING *`,
      [newId(),p.name,email,p.salt,p.hash,now]);
      if (!inserted.rows[0]) throw failure('e_taken');
      return { user: inserted.rows[0], purpose:'signup' };
    }
    const users = await q('SELECT * FROM users WHERE email=$1',[email]);
    if (!users.rows[0] || users.rows[0].blocked) throw failure('e_email_code');
    if (challenge.purpose === 'verify_email') {
      const updated = await q('UPDATE users SET email_verified_at=$1 WHERE email=$2 RETURNING *',[now,email]);
      return { user:updated.rows[0],purpose:'verify_email' };
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    await q('UPDATE auth_email_challenges SET reset_token_hash=$1,reset_expires_at=$2 WHERE id=$3',[sha(resetToken),now+TTL,id]);
    return { purpose:'recovery',resetToken };
  });
}

async function resetPassword(req, data) {
  const password = String(data.password || ''), token = String(data.resetToken || '');
  if (password.length < 8 || password.length > 200) throw failure('e_pw');
  if (!/^[a-f0-9]{64}$/.test(token)) throw failure('e_email_code');
  await limit('reset-ip:' + ipOf(req),600000,30);
  await transaction(async q => {
    const now = Date.now();
    const { rows } = await q(`UPDATE auth_email_challenges SET reset_token_hash=NULL
      WHERE reset_token_hash=$1 AND reset_expires_at>$2 AND purpose='recovery' RETURNING email`,[sha(token),now]);
    if (!rows[0]) throw failure('e_email_code');
    const email = rows[0].email;
    const users = await q('SELECT * FROM users WHERE email=$1',[email]);
    if (!users.rows[0] || users.rows[0].blocked) throw failure('e_email_code');
    const salt = makeSalt();
    await q('UPDATE users SET salt=$1,hash=$2,email_verified_at=COALESCE(email_verified_at,$3) WHERE email=$4',[salt,hashPassword(password,salt),now,email]);
    await q('DELETE FROM sessions WHERE user_id=$1',[users.rows[0].id]);
    await q('UPDATE auth_email_challenges SET used_at=$1,reset_token_hash=NULL WHERE email=$2',[now,email]);
  });
  return { ok:true };
}
module.exports = { startRegistration,requestRecovery,requestVerification,resend,verify,resetPassword };
