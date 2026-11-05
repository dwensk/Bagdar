const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { newDb } = require('pg-mem');

process.env.EMAIL_CODE_SECRET = 'test-only-secret-with-more-than-thirty-two-characters';
process.env.ADMIN_EMAILS = 'admin@example.test';
const memory = newDb();
const pool = new (memory.adapters.createPg().Pool)();
const db = require('../lib/db');
const driver = (text,params=[]) => pool.query(text,params);
driver.transaction = async fn => {
  const snapshot=memory.backup();
  try{return await fn(driver);}catch(error){snapshot.restore();throw error;}
};
db.setDriver(driver);
const deliveries=[];
let failMail=false;
require.cache[require.resolve('../lib/mail')] = {exports:{
  assertMailConfigured:()=>{},
  sendCode:async(email,code,purpose)=>{
    if(failMail)throw Object.assign(new Error('test mail failure'),{code:'e_mail_unavailable',status:503});
    deliveries.push({email,code,purpose});
  }
}};
const auth=require('../api/auth');
const {makeSalt,hashPassword,checkPassword}=require('../lib/http');
let now=Date.now();
const originalNow=Date.now;
Date.now=()=>now;
after(async()=>{Date.now=originalNow;await pool.end();});
let sequence=0;
async function call(action,body={},options={}) {
  const req={method:'POST',url:'/api/auth?action='+action,body,
    headers:{'x-vercel-forwarded-for':options.ip||'test-'+(++sequence),...(options.token?{authorization:'Bearer '+options.token}:{})}};
  let result;
  const res={setHeader(){},end(text){result={status:this.statusCode,body:JSON.parse(text)};}};
  await auth(req,res);return result;
}
const lastCode=email=>deliveries.filter(d=>d.email===email).at(-1)?.code;
async function signup(email='student'+sequence+'@example.test') {
  const sent=await call('register',{name:'Тест Әділ',email,password:'old-password-123',role:'admin'});
  assert.equal(sent.status,202);assert.equal(sent.body.token,undefined);
  const verified=await call('verify-code',{...sent.body,code:lastCode(email)});
  assert.equal(verified.status,201);return {...verified.body,email};
}

test('registration requires proof, stores only a keyed code hash, and rejects replay',async()=>{
  const email='signup@example.test';
  const sent=await call('register',{name:'Тест',email,password:'old-password-123',role:'admin'});
  assert.equal(sent.status,202);
  assert.equal((await db.query('select * from users where email=$1',[email])).rows.length,0);
  const row=(await db.query('select * from auth_email_challenges where email=$1',[email])).rows[0];
  assert.match(lastCode(email),/^\d{6}$/);assert.match(row.code_hash,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(row).includes('old-password-123'));assert.notEqual(row.code_hash,lastCode(email));
  const attempt=await call('verify-code',{...sent.body,code:lastCode(email),email:'other@example.test'});
  assert.equal(attempt.status,400);
  const verified=await call('verify-code',{...sent.body,code:lastCode(email)});
  assert.equal(verified.status,201);assert.equal(verified.body.user.emailVerified,true);
  assert.equal(verified.body.user.role,'user');assert.ok(verified.body.token);
  const replay=await call('verify-code',{...sent.body,code:lastCode(email)});assert.equal(replay.status,400);
});

test('five wrong attempts lock the challenge; resend has a persistent cooldown',async()=>{
  const email='locked@example.test';
  const sent=await call('register',{name:'Locked',email,password:'old-password-123'});
  assert.equal(sent.status,202);
  const repeat=await call('resend-code',sent.body);assert.equal(repeat.status,429);
  const wrong=lastCode(email)==='000000'?'999999':'000000';
  for(let i=0;i<5;i++)assert.equal((await call('verify-code',{...sent.body,code:wrong})).status,400);
  assert.equal((await call('verify-code',{...sent.body,code:lastCode(email)})).status,400);
  now+=61000;
  const next=await call('resend-code',sent.body);assert.equal(next.status,200);
  assert.notEqual(next.body.challengeId,sent.body.challengeId);
  assert.equal((await call('verify-code',{...next.body,code:lastCode(email)})).status,201);
});

test('expired signup codes cannot create an account',async()=>{
  const email='expired@example.test';
  const sent=await call('register',{name:'Expired',email,password:'old-password-123'});
  now+=600001;
  assert.equal((await call('verify-code',{...sent.body,code:lastCode(email)})).status,400);
  assert.equal((await db.query('select * from users where email=$1',[email])).rows.length,0);
});

test('recovery requires a separate one-time ticket and revokes all previous sessions',async()=>{
  const account=await signup('recovery@example.test');now+=61000;
  const second=await call('login',{email:account.email,password:'old-password-123'});assert.equal(second.status,200);
  const sent=await call('forgot',{email:account.email});assert.equal(sent.status,200);
  assert.equal((await call('reset-password',{password:'new-password-123'})).status,400);
  const verified=await call('verify-code',{...sent.body,code:lastCode(account.email)});
  assert.equal(verified.body.purpose,'recovery');assert.equal(verified.body.token,undefined);
  assert.match(verified.body.resetToken,/^[a-f0-9]{64}$/);
  const done=await call('reset-password',{resetToken:verified.body.resetToken,password:'new-password-123'});
  assert.equal(done.status,200);
  assert.equal((await db.query('select * from sessions where user_id=$1',[account.user.id])).rows.length,0);
  assert.equal((await call('login',{email:account.email,password:'old-password-123'})).status,400);
  assert.equal((await call('login',{email:account.email,password:'new-password-123'})).status,200);
  assert.equal((await call('reset-password',{resetToken:verified.body.resetToken,password:'another-password'})).status,400);
});

test('unknown recovery address gets the same response shape without email or an account',async()=>{
  const before=deliveries.length;
  const result=await call('forgot',{email:'missing@example.test'});
  assert.equal(result.status,200);assert.equal(result.body.purpose,'recovery');assert.ok(result.body.challengeId);
  assert.equal(deliveries.length,before);
  assert.equal((await call('verify-code',{...result.body,code:'123456'})).status,400);
});

test('failed mail delivery does not create a user and invalidates the pending code',async()=>{
  failMail=true;
  try{
    const email='mail-failed@example.test';
    const result=await call('register',{name:'Failed',email,password:'old-password-123'});
    assert.equal(result.status,503);
    assert.equal((await db.query('select * from users where email=$1',[email])).rows.length,0);
    assert.ok((await db.query('select * from auth_email_challenges where email=$1',[email])).rows[0].used_at);
  }finally{failMail=false;}
});

test('existing accounts keep access and are not falsely marked verified',async()=>{
  const salt=makeSalt(),id='legacy-account';
  await db.query(`insert into users(id,name,email,salt,hash,created_at,paid_until) values($1,$2,$3,$4,$5,$6,$7)`,
    [id,'Existing','legacy@example.test',salt,hashPassword('old-password-123',salt),now,now+86400000]);
  const login=await call('login',{email:'legacy@example.test',password:'old-password-123'});
  assert.equal(login.status,200);assert.equal(login.body.user.emailVerified,false);
  const sent=await call('send-verification',{}, {token:login.body.token});
  assert.equal(sent.status,200);assert.equal(sent.body.purpose,'verify_email');
  const result=await call('verify-code',{...sent.body,code:lastCode('legacy@example.test')},{token:login.body.token});
  assert.equal(result.status,200);assert.equal(result.body.user.emailVerified,true);
  const stored=(await db.query('select * from users where id=$1',[id])).rows[0];
  assert.ok(checkPassword('old-password-123',stored.salt,stored.hash));assert.ok(Number(stored.paid_until)>now);
});
