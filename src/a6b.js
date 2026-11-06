// ================= CUSTOMER ANALYTICS =================
const salesOrders=()=>S.orders.filter(o=>billable(o));
function lineVal(o,l){return l.q*l.price*(1-(o.custDisc||0)/100)}
const lineCost=l=>l.q*(l.cost||0);
const ago=d=>daysBetween(d,today());
const win=(o,a,b)=>{const x=ago(o.date);return x>=a&&x<b};
function agg(os){const r={n:os.length,val:0,qty:0,cost:0,byP:{}};os.forEach(o=>o.lines.forEach(l=>{const v=lineVal(o,l),c=lineCost(l);r.val+=v;r.qty+=l.q;r.cost+=c;const b=r.byP[l.pid]=r.byP[l.pid]||{val:0,qty:0,cost:0};b.val+=v;b.qty+=l.q;b.cost+=c;b.profit=b.val-b.cost}));r.profit=r.val-r.cost;return r}
function custStats(cid){
 const key='cs:'+cid;if(_memo[key])return _memo[key];
 const os=salesOrders().filter(o=>o.cu===cid).sort((a,b)=>a.date<b.date?-1:1);
 const dates=[...new Set(os.map(o=>o.date))];const gaps=[];for(let i=1;i<dates.length;i++)gaps.push({g:daysBetween(dates[i-1],dates[i]),d:dates[i]});
 const avgGap=avgArr(gaps.filter(x=>ago(x.d)<120).map(x=>x.g));
 const gapR=avgArr(gaps.filter(x=>ago(x.d)<30).map(x=>x.g)),gapP=avgArr(gaps.filter(x=>ago(x.d)>=30&&ago(x.d)<120).map(x=>x.g));
 const last=dates[dates.length-1];const since=last!=null?ago(last):null;
 const idleLimit=avgGap?Math.min(Math.max(2*avgGap,3),S.settings.idleMax):S.settings.idleMax;
 const A30=agg(os.filter(o=>win(o,0,30))),P30=agg(os.filter(o=>win(o,30,60))),P90=agg(os.filter(o=>win(o,30,120))),D90=agg(os.filter(o=>win(o,0,90)));
 const chA=P30.val?(A30.val-P30.val)/P30.val:null;const avg3=P90.val/3;const chB=avg3?(A30.val-avg3)/avg3:null;
 return _memo[key]={c:cust(cid),os,dates,gaps,avgGap,gapR,gapP,last,since,idle:last!=null&&since>idleLimit,idleLimit,A30,P30,P90,D90,chA,chB,first:dates[0]};
}
function signals(st){const th=S.settings.changePct/100;const out=[];const n=st.c.name;if(!st.os.length)return out;
 if(st.idle)out.push(['bad','idle',`${n} بقاله ${st.since} يوم ما طلبش`,`متعوّد يطلب كل ${fmt(st.avgGap||0,1)} يوم تقريبًا · الحد ${fmt(st.idleLimit,0)} يوم · آخر طلب ${dShort(st.last)}`]);
 const dA=st.chA!=null&&st.chA<=-th,dB=st.chB!=null&&st.chB<=-th,uA=st.chA!=null&&st.chA>=th,uB=st.chB!=null&&st.chB>=th;
 if(!st.idle&&(dA||dB))out.push(['warn','down',`${n} قلّل سحبه`,[dA?`آخر 30 يوم ${money(st.A30.val)} مقابل ${money(st.P30.val)} (${pct(st.chA)})`:'',dB?`مقابل متوسط 3 شهور ${money(st.P90.val/3)} (${pct(st.chB)})`:''].filter(Boolean).join(' · ')]);
 if(uA||uB)out.push(['ok','up',`${n} زوّد سحبه`,[uA?`آخر 30 يوم +${pct(st.chA)} عن اللي قبلهم`:'',uB?`+${pct(st.chB)} عن متوسط 3 شهور`:''].filter(Boolean).join(' · ')]);
 if(st.gapR&&st.gapP){if(st.gapR>st.gapP*(1+th))out.push(['warn','slow',`${n} بقى يطلب على فترات أطول`,`كل ${fmt(st.gapR,1)} يوم بدل ${fmt(st.gapP,1)}`]);else if(st.gapR<st.gapP*(1-th))out.push(['ok','fast',`${n} بقى يطلب على فترات أقصر`,`كل ${fmt(st.gapR,1)} يوم بدل ${fmt(st.gapP,1)}`])}
 const pids=new Set([...Object.keys(st.A30.byP),...Object.keys(st.P90.byP)]);const downs=[],ups=[];
 pids.forEach(pid=>{const a=(st.A30.byP[pid]||{}).qty||0,b=((st.P90.byP[pid]||{}).qty||0)/3;const nm=prod(pid).name;
  if(a&&!b&&st.P90.n)out.push(['info','new',`${n} بدأ يطلب ${nm}`,`${fmt(a)} قطعة في آخر 30 يوم، وماكانش بيطلبه قبل كده`]);
  else if(b&&!a&&!st.idle)out.push(['warn','stop',`${n} وقف طلب ${nm}`,`كان بيطلب حوالي ${fmt(b)} قطعة في الشهر`]);
  else if(b){const ch=(a-b)/b;if(ch<=-th)downs.push([nm,ch,a,b]);else if(ch>=th)ups.push([nm,ch,a,b])}});
 if(downs.length&&ups.length)out.push(['info','shift',`${n} قلّل ${downs.map(d=>d[0]).join(' و')} وزوّد ${ups.map(u=>u[0]).join(' و')}`,downs.concat(ups).map(d=>`${d[0]}: ${fmt(d[3])} ← ${fmt(d[2])} قطعة/شهر`).join(' · ')]);
 else if(!st.idle)downs.forEach(d=>out.push(['warn','pdown',`${n} قلّل ${d[0]} ${pct(-d[1])}`,`${fmt(d[2])} قطعة في آخر 30 يوم مقابل متوسط ${fmt(d[3])}`]));
 return out}
const allSignals=()=>S.customers.flatMap(c=>signals(custStats(c.id)).map(s=>[...s,c.id]));
const RANK=[['val','القيمة'],['qty','الكمية'],['profit','الربح']];
const rkVal=(r,k)=>k==='val'?r.val:k==='qty'?r.qty:r.profit;
const rkFmt=(v,k)=>k==='qty'?fmt(v)+' قطعة':money(v);
function rankSeg(){const k=TAB.rankBy||'val';return `<div class="seg" style="max-width:360px">${RANK.filter(([v])=>v!=='profit'||can('cost')).map(([v,t])=>`<button class="${k===v?'on':''}" data-a="rankBy" data-v="${v}">${t}</button>`).join('')}</div>`}
A.rankBy=el=>{TAB.rankBy=el.dataset.v;render()};
function weekBars(os,weeks){weeks=weeks||16;const vals=Array(weeks).fill(0);os.forEach(o=>{const w=Math.floor(ago(o.date)/7);if(w<weeks)vals[weeks-1-w]+=o.lines.reduce((s,l)=>s+lineVal(o,l),0)});
 const W=560,H=170,pad=44,mx=Math.max(1,...vals);const nice=Math.ceil(mx/1000)*1000||1000;const bw=(W-pad-6)/weeks;const y=v=>H-20-(v/nice)*(H-34);
 let g='';[0,.5,1].forEach(f=>{const v=nice*f;g+=`<line x1="${pad}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad-6}" y="${y(v)+4}" text-anchor="end">${fmt(v)}</text>`});
 vals.forEach((v,i)=>{const x=pad+3+i*bw;g+=`<rect x="${x}" y="${y(v)}" width="${bw*0.7}" height="${Math.max(0,H-20-y(v))}" rx="3" fill="var(--accent)" opacity="${i>=weeks-4?1:.55}"><title>أسبوع ${weeks-i}: ${fmt(v)} ج</title></rect>`;if(i%4===3||i===weeks-1)g+=`<text x="${x+bw*0.35}" y="${H-5}" text-anchor="middle">${i===weeks-1?'الأسبوع ده':'-'+(weeks-1-i)+'أ'}</text>`});
 return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`}

// ---------- customers screen ----------
const custListOld=V.customers;
V.customers=()=>{const tb=tabs([['dash','لوحة العملاء','أكبر العملاء والمنتجات والتنبيهات'],['compare','مقارنة العملاء','كل العملاء جنب بعض: الأوردرات، القيمة، مدة السحب، والتغيير'],['signals','التنبيهات','عملاء وقفوا أو قللوا أو غيّروا المنتجات'],['list','الحسابات والأسعار','أرصدة العملاء والأسعار الخاصة وحد المديونية']],'dash');
 if(tb.cur==='list'){return custListOld().replace('<div class="kpi" style="margin-bottom:10px">',tb.html+'<div class="kpi" style="margin-bottom:10px">')}
 const k=TAB.rankBy||'val';const sts=S.customers.map(c=>custStats(c.id));const sig=allSignals();
 let body='';
 if(tb.cur==='dash'){
  const tot90=agg(salesOrders().filter(o=>win(o,0,90)));const a30=agg(salesOrders().filter(o=>win(o,0,30)));
  const active=sts.filter(s=>s.since!=null&&s.since<30).length;const idle=sts.filter(s=>s.idle).length;
  const top=sts.map(s=>({s,r:s.D90})).sort((a,b)=>rkVal(b.r,k)-rkVal(a.r,k));const totK=rkVal(tot90,k)||1;
  const pr=Object.entries(tot90.byP).map(([pid,r])=>({p:prod(pid),r,a:(a30.byP[pid]||{qty:0}).qty})).sort((a,b)=>rkVal(b.r,k)-rkVal(a.r,k));
  const notSold=S.products.filter(p=>!a30.byP[p.id]);
  const mxC=Math.max(1,...top.map(t=>rkVal(t.r,k))),mxP=Math.max(1,...pr.map(t=>rkVal(t.r,k)));
  body=`<div class="grid4">${kpi('عملاء نشطين',`${active}<small>من ${S.customers.length}</small>`,'طلبوا في آخر 30 يوم',{go:'customers',tab:'compare',tip:'عدد العملاء اللي طلبوا مرة على الأقل في آخر 30 يوم'})}
   ${kpi('عملاء بقالهم فترة ما طلبوش',`${idle}`,'حسب عادة كل عميل، وبحد أقصى '+S.settings.idleMax+' أيام',{go:'customers',tab:'signals',cls:idle?'down':'up',tip:'العميل بيتحسب متوقف لو عدّى ضعف متوسط المدة بين طلباته أو الحد الأقصى الثابت، أيهم أقل'})}
   ${kpi('متوسط قيمة الأوردر',mv(a30.n?a30.val/a30.n:0),'آخر 30 يوم · '+a30.n+' أوردر',{tip:'إجمالي قيمة الأوردرات ÷ عددها في آخر 30 يوم'})}
   ${kpi('أكبر عميل من المبيعات',top[0]?pct(top[0].r.val/(tot90.val||1)):'—',top[0]?esc(top[0].s.c.name)+' · آخر 90 يوم':'',{tip:'نسبة أكبر عميل من إجمالي المبيعات. لو عالية أوي يبقى فيه خطر الاعتماد على عميل واحد'})}</div>
  <div class="between" style="margin:16px 0 4px"><span class="small muted">الترتيب على أساس (آخر 90 يوم):</span>${rankSeg()}</div>
  <div class="grid2" style="margin-top:8px"><div class="card"><h2 class="sec-title">أكبر المطاعم والكافيهات ${ti('مترتبين حسب اللي سحبوه في آخر 90 يوم. اضغط على أي عميل لتحليله')}</h2><div class="list" style="margin-top:6px">${top.map((t,i)=>`<div class="li click" data-a="custAna" data-v="${t.s.c.id}"><div class="main"><div class="between"><span class="t">${i+1}. ${esc(t.s.c.name)}</span><span class="num small">${rkFmt(rkVal(t.r,k),k)} · ${pct(rkVal(t.r,k)/totK)}</span></div><div class="bar" style="margin-top:5px"><i style="width:${Math.max(2,rkVal(t.r,k)/mxC*100)}%"></i></div><div class="s">${t.r.n} أوردر · بيطلب كل ${t.s.avgGap?fmt(t.s.avgGap,1):'—'} يوم · آخر طلب ${t.s.last?dShort(t.s.last):'—'}${t.s.idle?' · <span class="down">متوقف</span>':''}</div></div></div>`).join('')}</div></div>
   <div class="card"><h2 class="sec-title">أكتر المنتجات مبيعًا ${ti('مترتبة حسب المبيعات في آخر 90 يوم')}</h2><div class="list" style="margin-top:6px">${pr.slice(0,7).map((t,i)=>`<div class="li"><div class="main"><div class="between"><span class="t">${i+1}. ${esc(t.p.name)}</span><span class="num small">${rkFmt(rkVal(t.r,k),k)}</span></div><div class="bar" style="margin-top:5px"><i style="width:${Math.max(2,rkVal(t.r,k)/mxP*100)}%"></i></div></div></div>`).join('')}</div></div></div>
  <div class="grid2" style="margin-top:14px"><div class="card"><h2 class="sec-title">أقل المنتجات حركة ${ti('أقل المنتجات مبيعًا في آخر 90 يوم، واللي ما اتباعتش خالص في آخر 30 يوم')}</h2><div class="list" style="margin-top:6px">${pr.slice(-5).reverse().map(t=>`<div class="li"><div class="main"><div class="t">${esc(t.p.name)}</div><div class="s">${rkFmt(rkVal(t.r,k),k)} في 90 يوم · ${fmt(t.a)} قطعة في آخر 30 يوم</div></div></div>`).join('')}
    ${notSold.length?`<div class="alert warn" style="margin-top:8px"><span class="dot"></span><div><b>ما اتباعتش في آخر 30 يوم:</b> ${notSold.map(p=>esc(p.name)).join('، ')}</div></div>`:''}</div></div>
   <div class="card"><div class="between"><h2>آخر التنبيهات</h2><button class="btn ghost sm" data-a="tab" data-v="signals">الكل (${sig.length}) ↖</button></div><div class="stack" style="margin-top:10px;gap:8px">${sig.slice(0,6).map(sigRow).join('')||'<div class="empty">مفيش تغييرات ملحوظة</div>'}</div></div></div>
  <div class="card" style="margin-top:14px"><h2 class="sec-title">مبيعات العملاء أسبوع بأسبوع ${ti('إجمالي قيمة الأوردرات كل أسبوع لآخر 16 أسبوع. آخر 4 أسابيع بلون أغمق')}</h2>${weekBars(salesOrders())}</div>`}
 if(tb.cur==='compare'){const rows=sts.filter(s=>s.os.length).sort((a,b)=>rkVal(b.D90,k)-rkVal(a.D90,k));const tot=rows.reduce((s,r)=>s+rkVal(r.D90,k),0)||1;
  body=`<div class="between" style="margin-bottom:10px"><span class="small muted">آخر 90 يوم · الترتيب على أساس:</span>${rankSeg()}</div><div class="card"><div class="tbl-wrap"><table><tr><th>العميل</th><th class="n">أوردرات</th><th class="n">القيمة</th><th class="n">الكمية</th>${can('cost')?'<th class="n">الربح</th>':''}<th class="n">متوسط الأوردر</th><th class="n">بيطلب كل ${ti('متوسط عدد الأيام بين كل طلب واللي بعده')}</th><th class="n">آخر طلب</th><th class="n">آخر 30 مقابل اللي قبلهم</th><th class="n">مقابل متوسط 3 شهور</th><th class="n">النسبة</th></tr>
  ${rows.map(s=>{const r=s.D90;const ch=v=>v==null?'—':`<span class="${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${pct(Math.abs(v))}</span>`;return `<tr class="click" data-a="custAna" data-v="${s.c.id}"><td>${esc(s.c.name)} ${s.idle?'<span class="pill bad">متوقف</span>':''}</td><td class="n">${r.n}</td><td class="n">${fmt(r.val)}</td><td class="n">${fmt(r.qty)}</td>${can('cost')?`<td class="n">${fmt(r.profit)}</td>`:''}<td class="n">${fmt(r.n?r.val/r.n:0)}</td><td class="n">${s.avgGap?fmt(s.avgGap,1)+' يوم':'—'}</td><td class="n">${s.last?dShort(s.last)+' ('+s.since+' يوم)':'—'}</td><td class="n">${ch(s.chA)}</td><td class="n">${ch(s.chB)}</td><td class="n">${pct(rkVal(r,k)/tot)}</td></tr>`}).join('')}</table></div></div>
  <div class="card" style="margin-top:14px"><h2 class="sec-title">مين بيسحب إيه ${ti('كمية كل منتج سحبها كل عميل في آخر 90 يوم')}</h2><div class="tbl-wrap" style="margin-top:8px">${matrix(rows)}</div></div>`}
 if(tb.cur==='signals'){const f=TAB.sigF||'all';const types=[['all','الكل'],['idle','متوقفين'],['down','بيقللوا'],['up','بيزوّدوا'],['product','تغيير المنتجات'],['gap','مدة السحب']];
  const map={idle:['idle'],down:['down','pdown'],up:['up'],product:['new','stop','shift','pdown'],gap:['slow','fast']};const list=f==='all'?sig:sig.filter(s=>map[f].includes(s[1]));
  body=`<div class="tabs">${types.map(([v,t])=>`<button class="tab ${f===v?'on':''}" data-a="sigF" data-v="${v}">${t} (${v==='all'?sig.length:sig.filter(s=>map[v].includes(s[1])).length})</button>`).join('')}</div><div class="stack" style="gap:8px">${list.map(sigRow).join('')||'<div class="empty">مفيش تنبيهات هنا</div>'}</div>
  <p class="note" style="margin-top:12px">العميل بيتحسب «متوقف» لو عدّى ضعف متوسط المدة بين طلباته أو ${S.settings.idleMax} أيام (أيهم أقل). التغيير بيتحسب ملحوظ لو ${S.settings.changePct}% أو أكتر، في المقارنتين: آخر 30 يوم مقابل الـ 30 اللي قبلهم، وآخر 30 يوم مقابل متوسط 3 شهور. النسب دي بتتغير من الإعدادات.</p>`}
 return head('العملاء','داشبورد وتحليل للمطاعم والكافيهات، وحساباتهم وأسعارهم الخاصة','<button class="btn" data-a="editCust" data-v="">+ عميل</button>')+tb.html+body};
A.sigF=el=>{TAB.sigF=el.dataset.v;render()};
function sigRow(s){return `<div class="alert ${s[0]}" data-a="custAna" data-v="${s[4]}" style="cursor:pointer"${tip('اضغط لتحليل العميل')}><span class="dot"></span><div><b>${esc(s[2])}</b><div class="small muted">${esc(s[3])}</div></div></div>`}
function matrix(rows){const pids=S.products.map(p=>p.id).filter(pid=>rows.some(r=>r.D90.byP[pid]));
 return `<table><tr><th>العميل</th>${pids.map(pid=>`<th class="n">${esc(prod(pid).name)}</th>`).join('')}</tr>${rows.map(r=>`<tr><td>${esc(r.c.name)}</td>${pids.map(pid=>{const q=(r.D90.byP[pid]||{}).qty;return `<td class="n ${q?'':'muted'}">${q?fmt(q):'·'}</td>`}).join('')}</tr>`).join('')}</table>`}
A.custAna=el=>{const st=custStats(el.dataset.v);const c=st.c;const sg=signals(st);
 const pids=[...new Set([...Object.keys(st.A30.byP),...Object.keys(st.P90.byP)])];
 sheet(`<div class="between"><h2>تحليل ${esc(c.name)}</h2><div class="row"><button class="btn sec sm" data-a="custDetail" data-v="${c.id}">كشف الحساب</button><button class="btn sec sm" data-a="close">إغلاق</button></div></div><p class="sub">${esc(c.type)} · ${c.pay==='cash'?'كاش':'آجل '+c.days+' يوم'} · عميل من ${st.first?dShort(st.first):'—'}</p>
 ${st.os.length?`<div class="grid2">${kpi('سحب آخر 90 يوم',mv(st.D90.val),fmt(st.D90.qty)+' قطعة · '+st.D90.n+' أوردر')}${kpi('بيطلب كل',`${st.avgGap?fmt(st.avgGap,1):'—'}<small>يوم</small>`,st.gapR&&st.gapP?`آخر 30 يوم: كل ${fmt(st.gapR,1)} · قبلها: كل ${fmt(st.gapP,1)}`:'',{tip:'متوسط عدد الأيام بين كل طلب واللي بعده'})}
 ${kpi('آخر طلب',`${st.since??'—'}<small>يوم</small>`,st.last?dShort(st.last)+(st.idle?' · <span class="down">عدّى الحد ('+fmt(st.idleLimit,0)+' يوم)</span>':''):'',{cls:st.idle?'down':''})}${kpi('آخر 30 يوم',mv(st.A30.val),`${st.chA==null?'':`<span class="${st.chA>=0?'up':'down'}">${pct(st.chA)}</span> عن اللي قبلهم`}${st.chB==null?'':` · <span class="${st.chB>=0?'up':'down'}">${pct(st.chB)}</span> عن متوسط 3 شهور`}`)}</div>
 ${sg.length?`<div class="stack" style="gap:8px;margin-top:12px">${sg.map(s=>`<div class="alert ${s[0]}"><span class="dot"></span><div><b>${esc(s[2])}</b><div class="small muted">${esc(s[3])}</div></div></div>`).join('')}</div>`:''}
 <h3 style="margin-top:14px">السحب أسبوع بأسبوع</h3>${weekBars(st.os)}
 <h3 style="margin-top:12px">المنتجات</h3><div class="tbl-wrap"><table><tr><th>المنتج</th><th class="n">آخر 30 يوم</th><th class="n">متوسط شهري (3 شهور قبلها)</th><th class="n">التغيير</th><th class="n">القيمة 90 يوم</th></tr>${pids.map(pid=>{const a=(st.A30.byP[pid]||{}).qty||0,b=((st.P90.byP[pid]||{}).qty||0)/3;const ch=b?(a-b)/b:null;return `<tr><td>${esc(prod(pid).name)}</td><td class="n">${fmt(a)}</td><td class="n">${fmt(b,0)}</td><td class="n">${ch==null?'<span class="pill acc">جديد</span>':!a?'<span class="pill bad">وقف</span>':`<span class="${ch>=0?'up':'down'}">${ch>=0?'▲':'▼'} ${pct(Math.abs(ch))}</span>`}</td><td class="n">${fmt((st.D90.byP[pid]||{}).val||0)}</td></tr>`}).join('')}</table></div>
 <h3 style="margin-top:12px">مواعيد الطلب</h3><div class="row small" style="gap:4px">${st.gaps.slice(-20).map(g=>`<span class="pill ${g.g>(st.avgGap||0)*1.5?'warn':''}"${tip(dShort(g.d)+': بعد '+g.g+' يوم من اللي قبله')}>${g.g} يوم</span>`).join('')}</div>`:'<div class="empty">العميل ده لسه ما طلبش</div>'}`)};

// ================= FORECAST =================
function addMonth(k,n){let [y,m]=k.split('-').map(Number);m+=n;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return y+'-'+String(m).padStart(2,'0')}
function seasonMult(k){const m=+k.slice(5,7);const ss=S.seasons.filter(s=>s.months.includes(m));return {mult:1+ss.reduce((a,s)=>a+s.pct,0)/100,names:ss.map(s=>s.name+' '+(s.pct>0?'+':'')+s.pct+'%')}}
function forecastModel(){
 const cur=monthPL(curMonth());const hist=S.months.map(m=>({k:m.k,sales:m.sales,cogs:m.cogs,exp:m.exp,waste:m.waste}));
 if(cur.frac>0.5)hist.push({k:curMonth(),sales:cur.sales/cur.frac,est:true});
 const ys=hist.map(h=>h.sales/seasonMult(h.k).mult);const n=ys.length;const xs=ys.map((_,i)=>i);const mx=avgArr(xs),my=avgArr(ys);
 let b=0,d=0;xs.forEach((x,i)=>{b+=(x-mx)*(ys[i]-my);d+=(x-mx)**2});b=d?b/d:0;const a=my-b*mx;
 const res=ys.map((y,i)=>(y-(a+b*i))/(a+b*i));const sd=Math.max(0.06,Math.sqrt(avgArr(res.map(r=>r*r))||0));
 const closed=S.months.slice(-3).filter(m=>m.sales>0);const cogsR=avgArr(closed.map(m=>m.cogs/m.sales))??(cur.sales?cur.cogs/cur.sales:0.45);const wasteR=avgArr(closed.map(m=>(m.waste||0)/m.sales))??0;
 const payroll=S.staff.filter(w=>w.active).reduce((s,w)=>s+(w.type==='monthly'?w.salary:w.salary*26),0);const rent=(S.expenses.filter(e=>e.cat==='إيجار').slice(-1)[0]||{amt:0}).amt;const dep=S.assets.reduce((s,x)=>s+depFor(x,curMonth()),0);
 const varR=0.05;const fixed=Math.max(payroll+rent+dep-avgArr(closed.map(m=>m.sales))*varR*2,avgArr(closed.map(m=>m.exp-m.sales*varR))||0);
 const startK=hist[hist.length-1].est?addMonth(curMonth(),1):addMonth(hist[hist.length-1].k,1);const base0=hist[hist.length-1].est?n:n;
 const fc=[];for(let i=0;i<6;i++){const k=addMonth(startK,i);const se=seasonMult(k);const idx=(hist[hist.length-1].est?n:n)+i;const base=Math.max(0,a+b*idx);const sales=base*se.mult;const w=sd*Math.sqrt(i+1)*1.28;
  const cogs=sales*cogsR,exp=fixed+sales*varR,waste=sales*wasteR;fc.push({k,sales,lo:sales*(1-w),hi:sales*(1+w),cogs,exp,waste,net:sales-cogs-exp-waste,se})}
 return {hist,fc,slope:b,sd,cogsR,wasteR,fixed,varR,payroll,rent,dep,enough:S.months.length>=3}}
function fcChart(M){const all=M.hist.map(h=>({k:h.k,v:h.sales,est:h.est})).concat(M.fc.map(f=>({k:f.k,v:f.sales,lo:f.lo,hi:f.hi,fc:1})));
 const W=620,H=230,pad=46,top=Math.ceil(Math.max(...all.map(x=>x.hi||x.v))/10000)*10000;const bw=(W-pad-6)/all.length;const y=v=>H-24-(v/top)*(H-40);
 let g='';[0,.5,1].forEach(f=>{const v=top*f;g+=`<line x1="${pad}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad-6}" y="${y(v)+4}" text-anchor="end">${fmt(v/1000,0)}k</text>`});
 all.forEach((d,i)=>{const x=pad+4+i*bw,w=bw*0.62;g+=`<rect x="${x}" y="${y(d.v)}" width="${w}" height="${H-24-y(d.v)}" rx="3" fill="${d.fc?'var(--accent-soft)':'var(--accent)'}" stroke="${d.fc?'var(--accent)':'none'}" stroke-dasharray="${d.fc?'3 3':''}" opacity="${d.est?.7:1}"><title>${mName(d.k)}: ${fmt(d.v)} ج</title></rect>`;
  if(d.fc)g+=`<line x1="${x+w/2}" x2="${x+w/2}" y1="${y(d.hi)}" y2="${y(d.lo)}" stroke="var(--fg)" stroke-width="1.2"/><line x1="${x+w/2-5}" x2="${x+w/2+5}" y1="${y(d.hi)}" y2="${y(d.hi)}" stroke="var(--fg)"/><line x1="${x+w/2-5}" x2="${x+w/2+5}" y1="${y(d.lo)}" y2="${y(d.lo)}" stroke="var(--fg)"/>`;
  g+=`<text x="${x+w/2}" y="${H-7}" text-anchor="middle">${MONTHS[+d.k.slice(5)-1].slice(0,5)}</text>`});
 return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg><div class="row small muted" style="gap:14px"><span><span style="color:var(--accent)">■</span> فعلي</span><span>▢ متوقع (الخط = المدى من الأقل للأعلى)</span><span>الشهر الحالي متقدَّر بمعدل الأيام اللي عدّت</span></div>`}
V.forecast=()=>{const M=forecastModel();const tb=tabs([['total','المصنع كله'],['cust','لكل عميل','متوقع كل مطعم وكافيه يسحب قد إيه الشهر الجاي'],['prod','لكل منتج','محتاج تجهّز من كل منتج كام'],['seasons','المواسم','نسبة الزيادة أو النقص في كل موسم']],'total');const P=can('profit');let body='';
 const sum=(n,f)=>M.fc.slice(0,n).reduce((s,x)=>s+x[f],0);
 if(tb.cur==='total')body=`${M.enough?'':'<div class="alert warn"><span class="dot"></span><div>بيانات غير كافية: محتاج 3 شهور مقفولة على الأقل علشان التنبؤ يبقى له معنى.</div></div>'}
  <div class="grid3">${[[1,mName(M.fc[0].k)],[3,'3 شهور ('+MONTHS[+M.fc[0].k.slice(5)-1]+' – '+MONTHS[+M.fc[2].k.slice(5)-1]+')'],[6,'6 شهور ('+MONTHS[+M.fc[0].k.slice(5)-1]+' – '+MONTHS[+M.fc[5].k.slice(5)-1]+')']].map(([n,l])=>kpi('مبيعات '+l,mv(sum(n,'sales')),`من ${fmt(sum(n,'lo'))} لـ ${fmt(sum(n,'hi'))}${P?' · صافي '+fmt(sum(n,'net')):''}`,{hl:n===1,tip:'الرقم المتوقع، والمدى اللي غالبًا هيقع فيه (من الأقل للأعلى)'})).join('')}</div>
  <div class="card" style="margin-top:14px"><h2 class="sec-title">المبيعات: فعلي ومتوقع ${ti('الاتجاه محسوب من آخر الشهور بعد شيل أثر المواسم، وبعدين أثر موسم كل شهر بيتضاف عليه')}</h2>${fcChart(M)}</div>
  <div class="card" style="margin-top:14px"><h2>التوقع شهر بشهر</h2><div class="tbl-wrap" style="margin-top:8px"><table><tr><th>الشهر</th><th class="n">المبيعات المتوقعة</th><th class="n">المدى</th><th class="n">تكلفة الخامات ${ti('المبيعات × متوسط نسبة تكلفة المبيعات لآخر 3 شهور ('+pct(M.cogsR)+')')}</th><th class="n">المصروفات ${ti('ثابتة: مرتبات '+fmt(M.payroll)+' + إيجار '+fmt(M.rent)+' + إهلاك '+fmt(M.dep)+'، ومتغيرة: '+pct(M.varR)+' من المبيعات (غاز، كهربا، توصيل، منظفات)')}</th>${P?'<th class="n">صافي الربح</th>':''}<th>المواسم</th></tr>
  ${M.fc.map(f=>`<tr><td>${mName(f.k)}</td><td class="n b">${fmt(f.sales)}</td><td class="n small">${fmt(f.lo)} – ${fmt(f.hi)}</td><td class="n">${fmt(f.cogs)}</td><td class="n">${fmt(f.exp)}</td>${P?`<td class="n ${f.net<0?'down':'up'}">${fmt(f.net)}</td>`:''}<td class="small">${f.se.names.map(n=>`<span class="pill acc">${esc(n)}</span>`).join(' ')||'<span class="muted">—</span>'}</td></tr>`).join('')}</table></div>
  <p class="note" style="margin-top:10px">الاتجاه الحالي ${M.slope>=0?'صاعد':'نازل'} حوالي ${money(Math.abs(M.slope))} في الشهر (من غير المواسم). المدى بيوسع كل ما الشهر يبعد. ده تقدير يساعدك في التخطيط والشراء، مش رقم مضمون.</p></div>`;
 if(tb.cur==='cust'){const k1=M.fc[0].k;const sm=seasonMult(k1).mult;const rows=S.customers.map(c=>{const st=custStats(c.id);const base=st.D90.val/3,bq=st.D90.qty/3;const tr=st.chB==null?1:Math.min(1.4,Math.max(0.6,1+0.5*st.chB));const f=st.idle?0:1;return {st,val:base*tr*sm*f,qty:bq*tr*sm*f,tr,enough:st.os.length>=3}}).sort((a,b)=>b.val-a.val);
  body=`<div class="card"><p class="sub">متوقع ${mName(k1)}: متوسط سحب آخر 3 شهور × اتجاه العميل × أثر الموسم (${pct(sm-1)})</p><div class="tbl-wrap"><table><tr><th>العميل</th><th class="n">متوسط شهري</th><th class="n">الاتجاه</th><th class="n">متوقع القيمة</th><th class="n">متوقع الكمية</th><th>ملاحظة</th></tr>
  ${rows.map(r=>`<tr class="click" data-a="custAna" data-v="${r.st.c.id}"><td>${esc(r.st.c.name)}</td><td class="n">${fmt(r.st.D90.val/3)}</td><td class="n ${r.tr>=1?'up':'down'}">${r.tr>=1?'▲':'▼'} ${pct(Math.abs(r.tr-1))}</td><td class="n b">${fmt(r.val)}</td><td class="n">${fmt(r.qty)}</td><td class="small">${!r.enough?'<span class="pill">بيانات غير كافية</span>':r.st.idle?'<span class="pill bad">متوقف، مش محسوب</span>':''}</td></tr>`).join('')}
  <tr class="tot"><td>الإجمالي</td><td class="n">${fmt(rows.reduce((s,r)=>s+r.st.D90.val/3,0))}</td><td></td><td class="n">${fmt(rows.reduce((s,r)=>s+r.val,0))}</td><td class="n">${fmt(rows.reduce((s,r)=>s+r.qty,0))}</td><td></td></tr></table></div></div>`}
 if(tb.cur==='prod'){const k1=M.fc[0].k;const sm=seasonMult(k1).mult;const all90=agg(salesOrders().filter(o=>win(o,0,90))),a30=agg(salesOrders().filter(o=>win(o,0,30))),p90=agg(salesOrders().filter(o=>win(o,30,120)));
  const rows=S.products.map(p=>{const q=(all90.byP[p.id]||{qty:0}).qty/3;const a=(a30.byP[p.id]||{qty:0}).qty,b=(p90.byP[p.id]||{qty:0}).qty/3;const tr=b?Math.min(1.4,Math.max(0.6,1+0.5*(a-b)/b)):1;const m=q*tr*sm;return {p,q,tr,m}}).filter(r=>r.q>0).sort((a,b)=>b.m-a.m);
  body=`<div class="card"><p class="sub">جهّز إيه في ${mName(k1)}: متوسط آخر 3 شهور × اتجاه المنتج × أثر الموسم</p><div class="tbl-wrap"><table><tr><th>المنتج</th><th class="n">متوسط شهري</th><th class="n">الاتجاه</th><th class="n">متوقع الشهر</th><th class="n">في الأسبوع</th><th class="n">في اليوم ${ti('متوقع الشهر ÷ 26 يوم شغل')}</th><th class="n">كراتين/أسبوع</th></tr>
  ${rows.map(r=>`<tr><td>${esc(r.p.name)}</td><td class="n">${fmt(r.q,0)}</td><td class="n ${r.tr>=1?'up':'down'}">${r.tr>=1?'▲':'▼'} ${pct(Math.abs(r.tr-1))}</td><td class="n b">${fmt(r.m,0)}</td><td class="n">${fmt(r.m/4.33,0)}</td><td class="n">${fmt(r.m/26,1)}</td><td class="n">${r.p.cat==='cake'?'—':fmt(Math.ceil(r.m/4.33/r.p.ppc))}</td></tr>`).join('')}</table></div>
  <p class="note" style="margin-top:10px">المنتجات اللي ما اتباعتش في آخر 3 شهور مش ظاهرة: ${S.products.filter(p=>!all90.byP[p.id]).map(p=>esc(p.name)).join('، ')||'مفيش'}.</p></div>`}
 if(tb.cur==='seasons')body=`<div class="card"><p class="sub">النسبة بتتضاف على المبيعات المتوقعة في شهور الموسم. لو أكتر من موسم في نفس الشهر، النسب بتتجمع. مواعيد رمضان والعيدين بتتغير كل سنة، فراجع الشهور.</p><div class="tbl-wrap"><table><tr><th>الموسم</th><th>الشهور (أرقام مفصولة بفاصلة)</th><th class="n">التأثير %</th><th></th></tr>
  ${S.seasons.map(s=>`<tr><td><input type="text" id="sn-${s.id}" value="${esc(s.name)}"></td><td><input type="text" id="sm-${s.id}" value="${s.months.join(', ')}" style="max-width:140px;direction:ltr"></td><td class="n"><input class="inp-sm" type="number" id="sp-${s.id}" value="${s.pct}"></td><td><button class="icon-btn" data-a="seasonDel" data-v="${s.id}" aria-label="حذف">×</button></td></tr>`).join('')}</table></div>
  <div class="row" style="margin-top:12px"><button class="btn" data-a="seasonSave">حفظ المواسم</button><button class="btn sec" data-a="seasonAdd">+ موسم</button></div></div>`;
 return head('التنبؤ بالمبيعات والمصروفات','توقع الشهر الجاي و3 و6 شهور على أساس اتجاه المبيعات والمواسم، ولكل عميل ولكل منتج')+tb.html+body};
function readSeasons(){S.seasons.forEach(s=>{const n=document.getElementById('sn-'+s.id);if(!n)return;s.name=n.value;s.months=val('sm-'+s.id).split(/[,،\s]+/).map(Number).filter(x=>x>=1&&x<=12);s.pct=num('sp-'+s.id)})}
A.seasonSave=()=>{readSeasons();render();toast('اتحفظت المواسم واتحسب التنبؤ من جديد')};
A.seasonAdd=()=>{readSeasons();S.seasons.push({id:uid('se'),name:'موسم جديد',months:[],pct:0});render()};
A.seasonDel=el=>{readSeasons();S.seasons=S.seasons.filter(s=>s.id!==el.dataset.v);render()};

const OCC_TPL={xmas:'ميري كريسماس يا {الاسم} 🎄\nكل سنة وانتم طيبين، ونتمنى لكم أيام مليانة فرحة.',ny:'سنة جديدة سعيدة يا {الاسم} ✨\nنتمنى لكم سنة كلها نجاح، ومبسوطين إننا بنكمّلها معاكم.',ramadan:'رمضان كريم يا {الاسم} 🌙\nكل سنة وانتم بخير، ونتمنى لكم شهر مليان خير وبركة.',ramadan10:'تقبّل الله منا ومنكم يا {الاسم} 🌙\nالعشر الأواخر تكون فاتحة خير عليكم.',eid:'عيد سعيد يا {الاسم} 🎉\nكل سنة وانتم طيبين، وينعاد عليكم بالخير والبركة.',spring:'شم نسيم سعيد يا {الاسم} 🌸\nكل سنة وانتم طيبين.',hijri:'كل عام وانتم بخير يا {الاسم} 🌙\nبمناسبة رأس السنة الهجرية.',mawlid:'كل سنة وانتم طيبين يا {الاسم} 🌙\nبمناسبة المولد النبوي الشريف.',bday:'كل سنة وانت طيب يا {الاسم} 🎂\nعيد ميلاد سعيد، ويارب السنة الجاية تكون أحلى.',anniv:'كل سنة وانتم ناجحين يا {الاسم} 🎉\nبمناسبة {المناسبة}، فخورين إننا جزء من نجاحكم.',custom:'تحية خاصة لـ {الاسم} 🤍'};
function personalOcc(){const out=[];const yr=new Date().getFullYear();const nxt=d=>{if(!d)return null;let x=yr+d.slice(4);if(x<today())x=(yr+1)+d.slice(4);return x};
 const add=(e,k,f,name,key)=>{const d=nxt((e.info||{})[f]);if(d&&daysBetween(today(),d)<=60)out.push({id:k+e.id+f,name:name+' — '+e.name,date:d,key,personal:{k,id:e.id}})};
 S.customers.forEach(c=>{add(c,'c',c.kind==='person'?'eventDate':'bday',c.kind==='person'?'المناسبة':'عيد ميلاد '+((c.info||{}).contact||'المسؤول'),c.kind==='person'?'custom':'bday');add(c,'c','opening','ذكرى افتتاح','anniv');add(c,'c','since','ذكرى بداية التعامل','anniv')});
 S.suppliers.forEach(s=>{add(s,'s','bday','عيد ميلاد '+((s.info||{}).contact||''),'bday');add(s,'s','since','ذكرى بداية التعامل','anniv')});
 return out.sort((a,b)=>a.date<b.date?-1:1)}
V.greetings=()=>{const G=TAB.gr;const up=S.occasions.filter(o=>o.date>=daysAddISO(today(),-3)).sort((a,b)=>a.date<b.date?-1:1);const per=personalOcc();
 return head('التهاني والمناسبات','كارت تهنئة باسم كل عميل ومورد، بالمقاسين (مربع وطولي)، ومعاه نص جاهز للواتساب','<button class="btn" data-a="grCustom">+ مناسبة خاصة</button>')+
 `<div class="cols" style="margin-top:0"><div class="card"><h2 class="sec-title">المناسبات الجاية ${ti('التواريخ الهجرية والمتغيرة تقريبية، تقدر تعدّلها')}</h2><div class="list" style="margin-top:6px">${up.map(o=>`<div class="li click" data-a="grPick" data-v="${o.id}"><div class="main"><div class="t">${esc(o.name)}</div><div class="s">${dShort(o.date)} ${o.date.slice(0,4)} · بعد ${Math.max(0,daysBetween(today(),o.date))} يوم</div></div><span class="pill acc">جهّز الكروت</span></div>`).join('')}</div></div>
 <div class="card"><h2 class="sec-title">مناسبات شخصية قريبة ${ti('من دليل العملاء والموردين: أعياد الميلاد، ذكرى الافتتاح، ذكرى بداية التعامل، ومناسبات الأفراد، خلال 60 يوم')}</h2><div class="list" style="margin-top:6px">${per.map(o=>`<div class="li click" data-a="grPersonal" data-v="${o.id}"><div class="main"><div class="t">${esc(o.name)}</div><div class="s">${dShort(o.date)} · بعد ${daysBetween(today(),o.date)} يوم</div></div><span class="pill">كارت</span></div>`).join('')||'<div class="empty">مفيش مناسبات شخصية خلال 60 يوم. ضيف التواريخ من «دليل العملاء والموردين».</div>'}</div></div></div>
 ${G?grCompose(G):''}`};
A.grPick=el=>{const o=S.occasions.find(x=>x.id===el.dataset.v);TAB.gr={occ:o.name,key:o.key,to:'all',brand:'melt',size:'sq',msg:OCC_TPL[o.key]||OCC_TPL.custom,only:null};render();setTimeout(()=>document.getElementById('gr-compose')?.scrollIntoView({behavior:'smooth'}),50)};
A.grPersonal=el=>{const o=personalOcc().find(x=>x.id===el.dataset.v);const e=entity(o.personal.k,o.personal.id);TAB.gr={occ:o.name.split(' — ')[0],key:o.key,to:'one',brand:e.brand||'melt',size:'sq',msg:(OCC_TPL[o.key]||OCC_TPL.custom),only:o.personal};render();setTimeout(()=>document.getElementById('gr-compose')?.scrollIntoView({behavior:'smooth'}),50)};
A.grCustom=()=>{TAB.gr={occ:'مناسبة خاصة',key:'custom',to:'all',brand:'melt',size:'sq',msg:OCC_TPL.custom,only:null,editTitle:true};render()};
let grName=r=>r.k==='c'&&r.e.kind!=='person'?'فريق '+r.e.name:r.e.name;
let grText=(G,r)=>G.msg.replace(/\{الاسم\}/g,grName(r)).replace(/\{المناسبة\}/g,G.occ)+'\nمع تحيات '+brand(G.brand).name;
A.grClose=()=>{TAB.gr=null;render()};
A.grSet=el=>{A.grApply(true);TAB.gr[el.dataset.f]=el.dataset.v;render()};
A.grApply=noRender=>{const G=TAB.gr;if(!G)return;const m=document.getElementById('gr-m');if(m)G.msg=m.value;const t=document.getElementById('gr-t');if(t)G.occ=t.value;if(noRender!==true)render()};
A.grCopy=el=>{const G=TAB.gr;const r=grRecipients(G)[+el.dataset.i];A.copy({dataset:{t:grText(G,r)}})};
A.grDl=el=>{const cv=document.querySelector(`canvas.gcard[data-i="${el.dataset.i}"]`);const r=grRecipients(TAB.gr)[+el.dataset.i];try{cv.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='تهنئة-'+r.e.name+'.png';document.body.appendChild(a);a.click();a.remove();toast('اتحمّل الكارت')})}catch(e){toast('التحميل مقفول في المعاينة، افتح الملف من جهازك')}};
const _imgCache={};function loadImg(src){return _imgCache[src]=_imgCache[src]||new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src})}
function wrapLines(ctx,text,maxW){const out=[];text.split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
A.grDl=el=>{const cv=document.querySelector(`canvas.gcard[data-i="${el.dataset.i}"]`);const r=grRecipients(TAB.gr)[+el.dataset.i];cv.toBlob(b=>saveFile('تهنئة-'+(r.person?r.person.name:r.e.name)+'.png',b),'image/png')};
function ensurePeople(){[...S.customers,...S.suppliers].forEach(e=>{e.info=e.info||{};if(!e.info.people){const i=e.info;e.info.people=i.contact?[{name:i.contact,role:i.role||'',mobile:i.mobile||'',whatsapp:i.whatsapp||'',bday:i.bday||'',current:true}]:[]}})}
// greetings per person
function grRecipients(G){ensurePeople();const ex=G.excl||[];const expand=(e,k)=>{const ps=(e.info&&e.info.people)||[];return ps.length?ps.map((p,i)=>({e,k,person:p,key:k+e.id+':'+i})):[{e,k,key:k+e.id}]};
 let list;if(G.only){const e=entity(G.only.k,G.only.id);list=G.only.pi!=null?[{e,k:G.only.k,person:e.info.people[G.only.pi],key:G.only.k+e.id+':'+G.only.pi}]:expand(e,G.only.k)}
 else{const cs=S.customers.filter(c=>!G.brandOnly||(c.brand||'melt')===G.brand).flatMap(e=>expand(e,'c')),ss=S.suppliers.flatMap(e=>expand(e,'s'));list=G.to==='c'?cs:G.to==='s'?ss:cs.concat(ss)}
 return list.filter(r=>!ex.includes(r.key))}
grName=r=>r.person?r.person.name:(r.k==='c'&&r.e.kind!=='person'?'فريق '+r.e.name:r.e.name);
const grSub=r=>r.person?(r.person.role?r.person.role+' — ':'')+r.e.name+(r.person.current===false?' (سابقًا)':''):'';
grText=(G,r)=>G.msg.replace(/\{الاسم\}/g,grName(r)).replace(/\{المناسبة\}/g,G.occ)+'\nمع تحيات '+brand(G.brand).name;
function personalOcc(){ensurePeople();const out=[];const yr=new Date().getFullYear();const nxt=d=>{if(!d)return null;let x=yr+d.slice(4);if(x<today())x=(yr+1)+d.slice(4);return x};const near=d=>d&&daysBetween(today(),d)<=60;
 const all=[...S.customers.map(e=>[e,'c']),...S.suppliers.map(e=>[e,'s'])];
 all.forEach(([e,k])=>{const i=e.info||{};(i.people||[]).forEach((p,pi)=>{const d=nxt(p.bday);if(near(d))out.push({id:k+e.id+'b'+pi,name:'عيد ميلاد '+p.name+' ('+(p.role||'')+' — '+e.name+')',date:d,key:'bday',personal:{k,id:e.id,pi}})});
  if(k==='c'&&e.kind==='person'&&near(nxt(i.eventDate)))out.push({id:k+e.id+'ev',name:'المناسبة — '+e.name,date:nxt(i.eventDate),key:'custom',personal:{k,id:e.id}});
  [['opening','ذكرى افتتاح'],['since','ذكرى بداية التعامل']].forEach(([f,l])=>{const d=nxt(i[f]);if(near(d)&&daysBetween(i[f],d)>300)out.push({id:k+e.id+f,name:l+' — '+e.name,date:d,key:'anniv',personal:{k,id:e.id}})})});
 return out.sort((a,b)=>a.date<b.date?-1:1)}
A.grPersonal=el=>{const o=personalOcc().find(x=>x.id===el.dataset.v);const e=entity(o.personal.k,o.personal.id);TAB.gr={occ:o.name.split(' — ')[0].split(' (')[0],key:o.key,to:'one',brand:e.brand||'melt',size:'sq',msg:(OCC_TPL[o.key]||OCC_TPL.custom),only:o.personal,excl:[]};render();setTimeout(()=>document.getElementById('gr-compose')?.scrollIntoView({behavior:'smooth'}),50)};
A.grExcl=el=>{A.grApply(true);TAB.gr.excl=(TAB.gr.excl||[]).concat([el.dataset.k]);render()};
A.grReset=()=>{A.grApply(true);TAB.gr.excl=[];render()};
function grCompose(G){const rs=grRecipients(G);return `<div class="card" id="gr-compose" style="margin-top:14px"><div class="between"><h2>كروت: ${esc(G.occ)}</h2><button class="btn ghost sm" data-a="grClose">قفل</button></div>
 <div class="fgrid" style="margin-top:10px">${G.editTitle?`<div class="field full"><label for="gr-t">اسم المناسبة</label><input id="gr-t" type="text" value="${esc(G.occ)}" data-chg="grApply"></div>`:''}
 ${G.only?'':`<div class="field"><label>لمين</label><div class="seg"><button class="${G.to==='all'?'on':''}" data-a="grSet" data-f="to" data-v="all">الكل</button><button class="${G.to==='c'?'on':''}" data-a="grSet" data-f="to" data-v="c">العملاء</button><button class="${G.to==='s'?'on':''}" data-a="grSet" data-f="to" data-v="s">الموردين</button></div></div>`}
 <div class="field"><label>المقاس</label><div class="seg"><button class="${G.size==='sq'?'on':''}" data-a="grSet" data-f="size" data-v="sq">مربع (شات)</button><button class="${G.size==='st'?'on':''}" data-a="grSet" data-f="size" data-v="st">طولي (حالة)</button></div></div>
 <div class="field"><label>البراند</label><div class="seg">${S.brands.map(b=>`<button class="${G.brand===b.id?'on':''}" data-a="grSet" data-f="brand" data-v="${b.id}">${esc(b.name)}</button>`).join('')}</div></div>
 <div class="field full"><label for="gr-m">نص الرسالة ({الاسم} بيتبدل باسم كل شخص)</label><textarea id="gr-m" rows="3" data-chg="grApply">${esc(G.msg)}</textarea></div></div>
 <p class="small muted" style="margin-top:8px">${rs.length} كارت، لكل شخص في كل مكان كارت باسمه وصفته (المالك والمدير ومسؤول المشتريات...).${(G.excl||[]).length?` <button class="btn ghost sm" data-a="grReset">رجّع المستبعدين (${G.excl.length})</button>`:''}</p>
 <div class="grid3" style="margin-top:10px">${rs.map((r,i)=>{const ph=(r.person&&(r.person.whatsapp||r.person.mobile))||(r.e.info||{}).whatsapp||(r.e.info||{}).mobile||r.e.phone||'';return `<div class="card flat" style="padding:10px"><canvas class="gcard" data-i="${i}" style="width:100%;height:auto;border-radius:10px;display:block;border:1px solid var(--line)"></canvas>
  <div class="small b" style="margin-top:8px">${esc(grName(r))}</div><div class="small muted">${esc(grSub(r)||r.e.name)}</div><div class="small muted num" style="direction:ltr;text-align:right">${esc(ph)||'مفيش رقم'}</div>
  <div class="row" style="margin-top:6px"><button class="btn sm" data-a="grDl" data-i="${i}">حفظ الصورة</button><button class="btn sec sm" data-a="grCopy" data-i="${i}">نسخ النص</button><button class="btn ghost sm" data-a="grExcl" data-k="${r.key}">استبعاد</button></div></div>`}).join('')}</div></div>`}
async function drawCards(){const G=TAB.gr;if(!G)return;const cvs=document.querySelectorAll('canvas.gcard');if(!cvs.length)return;const B=brand(G.brand);const K=Object.assign({ink:'#3a2416',acc:'#b8894a',acc2:'#94692c',line:'#e1c9a0',bg1:'#fffaf3',bg2:'#f3e6d3'},B.id==='b2'?{ink:'#480903',acc:'#CE793A',acc2:'#B64B12',bg1:'#fbf5e8',bg2:'#E5D1A4'}:{},Object.fromEntries(Object.entries(B.c||{}).filter(([k,v])=>v)));const logo=B.logo?await loadImg(B.logo):null;
 try{await Promise.all([document.fonts.load('700 80px "El Messiri"'),document.fonts.load('500 40px "IBM Plex Sans Arabic"')])}catch(e){}
 const rs=grRecipients(G);cvs.forEach(cv=>{const r=rs[+cv.dataset.i];if(!r)return;const st=G.size==='st';const W=1080,H=st?1920:1080;cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,K.bg1);g.addColorStop(1,K.bg2);x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle=K.acc;x.lineWidth=4;x.strokeRect(36,36,W-72,H-72);x.lineWidth=1.5;x.strokeRect(52,52,W-104,H-104);
  [[70,70],[W-70,70],[70,H-70],[W-70,H-70]].forEach(([a,b])=>{x.save();x.translate(a,b);x.rotate(Math.PI/4);x.fillStyle=K.acc;x.fillRect(-9,-9,18,18);x.restore()});
  let y=st?200:100;
  if(logo){const lw=st?520:380,lh=lw*logo.height/logo.width;x.drawImage(logo,(W-lw)/2,y,lw,lh);y+=lh+36}else{x.fillStyle=K.ink;x.font='700 76px "El Messiri",serif';x.textAlign='center';x.fillText(B.name,W/2,y+70);y+=130}
  x.direction='rtl';x.textAlign='center';x.fillStyle=K.ink;x.font=`700 ${st?104:80}px "El Messiri",serif`;x.fillText(G.occ,W/2,y+66);y+=st?140:108;
  x.strokeStyle=K.acc;x.lineWidth=2;x.beginPath();x.moveTo(W/2-160,y);x.lineTo(W/2+160,y);x.stroke();x.fillStyle=K.acc;x.beginPath();x.arc(W/2,y,7,0,7);x.fill();y+=st?96:66;
  const sub=grSub(r);if(sub){x.fillStyle=K.acc2;x.font=`600 ${st?40:32}px "IBM Plex Sans Arabic",sans-serif`;x.fillText('إلى: '+grName(r)+' — '+sub,W/2,y);y+=st?90:66}
  x.fillStyle='#3a2416';x.font=`500 ${st?54:42}px "IBM Plex Sans Arabic",sans-serif`;wrapLines(x,grText(G,r).split('\nمع تحيات')[0],W-220).forEach(l=>{x.fillText(l,W/2,y);y+=st?84:64});
  x.fillStyle=K.acc2;x.font=`600 ${st?44:34}px "IBM Plex Sans Arabic",sans-serif`;x.fillText('مع تحيات '+B.name,W/2,H-(st?250:170));
  if(B.tagline){x.direction='ltr';x.font=`italic 400 ${st?36:28}px Georgia,serif`;x.fillStyle=K.acc2;x.fillText(B.tagline,W/2,H-(st?180:116))}
  x.direction='ltr';x.font='400 26px "IBM Plex Mono",monospace';x.fillStyle='#8a7560';x.fillText(S.settings.phones||'',W/2,H-(st?120:76))})}

// ================= PARTNER SHARE CALCULATOR =================
function pcBody(){const P=TAB.pc=TAB.pc||{p:10,mode:'new'};const p=P.p/100;const ms=S.months.slice(-6).map(m=>{const net=m.sales-m.cogs-m.exp-m.waste;const temps=distribute(net).filter(r=>r.p.kind==='temp').reduce((s,r)=>s+r.amt,0);return {k:m.k,net,pool:net-temps}});
 const A_=ms.map(m=>m.net*p),B_=ms.map(m=>m.pool*p);const mn=a=>Math.min(...a),mxx=a=>Math.max(...a),av=a=>avgArr(a);let fc=[];try{fc=forecastModel().fc.slice(0,3)}catch(e){}
 const fcA=fc.map(f=>f.net*p);const fcB=fc.map(f=>(f.net-distribute(f.net).filter(r=>r.p.kind==='temp').reduce((s,r)=>s+r.amt,0))*p);const main=S.partners.filter(x=>x.kind==='main');const avgPool=av(ms.map(m=>m.pool));
 return `<div class="grid4">${kpi('أقل شهر',mv(mn(B_)),'من الصافي كله: '+fmt(mn(A_)),{tip:'نصيبه من الصافي بعد الشركاء المؤقتين، وتحته من الصافي كله'})}${kpi('المتوسط الشهري',mv(av(B_)),'من الصافي كله: '+fmt(av(A_)),{hl:1})}${kpi('أعلى شهر',mv(mxx(B_)),'من الصافي كله: '+fmt(mxx(A_)))}${kpi('المتوقع في السنة',mv(av(B_)*12),'المتوسط × 12 شهر')}</div>
 <div class="tbl-wrap" style="margin-top:12px"><table><tr><th>الشهر</th><th class="n">صافي الربح</th><th class="n">بعد الشركاء المؤقتين</th><th class="n">${P.p}% من الصافي كله</th><th class="n">${P.p}% بعد المؤقتين</th></tr>
 ${ms.map((m,i)=>`<tr><td>${mName(m.k)}</td><td class="n">${fmt(m.net)}</td><td class="n">${fmt(m.pool)}</td><td class="n">${fmt(A_[i])}</td><td class="n b">${fmt(B_[i])}</td></tr>`).join('')}
 ${fc.map((f,i)=>`<tr style="background:var(--accent-soft)"><td>${mName(f.k)} <span class="tag-mini">متوقع</span></td><td class="n">${fmt(f.net)}</td><td class="n">${fmt(fcB[i]/p||0)}</td><td class="n">${fmt(fcA[i])}</td><td class="n b">${fmt(fcB[i])}</td></tr>`).join('')}</table></div>
 ${P.mode==='new'?`<h3 style="margin-top:14px">لو دخل شريك جديد بـ ${P.p}%: نسب الباقيين بتقل بالتناسب</h3><div class="tbl-wrap"><table><tr><th>الشريك</th><th class="n">النسبة الحالية</th><th class="n">النسبة الجديدة</th><th class="n">متوسط شهري قبل</th><th class="n">متوسط شهري بعد</th><th class="n">الفرق</th></tr>
 ${main.map(x=>{const nw=x.share*(1-p);return `<tr><td>${esc(x.name)}</td><td class="n">${fmt(x.share,2)}%</td><td class="n b">${fmt(nw,2)}%</td><td class="n">${fmt(avgPool*x.share/100)}</td><td class="n">${fmt(avgPool*nw/100)}</td><td class="n down">-${fmt(avgPool*(x.share-nw)/100)}</td></tr>`}).join('')}
 <tr class="tot"><td>الشريك الجديد</td><td class="n">—</td><td class="n">${P.p}%</td><td class="n">—</td><td class="n">${fmt(avgPool*p)}</td><td></td></tr></table></div>`:''}
 <p class="note" style="margin-top:10px">الأرقام مبنية على آخر ${ms.length} شهور مقفولة والتوقع من شاشة التنبؤ. ده تقدير يساعد الشريك يقرر، مش مبلغ مضمون.</p>`}
const partnersOld=V.partners;
V.partners=()=>{const base=partnersOld();if(!can('profit'))return base;const P=TAB.pc=TAB.pc||{p:10,mode:'new'};
 const calc=`<div class="card" style="margin-bottom:14px"><h2 class="sec-title">حاسبة نسبة الشريك ${ti('اكتب النسبة، والسيستم يقولك الشريك هيطلع له كام بناءً على الشهور اللي فاتت والتوقع')}</h2>
 <div class="fgrid" style="margin-top:10px"><div class="field"><label for="pc-p">النسبة %</label><input id="pc-p" type="number" value="${P.p}" data-live="pcCalc"></div><div class="field"><label>الحالة</label><div class="seg"><button class="${P.mode==='new'?'on':''}" data-a="pcMode" data-v="new">شريك جديد (الباقيين يقلوا)</button><button class="${P.mode==='old'?'on':''}" data-a="pcMode" data-v="old">نسبة شريك موجود</button></div></div></div>
 <div id="pc-res" style="margin-top:12px">${pcBody()}</div></div>`;
 return base.replace('<div class="card" style="margin-bottom:10px">',calc+'<div class="card" style="margin-bottom:10px">')};
A.pcCalc=()=>{TAB.pc.p=Math.max(0,Math.min(100,num('pc-p')));document.getElementById('pc-res').innerHTML=pcBody();applyGloss(document.getElementById('pc-res'))};
A.pcMode=el=>{TAB.pc.mode=el.dataset.v;render()};
