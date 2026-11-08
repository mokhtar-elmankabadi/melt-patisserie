// ================= PACKAGES, BACKDATING, OLD INVOICES, OPENING BALANCE =================
// ---- backdate helpers ----
function canBD(){const u=me();return !!(u&&(u.owner||(u.perms||{}).backdate))}
function bdField(id,label){if(!canBD())return '';return `<div class="field"><label for="${id}">${label||'التاريخ'} ${ti('سيبه النهارده للعمليات العادية. التاريخ القديم بيتقبل بس في شهر مش مقفول')}</label><input id="${id}" type="date" value="${today()}" max="${today()}"></div>`}
function bdVal(id){const v=val(id);return v&&v!==today()?v:''}

// ---- packages ----
function pkgs(m){if(!m)return [];return [{n:m.pu||unitLbl(m.base),s:m.size||1}].concat(m.units||[])}
function looseInfo(base){return base==='g'?{l:'كيلو',f:1000}:base==='ml'?{l:'لتر',f:1000}:{l:unitLbl(base),f:1}}
function pkgFmt(m,q){if(!m)return '';q=+q||0;const L=looseInfo(m.base);if(m.size<=1||q<=0)return fmt(q/L.f,2)+' '+L.l;const n=Math.floor(q/m.size+1e-9);const r=q-n*m.size;
 return [n?n+' '+m.pu:'',r>0.0001?fmt(r/L.f,2)+' '+L.l:''].filter(Boolean).join(' + ')||'0'}
function puF(m,u){const p=pkgs(m)[u||0];return p&&m?p.s/(m.size||1):1}
function puUnitName(m,u){const p=pkgs(m)[u||0];return p?p.n:''}
function puUnitSel(m,l,i){const ps=pkgs(m);if(ps.length<2)return '';return `<select id="pl-u-${i}" data-chg="puCheck" style="width:110px" aria-label="العبوة">${ps.map((p,j)=>`<option value="${j}" ${(l.u||0)===j?'selected':''}>${esc(p.n)}</option>`).join('')}</select>`}
function puConv(m,l){if(!m||!l.q)return '';const L=looseInfo(m.base);const tot=l.q*pkgs(m)[l.u||0].s;return ` = ${fmt(tot/L.f,2)} ${L.l}`}
function unitsEditor(m){const L=looseInfo(m.base);return `<h3 style="margin-top:12px">عبوات تانية للخامة دي ${ti('لو الخامة بتيجي بأكتر من عبوة: جالون وكرتونة، أو شوال 25 وشوال 50. كل عبوة بكميتها بوحدة الوصفة. وقت الشرا والجرد هتختار العبوة، والسيستم يحوّل لوحده')}</h3>
 <p class="small muted">العبوة الأساسية: <b>${esc(m.pu||'')}</b> = ${fmt(m.size)} ${unitLbl(m.base)} (أسعار الموردين محسوبة عليها)</p>
 ${(m.units||[]).map((u,i)=>`<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="text" id="eu-n-${i}" value="${esc(u.n)}" placeholder="اسم العبوة (كرتونة، شوال 50...)" style="flex:1"><input type="number" id="eu-s-${i}" value="${u.s||''}" placeholder="فيها كام ${unitLbl(m.base)}" style="width:120px"><button class="icon-btn" data-a="euDel" data-i="${i}" aria-label="حذف">×</button></div>`).join('')}
 <button class="btn sec sm" data-a="euAdd">+ عبوة</button>${L.f>1?`<p class="small muted" style="margin-top:4px">مثال: كرتونة فيها 4 جوالين 4 لتر = ${fmt(16*L.f)} ${unitLbl(m.base)}</p>`:''}`}
A.euAdd=()=>{matRead();EM.units=(EM.units||[]).concat([{n:'',s:0}]);matSheet()};
A.euDel=el=>{matRead();EM.units.splice(+el.dataset.i,1);matSheet()};
// package-count inputs (count & opening). pk = {u0:n,u1:n,...,loose:x}
function pkQty(m,pk){if(!pk)return null;const L=looseInfo(m.base);let q=0,any=false;pkgs(m).forEach((p,j)=>{const v=pk['u'+j];if(v!==''&&v!=null){q+=(+v)*p.s;any=true}});if(pk.loose!==''&&pk.loose!=null){q+=(+pk.loose)*L.f;any=true}return any?q:null}
function pkgInputs(pre,m,pk,act,cur){if(!m)return '';pk=pk||{};const L=looseInfo(m.base);const q=pkQty(m,pk);
 return `<div class="row" style="flex-wrap:wrap;gap:4px;justify-content:flex-end">${pkgs(m).map((p,j)=>`<label class="small" style="display:flex;align-items:center;gap:3px"><input type="number" class="inp-sm" style="width:58px" id="${pre}-${m.id}-u${j}" value="${pk['u'+j]??''}" min="0" step="any" data-chg="${act}" data-v="${m.id}">${esc(p.n)}</label>`).join('')}
 ${pkgs(m).length===1&&m.size===L.f?'':`<label class="small" style="display:flex;align-items:center;gap:3px">+<input type="number" class="inp-sm" style="width:64px" id="${pre}-${m.id}-l" value="${pk.loose??''}" min="0" step="0.01" data-chg="${act}" data-v="${m.id}">${L.l} فكة</label>`}
 <span class="small muted" id="${pre}-${m.id}-t" style="min-width:90px">${q!=null?'= '+fmt(q/L.f,2)+' '+L.l:(cur!=null&&cur!==''?'= '+fmt(cur/L.f,2)+' '+L.l:'')}</span></div>`}
function pkRead(pre,m){const pk={};pkgs(m).forEach((p,j)=>{const v=val(pre+'-'+m.id+'-u'+j);if(v!=='')pk['u'+j]=+v});const l=val(pre+'-'+m.id+'-l');if(l!=='')pk.loose=+l;return pk}
A.cntPk=el=>{const m=mat(el.dataset.v);const k=today().slice(0,7);const c=S.counts[k]=S.counts[k]||{status:'draft',items:{}};const pk=pkRead('cp',m);const q=pkQty(m,pk);
 if(q==null){delete c.items['m:'+m.id];delete c.items['mb:'+m.id]}else{c.items['m:'+m.id]=+q.toFixed(4);c.items['mb:'+m.id]=pk}
 const L=looseInfo(m.base);const t=document.getElementById('cp-'+m.id+'-t');if(t)t.textContent=q!=null?'= '+fmt(q/L.f,2)+' '+L.l:'';
 clearTimeout(_cntT);_cntT=setTimeout(async()=>{await dbx(sb.from('stock_counts').upsert({month:k,status:c.status==='approved'?'approved':'draft',items:c.items,updated_at:new Date().toISOString()},{onConflict:'month'}))},800)};

// ---- opening balance ----
function openingTab(){const op=S.settings.opening||{};const it=op.items||{};const sc=can('cost');const own=me().owner;const L=m=>looseInfo(m.base);
 const val0=Object.values(it).reduce((s,v)=>s+(v.qty||0)*(v.cost||0),0);
 return `<div class="card"><div class="between"><h2>رصيد أول المدة</h2>${op.at?`<span class="pill ok">متسجل · ${esc(op.by||'')} · ${dShort(op.date)}</span>`:'<span class="pill warn">لسه</span>'}</div>
 <p class="sub">اكتب الموجود يوم بداية السيستم. لو عدّلت بعد كده، الفرق بس هو اللي بيتظبط في الرصيد (المشتريات والفواتير اللي اتسجلت ما بتتأثرش). قيمته بتبقى مخزون أول المدة لأول إقفال.</p>
 ${!own?'<div class="lock">🔒 رصيد أول المدة للمالك بس</div>':`<div class="field" style="max-width:220px"><label for="op-d">تاريخ رصيد أول المدة</label><input id="op-d" type="date" value="${op.date||curMonth()+'-01'}" max="${today()}"></div>
 <h3 style="margin-top:12px">خامات وتغليف</h3><div class="tbl-wrap"><table><tr><th>الخامة</th><th class="n">الموجود (عبوات + فكة)</th>${sc?'<th class="n">تكلفة العبوة الأساسية</th>':''}</tr>
 ${S.materials.map(m=>{const x=it['m:'+m.id];return `<tr><td>${esc(m.name)}<div class="small muted">${esc(m.pu)} = ${fmt(m.size/L(m).f,2)} ${L(m).l}</div></td><td class="n">${pkgInputs('op',m,x&&x.pk,'opPk',x&&x.qty)}</td>${sc?`<td class="n"><input type="number" class="inp-sm" id="opc-m-${m.id}" value="${x&&x.cost?+(x.cost*m.size).toFixed(2):(m.avg?+(m.avg*m.size).toFixed(2):'')}" style="width:90px"></td>`:''}</tr>`}).join('')||'<tr><td colspan="3" class="empty">ضيف الخامات الأول</td></tr>'}</table></div>
 <h3 style="margin-top:12px">نص مصنع</h3><div class="tbl-wrap"><table><tr><th>المكون</th><th class="n">الموجود</th>${sc?'<th class="n">التكلفة (من الوصفة)</th>':''}</tr>
 ${S.recipes.map(r=>{const x=it['r:'+r.id];const lf=r.out==='g'?{l:'كيلو',f:1000}:{l:unitLbl(r.out),f:1};return `<tr><td>${esc(r.name)}</td><td class="n"><input type="number" class="inp-sm" id="opq-r-${r.id}" value="${x?+(x.qty/lf.f).toFixed(3):''}" step="0.01" style="width:90px"> ${lf.l}</td>${sc?`<td class="n small">${money(recInfo(r.id).unit*lf.f,2)} / ${lf.l}</td>`:''}</tr>`}).join('')||'<tr><td colspan="3" class="empty">مفيش</td></tr>'}</table></div>
 <h3 style="margin-top:12px">منتج تام</h3><div class="tbl-wrap"><table><tr><th>المنتج</th><th class="n">عدد القطع</th>${sc?'<th class="n">تكلفة القطعة</th>':''}</tr>
 ${S.products.map(p=>{const x=it['p:'+p.id];return `<tr><td>${esc(p.name)}</td><td class="n"><input type="number" class="inp-sm" id="opq-p-${p.id}" value="${x?x.qty:''}" style="width:80px"></td>${sc?`<td class="n small">${money(pcost(p).mat,2)}</td>`:''}</tr>`}).join('')||'<tr><td colspan="3" class="empty">مفيش</td></tr>'}</table></div>
 ${sc&&op.at?`<div class="kpi" style="margin-top:12px"><div class="l">قيمة رصيد أول المدة المتسجل</div><div class="v">${money(val0)}</div></div>`:''}
 <button class="btn block" style="margin-top:12px" data-a="openingSave">حفظ رصيد أول المدة</button>`}</div>`}
A.opPk=el=>{const m=mat(el.dataset.v);const q=pkQty(m,pkRead('op',m));const L=looseInfo(m.base);const t=document.getElementById('op-'+m.id+'-t');if(t)t.textContent=q!=null?'= '+fmt(q/L.f,2)+' '+L.l:''};
A.openingSave=async()=>{if(_busy)return;const old=(S.settings.opening||{}).items||{};const items=[];
 S.materials.forEach(m=>{const pk=pkRead('op',m);const q=pkQty(m,pk);const k='m:'+m.id;if(q==null&&!old[k])return;const cp=num('opc-m-'+m.id);items.push({kind:'m',id:m.id,qty:+(q||0).toFixed(4),unit_cost:cp?+(cp/m.size).toFixed(6):(old[k]?old[k].cost:m.avg||0),pk})});
 S.recipes.forEach(r=>{const v=val('opq-r-'+r.id);const k='r:'+r.id;if(v===''&&!old[k])return;const f=r.out==='g'?1000:1;items.push({kind:'r',id:r.id,qty:+((+v||0)*f).toFixed(4),unit_cost:+recInfo(r.id).unit.toFixed(6)})});
 S.products.forEach(p=>{const v=val('opq-p-'+p.id);const k='p:'+p.id;if(v===''&&!old[k])return;items.push({kind:'p',id:p.id,qty:+v||0,unit_cost:+pcost(p).mat.toFixed(4)})});
 if(!items.length){toast('اكتب الكميات الأول');return}if(!confirm('حفظ رصيد أول المدة وظبط الأرصدة؟'))return;
 _busy=true;try{await rpc('set_opening',{p:{date:val('op-d'),items}});await refresh();toast('اتسجل رصيد أول المدة واتظبطت الأرصدة')}finally{_busy=false}};

// ---- old invoice (one step, delivered at its date) ----
let OI=null;
A.oldInv=()=>{if(!S.customers.length){toast('ضيف عميل الأول');go('customers');return}const cu=S.customers.find(c=>c.active)||S.customers[0];const p=S.products.find(x=>x.brand===cu.brand);if(!p){toast('مفيش منتجات للبراند ده');return}
 OI={brand:cu.brand,cu:cu.id,d:daysAddISO(today(),-1),lines:[{pid:p.id,q:p.ppc>1?p.ppc:1}],courier:'',fee:0,feeOn:'us',discType:'amt',discVal:0,extras:[],paid:0,dest:'t:'+myTre(),notes:''};oiSheet()};
function oiRead(){if(!document.getElementById('oi-cu'))return;OI.cu=val('oi-cu');OI.brand=cust(OI.cu).brand;OI.d=val('oi-d');OI.lines=OI.lines.map((l,i)=>({pid:val('oil-p-'+i),q:Math.max(1,num('oil-q-'+i))}));OI.courier=val('oi-co');OI.fee=num('oi-fee');OI.discVal=num('oi-dv');OI.paid=num('oi-paid');OI.dest=val('oi-t');OI.notes=val('oi-n')}
function oiSheet(){const c=cust(OI.cu);OI.lines=OI.lines.filter(l=>prod(l.pid)&&prod(l.pid).brand===c.brand);if(!OI.lines.length){const p=S.products.find(x=>x.brand===c.brand);if(p)OI.lines=[{pid:p.id,q:1}]}const t=previewTotals(OI);const prods=S.products.filter(p=>p.brand===c.brand);
 sheet(`<h2>فاتورة قديمة</h2><p class="sub">بتتسجل «اتسلّمت» بتاريخها وبتخصم من المخزن. الرقم بيكمل الترقيم العادي.</p>
 <div class="fgrid"><div class="field"><label for="oi-d">تاريخ الفاتورة</label><input id="oi-d" type="date" value="${OI.d}" max="${today()}" data-chg="oiRe"></div><div class="field"><label for="oi-cu">العميل</label><select id="oi-cu" data-chg="oiRe">${S.customers.filter(x=>x.active).map(x=>`<option value="${x.id}" ${x.id===OI.cu?'selected':''}>${esc(x.name)} · ${esc(brand(x.brand).name)}</option>`).join('')}</select></div></div>
 ${isClosed((OI.d||'').slice(0,7))?'<div class="alert bad" style="margin-top:8px"><span class="dot"></span><div>الشهر ده مقفول. افتحه الأول من الإقفال.</div></div>':''}
 <h3 style="margin-top:12px">الأصناف</h3>${OI.lines.map((l,ix)=>`<div class="row" style="margin-bottom:8px;flex-wrap:nowrap"><select id="oil-p-${ix}" data-chg="oiRe" style="flex:1">${prods.map(x=>`<option value="${x.id}" ${x.id===l.pid?'selected':''}>${esc(x.name)}</option>`).join('')}</select><input id="oil-q-${ix}" type="number" min="1" value="${l.q}" data-chg="oiRe" style="width:76px" aria-label="الكمية"><button class="icon-btn" data-a="oiDel" data-i="${ix}" aria-label="حذف">×</button></div>`).join('')}<button class="btn sec sm" data-a="oiAdd">+ صنف</button>
 <div class="fgrid" style="margin-top:12px"><div class="field"><label for="oi-co">المندوب</label><select id="oi-co"><option value="">— استلام من المصنع —</option>${S.couriers.map(d=>`<option value="${d.id}" ${OI.courier===d.id?'selected':''}>${esc(d.name)} (${d.kind==='main'?'أساسي':'خارجي'})</option>`).join('')}</select></div>
 <div class="field"><label for="oi-fee">توصيل على العميل</label><input id="oi-fee" type="number" value="${OI.feeOn==='cust'?OI.fee:0}" data-chg="oiFee"></div>
 <div class="field"><label for="oi-dv">خصم على الفاتورة (مبلغ)</label><input id="oi-dv" type="number" value="${OI.discVal||0}" data-chg="oiRe"></div><div class="field"><label for="oi-n">ملاحظات</label><input id="oi-n" type="text" value="${esc(OI.notes)}"></div></div>
 <div class="card flat" style="margin-top:12px"><div class="between"><span>الإجمالي</span><b class="num">${money(t.total)}</b></div></div>
 <div class="fgrid" style="margin-top:10px"><div class="field"><label for="oi-paid">اتدفع منها</label><input id="oi-paid" type="number" value="${OI.paid}"></div><div class="field"><label for="oi-t">الفلوس راحت فين</label><select id="oi-t">${S.treasuries.map(x=>`<option value="t:${x.id}" ${OI.dest==='t:'+x.id?'selected':''}>${x.holder} — ${x.method}</option>`).join('')}${S.couriers.map(x=>`<option value="co:${x.id}" ${OI.dest==='co:'+x.id?'selected':''}>مع المندوب ${esc(x.name)} (عهدة)</option>`).join('')}</select></div></div>
 <p class="small muted">سيب المدفوع 0 لو الفاتورة آجل.</p><button class="btn block" style="margin-top:12px" data-a="oiSave">تسجيل الفاتورة</button>`)}
A.oiRe=()=>{oiRead();oiSheet()};A.oiFee=()=>{oiRead();OI.feeOn=OI.fee>0?'cust':'us';oiSheet()};
A.oiAdd=()=>{oiRead();const p=S.products.find(x=>x.brand===OI.brand&&!OI.lines.some(l=>l.pid===x.id))||S.products.find(x=>x.brand===OI.brand);OI.lines.push({pid:p.id,q:1});oiSheet()};
A.oiDel=el=>{oiRead();OI.lines.splice(+el.dataset.i,1);if(!OI.lines.length)A.oiAdd();else oiSheet()};
A.oiSave=async()=>{if(_busy)return;oiRead();if(!OI.d||OI.d>today()){toast('اختار تاريخ صح');return}if(isClosed(OI.d.slice(0,7))){toast('الشهر ده مقفول');return}const t=previewTotals(OI);if(OI.paid>t.total+0.01){toast('المدفوع أكبر من الإجمالي');return}
 const [k,id]=OI.dest.split(':');_busy=true;
 try{const oid=await rpc('create_old_invoice',{p:{cu:OI.cu,d:OI.d===today()?'':OI.d,fee:OI.feeOn==='cust'?OI.fee:0,fee_on:OI.feeOn,disc_type:'amt',disc_val:OI.discVal,extras:[],notes:OI.notes,courier_id:OI.courier,paid:OI.paid,treasury_id:k==='t'?id:'',pay_courier_id:k==='co'?id:'',
  lines:OI.lines.map(l=>({product_id:l.pid,qty:l.q,cost:+pcost(prod(l.pid)).mat.toFixed(4)}))}});closeSheet();await refresh();const o=ordr(oid);toast('اتسجلت '+(o?o.inv:'الفاتورة')+' بتاريخ '+dShort(OI.d));
  if(confirm('تسجل فاتورة قديمة تانية؟')){const keep={d:OI.d,dest:OI.dest};A.oldInv();Object.assign(OI,keep);oiSheet()}}finally{_busy=false}};
