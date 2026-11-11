const {test}=require('node:test');
const assert=require('node:assert/strict');
const excel=require('../assets/js/excel');
const now=Date.UTC(2026,10,12);
const users=[{id:'u1',name:'Әділ & Тест',email:'user@example.test',role:'user',emailVerified:true,createdAt:now,paidUntil:now+86400000,hash:'NEVER_EXPORT_HASH'},
  {id:'u2',name:'Manual access',email:'manual@example.test',role:'user',createdAt:now,paidUntil:now+86400000}];
const payment=(id,status,amount=2000)=>({id,userId:'u1',email:'user@example.test',amount,status,createdAt:now,method:'kaspi',note:'Отправитель'});
test('Excel buyers count confirmed payments only; manually granted access is not a purchase',()=>{
  const tables=excel.tables(users,[payment('p1','paid'),payment('p2','paid',3000),payment('p3','pending'),payment('p4','rejected'),payment('p5','demo')],{now});
  assert.deepEqual(tables.map(s=>s.rows.length),[1,2,5]);
  assert.equal(tables[0].rows[0][2],2);assert.equal(tables[0].rows[0][3].value,5000);
  assert.equal(tables[0].rows[0][6],'Активен');
  assert.equal(tables[1].rows.find(r=>r[1]==='manual@example.test')[6],0);
  assert.equal(tables[2].rows.find(r=>r[7]==='p3')[5],'Ждёт подтверждения');
});
test('Excel retains payments of deleted users and localizes Kazakh headings',()=>{
  const tables=excel.tables([], [payment('orphan','paid')],{lang:'kz',now});
  assert.equal(tables[0].name,'Сатып алушылар');
  assert.equal(tables[0].rows[0][1],'user@example.test');
  assert.equal(tables[0].rows[0][6],'Аккаунт жойылған');
});
test('XLSX contains escaped inline text, valid ZIP markers and no credential fields',()=>{
  const bytes=excel.build([{...users[0],name:'=HYPERLINK("bad") & Әділ'}],[payment('p1','paid')],{now});
  const text=Buffer.from(bytes).toString('utf8');
  assert.equal(new DataView(bytes.buffer,bytes.byteOffset).getUint32(0,true),0x04034b50);
  assert.ok(text.includes('t="inlineStr"'));
  assert.ok(text.includes('=HYPERLINK(&quot;bad&quot;) &amp; Әділ'));
  assert.ok(!text.includes('<f>'));assert.ok(!text.includes('NEVER_EXPORT_HASH'));
});
