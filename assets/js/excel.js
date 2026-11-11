/* Native .xlsx report. Text uses inline strings, so names cannot become formulas. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.BagdarExcel=factory();
})(typeof window!=='undefined'?window:this,function(){
  const enc=new TextEncoder();
  const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const normal=s=>String(s||'').trim().toLowerCase();
  const date=v=>v&&Number.isFinite(Number(v))?{value:Number(v)/86400000+25569+5/24,style:3}:''; // Display Kazakhstan UTC+5.
  const money=v=>({value:Number(v)||0,style:2});
  const words={
    ru:{sheets:['Покупатели','Пользователи','Платежи'],yes:'Да',no:'Нет',admin:'Администратор',user:'Пользователь',blocked:'Заблокирован',active:'Активен',inactive:'Не активен',missing:'Аккаунт удалён',paid:'Подтверждено',pending:'Ждёт подтверждения',rejected:'Отклонено',demo:'Тестовая',
      buyers:['Имя','E-mail','Подтверждённых оплат','Оплачено, ₸','Последняя оплата (UTC+5)','Доступ до (UTC+5)','Статус доступа'],
      users:['Имя','E-mail','Роль','Почта подтверждена','Статус доступа','Доступ до (UTC+5)','Подтверждённых оплат','Оплачено, ₸','Регистрация (UTC+5)','ID пользователя'],
      payments:['Дата (UTC+5)','Пользователь','E-mail','Отправитель перевода','Сумма, ₸','Статус оплаты','Способ','ID платежа']},
    kz:{sheets:['Сатып алушылар','Пайдаланушылар','Төлемдер'],yes:'Иә',no:'Жоқ',admin:'Әкімші',user:'Пайдаланушы',blocked:'Бұғатталған',active:'Белсенді',inactive:'Белсенді емес',missing:'Аккаунт жойылған',paid:'Расталды',pending:'Растауды күтуде',rejected:'Қабылданбады',demo:'Сынақтық',
      buyers:['Аты','E-mail','Расталған төлемдер саны','Төленген сома, ₸','Соңғы төлем (UTC+5)','Қолжетімділік мерзімі (UTC+5)','Қолжетімділік күйі'],
      users:['Аты','E-mail','Рөлі','Пошта расталған','Қолжетімділік күйі','Қолжетімділік мерзімі (UTC+5)','Расталған төлемдер саны','Төленген сома, ₸','Тіркелген күні (UTC+5)','Пайдаланушы ID'],
      payments:['Күні (UTC+5)','Пайдаланушы','E-mail','Аударым жіберуші','Сома, ₸','Төлем күйі','Тәсілі','Төлем ID']}
  };
  function tables(users,payments,options={}){
    const w=words[options.lang==='kz'?'kz':'ru'],now=options.now??Date.now();
    const ids=new Map(users.map(u=>[u.id,u])),emails=new Map(users.map(u=>[normal(u.email),u]));
    const person=p=>ids.get(p.userId)||emails.get(normal(p.email));
    const access=u=>!u?w.missing:u.blocked?w.blocked:u.role==='admin'?w.admin:Number(u.paidUntil)>now?w.active:w.inactive;
    const buyers=new Map();
    for(const p of payments){
      if(p.status!=='paid')continue;
      const u=person(p),key=u?.id||'email:'+(normal(p.email)||p.id);
      const item=buyers.get(key)||{user:u,email:u?.email||p.email,name:u?.name||w.missing,count:0,total:0,last:0};
      item.count++;item.total+=Number(p.amount)||0;item.last=Math.max(item.last,Number(p.createdAt)||0);buyers.set(key,item);
    }
    const buyerRows=[...buyers.values()].sort((a,b)=>b.total-a.total||b.last-a.last).map(b=>[b.name,b.email,b.count,money(b.total),date(b.last),date(b.user?.paidUntil),access(b.user)]);
    const userRows=[...users].sort((a,b)=>Number(b.createdAt)-Number(a.createdAt)).map(u=>{const b=buyers.get(u.id);return [u.name,u.email,u.role==='admin'?w.admin:w.user,u.emailVerified?w.yes:w.no,access(u),date(u.paidUntil),b?.count||0,money(b?.total||0),date(u.createdAt),u.id];});
    const paymentRows=[...payments].sort((a,b)=>Number(b.createdAt)-Number(a.createdAt)).map(p=>[date(p.createdAt),person(p)?.name||w.missing,p.email,p.note||'',money(p.amount),w[p.status]||String(p.status||''),p.method==='kaspi'?'Kaspi':p.method==='card'?(options.lang==='kz'?'Карта':'Карта'):String(p.method||''),p.id]);
    return [
      {name:w.sheets[0],headers:w.buyers,rows:buyerRows,widths:[28,36,23,22,27,27,24]},
      {name:w.sheets[1],headers:w.users,rows:userRows,widths:[28,36,22,23,24,27,23,22,27,40]},
      {name:w.sheets[2],headers:w.payments,rows:paymentRows,widths:[27,28,36,30,22,25,16,40]}
    ];
  }
  const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  function sheet(data){
    const rows=[data.headers,...data.rows],end=col(data.headers.length-1)+rows.length;
    const cells=rows.map((row,i)=>'<row r="'+(i+1)+'"'+(!i?' ht="34" customHeight="1"':'')+'>'+row.map((v,j)=>{
      const ref=col(j)+(i+1),style=!i?1:typeof v==='object'&&v?v.style||0:0;
      const value=typeof v==='object'&&v?v.value:v;
      return typeof value==='number'&&Number.isFinite(value)?`<c r="${ref}" s="${style}"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join('')+'</row>').join('');
    return declaration+`<worksheet xmlns="${ns}"><dimension ref="A1:${end}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="19"/><cols>${data.widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${cells}</sheetData><autoFilter ref="A1:${end}"/></worksheet>`;
  }
  // ZIP "stored" entries keep this small report dependency-free and valid in desktop Excel.
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
  const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;};
  function zip(files){
    const entries=[],central=[];let offset=0;
    for(const [filename,text] of Object.entries(files)){
      const name=enc.encode(filename),data=enc.encode(text),sum=crc(data);
      const h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
      const c=new Uint8Array(46),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,sum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);
      entries.push(h,name,data);central.push(c,name);offset+=h.length+name.length+data.length;
    }
    const directory=concat(central),end=new Uint8Array(22),e=new DataView(end.buffer),count=Object.keys(files).length;
    e.setUint32(0,0x06054b50,true);e.setUint16(8,count,true);e.setUint16(10,count,true);e.setUint32(12,directory.length,true);e.setUint32(16,offset,true);
    return concat([...entries,directory,end]);
  }
  function build(users,payments,options={}){
    const list=tables(users,payments,options);
    const files={
      '[Content_Types].xml':declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+list.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>',
      '_rels/.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':declaration+`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>`+list.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>',
      'xl/_rels/workbook.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+list.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${list.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml':declaration+`<styleSheet xmlns="${ns}"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0&quot; ₸&quot;"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
    };
    list.forEach((s,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=sheet(s);});
    return zip(files);
  }
  return {build,tables};
});
