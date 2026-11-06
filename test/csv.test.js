const {test}=require('node:test');
const assert=require('node:assert/strict');
const csv=require('../assets/js/csv');
test('CSV preserves Unicode, quotes and confirmation dates without credential fields',()=>{
  const output=csv.users([{id:'id-1',name:'Әділ, "Тест"',email:'user@example.test',role:'user',emailVerified:true,emailVerifiedAt:1760000000000,createdAt:1760000000000,hash:'do-not-export',salt:'secret',token:'do-not-export'}]);
  assert.ok(output.startsWith('\ufeff'));assert.ok(output.includes('"Әділ, ""Тест"""'));
  assert.ok(output.includes('"email_verified"'));assert.ok(output.includes('"true"'));
  assert.ok(output.includes('2025-10-09T08:53:20.000Z'));
  assert.ok(!output.includes('do-not-export')&&!output.includes('secret'));
});
test('untrusted names cannot become Excel formulas; legacy users remain unverified',()=>{
  for(const name of ['=HYPERLINK("x")',' +1','@SUM(1)','-2','\tformula']){
    const output=csv.users([{id:'id-2',name,email:'user@example.test',role:'user',createdAt:1760000000000}]);
    assert.ok(output.includes('"\''));assert.ok(output.includes('"false"'));
  }
});
