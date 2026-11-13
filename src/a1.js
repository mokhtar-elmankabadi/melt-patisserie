// ================= SHELL =================
const A={};let VIEW='home',TAB={};
const SCREENS=[
 {id:'home',t:'الرئيسية',g:'التشغيل',b:1},{id:'orders',t:'الأوردرات والفواتير',g:'التشغيل',b:2},{id:'cash',t:'التحصيل والخزن',g:'التشغيل',b:2},{id:'couriers',t:'المناديب والتوصيل',g:'التشغيل',b:2},{id:'returns',t:'المرتجعات والهالك',g:'التشغيل',b:2},
 {id:'materials',t:'الخامات',g:'الإنتاج والفود كوست',b:1},{id:'recipes',t:'الوصفات (نص مصنع)',g:'الإنتاج والفود كوست',b:1},{id:'products',t:'المنتجات',g:'الإنتاج والفود كوست',b:1},{id:'costing',t:'الفود كوست والتسعير',g:'الإنتاج والفود كوست',b:1},{id:'production',t:'تسجيل الإنتاج',g:'الإنتاج والفود كوست',b:2},
 {id:'stock',t:'المخزن والجرد',g:'المخزن والموردين والعملاء',b:2},{id:'suppliers',t:'الموردين والمشتريات',g:'المخزن والموردين والعملاء',b:1},{id:'customers',t:'العملاء',g:'المخزن والموردين والعملاء',b:2},{id:'contacts',t:'دليل العملاء والموردين',g:'المخزن والموردين والعملاء',b:2},{id:'greetings',t:'التهاني والمناسبات',g:'المخزن والموردين والعملاء',b:3},{id:'menu',t:'المنيو وقائمة الأسعار',g:'المخزن والموردين والعملاء',b:1},
 {id:'me',t:'حضوري ومرتبي',g:'المال والناس',b:3},{id:'expenses',t:'المصروفات',g:'المال والناس',b:3},{id:'staff',t:'الموظفين والمرتبات',g:'المال والناس',b:3},{id:'capital',t:'رأس المال والتقييم',g:'المال والناس',b:3},{id:'partners',t:'الشركاء',g:'المال والناس',b:3},{id:'closing',t:'الإقفال والتقارير',g:'المال والناس',b:3},{id:'forecast',t:'التنبؤ بالمبيعات والمصروفات',g:'المال والناس',b:3},
 {id:'data',t:'الاستيراد والتصدير',g:'النظام',b:1},{id:'users',t:'المستخدمين والصلاحيات',g:'النظام',b:1},{id:'prefs',t:'الإعدادات',g:'النظام',b:1}];
const SDESC={
 home:'ملخص سريع: مبيعات وربح الشهر، فلوس الخزن، المديونيات، وكل حاجة محتاجة انتباهك',
 orders:'تسجيل أوردرات المطاعم والكافيهات، الفواتير، مراحل الأوردر، والكميات المطلوب تصنيعها',
 cash:'الست خزن (مختار وحمزة × كاش وإنستا باي وفودافون كاش) وكل حركة فلوس',
 couriers:'المناديب الأساسيين والخارجيين، العمولة، وتسوية فلوس المندوب الخارجي',
 returns:'المرتجعات بخصم من حساب العميل أو بالاستبدال، وتكلفة الهالك',
 materials:'الخامات والتغليف، أسعار كل مورد، والمتوسط المرجّح',
 recipes:'المكونات النص مصنعة: الكيك والجناش والموس والصوصات، والهدر المحوّل',
 products:'المنتجات التامة: مكوناتها، الفينش، والتغليف بعدد القطع في الكرتونة',
 costing:'التكلفة ونسبتها وهامش الربح، خطط 50/60/70/80%، والتسعير بالهامش، وتعديل المكونات والأسعار',
 production:'تسجيل اللي اتصنع وخصم مكوناته من المخزن تلقائي',
 stock:'أرصدة الخامات والنص مصنع والمنتج التام، والجرد الشهري',
 suppliers:'فواتير الشراء كاش أو آجل أو جزئي، السداد، كشف الحساب، وتنبيهات زيادة الأسعار',
 customers:'داشبورد وتحليل المطاعم والكافيهات: أكبر العملاء، المنتجات، المقارنات، مدة السحب، والتنبيهات. وكمان الأسعار الخاصة والخصم، مدة الآجل وحد المديونية، وكشف الحساب',
 expenses:'المصروفات بالبنود: إيجار، كهربا، غاز، منظفات، وأي بند جديد',
 staff:'الموظفين بالشهري واليومية، الحضور بالموقع، الغياب والتأخير والأوفر تايم، السلف والقبض',
 me:'تسجيل حضورك وانصرافك من جوه المصنع، وحسابك وسلفك',
 capital:'الأصول الثابتة والإهلاك، توزيع رأس المال، والتقييم',
 partners:'نسب الشركاء، الحساب الجاري، الأرباح المحتجزة، الأقساط، والشريك المؤقت',
 closing:'قائمة الدخل الشهرية والسنوية، الربح الحقيقي مقابل سحب المخزون، وتوزيع الأرباح',
 menu:'منيو كل براند بالصور والأسعار، يطلع PDF كتالوج أو فلاير للعميل',
 contacts:'كل بيانات العملاء والموردين: التواصل، المكان، البيانات الرسمية، التواريخ، والمرفقات',
 greetings:'كروت تهنئة بالمواسم والأعياد والمناسبات الشخصية باسم كل عميل ومورد',
 forecast:'توقع المبيعات والمصروفات والربح للشهر الجاي و3 و6 شهور، بالمواسم، ولكل عميل ولكل منتج',
 data:'Excel: الخامات والموردين والعملاء والمنتجات والأرصدة والفواتير القديمة',
 users:'مين يشوف إيه: الشاشات والتكاليف والأرباح ورأس المال',
 prefs:'بيانات المصنع في الفاتورة، نسبة تنبيه الأسعار، وتوزيع المصاريف'};
const SIC={
 home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 orders:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
 cash:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
 couriers:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
 returns:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 materials:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
 recipes:'<path d="M5 11h14l-1.5 8.5a1 1 0 0 1-1 .5h-9a1 1 0 0 1-1-.5z"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 products:'<path d="M4 15h16v4H4zM6 15V11h12v4M9 11V8M15 11V8M12 11V6"/>',
 costing:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
 production:'<path d="M3 21V10l5 3V10l5 3V10l5 3v8z"/><path d="M18 21V4h3v17"/>',
 stock:'<path d="M3 9l9-5 9 5v11H3z"/><path d="M8 20v-6h8v6"/>',
 suppliers:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
 customers:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14a5 5 0 0 1 5.5 6"/>',
 expenses:'<path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z"/><path d="M10 8h4M10 12h4"/>',
 staff:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
 me:'<circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8z"/>',
 capital:'<path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M12 3l9 5H3z"/>',
 partners:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0"/>',
 closing:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 menu:'<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/>',
 greetings:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>',
 forecast:'<path d="M3 17l5-5 4 3 8-8"/><path d="M14 7h6v6"/><path d="M3 21h18" stroke-dasharray="2 3"/>',
 data:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
 users:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 prefs:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2 2-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20h-3v-.1A1.6 1.6 0 0 0 9.3 18.8l-.1.1-2-2 .1-.1A1.6 1.6 0 0 0 6.2 14H6v-3h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1 2-2 .1.1A1.6 1.6 0 0 0 12 5.2V5h3v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1 2 2-.1.1A1.6 1.6 0 0 0 19.8 11H20v3z"/>'};
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const MARK='<path d="M5 20h14"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M9 14c1 1.2 2 1.2 3 0s2-1.2 3 0"/><path d="M12 5V3M8.5 6.2 7.5 4.6M15.5 6.2l1-1.6"/>';
const tip=t=>` data-tip="${esc(t)}"`;
const ti=t=>`<button type="button" class="ti" data-tip="${esc(t)}" data-a="tipShow" aria-label="تعريف">i</button>`;
function badges(){const b={};b.suppliers=S.priceAlerts.filter(a=>!a.res).length;b.orders=S.orders.filter(o=>o.status==='approval').length;b.cash=S.couriers.filter(c=>custodyBal(c.id)>0.5).length;b.products=S.products.filter(p=>!p.comps.length).length;return b}
function shell(){const bd=badges();const groups=[...new Set(SCREENS.map(s=>s.g))];const cur=SCREENS.find(s=>s.id===VIEW)||SCREENS[0];const B=S.brands[0];
 document.getElementById('app').innerHTML=`<div class="layout">
 <aside class="side" id="side"><div class="brand"><div class="mark" style="overflow:hidden;background:#fff">${B&&B.logo?`<img src="${esc(B.logo)}" alt="" style="width:40px;height:40px;object-fit:contain">`:svg(MARK)}</div><div style="min-width:0"><b>${esc(S.settings.name||'MELT Patisserie')}</b><small>حلويات غربي · توريد مطاعم وكافيهات</small></div></div>
  <nav class="nav">${groups.map(g=>`<div class="nav-g">${g}</div>`+SCREENS.filter(s=>s.g===g&&(s.id!=='me'||S.myStaff)).map(s=>{const soon=s.b>APP_BATCH;const ok=canSee(s.id);return `<a data-a="${soon?'soon':'go'}" data-v="${s.id}" class="${VIEW===s.id?'on':''} ${ok&&!soon?'':'locked'}"${tip(soon?'هتتضاف في الدفعة '+s.b:SDESC[s.id])} tabindex="0">${svg(SIC[s.id]||'')}<span class="t">${s.t}</span>${soon?`<span class="soon">الدفعة ${s.b}</span>`:ok?'':'🔒'}${!soon&&bd[s.id]?`<span class="badge ${s.id==='products'?'w':''}">${bd[s.id]}</span>`:''}</a>`}).join('')).join('')}</nav></aside>
 <div class="drawer-scrim" id="dscrim" data-a="drawer"></div>
 <div class="mainwrap"><header class="top"><div class="top-in">
  <button class="icon-btn menu-btn" data-a="drawer" aria-label="القائمة">${svg('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button>
  <div class="crumb">${esc(S.settings.name||'MELT')} / <b>${cur.t}</b></div>
  <button class="chip-btn" data-a="userMenu"${tip('حسابك: قفل، تغيير الرمز السري، خروج')}><span class="dot"></span>${esc(me().name)} · ${esc(me().role||'')}</button>
  <button class="icon-btn" data-a="theme" aria-label="الوضع الفاتح أو الداكن"${tip('تبديل الوضع الفاتح والداكن')}>${svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')}</button>
 </div></header><main id="view"></main></div></div>`;
}
A.soon=el=>{const s=SCREENS.find(x=>x.id===el.dataset.v);toast('«'+s.t+'» هتتضاف في الدفعة '+s.b)};
A.userMenu=()=>sheet(`<h2>${esc(me().name)}</h2><p class="sub">${esc(me().role||'')} · ${esc(me().email||SESSION.user.email||'')}</p><div class="list">
 <div class="li click" data-a="lockNow"><div class="main"><div class="t">قفل السيستم دلوقتي</div><div class="s">يفتح تاني بالرمز السري أو البصمة</div></div></div>
 <div class="li click" data-a="newPin"><div class="main"><div class="t">تغيير الرمز السري / تفعيل البصمة</div></div></div>
 <div class="li click" data-a="myPwd"><div class="main"><div class="t">تغيير كلمة السر</div><div class="s">اللي بتدخل بيها بالإيميل على أي جهاز</div></div></div>
 <div class="li click" data-a="logout"><div class="main"><div class="t down">تسجيل خروج</div><div class="s">هتحتاج الإيميل وكلمة السر تاني</div></div></div></div><p class="small muted">${APP_VERSION}</p>`);
function dateLine(){const d=new Date();const days=['الأحد','الاتنين','التلات','الأربع','الخميس','الجمعة','السبت'];return (VIEW==='home'?'صباح الخير · ':'')+days[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()}
function head(title,sub,actions){return `<div class="phead"><div><div class="eyebrow">${dateLine()}</div><h1>${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div>${actions?`<div class="row">${actions}</div>`:''}</div>`}
function kpi(l,v,d,o){o=o||{};const go=o.go?` data-a="go" data-v="${o.go}"${o.tab?` data-tab="${o.tab}"`:''} tabindex="0" role="link"`:'';
 return `<div class="kpi ${o.go?'go':''} ${o.hl?'hl':''}"${go}${o.tip?tip(o.tip):''}>${o.go?'<span class="go-ic">↖</span>':''}<div class="l">${l}${o.tip?ti(o.tip):''}</div><div class="v ${o.cls||''}">${v}</div>${d?`<div class="d">${d}</div>`:''}</div>`}
const mv=n=>`${fmt(n)}<small>ج.م</small>`;
function go(v,tab){VIEW=v;if(tab)TAB[v]=tab;try{history.replaceState(null,'','#'+v)}catch(e){};render();window.scrollTo(0,0)}
function render(){
 if(!S.ready||LOCKED)return;recalc();shell();const el=document.getElementById('view');hideTip();
 if(!canSee(VIEW)){el.innerHTML=head((SCREENS.find(s=>s.id===VIEW)||{}).t||'')+`<div class="lock">🔒 الشاشة دي مش ضمن صلاحيات ${esc(me().name)}. المالك يقدر يفتحها من «المستخدمين والصلاحيات».</div>`;return}
 const sc=SCREENS.find(s=>s.id===VIEW);if(!V[VIEW]||(sc&&sc.b>APP_BATCH)){VIEW='home'}
 el.innerHTML=V[VIEW]();applyGloss(el);
}
function toast(t){document.querySelectorAll('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
function sheet(html){closeSheet();const s=document.createElement('div');s.className='scrim';s.id='scrim';s.innerHTML=`<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
 s.addEventListener('click',e=>{if(e.target===s)closeSheet()});document.body.appendChild(s);document.body.style.overflow='hidden'}
function closeSheet(){const s=document.getElementById('scrim');if(s)s.remove();document.body.style.overflow='';hideTip()}
const val=id=>{const e=document.getElementById(id);return e?e.value:''};
const num=id=>+val(id)||0;
// ---- tooltips: hover (mouse), long-press (touch), ⓘ (tap) ----
let tipEl=null,lpTimer=null,lpFired=false,tipTimer=null;
function showTip(target){const t=target.getAttribute('data-tip');if(!t)return;if(!tipEl){tipEl=document.createElement('div');tipEl.id='tip';tipEl.setAttribute('role','tooltip');document.body.appendChild(tipEl)}
 tipEl.textContent=t;tipEl.hidden=false;const r=target.getBoundingClientRect();const w=tipEl.offsetWidth,h=tipEl.offsetHeight;
 let x=r.left+r.width/2-w/2;x=Math.max(8,Math.min(window.innerWidth-w-8,x));let y=r.top-h-8;if(y<8)y=r.bottom+8;tipEl.style.left=x+'px';tipEl.style.top=y+'px';
 clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,4000)}
function hideTip(){if(tipEl)tipEl.hidden=true}
const canHover=matchMedia('(hover:hover) and (pointer:fine)').matches;
document.addEventListener('mouseover',e=>{if(!canHover)return;const t=e.target.closest('[data-tip]');if(t)showTip(t);else hideTip()});
document.addEventListener('touchstart',e=>{const t=e.target.closest('[data-tip]');lpFired=false;clearTimeout(lpTimer);if(!t)return;lpTimer=setTimeout(()=>{lpFired=true;showTip(t)},520)},{passive:true});
['touchend','touchmove','touchcancel'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(lpTimer),{passive:true}));
document.addEventListener('contextmenu',e=>{if(lpFired)e.preventDefault()});
document.addEventListener('click',e=>{if(lpFired){lpFired=false;e.preventDefault();e.stopPropagation();return}
 const el=e.target.closest('[data-a]');if(!el)return;const f=A[el.dataset.a];if(f){e.preventDefault();f(el)}},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-a][tabindex]')){e.preventDefault();e.target.click()}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-chg]');if(el&&A[el.dataset.chg])A[el.dataset.chg](el)});
document.addEventListener('input',e=>{const el=e.target.closest('[data-live]');if(el&&A[el.dataset.live])A[el.dataset.live](el)});
A.tipShow=el=>showTip(el);
A.go=el=>{closeSheet();go(el.dataset.v,el.dataset.tab)};
A.drawer=()=>{document.getElementById('side').classList.toggle('open');document.getElementById('dscrim').classList.toggle('open')};
A.close=()=>closeSheet();
A.tab=el=>{TAB[VIEW]=el.dataset.v;render()};
A.theme=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('melt-theme',r.dataset.theme)}catch(e){}};
const tabs=(arr,def)=>{const cur=TAB[VIEW]||def;return {cur,html:`<div class="tabs">${arr.map(([v,t,d])=>`<button class="tab ${cur===v?'on':''}" data-a="tab" data-v="${v}"${d?tip(d):''}>${t}</button>`).join('')}</div>`}};
const hidden=lbl=>`<span class="muted small">🔒 ${lbl||'مخفي'}</span>`;
const trOpts=sel=>S.treasuries.map(t=>`<option value="${t.id}" ${t.id===sel?'selected':''}>${t.holder} — ${t.method}</option>`).join('');

// ---- glossary: hover definitions for common labels ----
const GLOSS=[
 ['المتوسط المرجّح','متوسط تكلفة الخامة بعد كل شراء: (قيمة الرصيد القديم + قيمة الشراء الجديد) ÷ إجمالي الكمية'],
 ['آخر شراء','آخر سعر اشتريت بيه الخامة ومن أنهي مورد'],['قيمة الرصيد','الكمية الموجودة × تكلفة الوحدة'],
 ['تكلفة المبيعات','تكلفة البضاعة اللي اتباعت: أول المدة + المشتريات − آخر المدة (بعد الجرد)، أو من الوصفات قبل الجرد'],
 ['مجمل الربح','المبيعات − تكلفة المبيعات، قبل المصروفات والمرتبات'],['صافي الربح','مجمل الربح − المصروفات والمرتبات والإهلاك − الهالك'],
 ['أول المدة','قيمة المخزون في بداية الشهر من جرد الشهر اللي فات'],['آخر المدة','قيمة المخزون في آخر الشهر من الجرد'],
 ['مجمع الإهلاك','مجموع الإهلاك من يوم شراء الأصل لحد النهارده'],['إهلاك','النقص في قيمة الأصل بمرور الوقت، بيتحسب مصروف كل شهر'],['القيمة الحالية','تكلفة الأصل − مجمع الإهلاك'],
 ['حقوق الملكية','إجمالي الأصول − اللي علينا للموردين والشركاء'],['رأس المال المدفوع','مجموع رؤوس أموال الشركاء'],
 ['الحساب الجاري','كل اللي ليه وعليه: أرباح محتجزة، مسحوبات، ديون للمصنع، وأقساط'],['محتجز','أرباح من نصيبه ما اتصرفتش وفاضلة له'],
 ['متأخر','مبالغ عدّى ميعاد استحقاقها ولسه ما اتدفعتش'],['المتبقي','الباقي بعد خصم المدفوع والسلف'],
 ['العمولة','مبلغ على كل أوردر بيوصّله المندوب، تقدر تقفلها أو تفتحها'],['على الأوردر','أجرة المندوب الخارجي عن كل أوردر'],
 ['الهالك','تكلفة القطع المرتجعة أو المستبدلة أو العجز في الجرد'],['الفرق ج','(الفعلي − السيستم) × تكلفة الوحدة. السالب عجز'],
 ['خامات وتغليف','قيمة الخامات الخام ومواد التغليف بالمتوسط المرجّح'],['نص مصنع','مكونات اتصنعت ومستنية تدخل في منتج: كيك، جناش، موس...'],['منتج تام','منتجات جاهزة للبيع في المخزن'],
 ['نسبة التكلفة','التكلفة ÷ سعر البيع'],['نسبة الربح','(سعر البيع − التكلفة) ÷ سعر البيع'],['التكلفة الكاملة','تكلفة الخامات والتغليف + نصيب القطعة من المصاريف العامة'],
 ['وزن','كم قطعة ميني الصنف ده بيشيل من المصاريف العامة'],['الرصيد','الفرق بين اللي عليه واللي دفعه لحد النهارده'],['علينا','فلوس لسه ما اتدفعتش للموردين'],['لينا','فلوس لسه ما اتحصّلتش من العملاء'],
 ['الإجمالي','مجموع العمود'],['كراتين','عدد الكراتين = الكمية ÷ عدد القطع في الكرتونة (مقرّبة لفوق)']];
function applyGloss(root){(root||document).querySelectorAll('th,.kpi .l,h2,.tab,.pill,.li .s').forEach(el=>{if(el.hasAttribute('data-tip')||el.closest('[data-tip]')||el.querySelector('[data-tip]'))return;const t=el.textContent;const g=GLOSS.find(([k])=>t.includes(k));if(g)el.setAttribute('data-tip',g[1])})}
