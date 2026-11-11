// ================= IMPORT / EXPORT (Excel) =================
let _xlsxP=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(_xlsxP)return _xlsxP;_xlsxP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=()=>res(window.XLSX);s.onerror=()=>{_xlsxP=null;rej(new Error('مقدرتش أحمّل مكتبة Excel، اتأكد من النت'))};document.head.appendChild(s)});return _xlsxP}
const nz=s=>String(s??'').trim().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ـ]/g,'').replace(/\s+/g,' ').toLowerCase();
const byNm=(list,name)=>{const k=nz(name);return k?list.find(x=>nz(x.name)===k):null};
const numv=v=>{if(v===''||v==null)return 0;if(typeof v==='number')return v;const t=String(v).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,،\s]/g,'').replace('٫','.');const n=parseFloat(t);return isNaN(n)?NaN:n};
const UNIT_W={'كيلو':'g','كجم':'g','كيلوجرام':'g','جرام':'g','جم':'g','وزن':'g','g':'g','kg':'g','لتر':'ml','سايل':'ml','مل':'ml','ml':'ml','l':'ml','قطعه':'pc','قطعة':'pc','عدد':'pc','pc':'pc','متر':'m','طول':'m','m':'m'};
const baseOf=w=>UNIT_W[nz(w).replace('ه','ه')]||UNIT_W[String(w||'').trim()]||null;
const BASE_W={g:'كيلو',ml:'لتر',pc:'قطعة',m:'متر'};
function dateOf(v){if(v==null||v==='')return '';if(v instanceof Date){const d=new Date(v.getTime()-v.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)}
 if(typeof v==='number'&&window.XLSX){const p=XLSX.SSF.parse_date_code(v);if(p)return p.y+'-'+String(p.m).padStart(2,'0')+'-'+String(p.d).padStart(2,'0')}
 const s=String(v).trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')}return null}
function treByName(s){const k=nz(s).replace(/[-–—_]/g,' ').replace(/\s+/g,'');if(!k)return null;return S.treasuries.find(t=>{const a=nz(t.holder+t.method).replace(/\s+/g,''),b=nz(t.method+t.holder).replace(/\s+/g,'');return k===a||k===b||k===nz(t.id)})}
const brandOf=s=>{const k=nz(s);if(!k)return 'melt';const b=S.brands.find(x=>nz(x.name)===k||nz(x.id)===k||nz(x.name).includes(k));if(b)return b.id;if(/مويو|moyou|moy/.test(k))return 'b2';if(/ميلت|melt/.test(k))return 'melt';return null};

const TPL={
 'الخامات':{cols:['الاسم','النوع','بتتقاس بـ','العبوة الأساسية','العبوة فيها','عبوات تانية','وزن القطعة جرام','حد التنبيه بالعبوة'],ex:['دقيق','خامة','كيلو','شكارة 25','24.5','كيلو=1، شكارة 50=50','','2']},
 'الموردين':{cols:['الاسم','الموبايل','التعامل','مدة الآجل','رصيد افتتاحي له'],ex:['شركة البركة','01000000000','آجل','15','0']},
 'العملاء':{cols:['الاسم','البراند','التصنيف','الموبايل','التعامل','مدة الآجل','حد المديونية','خصم %','العنوان','رصيد افتتاحي عليه'],ex:['كافيه روز','MELT','كافيه','01000000000','آجل','15','5000','0','المعادي','0']},
 'أسعار الموردين':{cols:['الخامة','المورد','الجودة','سعر العبوة الأساسية'],ex:['دقيق','شركة البركة','','535']},
 'المنتجات':{cols:['الاسم','الاسم بالإنجليزي','البراند','النوع','سعر البيع','قطع في الكرتونة','الوزن'],ex:['فادج كيك','Fudge Cake','MELT','ميني','45','12','1']},
 'رصيد أول المدة':{cols:['النوع','الصنف','عبوات','فكة','تكلفة العبوة'],ex:['خامة','دقيق','2','10','535']},
 'الجرد':{cols:['النوع','الصنف','عبوات','فكة','رصيد السيستم (للعلم)'],ex:['خامة','دقيق','1','7.5','']},
 'فواتير الشرا':{cols:['رقم الفاتورة','التاريخ','المورد','الخامة','العبوة','العدد','فكة','سعر العبوة','المدفوع','الخزنة','ملاحظات'],ex:['1','2026-11-02','شركة البركة','دقيق','','2','','535','1070','مختار كاش','']},
 'فواتير البيع':{cols:['رقم الفاتورة','التاريخ','العميل','المنتج','الكمية','سعر القطعة','المندوب','المدفوع','الخزنة','ملاحظات'],ex:['1','2026-11-03','كافيه روز','فادج كيك','24','','','500','حمزة كاش','']}
};
const HELP=[['ورقة','إزاي تملاها'],
 ['عام','الصف الأول عناوين، ما تغيرهاش. الأسماء لازم تبقى نفس أسماء السيستم بالظبط (المسافات والهمزات مش مشكلة). أي ورقة مش محتاجها سيبها فاضية أو امسحها.'],
 ['الخامات','بتتقاس بـ: كيلو أو لتر أو قطعة أو متر. العبوة فيها: بنفس الوحدة (شكارة 25 = 24.5 كيلو). عبوات تانية: اسم=كمية مفصولين بفاصلة (كرتونة=16، كيلو=1). لو الاسم موجود بيتحدّث، ولو جديد بيتضاف. الرصيد ما بيتغيرش من هنا.'],
 ['الموردين / العملاء','التعامل: كاش أو آجل. البراند: MELT أو MoYou. الرصيد الافتتاحي: اللي ليه أو عليه قبل السيستم.'],
 ['أسعار الموردين','السعر للعبوة الأساسية بتاعة الخامة.'],
 ['المنتجات','النوع: ميني أو تورتة. لو السعر اتغير في منتج موجود، بيتسجل في سجل الأسعار.'],
 ['رصيد أول المدة','النوع: خامة أو نص مصنع أو منتج. للخامة: عبوات + فكة بالكيلو أو اللتر. للنص مصنع والمنتج: اكتب الكمية في «فكة» (كيلو أو قطعة).'],
 ['الجرد','زي رصيد أول المدة. بيتسجل مسودة جرد الشهر الحالي، وتعتمده من شاشة الجرد.'],
 ['فواتير الشرا','كل صنف في صف. الصفوف اللي ليها نفس رقم الفاتورة والمورد والتاريخ بتتجمع في فاتورة واحدة. العبوة فاضية = العبوة الأساسية. المدفوع والخزنة في أول صف بس (الخزنة زي: مختار كاش، حمزة فودافون كاش).'],
 ['فواتير البيع','كل منتج في صف، وبتتجمع برقم الفاتورة والعميل والتاريخ. سعر القطعة فاضي = سعر العميل في السيستم. بتتسجل «اتسلّمت» بتاريخها وبتخصم من المخزن.']];

// ---------- export ----------
function rowsFor(sheet,blank){if(blank)return [TPL[sheet].ex];const L=m=>looseInfo(m.base);
 switch(sheet){
 case 'الخامات':return S.materials.map(m=>[m.name,m.cat==='pack'?'تغليف':'خامة',BASE_W[m.base]||'',m.pu,+(m.size/L(m).f).toFixed(4),(m.units||[]).map(u=>u.n+'='+(+(u.s/L(m).f).toFixed(4))).join('، '),m.pw||'',m.min?+(m.min/m.size).toFixed(3):'']);
 case 'الموردين':return S.suppliers.map(s=>[s.name,s.phone,s.days?'آجل':'كاش',s.days||'',s.opening||0]);
 case 'العملاء':return S.customers.map(c=>[c.name,brand(c.brand).name,c.type,c.phone,c.pay==='credit'?'آجل':'كاش',c.days||'',c.limit||'',c.disc||'',(c.info||{}).address||'',c.opening||0]);
 case 'أسعار الموردين':return S.materials.flatMap(m=>m.prices.map(p=>[m.name,(sup(p.s)||{}).name||'',p.b||'',p.p]));
 case 'المنتجات':return S.products.map(p=>[p.name,p.en,brand(p.brand).name,p.cat==='cake'?'تورتة':'ميني',p.price,p.ppc,p.w]);
 case 'رصيد أول المدة':{const it=(S.settings.opening||{}).items||{};return Object.entries(it).map(([k,v])=>{const [kind,id]=k.split(':');const o=kind==='m'?mat(id):kind==='r'?rec(id):prod(id);if(!o)return null;
  if(kind==='m'){const pk=v.pk||{};return ['خامة',o.name,pk.u0||'',pk.loose||'',+((v.cost||0)*o.size).toFixed(2)]}const f=kind==='r'&&o.out==='g'?1000:1;return [kind==='r'?'نص مصنع':'منتج',o.name,'',+(v.qty/f).toFixed(3),'']}).filter(Boolean)}
 case 'الجرد':return [].concat(S.materials.map(m=>['خامة',m.name,'','',pkgFmt(m,m.stock)]),S.recipes.map(r=>['نص مصنع',r.name,'','',fmt(r.stock/(r.out==='g'?1000:1),3)+(r.out==='g'?' كيلو':' قطعة')]),S.products.map(p=>['منتج',p.name,'','',p.stock+' قطعة']));
 case 'فواتير الشرا':return S.purchases.flatMap(p=>p.lines.map((l,i)=>{const m=mat(l.mid)||{};return [p.no,p.d,(sup(p.s)||{}).name||'',m.name||'',m.pu||'',l.q,'',l.p,i?'':p.paid,i?'':(p.t?tName(p.t):''),i?'':p.notes||'']}));
 case 'فواتير البيع':return S.orders.filter(o=>o.status!=='cancelled').flatMap(o=>o.lines.map((l,i)=>[o.inv,o.date,(cust(o.cu)||{}).name||'',(prod(l.pid)||{}).name||'',l.q,l.price,i?'':((cour(o.courier)||{}).name||''),i?'':orderPaid(o),'',i?'':o.notes||'']));
 }return []}
async function exportBook(blank,only){const X=await loadXLSX();const wb=X.utils.book_new();
 const help=X.utils.aoa_to_sheet(HELP);help['!cols']=[{wch:18},{wch:110}];X.utils.book_append_sheet(wb,help,'تعليمات');
 Object.keys(TPL).filter(n=>!only||only.includes(n)).forEach(n=>{const data=[TPL[n].cols].concat(rowsFor(n,blank));const ws=X.utils.aoa_to_sheet(data);ws['!cols']=TPL[n].cols.map(c=>({wch:Math.max(12,c.length+4)}));X.utils.book_append_sheet(wb,ws,n)});
 wb.Workbook={Views:[{RTL:true}]};const out=X.write(wb,{type:'array',bookType:'xlsx'});const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const name=(blank?'MELT-قالب-استيراد':'MELT-بيانات-'+today())+'.xlsx';if(typeof saveFile==='function')saveFile(name,blob);else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()}}

// ---------- import: parse + validate ----------
let IMP=null;
async function readBook(file){const X=await loadXLSX();const buf=await file.arrayBuffer();const wb=X.read(buf,{type:'array',cellDates:true});const out={};
 Object.keys(TPL).forEach(n=>{const sn=wb.SheetNames.find(x=>nz(x)===nz(n));if(!sn)return;const rows=X.utils.sheet_to_json(wb.Sheets[sn],{defval:'',raw:true});
  const clean=rows.map((r,i)=>{const o={_r:i+2};Object.keys(r).forEach(k=>{const col=TPL[n].cols.find(c=>nz(c)===nz(k));if(col)o[col]=typeof r[k]==='string'?r[k].trim():r[k]});return o}).filter(o=>TPL[n].cols.some(c=>o[c]!==''&&o[c]!=null));
  if(clean.length)out[n]=clean});return out}
function planImport(book){const P={sheets:{},errors:[],warn:[]};const err=(s,r,m)=>P.errors.push({s,r,m});const add=(s,a)=>{(P.sheets[s]=P.sheets[s]||{list:[],nw:0,up:0}).list.push(a);if(a.isNew)P.sheets[s].nw++;else P.sheets[s].up++};
 const newMat=new Map(),newSup=new Set(),newCust=new Set(),newProd=new Set();
 (book['الخامات']||[]).forEach(r=>{const n=r['الاسم'];if(!n)return err('الخامات',r._r,'الاسم فاضي');const base=baseOf(r['بتتقاس بـ']);if(!base)return err('الخامات',r._r,'«بتتقاس بـ» لازم تبقى كيلو أو لتر أو قطعة أو متر');
  const f=looseInfo(base).f;const sz=numv(r['العبوة فيها']);if(!(sz>0))return err('الخامات',r._r,'«العبوة فيها» لازم رقم أكبر من صفر');
  const units=[];let bad=false;String(r['عبوات تانية']||'').split(/[,،\n]/).map(x=>x.trim()).filter(Boolean).forEach(x=>{const m=x.match(/^(.+?)\s*[=:]\s*([\d.٠-٩٫]+)$/);if(!m){bad=true;return}const v=numv(m[2]);if(v>0)units.push({n:m[1].trim(),s:v*f});else bad=true});
  if(bad)return err('الخامات',r._r,'«عبوات تانية» لازم بالشكل: كرتونة=16، كيلو=1');
  const ex=byNm(S.materials,n);const d={name:String(n).trim(),cat:/تغليف|pack/.test(nz(r['النوع']))?'pack':'raw',base,pu:String(r['العبوة الأساسية']||BASE_W[base]),size:sz*f,units,pw:base==='pc'?(numv(r['وزن القطعة جرام'])||0):0,min:(numv(r['حد التنبيه بالعبوة'])||0)*sz*f};
  if(ex&&ex.base!==base&&ex.stock)P.warn.push({s:'الخامات',r:r._r,m:`${n}: وحدة القياس هتتغير من ${BASE_W[ex.base]} لـ ${BASE_W[base]} ورصيده ${pkgFmt(ex,ex.stock)}، اتأكد من الرصيد بعدها`});
  newMat.set(nz(n),d);add('الخامات',{isNew:!ex,label:d.name,run:async()=>{const row={name:d.name,cat:d.cat,base:d.base,pu:d.pu,size:d.size,units:d.units,pw:d.pw,min_stock:d.min};if(ex)await dbx(sb.from('materials').update(row).eq('id',ex.id));else await dbx(sb.from('materials').insert(Object.assign({id:uuid(),stock:0},row)))}})});
 (book['الموردين']||[]).forEach(r=>{const n=r['الاسم'];if(!n)return err('الموردين',r._r,'الاسم فاضي');const days=numv(r['مدة الآجل'])||0;const cr=/اجل/.test(nz(r['التعامل']))||days>0;const ex=byNm(S.suppliers,n);newSup.add(nz(n));
  const row={name:String(n).trim(),phone:String(r['الموبايل']||''),terms:cr?'آجل '+days+' يوم':'كاش',days:cr?days:0,opening_balance:numv(r['رصيد افتتاحي له'])||0};
  add('الموردين',{isNew:!ex,label:row.name,run:async()=>{if(ex)await dbx(sb.from('suppliers').update(row).eq('id',ex.id));else await dbx(sb.from('suppliers').insert(Object.assign({id:uuid(),info:{}},row)))}})});
 (book['العملاء']||[]).forEach(r=>{const n=r['الاسم'];if(!n)return err('العملاء',r._r,'الاسم فاضي');const b=brandOf(r['البراند']);if(!b)return err('العملاء',r._r,'البراند مش معروف: '+r['البراند']);
  const days=numv(r['مدة الآجل'])||0;const cr=/اجل/.test(nz(r['التعامل']))||days>0;const ex=byNm(S.customers,n);newCust.add(nz(n));const type=String(r['التصنيف']||'كافيه');
  const row={name:String(n).trim(),brand:b,kind:/فرد/.test(nz(type))?'person':'b2b',type,phone:String(r['الموبايل']||''),pay:cr?'credit':'cash',days:cr?days:0,credit_limit:numv(r['حد المديونية'])||0,disc:numv(r['خصم %'])||0,opening_balance:numv(r['رصيد افتتاحي عليه'])||0};
  add('العملاء',{isNew:!ex,label:row.name,run:async()=>{const info=Object.assign({},ex?ex.info:{},r['العنوان']?{address:String(r['العنوان'])}:{});if(ex)await dbx(sb.from('customers').update(Object.assign({info},row)).eq('id',ex.id));else await dbx(sb.from('customers').insert(Object.assign({id:uuid(),special:{},info,active:true},row)))}})});
 const matOk=n=>byNm(S.materials,n)||newMat.has(nz(n)),supOk=n=>byNm(S.suppliers,n)||newSup.has(nz(n)),custOk=n=>byNm(S.customers,n)||newCust.has(nz(n));
 (book['أسعار الموردين']||[]).forEach(r=>{if(!matOk(r['الخامة']))return err('أسعار الموردين',r._r,'خامة مش موجودة: '+r['الخامة']);if(!supOk(r['المورد']))return err('أسعار الموردين',r._r,'مورد مش موجود: '+r['المورد']);const p=numv(r['سعر العبوة الأساسية']);if(!(p>0))return err('أسعار الموردين',r._r,'السعر مش رقم');
  add('أسعار الموردين',{isNew:true,label:r['الخامة']+' — '+r['المورد'],run:async()=>{const m=byNm(S.materials,r['الخامة']),s=byNm(S.suppliers,r['المورد']);await dbx(sb.from('material_prices').upsert({material_id:m.id,supplier_id:s.id,quality:String(r['الجودة']||''),price:p,updated_at:new Date().toISOString()},{onConflict:'material_id,supplier_id,quality'}))}})});
 (book['المنتجات']||[]).forEach(r=>{const n=r['الاسم'];if(!n)return err('المنتجات',r._r,'الاسم فاضي');const b=brandOf(r['البراند']);if(!b)return err('المنتجات',r._r,'البراند مش معروف');const price=numv(r['سعر البيع']);if(isNaN(price))return err('المنتجات',r._r,'السعر مش رقم');
  const ex=byNm(S.products,n);newProd.add(nz(n));const cat=/تورت|cake/.test(nz(r['النوع']))?'cake':'mini';const row={name:String(n).trim(),en:String(r['الاسم بالإنجليزي']||''),brand:b,cat,ppc:cat==='cake'?1:(numv(r['قطع في الكرتونة'])||1),weight:numv(r['الوزن'])||1};
  add('المنتجات',{isNew:!ex,label:row.name,run:async()=>{if(ex){await dbx(sb.from('products').update(row).eq('id',ex.id));if(price&&Math.abs(price-ex.price)>0.001)await rpc('set_product_price',{p_id:ex.id,p_price:price,p_how:'استيراد Excel'})}else await dbx(sb.from('products').insert(Object.assign({id:uuid(),price,stock:0,menu:{}},row)))}})});
 const prodOk=n=>byNm(S.products,n)||newProd.has(nz(n));
 const kindOf=s=>{const k=nz(s);return /نص|مصنع|recipe/.test(k)?'r':/منتج|product/.test(k)?'p':'m'};
 const stockItems=(sheet)=>{const items=[];(book[sheet]||[]).forEach(r=>{const kind=kindOf(r['النوع']);const n=r['الصنف'];const ok=kind==='m'?matOk(n):kind==='r'?byNm(S.recipes,n):prodOk(n);if(!ok)return err(sheet,r._r,'صنف مش موجود: '+n);
  const a=numv(r['عبوات']),l=numv(r['فكة']),c=numv(r['تكلفة العبوة']);if(isNaN(a)||isNaN(l)||isNaN(c))return err(sheet,r._r,'فيه خانة مش رقم');items.push({kind,n,a:a||0,l:l||0,c:c||0,r:r._r})});return items};
 const op=stockItems('رصيد أول المدة');if(op.length)add('رصيد أول المدة',{isNew:true,label:op.length+' صنف',run:async()=>{const its=op.map(x=>{if(x.kind==='m'){const m=byNm(S.materials,x.n);const L=looseInfo(m.base);return {kind:'m',id:m.id,qty:+(x.a*m.size+x.l*L.f).toFixed(4),unit_cost:x.c?+(x.c/m.size).toFixed(6):(m.avg||0),pk:{u0:x.a||'',loose:x.l||''}}}
  if(x.kind==='r'){const r=byNm(S.recipes,x.n);const f=r.out==='g'?1000:1;return {kind:'r',id:r.id,qty:+((x.l||x.a)*f).toFixed(4),unit_cost:+recInfo(r.id).unit.toFixed(6)}}const p=byNm(S.products,x.n);return {kind:'p',id:p.id,qty:x.l||x.a,unit_cost:+pcost(p).mat.toFixed(4)}});
  await rpc('set_opening',{p:{date:(S.settings.opening||{}).date||curMonth()+'-01',items:its}})}});
 const ct=stockItems('الجرد');if(ct.length)add('الجرد',{isNew:true,label:ct.length+' صنف (مسودة)',run:async()=>{const k=curMonth();const c=S.counts[k]=S.counts[k]||{status:'draft',items:{}};if(c.status==='approved')throw new Error('جرد الشهر ده اتعتمد بالفعل');
  ct.forEach(x=>{if(x.kind==='m'){const m=byNm(S.materials,x.n);const L=looseInfo(m.base);c.items['m:'+m.id]=+(x.a*m.size+x.l*L.f).toFixed(4);c.items['mb:'+m.id]={u0:x.a||'',loose:x.l||''}}else{const o=x.kind==='r'?byNm(S.recipes,x.n):byNm(S.products,x.n);const f=x.kind==='r'&&o.out==='g'?1000:1;c.items[x.kind+':'+o.id]=+((x.l||x.a)*f).toFixed(4)}});
  await dbx(sb.from('stock_counts').upsert({month:k,status:'draft',items:c.items,updated_at:new Date().toISOString()},{onConflict:'month'}))}});
 // purchases
 const pg=new Map();(book['فواتير الشرا']||[]).forEach(r=>{const d=dateOf(r['التاريخ']);if(!d)return err('فواتير الشرا',r._r,'التاريخ مش مفهوم: '+r['التاريخ']);if(d>today())return err('فواتير الشرا',r._r,'تاريخ في المستقبل');if(isClosed(d.slice(0,7)))return err('فواتير الشرا',r._r,'الشهر مقفول');
  if(!supOk(r['المورد']))return err('فواتير الشرا',r._r,'مورد مش موجود: '+r['المورد']);if(!matOk(r['الخامة']))return err('فواتير الشرا',r._r,'خامة مش موجودة: '+r['الخامة']);
  const q=numv(r['العدد']),l=numv(r['فكة']),p=numv(r['سعر العبوة']);if(isNaN(q)||isNaN(l)||!(p>=0)||(q<=0&&l<=0))return err('فواتير الشرا',r._r,'العدد أو السعر مش مظبوط');
  const key=String(r['رقم الفاتورة']||'')+'|'+d+'|'+nz(r['المورد']);if(!pg.has(key))pg.set(key,{d,sup:r['المورد'],rows:[],paid:0,tre:'',notes:''});const g=pg.get(key);g.rows.push(r);if(numv(r['المدفوع'])>0)g.paid=numv(r['المدفوع']);if(r['الخزنة'])g.tre=r['الخزنة'];if(r['ملاحظات'])g.notes=String(r['ملاحظات'])});
 pg.forEach(g=>{const r0=g.rows[0]._r;if(g.paid>0&&!treByName(g.tre))return err('فواتير الشرا',r0,'الخزنة مش معروفة: «'+g.tre+'» (اكتبها زي: مختار كاش)');
  add('فواتير الشرا',{isNew:true,label:g.sup+' · '+g.d+' · '+g.rows.length+' صنف',run:async()=>{const s=byNm(S.suppliers,g.sup);const lines=g.rows.map(r=>{const m=byNm(S.materials,r['الخامة']);const ps=pkgs(m);let u=0;if(r['العبوة']){u=ps.findIndex(x=>nz(x.n)===nz(r['العبوة']));if(u<0)throw new Error('العبوة «'+r['العبوة']+'» مش متعرّفة للخامة '+m.name)}
   const l={q:numv(r['العدد'])||0,l:numv(r['فكة'])||0,u};const f=puF(m,u);const qe=puQ(m,l);return {material_id:m.id,qty:+(qe*f).toFixed(6),price:+(numv(r['سعر العبوة'])/f).toFixed(6),quality:''}});
   const tot=lines.reduce((a,x)=>a+x.qty*x.price,0);if(S.purchases.some(p=>p.s===s.id&&p.d===g.d&&Math.abs(purTotal(p)-tot)<0.5))throw new Error('شكلها متسجلة قبل كده (نفس المورد والتاريخ والإجمالي)');
   await rpc('post_purchase',{p:{supplier_id:s.id,d:g.d===today()?'':g.d,paid:Math.min(g.paid,tot),treasury_id:g.paid>0?treByName(g.tre).id:'',notes:g.notes||'استيراد',lines}})}})});
 // sales
 const sg=new Map();(book['فواتير البيع']||[]).forEach(r=>{const d=dateOf(r['التاريخ']);if(!d)return err('فواتير البيع',r._r,'التاريخ مش مفهوم: '+r['التاريخ']);if(d>today())return err('فواتير البيع',r._r,'تاريخ في المستقبل');if(isClosed(d.slice(0,7)))return err('فواتير البيع',r._r,'الشهر مقفول');
  if(!custOk(r['العميل']))return err('فواتير البيع',r._r,'عميل مش موجود: '+r['العميل']);if(!prodOk(r['المنتج']))return err('فواتير البيع',r._r,'منتج مش موجود: '+r['المنتج']);
  const q=numv(r['الكمية']);if(!(q>0))return err('فواتير البيع',r._r,'الكمية مش مظبوطة');if(r['المندوب']&&!byNm(S.couriers,r['المندوب']))return err('فواتير البيع',r._r,'مندوب مش موجود: '+r['المندوب']);
  const key=String(r['رقم الفاتورة']||'')+'|'+d+'|'+nz(r['العميل']);if(!sg.has(key))sg.set(key,{d,cu:r['العميل'],rows:[],paid:0,tre:'',co:'',notes:''});const g=sg.get(key);g.rows.push(r);if(numv(r['المدفوع'])>0)g.paid=numv(r['المدفوع']);if(r['الخزنة'])g.tre=r['الخزنة'];if(r['المندوب'])g.co=r['المندوب'];if(r['ملاحظات'])g.notes=String(r['ملاحظات'])});
 sg.forEach(g=>{const r0=g.rows[0]._r;const coPay=/مندوب/.test(nz(g.tre));if(g.paid>0&&!coPay&&!treByName(g.tre))return err('فواتير البيع',r0,'الخزنة مش معروفة: «'+g.tre+'»');if(g.paid>0&&coPay&&!g.co)return err('فواتير البيع',r0,'الفلوس مع المندوب بس مفيش مندوب');
  add('فواتير البيع',{isNew:true,label:g.cu+' · '+g.d+' · '+g.rows.length+' صنف',run:async()=>{const c=byNm(S.customers,g.cu);const co=g.co?byNm(S.couriers,g.co):null;
   const lines=g.rows.map(r=>{const p=byNm(S.products,r['المنتج']);if(p.brand!==c.brand)throw new Error(p.name+' مش من براند العميل');const pr=numv(r['سعر القطعة']);return {product_id:p.id,qty:numv(r['الكمية']),cost:+pcost(p).mat.toFixed(4),price:pr>0?pr:''}});
   const est=lines.reduce((a,l)=>a+l.qty*(l.price||priceFor(c.id,l.product_id)),0)*(1-(c.disc||0)/100);if(S.orders.some(o=>o.cu===c.id&&o.date===g.d&&o.status!=='cancelled'&&Math.abs(o.total-est)<0.5))throw new Error('شكلها متسجلة قبل كده (نفس العميل والتاريخ والإجمالي)');
   await rpc('create_old_invoice',{p:{cu:c.id,d:g.d===today()?'':g.d,courier_id:co?co.id:'',paid:g.paid,treasury_id:g.paid>0&&!coPay?treByName(g.tre).id:'',pay_courier_id:g.paid>0&&coPay&&co?co.id:'',notes:g.notes||'استيراد',fee:0,fee_on:'us',disc_type:'amt',disc_val:0,extras:[],lines}})}})});
 return P}
const ORDER=['الخامات','الموردين','العملاء','أسعار الموردين','المنتجات','رصيد أول المدة','الجرد','فواتير الشرا','فواتير البيع'];

// ---------- screen ----------
V.data=()=>{if(!me().owner)return head('الاستيراد والتصدير')+`<div class="lock">🔒 الاستيراد والتصدير للمالك بس</div>`;
 let body='';
 if(IMP&&IMP.plan){const P=IMP.plan;const ok=ORDER.filter(s=>P.sheets[s]).reduce((a,s)=>a+P.sheets[s].list.length,0);
  body=`<div class="card" style="margin-top:12px"><div class="between"><h2>مراجعة ملف: ${esc(IMP.file)}</h2><button class="btn ghost sm" data-a="impClear">إلغاء</button></div>
  <div class="tbl-wrap" style="margin-top:8px"><table><tr><th>الورقة</th><th class="n">جديد</th><th class="n">تحديث</th><th class="n">أخطاء</th></tr>${ORDER.filter(s=>P.sheets[s]||P.errors.some(e=>e.s===s)).map(s=>{const x=P.sheets[s]||{nw:0,up:0};const e=P.errors.filter(e=>e.s===s).length;const tx=/فواتير|رصيد|الجرد|أسعار/.test(s);return `<tr><td>${esc(s)}</td><td class="n">${tx?(x.nw+x.up):x.nw}</td><td class="n">${tx?'—':x.up}</td><td class="n ${e?'down b':''}">${e||'—'}</td></tr>`}).join('')}</table></div>
  ${P.errors.length?`<div class="alert bad" style="margin-top:10px"><span class="dot"></span><div><b>${P.errors.length} صف فيه مشكلة، ومش هيتسجل:</b><div class="small" style="max-height:220px;overflow:auto;margin-top:6px">${P.errors.slice(0,150).map(e=>`${esc(e.s)} · صف ${e.r}: ${esc(e.m)}`).join('<br>')}</div><div class="small muted" style="margin-top:4px">صلّحهم في الملف وارفعه تاني، أو كمّل بالصفوف السليمة.</div></div></div>`:''}
  ${P.warn.length?`<div class="alert warn" style="margin-top:8px"><span class="dot"></span><div>${P.warn.map(w=>esc(w.m)).join('<br>')}</div></div>`:''}
  ${IMP.result?`<div class="alert ${IMP.result.fail.length?'warn':'ok'}" style="margin-top:10px"><span class="dot"></span><div><b>اتسجل ${IMP.result.ok} من ${IMP.result.total}</b>${IMP.result.fail.length?`<div class="small" style="max-height:200px;overflow:auto">${IMP.result.fail.map(f=>esc(f.s+' · '+f.label+': '+f.m)).join('<br>')}</div>`:''}</div></div>`:
  ok?`<button class="btn block" style="margin-top:12px" data-a="impRun" ${IMP.running?'disabled':''}>${IMP.running?'بيسجّل… '+IMP.done+' من '+ok:'تسجيل '+ok+' عملية'}</button>`:'<p class="small muted" style="margin-top:10px">مفيش صفوف سليمة تتسجل.</p>'}</div>`}
 return head('الاستيراد والتصدير','Excel: البيانات الأساسية، والأرصدة، والفواتير القديمة')+
 `<div class="grid2"><div class="card"><h2>📤 تصدير</h2><p class="sub">ملف Excel فيه كل البيانات بنفس شكل قالب الاستيراد. تقدر تعدّل فيه وترفعه تاني.</p><div class="row"><button class="btn" data-a="expAll">تصدير كل البيانات</button><button class="btn sec" data-a="expTpl">تحميل قالب فاضي</button><button class="btn ghost" data-a="expCount">ورقة جرد للطباعة</button></div></div>
 <div class="card"><h2>📥 استيراد</h2><p class="sub">ارفع ملف Excel بنفس شكل القالب. هتشوف مراجعة كاملة قبل ما أي حاجة تتسجل.</p><label class="btn" style="display:inline-block;cursor:pointer">اختار ملف Excel<input type="file" accept=".xlsx,.xls" id="imp-f" data-chg="impFile" style="display:none"></label></div></div>`+body};
A.expAll=async()=>{try{toast('بيجهّز الملف…');await exportBook(false)}catch(e){toast(e.message)}};
A.expTpl=async()=>{try{await exportBook(true)}catch(e){toast(e.message)}};
A.expCount=async()=>{try{await exportBook(false,['الجرد'])}catch(e){toast(e.message)}};
A.impClear=()=>{IMP=null;render()};
A.impFile=async el=>{const f=el.files&&el.files[0];if(!f)return;try{toast('بيقرا الملف…');const book=await readBook(f);if(!Object.keys(book).length){toast('مفيش ورقة بأسماء القالب في الملف');return}IMP={file:f.name,book,plan:planImport(book),done:0};render()}catch(e){toast('مقدرتش أقرا الملف: '+e.message)}};
A.impRun=async()=>{if(!IMP||IMP.running)return;if(!confirm('تسجيل البيانات دي؟'))return;IMP.running=true;IMP.done=0;const res={ok:0,total:0,fail:[]};render();
 for(const s of ORDER){const sh=IMP.plan.sheets[s];if(!sh)continue;if(['أسعار الموردين','المنتجات','رصيد أول المدة','فواتير الشرا'].includes(s))await refresh();
  for(const a of sh.list){res.total++;try{await a.run();res.ok++}catch(e){res.fail.push({s,label:a.label,m:e.message||String(e)})}IMP.done++;const b=document.querySelector('[data-a="impRun"]');if(b)b.textContent='بيسجّل… '+IMP.done}}
 await refresh();IMP.running=false;IMP.result=res;render();toast('خلص الاستيراد: '+res.ok+' من '+res.total)};
