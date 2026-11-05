const {test}=require('node:test');
const assert=require('node:assert/strict');
const nodemailer=require('nodemailer');
let transportConfig, message;
nodemailer.createTransport=config=>{
  transportConfig=config;
  return {sendMail:async data=>{message=data;return {accepted:[data.to.address],rejected:[]};}};
};
const mail=require('../lib/mail');
test('missing SMTP settings fail closed; configured mail uses TLS and a bilingual code',async()=>{
  for(const key of ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','EMAIL_CODE_SECRET'])delete process.env[key];
  assert.equal(mail.mailConfigured(),false);
  assert.throws(()=>mail.assertMailConfigured(),e=>e.code==='e_mail_unavailable');
  Object.assign(process.env,{SMTP_HOST:'smtp.example.test',SMTP_PORT:'465',SMTP_USER:'sender@example.test',SMTP_PASSWORD:'test-only-password',EMAIL_CODE_SECRET:'test-only-secret-over-thirty-two-characters'});
  assert.equal(mail.mailConfigured(),true);
  await mail.sendCode('recipient@example.test','012345','recovery');
  assert.equal(transportConfig.secure,true);assert.equal(transportConfig.logger,false);
  assert.equal(message.to.address,'recipient@example.test');
  assert.ok(message.text.includes('012345')&&message.html.includes('012345'));
  assert.ok(message.subject.includes('Құпиясөз')&&message.subject.includes('Восстановление'));
  assert.ok(!JSON.stringify(message).includes('test-only-password'));
});
