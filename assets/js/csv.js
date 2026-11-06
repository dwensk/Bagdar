/* User-directory CSV: quoted UTF-8 with BOM for Excel; neutralizes formula cells. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.BagdarCSV=factory();
})(typeof window!=='undefined'?window:this,function(){
  const iso=value=>value?new Date(value).toISOString():'';
  function cell(value){
    let text=String(value??'');
    if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function users(items){
    const rows=[['id','name','email','role','email_verified','email_verified_at','last_login_at','paid_until','blocked','created'],
      ...items.map(u=>[u.id,u.name,u.email,u.role,!!u.emailVerified,iso(u.emailVerifiedAt),iso(u.lastLoginAt),iso(u.paidUntil),!!u.blocked,iso(u.createdAt)])];
    return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
  }
  return {users};
});
