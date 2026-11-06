'use strict';
// ================= CONFIG =================
const SB_URL='https://puhpfyuvpmxzzigbssqv.supabase.co';
const SB_KEY='sb_publishable_HvzQOXqGOp11jgTTBBPb0w_1Tem0xqN';
const APP_VERSION='1.0.0 · الدفعة 1';
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

// ================= UTILS =================
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function fmt(n,d){if(n==null||isNaN(n))return '—';d=d??(Math.abs(n)<100&&n%1?2:0);return Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d})}
const money=(n,d)=>fmt(n,d)+' ج';
const pct=n=>isFinite(n)?fmt(n*100,1)+'%':'—';
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const dShort=d=>{if(!d)return '';const x=new Date(String(d).slice(0,10)+'T12:00');return x.getDate()+' '+MONTHS[x.getMonth()]};
const daysBetween=(a,b)=>Math.round((new Date(String(b).slice(0,10)+'T12:00')-new Date(String(a).slice(0,10)+'T12:00'))/864e5);
function daysAddISO(d,n){const x=new Date(String(d).slice(0,10)+'T12:00');x.setDate(x.getDate()+(+n||0));return x.toISOString().slice(0,10)}
const unitLbl=u=>({g:'جم',pc:'قطعة',m:'متر'}[u]||u);
const uuid=()=>crypto.randomUUID();
const byId=(a,id)=>a.find(x=>x.id===id);
const avgArr=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

// ================= STATE =================
let S={ready:false};let SESSION=null;
const mat=id=>byId(S.materials,id),rec=id=>byId(S.recipes,id),prod=id=>byId(S.products,id),sup=id=>byId(S.suppliers,id),tre=id=>byId(S.treasuries,id);
const brand=id=>(S.brands||[]).find(b=>b.id===id)||S.brands[0];
const tName=t=>{const x=tre(t);return x?x.holder+' — '+x.method:'—'};
const me=()=>(S.users||[]).find(u=>u.id===SESSION?.user?.id)||{name:'',perms:{}};
const can=k=>{const u=me();return !!(u.owner||(u.perms||{})[k])};
const canSee=s=>{const u=me();return !!(u.owner||((u.perms||{}).screens||[]).includes(s))};

async function q(table,sel,opts){let r=sb.from(table).select(sel||'*');if(opts&&opts.order)r=r.order(opts.order,{ascending:opts.asc!==false});if(opts&&opts.limit)r=r.limit(opts.limit);const {data,error}=await r;if(error){if(/permission|policy|denied/i.test(error.message))return [];console.warn(table,error.message);return []}return data||[]}
async function loadAll(){
 const [users,settings,brands,treas,cash,sups,mats,costs,mprices,hist,alerts,purs,plines,spays,recs,rins,prods,pcomps,plog]=await Promise.all([
  q('app_users'),q('settings'),q('brands','*',{order:'sort'}),q('treasuries','*',{order:'sort'}),q('cash_movements','*',{order:'created_at',asc:false,limit:300}),
  q('suppliers','*',{order:'name'}),q('materials','*',{order:'name'}),q('material_costs'),q('material_prices'),q('price_history','*',{order:'d'}),q('price_alerts','*',{order:'d'}),
  q('purchases','*',{order:'no'}),q('purchase_lines'),q('supplier_payments','*',{order:'d'}),q('recipes','*',{order:'name'}),q('recipe_inputs','*',{order:'ord'}),
  q('products','*',{order:'name'}),q('product_comps','*',{order:'ord'}),q('price_log','*',{order:'d'})]);
 const N=v=>v==null?0:+v;
 S.users=users.map(u=>({id:u.id,name:u.name,role:u.role,email:u.email,owner:u.is_owner,active:u.active,perms:u.perms||{}}));
 S.settings=Object.assign({priceAlert:3,ohMonthly:0,ohUnits:1500,leadDays:3,welcome:['','',''],thanks:['','','']},(settings[0]||{}).data||{});
 S.brands=brands.map(b=>({id:b.id,name:b.name,tagline:b.tagline||'',use:b.use_for||'',logo:b.logo_url||'',c:b.colors||{}}));
 if(!S.brands.length)S.brands=[{id:'melt',name:'MELT Patisserie',tagline:'',use:'',logo:'logo-melt.png',c:{}}];
 S.treasuries=treas.map(t=>({id:t.id,holder:t.holder,method:t.method,bal:N(t.balance),opening:N(t.opening)}));
 S.cashLog=cash.map(c=>({d:c.d,t:c.treasury_id,amt:N(c.amount),note:c.note,by:(S.users.find(u=>u.id===c.user_id)||{}).name||''}));
 S.suppliers=sups.map(s=>({id:s.id,name:s.name,phone:s.phone||'',terms:s.terms||'كاش',days:s.days||0,opening:N(s.opening_balance),info:s.info||{}}));
 const cm=Object.fromEntries(costs.map(c=>[c.material_id,c]));
 S.materials=mats.map(m=>{const c=cm[m.id]||{};return {id:m.id,name:m.name,cat:m.cat,base:m.base,pu:m.pu,size:N(m.size)||1,stock:N(m.stock),min:N(m.min_stock),avg:N(c.avg_cost),
  last:c.last_price!=null?{s:c.last_supplier,b:c.last_quality||'',p:N(c.last_price),d:c.last_date}:null,
  prices:mprices.filter(p=>p.material_id===m.id).map(p=>({id:p.id,s:p.supplier_id,b:p.quality||'',p:N(p.price)})),
  hist:hist.filter(h=>h.material_id===m.id).map(h=>({d:h.d,s:h.supplier_id,b:h.quality||'',p:N(h.price)}))}});
 S.priceAlerts=alerts.map(a=>({id:a.id,d:a.d,mid:a.material_id,s:a.supplier_id,old:N(a.old_price),nw:N(a.new_price),pct:N(a.pct),res:a.resolution||''}));
 S.purchases=purs.map(p=>({id:p.id,no:p.no,d:p.d,s:p.supplier_id,paid:N(p.paid),t:p.treasury_id,notes:p.notes||'',lines:plines.filter(l=>l.purchase_id===p.id).map(l=>({mid:l.material_id,q:N(l.qty),p:N(l.price),b:l.quality||''}))}));
 S.supPay=spays.map(p=>({id:p.id,d:p.d,s:p.supplier_id,amt:N(p.amount),t:p.treasury_id}));
 S.recipes=recs.map(r=>({id:r.id,name:r.name,out:r.out_unit,yield:N(r.yield),byproduct:r.byproduct,src:r.src_recipe,by:r.by_recipe?{id:r.by_recipe,q:N(r.by_qty)}:null,stock:N(r.stock),
  inputs:rins.filter(i=>i.recipe_id===r.id).map(i=>({k:i.kind,id:i.item_id,q:N(i.qty)}))}));
 S.products=prods.map(p=>({id:p.id,name:p.name,en:p.en||'',brand:p.brand,cat:p.cat,price:N(p.price),ppc:p.ppc||1,w:N(p.weight)||1,slices:p.slices,finish:p.finish||'',menu:p.menu||{},stock:N(p.stock),
  comps:pcomps.filter(c=>c.product_id===p.id&&!c.is_pack).map(c=>({k:c.kind,id:c.item_id,q:N(c.qty)})),
  pack:pcomps.filter(c=>c.product_id===p.id&&c.is_pack).map(c=>({k:'m',id:c.item_id,q:N(c.qty),perCarton:c.per_carton}))}));
 S.priceLog=plog.map(l=>({d:l.d,pid:l.product_id,old:N(l.old_price),nw:N(l.new_price),how:l.how||'',by:l.user_name||''}));
 S.ready=true;recalc();
}
// DB helpers
async function dbx(promise,okMsg){const {data,error}=await promise;if(error){toast('حصلت مشكلة: '+error.message);throw error}if(okMsg)toast(okMsg);return data}
async function rpc(fn,args,okMsg){return dbx(sb.rpc(fn,args),okMsg)}
let _reloadT=null;async function refresh(){await loadAll();render()}
function scheduleRefresh(){clearTimeout(_reloadT);_reloadT=setTimeout(()=>{const ae=document.activeElement;if(ae&&ae.closest&&ae.closest('#view')&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)){scheduleRefresh();return}if(S.ready&&!LOCKED)refresh()},600)}
function subscribeRealtime(){const ch=sb.channel('melt-all');['settings','brands','treasuries','cash_movements','suppliers','materials','material_costs','material_prices','price_alerts','purchases','supplier_payments','recipes','recipe_inputs','products','product_comps','price_log','app_users'].forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},scheduleRefresh));ch.subscribe()}
async function uploadImage(blob,path){const {error}=await sb.storage.from('menu').upload(path,blob,{upsert:true,contentType:blob.type||'image/jpeg'});if(error){toast('رفع الصورة فشل: '+error.message);throw error}return sb.storage.from('menu').getPublicUrl(path).data.publicUrl}
function dataToBlob(d){const [h,b]=d.split(',');const mime=h.match(/:(.*?);/)[1];const bin=atob(b);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:mime})}
function imgToData(file,max,cb,png){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height));const cv=document.createElement('canvas');cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);const x=cv.getContext('2d');if(!png){x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height)}x.drawImage(im,0,0,cv.width,cv.height);cb(cv.toDataURL(png?'image/png':'image/jpeg',.86))};im.src=r.result};r.readAsDataURL(file)}
function whiteToAlpha(src,cb){const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){const m=Math.min(a[i],a[i+1],a[i+2]);if(m>235)a[i+3]=0;else if(m>200)a[i+3]=Math.round(255*(235-m)/35)}x.putImageData(d,0,0);cb(c.toDataURL('image/png'))};im.src=src}

// ================= AUTH + PIN LOCK =================
let LOCKED=false;let PIN_BUF='';let idleT=null;
const PIN_KEY=()=>'melt-pin-'+(SESSION?.user?.id||'');
const BIO_KEY=()=>'melt-bio-'+(SESSION?.user?.id||'');
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};
function authShell(inner){document.getElementById('app').innerHTML=`<div class="auth-wrap"><div class="auth"><img src="logo-melt.png" alt="MELT Patisserie">${inner}<p class="small muted" style="margin-top:14px">${APP_VERSION}</p></div></div>`}
async function showLogin(msg){let owner=true;try{const {data}=await sb.rpc('has_owner');owner=!!data}catch(e){}
 authShell(`<h2 style="margin:6px 0 4px">${owner?'تسجيل الدخول':'إنشاء حساب المالك'}</h2><p class="small muted">${owner?'ادخل بالإيميل وكلمة السر':'أول حساب بيتعمل هنا بيبقى حساب المالك بكل الصلاحيات'}</p>
 ${msg?`<div class="alert info" style="margin:10px 0;text-align:right"><span class="dot"></span><div>${esc(msg)}</div></div>`:''}
 <div class="stack" style="text-align:right;margin-top:12px">${owner?'':'<div class="field"><label for="au-n">اسمك</label><input id="au-n" type="text" value="مختار"></div>'}
 <div class="field"><label for="au-e">الإيميل</label><input id="au-e" type="text" inputmode="email" autocomplete="username" style="direction:ltr"></div>
 <div class="field"><label for="au-p">كلمة السر ${owner?'':'(8 حروف على الأقل)'}</label><input id="au-p" type="password" autocomplete="${owner?'current-password':'new-password'}" style="direction:ltr"></div>
 <button class="btn block" data-a="${owner?'login':'signupOwner'}">${owner?'دخول':'إنشاء الحساب'}</button>
 ${owner?'<button class="btn ghost sm" data-a="forgot">نسيت كلمة السر؟</button>':''}</div>`)}
const A_AUTH={};
A_AUTH.login=async()=>{const e=val('au-e').trim(),p=val('au-p');if(!e||!p){toast('اكتب الإيميل وكلمة السر');return}const {error}=await sb.auth.signInWithPassword({email:e,password:p});if(error){toast(error.message.includes('Invalid')?'الإيميل أو كلمة السر غلط':error.message.includes('confirm')?'لازم تأكد الإيميل الأول من الرسالة اللي وصلتك':error.message);return}afterLogin(true)};
A_AUTH.signupOwner=async()=>{const n=val('au-n').trim(),e=val('au-e').trim(),p=val('au-p');if(p.length<8){toast('كلمة السر 8 حروف على الأقل');return}
 const {data,error}=await sb.auth.signUp({email:e,password:p,options:{data:{name:n},emailRedirectTo:location.origin+location.pathname}});if(error){toast(error.message);return}
 if(data.session){afterLogin(true)}else showLogin('اتعمل الحساب. افتح الإيميل اللي وصلك على '+e+' واضغط على لينك التأكيد، وبعدين ارجع هنا وادخل.')};
A_AUTH.forgot=async()=>{const e=val('au-e').trim();if(!e){toast('اكتب إيميلك الأول');return}const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});toast(error?error.message:'اتبعتلك رسالة لتغيير كلمة السر')};
A_AUTH.logout=async()=>{await sb.auth.signOut();lsDel(PIN_KEY());location.hash='';location.reload()};
async function afterLogin(fresh){const {data}=await sb.auth.getSession();SESSION=data.session;if(!SESSION){showLogin();return}
 document.getElementById('app').innerHTML='<div class="loading">بيحمّل البيانات...</div>';
 await loadAll();const u=me();
 if(!u.id){authShell(`<h2>حسابك لسه مش مفعّل</h2><p class="muted">اطلب من المالك يضيفك من «المستخدمين والصلاحيات».</p><button class="btn sec" data-a="logout">خروج</button>`);return}
 if(!u.active){authShell(`<h2>الحساب ده متوقف</h2><p class="muted">كلّم المالك.</p><button class="btn sec" data-a="logout">خروج</button>`);return}
 subscribeRealtime();
 if(fresh&&!lsGet(PIN_KEY())){showPinSetup();return}
 if(!fresh&&lsGet(PIN_KEY())){showLock();return}
 startApp()}
function startApp(){LOCKED=false;const h=(location.hash||'').slice(1);if(SCREENS.some(s=>s.id===h&&s.b===1))VIEW=h;render();armIdle()}
function pinPad(title,sub,act,extra){PIN_BUF='';authShell(`<h2 style="margin:6px 0 2px">${title}</h2><p class="small muted">${sub}</p><div class="pin-dots" id="pdots">${'<i></i>'.repeat(6)}</div>
 <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-a="pinKey" data-v="${n}">${n}</button>`).join('')}<button data-a="pinKey" data-v="del" aria-label="مسح">⌫</button><button data-a="pinKey" data-v="0">0</button><button data-a="pinKey" data-v="ok" data-next="${act}" aria-label="تأكيد">✓</button></div>${extra||''}`)}
function showPinSetup(){pinPad('اختار رمز سري','من 4 لـ 6 أرقام، بيفتح بيه السيستم على الجهاز ده من غير الإيميل','pinSet1',`<button class="btn ghost sm" style="margin-top:10px" data-a="pinSkip">تخطي دلوقتي</button>`)}
function showLock(){const bio=lsGet(BIO_KEY());pinPad('أهلاً '+esc(me().name),'اكتب رمزك السري','pinCheck',`${bio?'<button class="btn sec block" style="margin-top:12px" data-a="bioUnlock">الدخول بالبصمة</button>':''}<button class="btn ghost sm" style="margin-top:8px" data-a="logout">دخول بحساب تاني</button>`);LOCKED=true;if(bio)setTimeout(()=>A_AUTH.bioUnlock(),300)}
let PIN_FIRST='',PIN_TRIES=0;
A_AUTH.pinKey=async el=>{const v=el.dataset.v;if(v==='del')PIN_BUF=PIN_BUF.slice(0,-1);else if(v==='ok'){const nx=el.dataset.next;if(PIN_BUF.length<4){toast('الرمز من 4 لـ 6 أرقام');return}
  if(nx==='pinSet1'){if(/^(\d)\1+$/.test(PIN_BUF)||'0123456789'.includes(PIN_BUF)||'9876543210'.includes(PIN_BUF)){toast('اختار رمز أصعب من كده');PIN_BUF='';dots();return}PIN_FIRST=PIN_BUF;pinPad('أكّد الرمز','اكتبه تاني','pinSet2');return}
  if(nx==='pinSet2'){if(PIN_BUF!==PIN_FIRST){toast('الرمزين مش زي بعض');showPinSetup();return}lsSet(PIN_KEY(),await sha(SESSION.user.id+':'+PIN_BUF));toast('اتحفظ الرمز');offerBio();return}
  if(nx==='pinCheck'){if(await sha(SESSION.user.id+':'+PIN_BUF)===lsGet(PIN_KEY())){PIN_TRIES=0;startApp()}else{PIN_TRIES++;PIN_BUF='';dots();if(PIN_TRIES>=5){toast('5 محاولات غلط، لازم تدخل بالإيميل تاني');lsDel(PIN_KEY());await sb.auth.signOut();showLogin()}else toast('الرمز غلط ('+PIN_TRIES+' من 5)')}return}}
 else if(PIN_BUF.length<6)PIN_BUF+=v;dots()};
function dots(){document.querySelectorAll('#pdots i').forEach((d,i)=>d.classList.toggle('on',i<PIN_BUF.length))}
A_AUTH.pinSkip=()=>startApp();
function offerBio(){if(!window.PublicKeyCredential){startApp();return}authShell(`<h2>الدخول بالبصمة؟</h2><p class="muted small">لو موبايلك فيه بصمة أو Face ID، تقدر تفتح بيها بدل الرمز.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="bioSetup">تفعيل البصمة</button><button class="btn sec" data-a="pinSkip">مش دلوقتي</button></div>`)}
A_AUTH.bioSetup=async()=>{try{const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'MELT Patisserie'},user:{id:new TextEncoder().encode(SESSION.user.id.slice(0,32)),name:SESSION.user.email||'user',displayName:me().name||'user'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required'},timeout:60000}});
 lsSet(BIO_KEY(),btoa(String.fromCharCode(...new Uint8Array(c.rawId))));toast('اتفعّلت البصمة')}catch(e){toast('البصمة مش متاحة على الجهاز ده')}startApp()};
A_AUTH.bioUnlock=async()=>{try{const id=Uint8Array.from(atob(lsGet(BIO_KEY())),c=>c.charCodeAt(0));await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id}],userVerification:'required',timeout:60000}});startApp()}catch(e){}};
function armIdle(){const reset=()=>{clearTimeout(idleT);idleT=setTimeout(()=>{if(lsGet(PIN_KEY())&&!LOCKED){closeSheet();showLock()}},10*60*1000)};['click','keydown','touchstart'].forEach(e=>document.addEventListener(e,reset,{passive:true}));reset()}
A_AUTH.lockNow=()=>{if(lsGet(PIN_KEY())){closeSheet();showLock()}else toast('اعمل رمز سري الأول من زرار اسمك')};
A_AUTH.newPin=()=>{closeSheet();showPinSetup()};
// ================= SHELL =================
const A={};let VIEW='home',TAB={};
const SCREENS=[
 {id:'home',t:'الرئيسية',g:'التشغيل',b:1},{id:'orders',t:'الأوردرات والفواتير',g:'التشغيل',b:2},{id:'cash',t:'التحصيل والخزن',g:'التشغيل',b:2},{id:'couriers',t:'المناديب والتوصيل',g:'التشغيل',b:2},{id:'returns',t:'المرتجعات والهالك',g:'التشغيل',b:2},
 {id:'materials',t:'الخامات',g:'الإنتاج والفود كوست',b:1},{id:'recipes',t:'الوصفات (نص مصنع)',g:'الإنتاج والفود كوست',b:1},{id:'products',t:'المنتجات',g:'الإنتاج والفود كوست',b:1},{id:'costing',t:'الفود كوست والتسعير',g:'الإنتاج والفود كوست',b:1},{id:'production',t:'تسجيل الإنتاج',g:'الإنتاج والفود كوست',b:2},
 {id:'stock',t:'المخزن والجرد',g:'المخزن والموردين والعملاء',b:2},{id:'suppliers',t:'الموردين والمشتريات',g:'المخزن والموردين والعملاء',b:1},{id:'customers',t:'العملاء',g:'المخزن والموردين والعملاء',b:2},{id:'contacts',t:'دليل العملاء والموردين',g:'المخزن والموردين والعملاء',b:2},{id:'greetings',t:'التهاني والمناسبات',g:'المخزن والموردين والعملاء',b:3},{id:'menu',t:'المنيو وقائمة الأسعار',g:'المخزن والموردين والعملاء',b:1},
 {id:'expenses',t:'المصروفات',g:'المال والناس',b:3},{id:'staff',t:'الموظفين والمرتبات',g:'المال والناس',b:3},{id:'capital',t:'رأس المال والتقييم',g:'المال والناس',b:3},{id:'partners',t:'الشركاء',g:'المال والناس',b:3},{id:'closing',t:'الإقفال والتقارير',g:'المال والناس',b:3},{id:'forecast',t:'التنبؤ بالمبيعات والمصروفات',g:'المال والناس',b:3},
 {id:'users',t:'المستخدمين والصلاحيات',g:'النظام',b:1},{id:'prefs',t:'الإعدادات',g:'النظام',b:1}];
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
 staff:'الموظفين بالشهري واليومية، السلف، وتقفيل المرتبات',
 capital:'الأصول الثابتة والإهلاك، توزيع رأس المال، والتقييم',
 partners:'نسب الشركاء، الحساب الجاري، الأرباح المحتجزة، الأقساط، والشريك المؤقت',
 closing:'قائمة الدخل الشهرية والسنوية، الربح الحقيقي مقابل سحب المخزون، وتوزيع الأرباح',
 menu:'منيو كل براند بالصور والأسعار، يطلع PDF كتالوج أو فلاير للعميل',
 contacts:'كل بيانات العملاء والموردين: التواصل، المكان، البيانات الرسمية، التواريخ، والمرفقات',
 greetings:'كروت تهنئة بالمواسم والأعياد والمناسبات الشخصية باسم كل عميل ومورد',
 forecast:'توقع المبيعات والمصروفات والربح للشهر الجاي و3 و6 شهور، بالمواسم، ولكل عميل ولكل منتج',
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
 capital:'<path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M12 3l9 5H3z"/>',
 partners:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0"/>',
 closing:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 menu:'<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/>',
 greetings:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>',
 forecast:'<path d="M3 17l5-5 4 3 8-8"/><path d="M14 7h6v6"/><path d="M3 21h18" stroke-dasharray="2 3"/>',
 users:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 prefs:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2 2-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20h-3v-.1A1.6 1.6 0 0 0 9.3 18.8l-.1.1-2-2 .1-.1A1.6 1.6 0 0 0 6.2 14H6v-3h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1 2-2 .1.1A1.6 1.6 0 0 0 12 5.2V5h3v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1 2 2-.1.1A1.6 1.6 0 0 0 19.8 11H20v3z"/>'};
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const MARK='<path d="M5 20h14"/><path d="M6 20v-6a6 6 0 0 1 12 0v6"/><path d="M9 14c1 1.2 2 1.2 3 0s2-1.2 3 0"/><path d="M12 5V3M8.5 6.2 7.5 4.6M15.5 6.2l1-1.6"/>';
const tip=t=>` data-tip="${esc(t)}"`;
const ti=t=>`<button type="button" class="ti" data-tip="${esc(t)}" data-a="tipShow" aria-label="تعريف">i</button>`;
function badges(){const b={};b.suppliers=S.priceAlerts.filter(a=>!a.res).length;b.products=S.products.filter(p=>!p.comps.length).length;return b}
function shell(){const bd=badges();const groups=[...new Set(SCREENS.map(s=>s.g))];const cur=SCREENS.find(s=>s.id===VIEW)||SCREENS[0];const B=S.brands[0];
 document.getElementById('app').innerHTML=`<div class="layout">
 <aside class="side" id="side"><div class="brand"><div class="mark" style="overflow:hidden;background:#fff">${B&&B.logo?`<img src="${esc(B.logo)}" alt="" style="width:40px;height:40px;object-fit:contain">`:svg(MARK)}</div><div style="min-width:0"><b>${esc(S.settings.name||'MELT Patisserie')}</b><small>حلويات غربي · توريد مطاعم وكافيهات</small></div></div>
  <nav class="nav">${groups.map(g=>`<div class="nav-g">${g}</div>`+SCREENS.filter(s=>s.g===g).map(s=>{const soon=s.b>1;const ok=canSee(s.id);return `<a data-a="${soon?'soon':'go'}" data-v="${s.id}" class="${VIEW===s.id?'on':''} ${ok&&!soon?'':'locked'}"${tip(soon?'هتتضاف في الدفعة '+s.b:SDESC[s.id])} tabindex="0">${svg(SIC[s.id]||'')}<span class="t">${s.t}</span>${soon?`<span class="soon">الدفعة ${s.b}</span>`:ok?'':'🔒'}${!soon&&bd[s.id]?`<span class="badge ${s.id==='products'?'w':''}">${bd[s.id]}</span>`:''}</a>`}).join('')).join('')}</nav></aside>
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
 const sc=SCREENS.find(s=>s.id===VIEW);if(!V[VIEW]||(sc&&sc.b>1)){VIEW='home'}
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
// ================= COST ENGINE =================
let _memo={};function recalc(){_memo={}}
function unitCost(k,id){return k==='m'?(mat(id)?.avg||0):recInfo(id).unit}
function recWeight(r){return r.inputs.reduce((s,x)=>{if(x.k==='m'){const m=mat(x.id);return s+(m&&m.base==='g'?x.q:0)}const rr=rec(x.id);return s+(rr&&rr.out==='g'?x.q:0)},0)}
function recInfo(id){if(_memo[id])return _memo[id];const r=rec(id);if(!r)return {unit:0,batch:0};_memo[id]={unit:0,batch:0};
 if(r.byproduct){const si=recInfo(r.src);return _memo[id]={unit:si.byUnit||0,batch:0,byproduct:true}}
 const batch=r.inputs.reduce((s,x)=>s+x.q*unitCost(x.k,x.id),0);let byVal=0,byUnit=0;if(r.by&&r.by.q){const w=recWeight(r);byUnit=w?batch/w:0;byVal=byUnit*r.by.q}
 return _memo[id]={unit:r.yield?(batch-byVal)/r.yield:0,batch,byVal,byUnit}}
const ohMonthly=()=>+S.settings.ohMonthly||0, ohUnits=()=>+S.settings.ohUnits||1500, ohPerUnit=()=>ohMonthly()/Math.max(1,ohUnits());
function pcost(p){const k='p:'+p.id;if(_memo[k])return _memo[k];return _memo[k]=pcost0(p)}
function pcost0(p){const ing=p.comps.reduce((s,x)=>s+x.q*unitCost(x.k,x.id),0);const pack=p.pack.reduce((s,x)=>s+(x.perCarton?x.q*unitCost('m',x.id)/(p.ppc||1):x.q*unitCost('m',x.id)),0);const m=ing+pack,oh=ohPerUnit()*(p.w||1);return {ing,pack,mat:m,oh,full:m+oh,missing:!p.comps.length}}
function withLastPrices(fn){const keep=S.materials.map(m=>m.avg);S.materials.forEach(m=>{if(m.last&&m.last.p)m.avg=m.last.p/m.size});recalc();let r;try{r=fn()}finally{S.materials.forEach((m,i)=>m.avg=keep[i]);recalc()}return r}
const purTotal=p=>p.lines.reduce((s,l)=>s+l.q*l.p,0);
function supLedger(sid){const rows=[];const s=sup(sid);if(s.opening)rows.push({d:'0000',t:'رصيد أول المدة',cr:s.opening,dr:0,due:'0000'});
 S.purchases.filter(p=>p.s===sid).forEach(p=>{rows.push({d:p.d,t:'فاتورة شراء #'+p.no,cr:purTotal(p),dr:0,due:daysAddISO(p.d,s.days)});if(p.paid)rows.push({d:p.d,t:'مدفوع مع الفاتورة — '+tName(p.t),cr:0,dr:p.paid})});
 S.supPay.filter(p=>p.s===sid).forEach(p=>rows.push({d:p.d,t:'سداد — '+tName(p.t),cr:0,dr:p.amt}));
 rows.sort((a,b)=>a.d<b.d?-1:1);let bal=0;rows.forEach(r=>{bal+=r.cr-r.dr;r.bal=bal});let paid=rows.reduce((s,r)=>s+r.dr,0);let overdue=0,soon=0;
 rows.filter(r=>r.cr).forEach(r=>{const u=Math.min(paid,r.cr);paid-=u;const open=r.cr-u;if(open>0.5){if(r.due<today())overdue+=open;else if(daysBetween(today(),r.due)<=3)soon+=open}});return {rows,bal,overdue,soon}}
function stockValue(){let m=0,r=0,p=0;S.materials.forEach(x=>m+=x.stock*x.avg);S.recipes.forEach(x=>r+=x.stock*recInfo(x.id).unit);S.products.forEach(x=>p+=x.stock*pcost(x).mat);return {m,r,p,all:m+r+p}}
function itemName(k,id){return (k==='m'?mat(id)?.name:rec(id)?.name)||'(محذوف)'}
function itemUnit(k,id){return k==='m'?unitLbl(mat(id)?.base):unitLbl(rec(id)?.out)}
const myTre=()=>(S.treasuries.find(t=>t.holder===me().name)||S.treasuries[0]||{}).id;
function emptyState(t,btn){return `<div class="card"><div class="empty">${t}${btn?`<div style="margin-top:12px">${btn}</div>`:''}</div></div>`}

// ================= HOME (batch 1) =================
const V={};
V.home=()=>{const sv=stockValue();const pay=S.suppliers.reduce((s,x)=>s+supLedger(x.id).bal,0);const cash=S.treasuries.reduce((s,t)=>s+t.bal,0);
 const alerts=[];S.priceAlerts.filter(a=>!a.res).forEach(a=>alerts.push(['warn',`${sup(a.s)?.name||'مورد'} زوّد سعر ${mat(a.mid)?.name||''}`,`من ${fmt(a.old)} لـ ${fmt(a.nw)} (+${fmt(a.pct,1)}%)`,'suppliers','alerts']));
 S.suppliers.forEach(s=>{const L=supLedger(s.id);if(L.overdue>0)alerts.push(['bad',`مستحق لـ ${s.name} عدّى ميعاده`,money(L.overdue),'suppliers','list']);else if(L.soon>0)alerts.push(['info',`مستحق لـ ${s.name} خلال 3 أيام`,money(L.soon),'suppliers','list'])});
 S.products.filter(p=>!p.comps.length).forEach(p=>alerts.push(['info',`${p.name} من غير مكونات`,'تكلفته مش محسوبة','products']));
 S.materials.filter(m=>m.min&&m.stock<m.min).forEach(m=>alerts.push(['warn',`${m.name} قرّب يخلص`,`الرصيد ${fmt(m.stock/m.size,1)} ${m.pu}`,'materials']));
 const steps=[[S.settings.cr||S.settings.phones,'بيانات المصنع والفاتورة','prefs'],[S.treasuries.some(t=>t.opening),'أرصدة الخزن الافتتاحية','prefs'],[S.suppliers.length,'الموردين','suppliers'],[S.materials.length,'الخامات وأسعارها','materials'],[S.recipes.length,'المكونات النص مصنعة','recipes'],[S.products.length,'المنتجات','products'],[S.users.length>1,'المستخدمين (حمزة وغيره)','users']];
 const done=steps.filter(s=>s[0]).length;
 return head('لوحة التحكم','الدفعة 1: الخامات والموردين والمشتريات والفود كوست والمنيو')+`
 ${done<steps.length&&me().owner?`<div class="card" style="margin-bottom:14px"><div class="between"><h2>ابدأ تجهيز السيستم</h2><span class="pill acc">${done} من ${steps.length}</span></div><div class="bar" style="margin:10px 0"><i style="width:${done/steps.length*100}%"></i></div><div class="list">${steps.map(s=>`<div class="li click" data-a="go" data-v="${s[2]}"><div class="main"><div class="t">${s[0]?'✓ ':'○ '}${s[1]}</div></div><span class="pill ${s[0]?'ok':''}">${s[0]?'تمام':'سجّل'}</span></div>`).join('')}</div></div>`:''}
 <div class="grid4">
  ${kpi('قيمة المخزون',can('cost')?mv(sv.all):hidden(),'خامات '+fmt(sv.m)+' · نص مصنع '+fmt(sv.r)+' · تام '+fmt(sv.p),{go:'materials',hl:1,tip:'رصيد الخامات بالمتوسط المرجّح، والنص مصنع والتام بتكلفة الوصفة'})}
  ${kpi('علينا للموردين',canSee('suppliers')?mv(pay):hidden(),S.suppliers.filter(s=>supLedger(s.id).bal>0).length+' موردين ليهم فلوس',{go:'suppliers',tab:'list',cls:'down',tip:'الفواتير الآجل والجزئي اللي لسه ما اتسددتش + أرصدة أول المدة'})}
  ${kpi('الفلوس في الخزن',S.treasuries.length?mv(cash):hidden(),S.treasuries.length?`مختار ${fmt(S.treasuries.filter(t=>t.holder==='مختار').reduce((s,t)=>s+t.bal,0))} · حمزة ${fmt(S.treasuries.filter(t=>t.holder==='حمزة').reduce((s,t)=>s+t.bal,0))}`:'',{go:'prefs',tip:'مجموع الست خزن. التحصيل والتحويلات في الدفعة 2'})}
  ${kpi('الأصناف',`${S.products.length}`,S.recipes.length+' مكون نص مصنع · '+S.materials.length+' خامة',{go:'costing',tip:'المنتجات المسجلة في البراندين'})}
 </div>
 <div class="card" style="margin-top:14px"><div class="between"><h2>محتاج انتباهك</h2><span class="pill ${alerts.length?'warn':'ok'}">${alerts.length}</span></div><div class="stack" style="margin-top:12px;gap:8px">
 ${alerts.length?alerts.slice(0,10).map(a=>`<div class="alert ${a[0]}" data-a="go" data-v="${a[3]}"${a[4]?` data-tab="${a[4]}"`:''} style="cursor:pointer"><span class="dot"></span><div><b>${esc(a[1])}</b><div class="small muted">${esc(a[2])}</div></div></div>`).join(''):'<div class="empty">كله تمام</div>'}</div></div>`};

// ================= MATERIALS =================
V.materials=()=>{const tb=tabs([['raw','خامات'],['pack','تغليف']],'raw');const list=S.materials.filter(m=>m.cat===tb.cur);
 return head('الخامات','السعر في الوصفات = المتوسط المرجّح، وبيتحدّث مع كل فاتورة شراء. جنبه آخر سعر وسعر كل مورد',canSee('materials')?'<button class="btn" data-a="editMat" data-v="">+ خامة</button>':'')+tb.html+
 (list.length?`<div class="card"><div class="field" style="max-width:360px;margin-bottom:8px"><label for="m-q">بحث</label><input id="m-q" type="text" data-live="matFilter" placeholder="اسم الخامة..."></div><div class="list" id="m-list">${list.map(m=>{const ps=m.prices.map(p=>p.p);const spread=ps.length>1?(Math.max(...ps)-Math.min(...ps))/Math.min(...ps):0;
  return `<div class="li click" data-a="matDetail" data-v="${m.id}" data-q="${esc(m.name)}"><div class="main"><div class="t">${esc(m.name)} ${m.prices.length>1?`<span class="tag-mini">${m.prices.length} موردين</span>`:''}</div><div class="s">${esc(m.pu)} · رصيد ${fmt(m.stock/m.size,2)} ${esc(m.pu)}${m.min&&m.stock<m.min?' · <span class="down">قرّب يخلص</span>':''}${spread>0.03?` · <span class="down">فرق أسعار ${pct(spread)}</span>`:''}</div></div>
  <div class="e">${can('cost')?`<div class="b">${money(m.avg*m.size,2)}</div><div class="small muted">${fmt(m.avg*(m.base==='g'?1000:1),2)} ج/${m.base==='g'?'كيلو':unitLbl(m.base)}</div>`:hidden()}</div></div>`}).join('')}</div></div>`:emptyState('لسه مفيش '+(tb.cur==='raw'?'خامات':'مواد تغليف')+'. ضيف أول واحدة باسمها ووحدة الشراء وسعرها.','<button class="btn" data-a="editMat" data-v="">+ خامة</button>'))};
A.matFilter=el=>{const q=el.value.trim();document.querySelectorAll('#m-list .li').forEach(x=>x.hidden=q&&!x.dataset.q.includes(q))};
A.matDetail=el=>{const m=mat(el.dataset.v);const used=[...S.recipes.filter(r=>r.inputs.some(x=>x.k==='m'&&x.id===m.id)).map(r=>r.name),...S.products.filter(p=>p.comps.concat(p.pack).some(x=>x.k==='m'&&x.id===m.id)).map(p=>p.name)];
 sheet(`<div class="between"><h2>${esc(m.name)}</h2>${canSee('materials')?`<button class="btn sec sm" data-a="editMat" data-v="${m.id}">تعديل</button>`:''}</div><p class="sub">وحدة الشراء ${esc(m.pu)} = ${fmt(m.size)} ${unitLbl(m.base)} · الرصيد ${fmt(m.stock)} ${unitLbl(m.base)}</p>
 ${can('cost')?`<div class="grid3">${kpi('المتوسط المرجّح',money(m.avg*m.size,2),'لوحدة الشراء')}${kpi('آخر شراء',m.last?money(m.last.p,2):'—',m.last?esc(sup(m.last.s)?.name||'')+' '+dShort(m.last.d):'')}${kpi('قيمة الرصيد',money(m.stock*m.avg))}</div>
 ${m.prices.length?`<h3 style="margin-top:12px">مقارنة الموردين</h3><div class="tbl-wrap"><table><tr><th>المورد</th><th>الجودة/الماركة</th><th class="n">السعر</th><th class="n">الفرق عن الأرخص</th></tr>${(()=>{const mn=Math.min(...m.prices.map(p=>p.p));return m.prices.map(p=>`<tr><td>${esc(sup(p.s)?.name||'')}</td><td>${esc(p.b||'—')}</td><td class="n">${fmt(p.p,2)}</td><td class="n ${p.p>mn?'down':''}">${p.p>mn?'+'+pct((p.p-mn)/mn):'الأرخص'}</td></tr>`).join('')})()}</table></div>`:''}
 ${m.hist.length>1?`<h3 style="margin-top:12px">تاريخ الأسعار</h3>${priceSpark(m)}`:''}`:hidden('الأسعار مخفية')}
 <p class="small muted" style="margin-top:10px">بتدخل في: ${used.map(esc).join('، ')||'مفيش'}</p>`)};
function priceSpark(m){const h=m.hist.slice(-10);const W=320,H=90;const ps=h.map(x=>x.p);const mn=Math.min(...ps)*0.97,mx=Math.max(...ps)*1.02;const x=i=>14+i*(W-28)/Math.max(1,h.length-1),y=v=>H-18-(v-mn)/(mx-mn||1)*(H-34);
 return `<svg class="chart" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${h.map((p,i)=>x(i)+','+y(p.p)).join(' ')}"/>${h.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.p)}" r="3.5" fill="var(--accent)"/><text x="${x(i)}" y="${y(p.p)-7}" text-anchor="middle" style="fill:var(--fg)">${fmt(p.p)}</text><text x="${x(i)}" y="${H-3}" text-anchor="middle">${dShort(p.d)}</text>`).join('')}</svg>`}
let EM=null;
A.editMat=el=>{const m=el.dataset.v?mat(el.dataset.v):null;EM=m?JSON.parse(JSON.stringify(m)):{id:'',name:'',cat:TAB.materials==='pack'?'pack':'raw',base:'g',pu:'كيلو',size:1000,stock:0,min:0,prices:[],avg:0};if(!EM.prices.length&&S.suppliers.length)EM.prices=[{s:S.suppliers[0].id,b:'',p:0}];matSheet()};
function matRead(){EM.name=val('em-n');EM.cat=val('em-c');EM.base=val('em-b');EM.pu=val('em-pu');EM.size=num('em-s')||1;EM.stockPU=val('em-st');EM.min=num('em-min')*EM.size;EM.prices=EM.prices.map((p,i)=>({id:p.id,s:val('em-ps-'+i),b:val('em-pb-'+i),p:num('em-pp-'+i)}))}
function matSheet(){const m=EM;sheet(`<h2>${m.id?'تعديل خامة':'خامة جديدة'}</h2><div class="fgrid"><div class="field full"><label for="em-n">الاسم</label><input id="em-n" type="text" value="${esc(m.name)}"></div>
 <div class="field"><label for="em-c">النوع</label><select id="em-c"><option value="raw" ${m.cat==='raw'?'selected':''}>خامة</option><option value="pack" ${m.cat==='pack'?'selected':''}>تغليف</option></select></div>
 <div class="field"><label for="em-b">وحدة الوصفة ${ti('الوحدة اللي بتكتب بيها الكمية في الوصفات: جرام، قطعة، أو متر')}</label><select id="em-b">${['g','pc','m'].map(u=>`<option value="${u}" ${m.base===u?'selected':''}>${unitLbl(u)}</option>`).join('')}</select></div>
 <div class="field"><label for="em-pu">وحدة الشراء</label><input id="em-pu" type="text" value="${esc(m.pu)}" placeholder="كيلو، شيكارة 50ك، كرتونة 12..."></div><div class="field"><label for="em-s">فيها كام وحدة وصفة ${ti('مثلاً شيكارة 50 كيلو = 50000 جم، وكرتونة 100 قطعة = 100')}</label><input id="em-s" type="number" value="${m.size}"></div>
 <div class="field"><label for="em-st">الرصيد الحالي (بوحدة الشراء)</label><input id="em-st" type="number" value="${fmt(m.stock/m.size,3).replace(/,/g,'')}"></div><div class="field"><label for="em-min">نبهني لو الرصيد أقل من (وحدة شراء)</label><input id="em-min" type="number" value="${m.min?m.min/m.size:''}"></div></div>
 ${can('cost')?`<h3 style="margin-top:12px">الموردين وأسعارهم (لوحدة الشراء)</h3>${S.suppliers.length?m.prices.map((p,i)=>`<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><select id="em-ps-${i}" style="flex:1.3">${S.suppliers.map(s=>`<option value="${s.id}" ${s.id===p.s?'selected':''}>${esc(s.name)}</option>`).join('')}</select><input id="em-pb-${i}" type="text" value="${esc(p.b)}" placeholder="الجودة/الماركة" style="flex:1"><input id="em-pp-${i}" type="number" value="${p.p||''}" placeholder="السعر" style="width:90px"><button class="icon-btn" data-a="emDelSup" data-i="${i}" aria-label="حذف">×</button></div>`).join('')+'<button class="btn sec sm" data-a="emAddSup">+ مورد لنفس الخامة</button>':'<div class="alert info"><span class="dot"></span><div>ضيف الموردين الأول من «الموردين والمشتريات».</div></div>'}
 <p class="small muted" style="margin-top:6px">${m.id?'تكلفة الخامة بتتغير بفاتورة الشراء أو من «أسعار الخامات» في الفود كوست.':'السعر الأول هيتحسب تكلفة الخامة لحد أول فاتورة شراء.'}</p>`:''}
 <div class="row" style="margin-top:12px"><button class="btn" data-a="saveMat">حفظ</button>${m.id?`<button class="btn ghost" data-a="delMat">حذف الخامة</button>`:''}</div>`)}
A.emAddSup=()=>{matRead();EM.prices.push({s:S.suppliers[0].id,b:'',p:0});matSheet()};
A.emDelSup=el=>{matRead();EM.prices.splice(+el.dataset.i,1);matSheet()};
A.saveMat=async()=>{matRead();const m=EM;if(!m.name.trim()){toast('اكتب اسم الخامة');return}const id=m.id||uuid();
 await dbx(sb.from('materials').upsert({id,name:m.name.trim(),cat:m.cat,base:m.base,pu:m.pu,size:m.size,stock:(+m.stockPU||0)*m.size,min_stock:m.min||0}));
 if(can('cost')){const old=m.id?mat(m.id).prices:[];const keep=m.prices.filter(p=>p.s&&p.p>0);
  const dels=old.filter(o=>!keep.some(k=>k.id===o.id));for(const d of dels)await dbx(sb.from('material_prices').delete().eq('id',d.id));
  for(const p of keep)await dbx(sb.from('material_prices').upsert({material_id:id,supplier_id:p.s,quality:p.b||'',price:p.p,updated_at:new Date().toISOString()},{onConflict:'material_id,supplier_id,quality'}));
  if(!m.id&&keep.length)await rpc('set_material_prices',{p:[{material_id:id,price:keep[0].p,supplier_id:keep[0].s,quality:keep[0].b||''}]})}
 closeSheet();await refresh();toast('اتحفظت الخامة')};
A.delMat=async()=>{const m=EM;const used=S.recipes.some(r=>r.inputs.some(x=>x.k==='m'&&x.id===m.id))||S.products.some(p=>p.comps.concat(p.pack).some(x=>x.id===m.id));if(used){toast('الخامة داخلة في وصفات أو منتجات، شيلها منهم الأول');return}
 if(S.purchases.some(p=>p.lines.some(l=>l.mid===m.id))){await dbx(sb.from('materials').update({active:false}).eq('id',m.id));}else await dbx(sb.from('materials').delete().eq('id',m.id));closeSheet();await refresh();toast('اتحذفت')};

// ================= RECIPES =================
V.recipes=()=>head('الوصفات (نص مصنع)','الكيك والجناش والموس والصوصات: بالوجبة، وبتطلع عدد قطع أو جرامات. الهدر بيتحول لمكون تاني',canSee('recipes')?'<button class="btn" data-a="editRec" data-v="">+ وصفة</button>':'')+
 (S.recipes.length?`<div class="card"><div class="list">${S.recipes.map(r=>{const ri=recInfo(r.id);return `<div class="li click" data-a="recDetail" data-v="${r.id}"><div class="main"><div class="t">${esc(r.name)} ${r.byproduct?'<span class="pill acc">هدر محوّل</span>':''}</div><div class="s">${r.byproduct?'بيطلع من '+esc(rec(r.src)?.name||''):'الوجبة بتطلع '+fmt(r.yield)+' '+unitLbl(r.out)}${r.by?' + هدر '+fmt(r.by.q)+' جم':''}</div></div><div class="e">${can('cost')?`<div class="b">${fmt(ri.unit,r.out==='g'?4:2)} ج</div><div class="small muted">لل${r.out==='g'?'جرام':'قطعة'}</div>`:''}</div></div>`}).join('')}</div></div>`:emptyState('لسه مفيش وصفات. ابدأ بالكيك والجناش والموس، كل وصفة بخاماتها وبتطلع كام.',S.materials.length?'<button class="btn" data-a="editRec" data-v="">+ وصفة</button>':'<button class="btn" data-a="go" data-v="materials">سجّل الخامات الأول</button>'));
A.recDetail=el=>{const r=rec(el.dataset.v);const ri=recInfo(r.id);
 sheet(`<div class="between"><h2>${esc(r.name)}</h2>${r.byproduct||!canSee('recipes')?'':`<button class="btn sec sm" data-a="editRec" data-v="${r.id}">تعديل</button>`}</div>
 ${r.byproduct?`<p class="sub">هدر بيطلع من «${esc(rec(r.src)?.name||'')}». تكلفة الجرام = تكلفة الوجبة الأصلية ÷ وزن مكوناتها، وقيمته بتتخصم من تكلفة الصنف الأصلي.</p>${can('cost')?kpi('تكلفة الجرام',fmt(ri.unit,4)+' ج'):''}`:`
 <p class="sub">الوجبة بتطلع ${fmt(r.yield)} ${unitLbl(r.out)}</p><div class="tbl-wrap"><table><tr><th>المكون</th><th class="n">الكمية</th>${can('cost')?'<th class="n">سعر الوحدة</th><th class="n">التكلفة</th>':''}</tr>
 ${r.inputs.map(x=>`<tr><td>${esc(itemName(x.k,x.id))} ${x.k==='r'?'<span class="tag-mini">نص مصنع</span>':''}</td><td class="n">${fmt(x.q)} ${itemUnit(x.k,x.id)}</td>${can('cost')?`<td class="n">${fmt(unitCost(x.k,x.id),4)}</td><td class="n">${fmt(x.q*unitCost(x.k,x.id),2)}</td>`:''}</tr>`).join('')}
 ${can('cost')?`<tr class="tot"><td colspan="3">تكلفة الوجبة</td><td class="n">${fmt(ri.batch,2)}</td></tr>${r.by?`<tr><td colspan="3">ناقص قيمة الهدر (${fmt(r.by.q)} جم ← ${esc(rec(r.by.id)?.name||'')})</td><td class="n">-${fmt(ri.byVal,2)}</td></tr>`:''}<tr class="tot"><td colspan="3">تكلفة ال${r.out==='g'?'جرام':'قطعة'}</td><td class="n">${fmt(ri.unit,r.out==='g'?4:2)}</td></tr>`:''}</table></div>`}`)};
let ER=null;
function compRows(list,prefix){return list.map((x,i)=>`<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><select id="${prefix}-i-${i}" style="flex:1">${S.recipes.filter(r=>!ER||r.id!==ER.id).map(r=>`<option value="r:${r.id}" ${x.k==='r'&&x.id===r.id?'selected':''}>◆ ${esc(r.name)}</option>`).join('')}${S.materials.filter(m=>prefix!=='epk'||m.cat==='pack').map(m=>`<option value="m:${m.id}" ${x.k==='m'&&x.id===m.id?'selected':''}>${esc(m.name)} (${unitLbl(m.base)})</option>`).join('')}</select><input id="${prefix}-q-${i}" type="number" value="${x.q}" style="width:86px" aria-label="الكمية"><button class="icon-btn" data-a="compDel" data-p="${prefix}" data-i="${i}" aria-label="حذف">×</button></div>${prefix==='epk'?`<label class="small" style="display:block;margin:-2px 0 8px"><input type="checkbox" id="${prefix}-c-${i}" ${x.perCarton?'checked':''}> بيتقسم على عدد القطع في الكرتونة</label>`:''}`).join('')}
function readComps(list,prefix){return list.map((x,i)=>{const v=val(prefix+'-i-'+i);if(!v)return null;const [k,id]=v.split(':');const c=document.getElementById(prefix+'-c-'+i);return {k,id,q:num(prefix+'-q-'+i),perCarton:c?c.checked:x.perCarton}}).filter(Boolean)}
A.editRec=el=>{ER=el.dataset.v?JSON.parse(JSON.stringify(rec(el.dataset.v))):{id:'',name:'',out:'pc',yield:10,inputs:[],stock:0};if(!ER.inputs.length&&S.materials[0])ER.inputs=[{k:'m',id:S.materials[0].id,q:0}];recSheet()};
function recMeta(){if(!document.getElementById('er-n'))return;ER.name=val('er-n');ER.out=val('er-o');ER.yield=num('er-y');ER.inputs=readComps(ER.inputs,'er');ER._bq=num('er-bq');ER._bt=val('er-bt')}
function recSheet(){const r=ER;sheet(`<h2>${r.id?'تعديل وصفة':'وصفة جديدة'}</h2><div class="fgrid"><div class="field full"><label for="er-n">الاسم</label><input id="er-n" type="text" value="${esc(r.name)}"></div>
 <div class="field"><label for="er-o">بتطلع</label><select id="er-o"><option value="pc" ${r.out==='pc'?'selected':''}>قطع</option><option value="g" ${r.out==='g'?'selected':''}>جرامات</option></select></div>
 <div class="field"><label for="er-y">الوجبة بتطلع كام</label><input id="er-y" type="number" value="${r.yield}"></div></div>
 <h3 style="margin-top:12px">المكونات (بوحدة الوصفة: جم / قطعة)</h3><p class="small muted">◆ = مكون نص مصنع (وصفة جوه وصفة)</p>${compRows(r.inputs,'er')}<button class="btn sec sm" data-a="compAdd" data-p="er">+ مكون</button>
 <h3 style="margin-top:12px">الهدر اللي بيتحول لمكون تاني (اختياري)</h3><div class="fgrid"><div class="field"><label for="er-bq">كمية الهدر في الوجبة (جم)</label><input id="er-bq" type="number" value="${r._bq??(r.by?r.by.q:0)}"></div><div class="field"><label for="er-bt">بيتحول لـ</label><select id="er-bt">${S.recipes.filter(x=>x.byproduct).map(x=>`<option value="${x.id}" ${r.by&&r.by.id===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="new">+ مكون هدر جديد</option></select></div></div>
 <div class="row" style="margin-top:12px"><button class="btn" data-a="saveRec">حفظ</button>${r.id?'<button class="btn ghost" data-a="delRec">حذف</button>':''}</div>`)}
A.compAdd=el=>{const p=el.dataset.p;if(p==='er'){recMeta();ER.inputs.push({k:'m',id:S.materials[0]?.id,q:0});recSheet()}else{prodMeta();EP.comps=readComps(EP.comps,'ep');EP.pack=readComps(EP.pack,'epk');const pk=S.materials.find(m=>m.cat==='pack');(p==='ep'?EP.comps:EP.pack).push(p==='ep'?{k:(S.recipes[0]?'r':'m'),id:(S.recipes[0]||S.materials[0]||{}).id,q:1}:{k:'m',id:pk?.id,q:1,perCarton:false});prodSheet()}};
A.compDel=el=>{const p=el.dataset.p,i=+el.dataset.i;if(p==='er'){recMeta();ER.inputs.splice(i,1);recSheet()}else{prodMeta();EP.comps=readComps(EP.comps,'ep');EP.pack=readComps(EP.pack,'epk');(p==='ep'?EP.comps:EP.pack).splice(i,1);prodSheet()}};
async function saveRecipeRow(r){await dbx(sb.from('recipes').upsert({id:r.id,name:r.name,out_unit:r.out,yield:r.yield,byproduct:!!r.byproduct,src_recipe:r.src||null,by_recipe:r.by?r.by.id:null,by_qty:r.by?r.by.q:0}));
 await dbx(sb.from('recipe_inputs').delete().eq('recipe_id',r.id));if(r.inputs.length)await dbx(sb.from('recipe_inputs').insert(r.inputs.map((x,i)=>({recipe_id:r.id,kind:x.k,item_id:x.id,qty:x.q,ord:i}))))}
A.saveRec=async()=>{recMeta();const r=ER;if(!r.name.trim()){toast('اكتب اسم الوصفة');return}if(!(r.yield>0)){toast('اكتب الوجبة بتطلع كام');return}r.id=r.id||uuid();r.inputs=r.inputs.filter(x=>x.q>0&&x.id);
 if(r._bq>0){let bt=r._bt;if(!bt||bt==='new'){bt=uuid();await dbx(sb.from('recipes').insert({id:bt,name:'هدر '+r.name,out_unit:'g',yield:0,byproduct:true,src_recipe:r.id}))}r.by={id:bt,q:r._bq}}else r.by=null;
 await saveRecipeRow(r);closeSheet();await refresh();toast('اتحفظت الوصفة واتحدّثت كل التكاليف')};
A.delRec=async()=>{const r=ER;if(S.recipes.some(x=>x.inputs.some(i=>i.k==='r'&&i.id===r.id))||S.products.some(p=>p.comps.some(i=>i.k==='r'&&i.id===r.id))){toast('الوصفة داخلة في وصفات أو منتجات تانية');return}await dbx(sb.from('recipes').delete().eq('id',r.id));closeSheet();await refresh();toast('اتحذفت')};

// ================= PRODUCTS =================
const catLbl=(b,c)=>b==='melt'?(c==='cake'?'تورت 24 سم':'ميني كيك'):(c==='cake'?'تورت المناسبات':'بوكسات وبوفيه');
V.products=()=>{const b=TAB.prodBrand||'melt';const list=S.products.filter(p=>p.brand===b);
 return head('المنتجات','كل منتج = مكونات نص مصنع + خامات فينش + تغليف (قاعدة، فاكيوم، كرتونة بعدد القطع، ستريتش)',canSee('products')?'<button class="btn" data-a="editProd" data-v="">+ منتج</button>':'')+
 `<div class="tabs">${S.brands.map(x=>`<button class="tab ${b===x.id?'on':''}" data-a="prodBrand" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div>`+
 (list.length?['mini','cake'].map(cat=>{const l=list.filter(p=>p.cat===cat);return l.length?`<div class="card" style="margin-bottom:12px"><h2>${catLbl(b,cat)}</h2><div class="list">${l.map(p=>{const c=pcost(p);return `<div class="li click" data-a="prodDetail" data-v="${p.id}"><div class="main"><div class="t">${esc(p.name)} <span class="muted small">${esc(p.en)}</span></div><div class="s">${p.cat==='cake'?(p.slices?'بتتقطع '+p.slices+' قطعة':'تورتة'):'الكرتونة '+p.ppc+' قطع'}${p.finish?' · فينش: '+esc(p.finish):''}</div></div><div class="e"><div class="b">${money(p.price)}</div>${c.missing?'<span class="pill bad">المكونات ناقصة</span>':can('cost')?`<div class="small muted">تكلفة ${fmt(c.mat,1)} · ${pct(c.mat/(p.price||1))}</div>`:''}</div></div>`}).join('')}</div></div>`:''}).join(''):emptyState('لسه مفيش منتجات لـ '+esc(brand(b).name)+'.',canSee('products')?'<button class="btn" data-a="editProd" data-v="">+ منتج</button>':''))};
A.prodBrand=el=>{TAB.prodBrand=el.dataset.v;render()};
A.prodDetail=el=>{const p=prod(el.dataset.v);const c=pcost(p);
 sheet(`<div class="between"><h2>${esc(p.name)}</h2>${canSee('products')?`<button class="btn sec sm" data-a="editProd" data-v="${p.id}">تعديل</button>`:''}</div><p class="sub">${esc(brand(p.brand).name)} · ${p.cat==='cake'?'تورتة'+(p.slices?' بتتقطع '+p.slices:''):'الكرتونة '+p.ppc+' قطع'} · وزن توزيع المصاريف ${p.w}</p>
 ${c.missing?'<div class="alert bad"><span class="dot"></span><div>المنتج ده من غير مكونات، فتكلفته مش محسوبة.</div></div>':''}
 ${can('cost')?`<div class="tbl-wrap"><table><tr><th>المكون</th><th class="n">الكمية</th><th class="n">التكلفة</th></tr>
 ${p.comps.map(x=>`<tr><td>${esc(itemName(x.k,x.id))}</td><td class="n">${fmt(x.q)} ${itemUnit(x.k,x.id)}</td><td class="n">${fmt(x.q*unitCost(x.k,x.id),2)}</td></tr>`).join('')}<tr class="tot"><td colspan="2">المكونات</td><td class="n">${fmt(c.ing,2)}</td></tr>
 ${p.pack.map(x=>`<tr><td>${esc(itemName('m',x.id))} ${x.perCarton?'<span class="tag-mini">÷ '+p.ppc+' قطع</span>':''}</td><td class="n">${fmt(x.q)} ${itemUnit('m',x.id)}</td><td class="n">${fmt((x.perCarton?x.q/p.ppc:x.q)*unitCost('m',x.id),2)}</td></tr>`).join('')}<tr class="tot"><td colspan="2">التغليف</td><td class="n">${fmt(c.pack,2)}</td></tr>
 <tr class="tot"><td colspan="2">تكلفة الخامات والتغليف</td><td class="n">${fmt(c.mat,2)}</td></tr><tr><td colspan="2">نصيبه من المصاريف العامة (${fmt(ohPerUnit(),2)} × وزن ${p.w})</td><td class="n">${fmt(c.oh,2)}</td></tr><tr class="tot"><td colspan="2">التكلفة الكاملة</td><td class="n">${fmt(c.full,2)}</td></tr></table></div>
 ${p.cat==='cake'&&p.slices?`<p class="small">الشريحة (÷${p.slices}): ${fmt(c.mat/p.slices,2)} خامات · سعر الشريحة ${fmt(p.price/p.slices,2)}</p>`:''}`:hidden('التكلفة مخفية')}`)};
let EP=null;
A.editProd=el=>{const b=TAB.menuBrand&&VIEW==='menu'?TAB.menuBrand:(TAB.prodBrand||'melt');EP=el.dataset.v?JSON.parse(JSON.stringify(prod(el.dataset.v))):{id:'',name:'',en:'',brand:b,cat:'mini',price:0,ppc:9,w:1,slices:10,finish:'',comps:[],pack:[],menu:{}};prodSheet()};
function prodMeta(){if(!document.getElementById('ep-n'))return;Object.assign(EP,{name:val('ep-n'),en:val('ep-en'),brand:val('ep-br'),cat:val('ep-c'),ppc:+val('ep-ppc'),slices:+val('ep-s'),w:num('ep-w')||1,finish:val('ep-f')});if(document.getElementById('ep-p'))EP._price=num('ep-p')}
function prodSheet(){const p=EP;ER=null;const c=p.comps.length&&can('cost')?withLastPrices(()=>pcost0(p)):null;
 sheet(`<h2>${p.id?'تعديل منتج':'منتج جديد'}</h2><div class="fgrid"><div class="field"><label for="ep-n">الاسم</label><input id="ep-n" type="text" value="${esc(p.name)}"></div><div class="field"><label for="ep-en">الاسم بالإنجليزي (للفاتورة والمنيو)</label><input id="ep-en" type="text" value="${esc(p.en)}"></div>
 <div class="field"><label for="ep-br">البراند</label><select id="ep-br">${S.brands.map(b=>`<option value="${b.id}" ${p.brand===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
 <div class="field"><label for="ep-c">النوع</label><select id="ep-c"><option value="mini" ${p.cat==='mini'?'selected':''}>بالقطعة / بوكس</option><option value="cake" ${p.cat==='cake'?'selected':''}>تورتة</option></select></div>
 ${!p.id||can('editPrices')?`<div class="field"><label for="ep-p">سعر البيع</label><input id="ep-p" type="number" value="${p._price??p.price}"></div>`:`<div class="field"><label>سعر البيع</label><div class="b num">${fmt(p.price)} ج 🔒</div></div>`}
 <div class="field"><label for="ep-ppc">قطع في الكرتونة</label><select id="ep-ppc">${[1,6,9,10,12,20,24].map(n=>`<option ${p.ppc===n?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="field"><label for="ep-s">التورتة بتتقطع</label><select id="ep-s">${[0,8,10,12,16,20,24,30,40,60].map(n=>`<option value="${n}" ${+p.slices===n?'selected':''}>${n||'—'}</option>`).join('')}</select></div>
 <div class="field"><label for="ep-w">وزن توزيع المصاريف ${ti('القطعة الميني = 1، والتورتة مثلاً = 8')}</label><input id="ep-w" type="number" step="0.1" value="${p.w}"></div><div class="field full"><label for="ep-f">الفينش (وصف)</label><input id="ep-f" type="text" value="${esc(p.finish||'')}"></div></div>
 ${c?`<div class="alert info" style="margin-top:10px"><span class="dot"></span><div>التكلفة بآخر سعر شراء: <b class="num">${fmt(c.mat,2)} ج</b> · سعر بتكلفة 50%: ${fmt(c.mat/0.5)} · 60%: ${fmt(c.mat/0.6)} · 70%: ${fmt(c.mat/0.7)} · 80%: ${fmt(c.mat/0.8)}<div class="small muted">بتتحدّث لوحدها مع كل فاتورة شراء.</div></div></div>`:''}
 <h3 style="margin-top:12px">المكونات والفينش</h3><p class="small muted">الكيك بالقطعة، والجناش والموس والصوص بالجرام. ◆ = نص مصنع</p>${compRows(p.comps,'ep')}<button class="btn sec sm" data-a="compAdd" data-p="ep">+ مكون</button>
 <h3 style="margin-top:12px">التغليف</h3>${compRows(p.pack,'epk')}<button class="btn sec sm" data-a="compAdd" data-p="epk">+ تغليف</button>
 <div class="row" style="margin-top:12px"><button class="btn" data-a="saveProd">حفظ</button>${p.id?'<button class="btn ghost" data-a="delProd">حذف</button>':''}</div>`)}
async function saveProductRow(p){const row={id:p.id,name:p.name,en:p.en||'',brand:p.brand,cat:p.cat,ppc:p.cat==='cake'?1:(p.ppc||1),weight:p.w||1,slices:p.slices||null,finish:p.finish||'',menu:p.menu||{}};
 if(p._price!=null&&(!p.price&&!prod(p.id)||can('editPrices')))row.price=p._price;
 await dbx(sb.from('products').upsert(row));await dbx(sb.from('product_comps').delete().eq('product_id',p.id));
 const rows=p.comps.map((x,i)=>({product_id:p.id,kind:x.k,item_id:x.id,qty:x.q,is_pack:false,per_carton:false,ord:i})).concat(p.pack.map((x,i)=>({product_id:p.id,kind:'m',item_id:x.id,qty:x.q,is_pack:true,per_carton:!!x.perCarton,ord:100+i})));
 if(rows.length)await dbx(sb.from('product_comps').insert(rows))}
A.saveProd=async()=>{prodMeta();const p=EP;if(!p.name.trim()){toast('اكتب اسم المنتج');return}p.comps=readComps(p.comps,'ep').filter(x=>x.q>0&&x.id);p.pack=readComps(p.pack,'epk').filter(x=>x.q>0&&x.id);const isNew=!p.id;p.id=p.id||uuid();
 if(!isNew&&p._price!=null&&p._price!==prod(p.id).price&&can('editPrices')){const nw=p._price;delete p._price;await saveProductRow(p);await rpc('set_product_price',{p_id:p.id,p_price:nw,p_how:'تعديل من شاشة المنتج'})}else await saveProductRow(p);
 closeSheet();await refresh();toast('اتحفظ المنتج')};
A.delProd=async()=>{await dbx(sb.from('products').delete().eq('id',EP.id));closeSheet();await refresh();toast('اتحذف المنتج')};
// ================= FOOD COST =================
const PLANS=[0.5,0.6,0.7,0.8];
V.costing=()=>{if(!can('cost'))return head('الفود كوست والتسعير')+`<div class="lock">🔒 التكاليف مش ضمن صلاحياتك</div>`;
 const tb=tabs([['plans','نسب التكلفة','التكلفة ونسبتها من سعر البيع، ونسبة الربح، والسعر المقترح لكل نسبة تكلفة'],['margin','التسعير بالهامش','اكتب هامش الربح نسبة أو مبلغ والسيستم يحسب السعر'],['semi','المكونات الأساسية','الكيك والجناش والموس: كمياتها وتكلفتها وتعديلها'],['items','تعديل الأصناف','مكونات كل منتج وكمياتها'],['prices','أسعار الخامات','تعديل سريع لأسعار الخامات والتغليف'],['mix','أثر أسعار الموردين']],'plans');
 const base=TAB.costBase||'mat';const rows=S.products.filter(p=>!pcost(p).missing&&p.price>0).map(p=>{const c=pcost(p);const cost=base==='mat'?c.mat:c.full;return {p,c,cost,margin:p.price-cost,fc:cost/p.price}});
 let body='';
 if(tb.cur==='plans')body=rows.length?`<div class="seg" style="margin-bottom:12px;max-width:560px"><button class="${base==='mat'?'on':''}" data-a="costBase" data-v="mat">تكلفة الخامات والتغليف</button><button class="${base==='full'?'on':''}" data-a="costBase" data-v="full"${tip('الخامات والتغليف + نصيب القطعة من المصاريف العامة (من الإعدادات)')}>التكلفة الكاملة</button></div>
  <div class="card"><div class="tbl-wrap"><table><tr><th>الصنف</th><th class="n">قيمة التكلفة</th><th class="n">نسبة التكلفة ${ti('قيمة التكلفة ÷ سعر البيع')}</th><th class="n">سعر البيع</th><th class="n">نسبة الربح ${ti('(سعر البيع − التكلفة) ÷ سعر البيع')}</th>${PLANS.map(x=>`<th class="n">تكلفة ${x*100}% ${ti('السعر اللي يخلي التكلفة '+x*100+'% من سعر البيع = التكلفة ÷ '+x.toFixed(2))}</th>`).join('')}</tr>
  ${S.brands.map(B=>['mini','cake'].map(cat=>{const rr=rows.filter(r=>r.p.brand===B.id&&r.p.cat===cat);return rr.length?`<tr><td colspan="9" class="small b" style="background:var(--surface2);color:var(--accent)">${esc(B.name)} · ${catLbl(B.id,cat)}</td></tr>`+rr.map(r=>`<tr class="click" data-a="prodDetail" data-v="${r.p.id}"><td>${esc(r.p.name)}</td><td class="n">${fmt(r.cost,2)}</td><td class="n"><span class="pill ${r.fc>0.8?'bad':r.fc>0.6?'warn':'ok'}">${pct(r.fc)}</span></td><td class="n b">${fmt(r.p.price)}</td><td class="n ${r.margin<0?'down':''}">${pct(r.margin/r.p.price)}</td>${PLANS.map(x=>`<td class="n">${fmt(r.cost/x,2)}</td>`).join('')}</tr>`).join(''):''}).join('')).join('')}</table></div>
  <p class="note" style="margin-top:10px">مثال: تكلفة 30 جنيه وعايز التكلفة 60% من السعر ← تبيع بـ 30 ÷ 0.60 = 50، ونسبة ربحك 40%.</p></div>
  ${S.products.some(p=>pcost(p).missing)?`<div class="alert info" style="margin-top:12px"><span class="dot"></span><div>أصناف من غير مكونات مش ظاهرة: ${S.products.filter(p=>pcost(p).missing).map(p=>esc(p.name)).join('، ')}.</div></div>`:''}`:emptyState('سجّل منتجات بمكوناتها وسعرها علشان تظهر هنا.','<button class="btn" data-a="go" data-v="products">المنتجات</button>');
 if(tb.cur==='margin'){const pr=S.products.filter(p=>!pcost(p).missing);if(!pr.length)body=emptyState('مفيش منتجات بمكونات لسه.');else{const M=TAB.mg=TAB.mg&&prod(TAB.mg.pid)?TAB.mg:{pid:pr[0].id,type:'pct',v:40,round:true};
  body=`<div class="cols" style="margin-top:0"><div class="card"><h2>حاسبة السعر بالهامش</h2><p class="sub" style="margin-bottom:12px">اختار الصنف واكتب هامش الربح، نسبة من سعر البيع أو مبلغ في القطعة</p>
  <div class="fgrid"><div class="field full"><label for="mg-p">الصنف</label><select id="mg-p" data-chg="mgCalc">${pr.map(p=>`<option value="${p.id}" ${p.id===M.pid?'selected':''}>${esc(p.name)} — تكلفة ${fmt(pcost(p).mat,2)}</option>`).join('')}</select></div>
  <div class="field full"><label>نوع الهامش</label><div class="seg"><button class="${M.type==='pct'?'on':''}" data-a="mgType" data-v="pct">نسبة % من سعر البيع</button><button class="${M.type==='amt'?'on':''}" data-a="mgType" data-v="amt">مبلغ بالجنيه</button></div></div>
  <div class="field"><label for="mg-v">${M.type==='pct'?'نسبة الربح %':'الربح بالجنيه'}</label><input id="mg-v" type="number" value="${M.v}" data-live="mgCalc"></div>
  <div class="field" style="justify-content:flex-end"><label class="small"><input type="checkbox" id="mg-r" ${M.round?'checked':''} data-chg="mgCalc"> قرّب لأقرب جنيه</label></div></div><div id="mg-res" style="margin-top:14px">${mgResult()}</div></div>
  <div class="card"><h2>سجل تغيير الأسعار</h2><div class="list" style="margin-top:6px">${S.priceLog.slice().reverse().slice(0,40).map(l=>`<div class="li"><div class="main"><div class="t">${esc(prod(l.pid)?.name||'')}</div><div class="s">${dShort(l.d)} · ${esc(l.by)} · ${esc(l.how)}</div></div><div class="e num">${fmt(l.old)} ← <b>${fmt(l.nw)}</b></div></div>`).join('')||'<div class="empty">لسه مفيش تغييرات.</div>'}</div></div></div>`}}
 if(tb.cur==='semi')body=`<p class="sub">عدّل الكميات والإنتاج واضغط حفظ، والتكلفة بتتحسب في كل المنتجات اللي بتستخدم المكون.</p><div class="row" style="margin-bottom:12px"><button class="btn" data-a="editRec" data-v="">+ مكون أساسي جديد</button></div>${S.recipes.filter(r=>!r.byproduct).map(semiCard).join('')||emptyState('مفيش وصفات لسه.')}`;
 if(tb.cur==='items')body=`<p class="sub">عدّل كميات المكونات لكل صنف واضغط حفظ. السعر بيتغير من «التسعير بالهامش».</p><div class="row" style="margin-bottom:12px"><button class="btn" data-a="editProd" data-v="">+ صنف جديد</button></div>${S.products.map(itemCard).join('')||emptyState('مفيش منتجات لسه.')}`;
 if(tb.cur==='prices'){const cat=TAB.pricesCat||'raw';body=`<p class="sub">اكتب السعر الجديد لوحدة الشراء واضغط «حفظ الأسعار». ده بيبقى تكلفة الخامة الحالية لحد أول فاتورة شراء جديدة. لو زاد أكتر من ${S.settings.priceAlert}% بيتسجل تنبيه.</p>
  <div class="tabs">${[['raw','خامات'],['pack','تغليف']].map(([v,t])=>`<button class="tab ${cat===v?'on':''}" data-a="pricesCat" data-v="${v}">${t}</button>`).join('')}</div>
  <div class="card"><div class="tbl-wrap"><table><tr><th>الخامة</th><th>وحدة الشراء</th><th>آخر مورد</th><th class="n">التكلفة الحالية</th><th class="n">السعر الجديد</th><th class="n">للكيلو / الوحدة</th></tr>
  ${S.materials.filter(m=>m.cat===cat).map(m=>`<tr><td>${esc(m.name)}</td><td class="small">${esc(m.pu)}</td><td class="small muted">${esc(sup(m.last?.s)?.name||'')}${m.last?.b?' · '+esc(m.last.b):''}</td><td class="n">${fmt(m.avg*m.size,2)}</td><td class="n"><input class="inp-sm" type="number" id="mp-${m.id}" placeholder="${fmt(m.avg*m.size,2)}"></td><td class="n small">${fmt(m.avg*(m.base==='g'?1000:1),2)}</td></tr>`).join('')}</table></div>
  <div class="row" style="margin-top:12px"><button class="btn" data-a="savePrices">حفظ الأسعار وإعادة حساب التكاليف</button></div></div>`}
 if(tb.cur==='mix'){const ms=S.materials.filter(m=>m.prices.length>1);body=ms.length?`<div class="card"><p class="sub">لكل خامة ليها أكتر من مورد: تكلفة المنتج لو اشتريت كلها من الأرخص أو الأغلى</p>${ms.map(m=>{const mn=Math.min(...m.prices.map(p=>p.p))/m.size,mx=Math.max(...m.prices.map(p=>p.p))/m.size;
  const aff=S.products.map(p=>{const save=m.avg;m.avg=mn;recalc();const a=pcost(p).mat;m.avg=mx;recalc();const b=pcost(p).mat;m.avg=save;recalc();return {p,a,b}}).filter(x=>Math.abs(x.b-x.a)>0.05);
  return `<details class="acc card flat" style="margin-bottom:8px"><summary class="between"><span>${esc(m.name)}</span><span class="small muted">${m.prices.map(p=>esc(p.b||sup(p.s)?.name||'')+' '+fmt(p.p)).join(' · ')}</span></summary><div class="tbl-wrap" style="margin-top:8px"><table><tr><th>المنتج</th><th class="n">بالأرخص</th><th class="n">بالأغلى</th><th class="n">الفرق</th></tr>${aff.map(x=>`<tr><td>${esc(x.p.name)}</td><td class="n">${fmt(x.a,2)}</td><td class="n">${fmt(x.b,2)}</td><td class="n down">+${fmt(x.b-x.a,2)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">مش داخلة في منتجات</td></tr>'}</table></div></details>`}).join('')}</div>`:emptyState('لما تسجل لنفس الخامة أكتر من مورد بأسعار مختلفة، هتشوف هنا أثر كل مورد على تكلفة المنتجات.')}
 return head('الفود كوست والتسعير',`تكلفة الخامات والتغليف + التكلفة الكاملة (المصاريف ${money(ohMonthly())} ÷ ${fmt(ohUnits())} قطعة موزونة = ${fmt(ohPerUnit(),2)} ج للقطعة)`)+tb.html+body};
A.costBase=el=>{TAB.costBase=el.dataset.v;render()};A.pricesCat=el=>{TAB.pricesCat=el.dataset.v;render()};
function mgResult(){const M=TAB.mg;const p=prod(M.pid);if(!p)return '';const c=pcost(p);const cost=(TAB.costBase||'mat')==='mat'?c.mat:c.full;let price=M.type==='pct'?cost/(1-Math.min(99,M.v)/100):cost+M.v;if(M.round)price=Math.round(price);const profit=price-cost,diff=price-p.price;
 return `<div class="grid2">${kpi('سعر البيع الجديد',mv(price),'الحالي '+fmt(p.price)+(diff?` · <span class="${diff>0?'up':'down'}">${diff>0?'+':''}${fmt(diff,2)}</span>`:''),{hl:1})}${kpi('نسبة التكلفة',pct(cost/price),'التكلفة '+fmt(cost,2)+' ج')}${kpi('الربح في القطعة',mv(profit),'',{cls:profit<0?'down':'up'})}${kpi('نسبة الربح من سعر البيع',pct(profit/price),'')}</div>
 ${can('editPrices')?`<button class="btn block" style="margin-top:12px" data-a="mgApprove" data-p="${price}">اعتمد ${fmt(price,2)} كسعر بيع جديد لـ ${esc(p.name)}</button>`:'<p class="small muted" style="margin-top:10px">🔒 اعتماد السعر محتاج صلاحية «يعدّل الأسعار»</p>'}`}
A.mgCalc=()=>{const M=TAB.mg;M.pid=val('mg-p');M.v=num('mg-v');M.round=document.getElementById('mg-r').checked;document.getElementById('mg-res').innerHTML=mgResult()};
A.mgType=el=>{A.mgCalc();TAB.mg.type=el.dataset.v;TAB.mg.v=el.dataset.v==='pct'?40:15;render()};
A.mgApprove=async el=>{const M=TAB.mg;await rpc('set_product_price',{p_id:M.pid,p_price:+el.dataset.p,p_how:M.type==='pct'?'هامش '+M.v+'% من السعر':'ربح '+M.v+' ج في القطعة'});await refresh();toast('اتغير السعر لـ '+fmt(+el.dataset.p,2))};
A.mgFor=el=>{TAB.mg={pid:el.dataset.v,type:'pct',v:40,round:true};closeSheet();go('costing','margin')};
function semiCard(r){const ri=recInfo(r.id);return `<details class="card acc" style="margin-bottom:10px;padding:14px 16px"${TAB.openSemi===r.id?' open':''}><summary class="between"><span>${esc(r.name)} <span class="tag-mini">${r.out==='g'?'بالجرام':'بالقطعة'}</span></span><span class="num small">${fmt(ri.unit,r.out==='g'?4:2)} ج / ${r.out==='g'?'جم':'قطعة'} · الوجبة ${fmt(ri.batch,2)}</span></summary>
 <div class="tbl-wrap" style="margin-top:10px"><table><tr><th>المكون</th><th class="n">الكمية</th><th class="n">سعر الوحدة</th><th class="n">التكلفة</th></tr>${r.inputs.map((x,i)=>`<tr><td>${esc(itemName(x.k,x.id))}</td><td class="n"><input class="inp-sm" type="number" id="sq-${r.id}-${i}" value="${x.q}"> ${itemUnit(x.k,x.id)}</td><td class="n">${fmt(unitCost(x.k,x.id),4)}</td><td class="n">${fmt(x.q*unitCost(x.k,x.id),2)}</td></tr>`).join('')}
 <tr class="tot"><td>تكلفة الوجبة</td><td></td><td></td><td class="n">${fmt(ri.batch,2)}</td></tr><tr><td>الوجبة بتطلع</td><td class="n"><input class="inp-sm" type="number" id="sy-${r.id}" value="${r.yield}"> ${unitLbl(r.out)}</td><td></td><td class="n b">${fmt(ri.unit,r.out==='g'?4:2)}</td></tr></table></div>
 <div class="row" style="margin-top:10px"><button class="btn sm" data-a="semiSave" data-v="${r.id}">حفظ</button><button class="btn sec sm" data-a="editRec" data-v="${r.id}">تعديل كامل</button></div></details>`}
A.semiSave=async el=>{const r=JSON.parse(JSON.stringify(rec(el.dataset.v)));r.inputs.forEach((x,i)=>{const v=document.getElementById('sq-'+r.id+'-'+i);if(v&&v.value!=='')x.q=+v.value});const y=num('sy-'+r.id);if(y>0)r.yield=y;TAB.openSemi=r.id;await saveRecipeRow(r);await refresh();toast('اتحفظ '+r.name)};
function itemCard(p){const c=pcost(p);return `<details class="card acc" style="margin-bottom:10px;padding:14px 16px"${TAB.openItem===p.id?' open':''}><summary class="between"><span>${esc(p.name)} <span class="tag-mini">${esc(brand(p.brand).name)}</span> ${c.missing?'<span class="pill bad">المكونات ناقصة</span>':''}</span><span class="num small">تكلفة ${fmt(c.mat,2)} · سعر ${fmt(p.price)} · ${pct(c.mat/(p.price||1))}</span></summary>
 <div class="tbl-wrap" style="margin-top:10px"><table><tr><th>المكون</th><th class="n">الكمية</th><th class="n">التكلفة</th></tr>${p.comps.map((x,i)=>`<tr><td>${esc(itemName(x.k,x.id))}</td><td class="n"><input class="inp-sm" type="number" id="iq-${p.id}-${i}" value="${x.q}"> ${itemUnit(x.k,x.id)}</td><td class="n">${fmt(x.q*unitCost(x.k,x.id),2)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">مفيش مكونات</td></tr>'}
 ${p.pack.map((x,i)=>`<tr><td>${esc(itemName('m',x.id))}${x.perCarton?' <span class="tag-mini">÷ '+p.ppc+'</span>':''}</td><td class="n"><input class="inp-sm" type="number" id="ik-${p.id}-${i}" value="${x.q}"></td><td class="n">${fmt((x.perCarton?x.q/p.ppc:x.q)*unitCost('m',x.id),2)}</td></tr>`).join('')}<tr class="tot"><td>تكلفة الخامات والتغليف</td><td></td><td class="n">${fmt(c.mat,2)}</td></tr></table></div>
 <div class="row" style="margin-top:10px"><button class="btn sm" data-a="itemSave" data-v="${p.id}">حفظ</button><button class="btn sec sm" data-a="editProd" data-v="${p.id}">تعديل كامل</button><button class="btn ghost sm" data-a="mgFor" data-v="${p.id}">سعّر بالهامش ↖</button></div></details>`}
A.itemSave=async el=>{const p=JSON.parse(JSON.stringify(prod(el.dataset.v)));p.comps.forEach((x,i)=>{const v=document.getElementById('iq-'+p.id+'-'+i);if(v&&v.value!=='')x.q=+v.value});p.pack.forEach((x,i)=>{const v=document.getElementById('ik-'+p.id+'-'+i);if(v&&v.value!=='')x.q=+v.value});TAB.openItem=p.id;await saveProductRow(p);await refresh();toast('اتحفظ '+p.name)};
A.savePrices=async()=>{const items=[];S.materials.forEach(m=>{const e=document.getElementById('mp-'+m.id);if(e&&e.value!==''&&+e.value>0)items.push({material_id:m.id,price:+e.value})});if(!items.length){toast('مفيش أسعار جديدة اتكتبت');return}const n=await rpc('set_material_prices',{p:items});await refresh();toast('اتحدّث سعر '+n+' خامة')};

// ================= SUPPLIERS & PURCHASES =================
V.suppliers=()=>{const tb=tabs([['list','الموردين'],['buy','فواتير الشراء'],['alerts','تنبيهات الأسعار']],'list');let body='';
 if(tb.cur==='list')body=S.suppliers.length?`<div class="card"><div class="list">${S.suppliers.map(s=>{const L=supLedger(s.id);return `<div class="li click" data-a="supDetail" data-v="${s.id}"><div class="main"><div class="t">${esc(s.name)}</div><div class="s">${esc(s.terms)}${s.phone?' · '+esc(s.phone):''}${L.overdue?` · <span class="down">متأخر ${money(L.overdue)}</span>`:''}${L.soon?` · <span style="color:var(--warn)">قرّب ${money(L.soon)}</span>`:''}</div></div><div class="e"><div class="b ${L.bal>0?'down':''}">${money(L.bal)}</div><div class="small muted">علينا</div></div></div>`}).join('')}</div></div>`:emptyState('لسه مفيش موردين. ضيف أول مورد باسمه وتليفونه وطريقة التعامل (كاش أو آجل كام يوم).','<button class="btn" data-a="editSup" data-v="">+ مورد</button>');
 if(tb.cur==='buy')body=S.purchases.length?`<div class="card"><div class="list">${S.purchases.slice().reverse().map(p=>`<div class="li click" data-a="purDetail" data-v="${p.id}"><div class="main"><div class="t">#${p.no} · ${esc(sup(p.s)?.name||'')}</div><div class="s">${dShort(p.d)} · ${p.lines.map(l=>esc(mat(l.mid)?.name||'')+' ×'+fmt(l.q)).join('، ')}</div></div><div class="e"><div class="b">${money(purTotal(p))}</div><span class="pill ${p.paid>=purTotal(p)?'ok':p.paid?'warn':'bad'}">${p.paid>=purTotal(p)?'مدفوعة':p.paid?'جزئي '+fmt(p.paid):'آجل'}</span></div></div>`).join('')}</div></div>`:emptyState('مفيش فواتير شراء لسه.',S.suppliers.length&&S.materials.length?'<button class="btn" data-a="newPurchase">+ فاتورة شراء</button>':'');
 if(tb.cur==='alerts')body=`<div class="card"><p class="sub">بيظهر لما سعر خامة يزيد أكتر من ${S.settings.priceAlert}% عن آخر سعر</p><div class="list">${S.priceAlerts.slice().reverse().map(a=>`<div class="li"><div class="main"><div class="t">${esc(mat(a.mid)?.name||'')} · ${esc(sup(a.s)?.name||'')}</div><div class="s">${dShort(a.d)} · ${fmt(a.old)} ← ${fmt(a.nw)} · ${a.res?'السبب: '+esc(a.res):'<span class="down">لسه محتاج سبب</span>'}</div></div><div class="e"><span class="pill bad">+${fmt(a.pct,1)}%</span>${a.res?'':`<div><button class="btn ghost sm" data-a="alertRes" data-v="${a.id}">تحديد السبب</button></div>`}</div></div>`).join('')||'<div class="empty">مفيش تنبيهات</div>'}</div></div>`;
 return head('الموردين والمشتريات','كاش أو آجل أو جزئي · كل دفعة بتنزل من المديونية · المتوسط المرجّح بيتحدّث مع كل فاتورة',`<button class="btn" data-a="newPurchase">+ فاتورة شراء</button><button class="btn sec" data-a="supPay">سداد</button><button class="btn sec" data-a="editSup" data-v="">+ مورد</button>`)+
 `<div class="kpi" style="margin-bottom:10px"><div class="l">إجمالي علينا للموردين</div><div class="v down">${money(S.suppliers.reduce((s,x)=>s+supLedger(x.id).bal,0))}</div></div>`+tb.html+body};
A.alertRes=el=>{const a=S.priceAlerts.find(x=>x.id===el.dataset.v);sheet(`<h2>سبب زيادة السعر</h2><p class="sub">${esc(mat(a.mid)?.name||'')} من ${esc(sup(a.s)?.name||'')}: ${fmt(a.old)} ← ${fmt(a.nw)}</p><div class="list">${['فرق سعر فعلي (زيادة سوق)','فرق جودة أو ماركة','خطأ في الإدخال'].map(r=>`<div class="li click" data-a="alertSet" data-v="${a.id}" data-r="${r}"><div class="main t">${r}</div></div>`).join('')}</div>`)};
A.alertSet=async el=>{await rpc('resolve_alert',{p_id:el.dataset.v,p_res:el.dataset.r});closeSheet();await refresh()};
A.editSup=el=>{const s=el.dataset.v?sup(el.dataset.v):{id:'',name:'',phone:'',terms:'كاش',days:0,opening:0,info:{}};
 sheet(`<h2>${s.id?'تعديل مورد':'مورد جديد'}</h2><div class="fgrid"><div class="field full"><label for="es-n">الاسم</label><input id="es-n" type="text" value="${esc(s.name)}"></div><div class="field"><label for="es-p">الموبايل</label><input id="es-p" type="tel" value="${esc(s.phone)}"></div>
 <div class="field"><label for="es-t">طريقة التعامل</label><select id="es-t">${['كاش','آجل'].map(t=>`<option ${s.terms.startsWith(t)?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="es-d">مدة الآجل (يوم)</label><input id="es-d" type="number" value="${s.days}"></div>
 <div class="field"><label for="es-o">رصيد أول المدة (علينا له) ${ti('المديونية اللي عليك للمورد ده يوم ما بدأت تستخدم السيستم')}</label><input id="es-o" type="number" value="${s.opening||''}"></div>
 <div class="field"><label for="es-c">اسم المسؤول</label><input id="es-c" type="text" value="${esc(s.info.contact||'')}"></div><div class="field"><label for="es-a">العنوان / المنطقة</label><input id="es-a" type="text" value="${esc(s.info.address||'')}"></div>
 <div class="field"><label for="es-b">الحساب البنكي / إنستا باي</label><input id="es-b" type="text" value="${esc(s.info.bank||'')}"></div><div class="field"><label for="es-x">ملاحظات</label><input id="es-x" type="text" value="${esc(s.info.notes||'')}"></div></div>
 <p class="small muted" style="margin-top:8px">باقي البيانات (الأشخاص، السجل، أعياد الميلاد) هتبقى في «دليل العملاء والموردين» في الدفعة 2.</p><button class="btn block" style="margin-top:12px" data-a="saveSup" data-v="${s.id}">حفظ</button>`)};
A.saveSup=async el=>{const n=val('es-n').trim();if(!n){toast('اكتب اسم المورد');return}const old=el.dataset.v?sup(el.dataset.v):null;const t=val('es-t'),d=num('es-d');
 await dbx(sb.from('suppliers').upsert({id:el.dataset.v||uuid(),name:n,phone:val('es-p'),terms:t==='آجل'?'آجل '+d+' يوم':'كاش',days:t==='آجل'?d:0,opening_balance:num('es-o'),info:Object.assign({},old?old.info:{},{contact:val('es-c'),address:val('es-a'),bank:val('es-b'),notes:val('es-x'),mobile:val('es-p')})}));closeSheet();await refresh();toast('اتحفظ المورد')};
A.supDetail=el=>{const s=sup(el.dataset.v);const L=supLedger(s.id);sheet(`<div class="between"><h2>كشف حساب ${esc(s.name)}</h2><button class="btn sec sm" data-a="editSup" data-v="${s.id}">تعديل</button></div><p class="sub">${esc(s.terms)} · ${esc(s.phone)}</p>
 <div class="tbl-wrap"><table><tr><th>التاريخ</th><th>البيان</th><th class="n">له</th><th class="n">مدفوع</th><th class="n">الرصيد</th></tr>${L.rows.map(r=>`<tr><td>${r.d==='0000'?'—':dShort(r.d)}</td><td>${esc(r.t)}</td><td class="n">${r.cr?fmt(r.cr):''}</td><td class="n">${r.dr?fmt(r.dr):''}</td><td class="n b">${fmt(r.bal)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">مفيش حركات</td></tr>'}</table></div>
 <div class="grid2" style="margin-top:10px">${kpi('الرصيد',money(L.bal))}${kpi('متأخر',money(L.overdue),'',{cls:L.overdue?'down':''})}</div>`)};
A.purDetail=el=>{const p=S.purchases.find(x=>x.id===el.dataset.v);sheet(`<h2>فاتورة شراء #${p.no}</h2><p class="sub">${esc(sup(p.s)?.name||'')} · ${p.d}</p><div class="tbl-wrap"><table><tr><th>الخامة</th><th class="n">الكمية</th><th class="n">السعر</th><th class="n">الإجمالي</th></tr>${p.lines.map(l=>{const m=mat(l.mid);return `<tr><td>${esc(m?.name||'')} ${l.b?'<span class="tag-mini">'+esc(l.b)+'</span>':''}</td><td class="n">${fmt(l.q)} ${esc(m?.pu||'')}</td><td class="n">${fmt(l.p,2)}</td><td class="n">${fmt(l.q*l.p,2)}</td></tr>`}).join('')}<tr class="tot"><td colspan="3">الإجمالي</td><td class="n">${fmt(purTotal(p),2)}</td></tr><tr><td colspan="3">مدفوع ${p.t?'('+tName(p.t)+')':''}</td><td class="n">${fmt(p.paid)}</td></tr></table></div>${p.notes?`<p class="small muted">${esc(p.notes)}</p>`:''}`)};
let PU=null;
A.newPurchase=()=>{if(!S.suppliers.length){toast('ضيف مورد الأول');return}if(!S.materials.length){toast('ضيف الخامات الأول');return}const m=S.materials[0];PU={s:S.suppliers[0].id,lines:[{mid:m.id,q:1,p:m.last?.p||0,b:m.last?.b||''}],paid:0,t:myTre(),d:today(),notes:''};puSheet()};
function puRead(){PU.s=val('pu-s');PU.d=val('pu-d')||today();PU.notes=val('pu-n');PU.lines=PU.lines.map((l,i)=>({mid:val('pl-m-'+i),q:num('pl-q-'+i),p:num('pl-p-'+i),b:val('pl-b-'+i)}));PU.paid=num('pu-paid');PU.t=val('pu-t')}
function puSheet(){const warn=[];PU.lines.forEach(l=>{const m=mat(l.mid);const lp=m?.last?.p;if(lp&&l.p>lp*(1+S.settings.priceAlert/100))warn.push(`${m.name}: ${fmt(lp)} ← ${fmt(l.p)} (+${fmt((l.p/lp-1)*100,1)}%)`)});const tot=PU.lines.reduce((s,l)=>s+l.q*l.p,0);
 sheet(`<h2>فاتورة شراء</h2><div class="fgrid"><div class="field"><label for="pu-s">المورد</label><select id="pu-s">${S.suppliers.map(s=>`<option value="${s.id}" ${s.id===PU.s?'selected':''}>${esc(s.name)} — ${esc(s.terms)}</option>`).join('')}</select></div><div class="field"><label for="pu-d">التاريخ</label><input id="pu-d" type="date" value="${PU.d}"></div></div>
 <h3 style="margin-top:10px">الأصناف (الكمية بوحدة الشراء)</h3>${PU.lines.map((l,i)=>{const m=mat(l.mid);return `<div class="row" style="flex-wrap:nowrap;margin-bottom:4px"><select id="pl-m-${i}" style="flex:1" data-chg="puMat" data-i="${i}">${S.materials.map(x=>`<option value="${x.id}" ${x.id===l.mid?'selected':''}>${esc(x.name)}</option>`).join('')}</select><input id="pl-q-${i}" type="number" value="${l.q}" style="width:66px" aria-label="الكمية" data-chg="puCheck"><input id="pl-p-${i}" type="number" value="${l.p}" style="width:86px" aria-label="سعر الوحدة" data-chg="puCheck"><button class="icon-btn" data-a="puDel" data-i="${i}" aria-label="حذف">×</button></div><div class="row small muted" style="margin-bottom:8px">${esc(m?.pu||'')} · آخر سعر ${m?.last?fmt(m.last.p):'—'} · <input id="pl-b-${i}" type="text" value="${esc(l.b)}" placeholder="الجودة/الماركة" style="width:150px;padding:4px 8px"></div>`}).join('')}
 <button class="btn sec sm" data-a="puAdd">+ صنف</button>
 ${warn.length?`<div class="alert warn" style="margin-top:10px"><span class="dot"></span><div><b>تنبيه زيادة سعر:</b><br>${warn.map(esc).join('<br>')}</div></div>`:''}
 <div class="between" style="margin-top:10px"><span>الإجمالي</span><b class="num">${money(tot,2)}</b></div>
 <div class="fgrid" style="margin-top:8px"><div class="field"><label for="pu-paid">المدفوع دلوقتي</label><input id="pu-paid" type="number" value="${PU.paid}"></div><div class="field"><label for="pu-t">من خزنة</label><select id="pu-t">${trOpts(PU.t)}</select></div><div class="field full"><label for="pu-n">ملاحظات</label><input id="pu-n" type="text" value="${esc(PU.notes)}"></div></div>
 <p class="small muted">لو المدفوع أقل من الإجمالي، الباقي بيتسجل آجل على المورد.</p><button class="btn block" style="margin-top:10px" data-a="puSave">حفظ الفاتورة</button>`)}
A.puMat=el=>{puRead();const i=+el.dataset.i;const m=mat(PU.lines[i].mid);PU.lines[i].p=m.last?.p||0;PU.lines[i].b=m.last?.b||'';puSheet()};
A.puCheck=()=>{puRead();puSheet()};
A.puAdd=()=>{puRead();const m=S.materials.find(x=>!PU.lines.some(l=>l.mid===x.id))||S.materials[0];PU.lines.push({mid:m.id,q:1,p:m.last?.p||0,b:m.last?.b||''});puSheet()};
A.puDel=el=>{puRead();PU.lines.splice(+el.dataset.i,1);if(!PU.lines.length)A.puAdd();else puSheet()};
let _busy=false;
A.puSave=async()=>{if(_busy)return;puRead();const lines=PU.lines.filter(l=>l.q>0);if(!lines.length){toast('ضيف صنف بكمية');return}const tot=lines.reduce((s,l)=>s+l.q*l.p,0);if(PU.paid>tot+0.01){toast('المدفوع أكبر من الإجمالي');return}
 _busy=true;try{await rpc('post_purchase',{p:{supplier_id:PU.s,d:PU.d,paid:PU.paid,treasury_id:PU.paid?PU.t:'',notes:PU.notes,lines:lines.map(l=>({material_id:l.mid,qty:l.q,price:l.p,quality:l.b||''}))}});closeSheet();await refresh();toast('اتسجلت الفاتورة واتحدّث المخزن والمتوسط المرجّح')}finally{_busy=false}};
A.supPay=()=>{const list=S.suppliers.filter(s=>supLedger(s.id).bal>0);if(!list.length){toast('مفيش مستحقات للموردين');return}sheet(`<h2>سداد لمورد</h2><p class="sub">بيتوزع على أقدم فواتير الأول</p><div class="fgrid"><div class="field full"><label for="sp-s">المورد</label><select id="sp-s">${list.map(s=>`<option value="${s.id}">${esc(s.name)} — له ${money(supLedger(s.id).bal)}</option>`).join('')}</select></div><div class="field"><label for="sp-v">المبلغ</label><input id="sp-v" type="number"></div><div class="field"><label for="sp-t">من خزنة</label><select id="sp-t">${trOpts(myTre())}</select></div><div class="field full"><label for="sp-n">ملاحظات</label><input id="sp-n" type="text"></div></div><button class="btn block" style="margin-top:12px" data-a="supPaySave">سداد</button>`)};
A.supPaySave=async()=>{if(_busy)return;const v=num('sp-v');if(v<=0){toast('اكتب المبلغ');return}_busy=true;try{await rpc('pay_supplier',{p:{supplier_id:val('sp-s'),amount:v,treasury_id:val('sp-t'),notes:val('sp-n')}});closeSheet();await refresh();toast('اتسدد '+money(v))}finally{_busy=false}};
// ================= FILE SAVE / PDF =================
function saveFile(filename,blob){try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('اتحمّل: '+filename)}catch(e){toast('التحميل مش متاح')}}
async function nodesToPdf(nodes,filename){if(!window.html2canvas||!window.jspdf){toast('مكتبة الـ PDF لسه بتحمّل، جرّب كمان ثانية');return}toast('بيتجهز الـ PDF...');try{await document.fonts.ready}catch(e){}
 const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4'});for(let i=0;i<nodes.length;i++){const cv=await html2canvas(nodes[i],{scale:2,backgroundColor:'#ffffff',useCORS:true});const w=210,h=Math.min(297,cv.height*w/cv.width);if(i)pdf.addPage();pdf.addImage(cv.toDataURL('image/jpeg',.9),'JPEG',0,0,w,h)}saveFile(filename,pdf.output('blob'))}

// ================= MENU =================
const bvars=B=>{const c=Object.assign({ink:'#7a5520',acc:'#c9a46a',acc2:'#94692c',line:'#e1c9a0',bg1:'#fffaf3',bg2:'#f3e6d3'},B.c||{});return `--mk-ink:${c.ink};--mk-acc:${c.acc};--mk-acc2:${c.acc2};--mk-line:${c.line};--mk-bg1:${c.bg1};--mk-bg2:${c.bg2}`};
const menuOf=p=>Object.assign({show:true,desc:'',img:'',mode:'fixed'},p.menu||{});
async function saveMenu(p,patch){const m=Object.assign(menuOf(p),patch);await dbx(sb.from('products').update({menu:m}).eq('id',p.id));p.menu=m}
function priceHTML(p,big){const m=menuOf(p);const pr=p.price;
 if(m.mode==='request')return `<div style="font-family:'El Messiri',serif;font-size:${big?20:15}px;color:var(--mk-ink)">السعر حسب الطلب</div><div style="font-size:11px;color:#8a7560">تواصل معانا</div>`;
 const from=m.mode==='from'?'<span style="font-size:11px;color:#8a7560">يبدأ من </span>':'';
 if(p.cat==='cake'||p.ppc<=1)return `<div style="font-family:'El Messiri',serif;font-size:${big?24:17}px;color:var(--mk-ink)">${from}${fmt(pr)} <span style="font-size:12px">ج</span></div><div style="font-size:11px;color:#8a7560">${p.cat==='cake'?(p.slices?'التورتة · تتقطع '+p.slices+' قطعة':'التورتة'):'للبوكس'}</div>`;
 return `<div style="font-family:'El Messiri',serif;font-size:${big?24:17}px;color:var(--mk-ink)">${from}${fmt(pr)} <span style="font-size:12px">ج / القطعة</span></div><div style="font-size:11.5px;color:#5b4a40">الكرتونة ${p.ppc} قطع = <b>${fmt(pr*p.ppc)} ج</b></div>`}
function photoHTML(p,size){const m=menuOf(p);const v=bvars(brand(p.brand));if(m.img)return `<img src="${esc(m.img)}" crossorigin="anonymous" alt="" style="width:100%;height:${size}px;object-fit:cover;border-radius:10px;display:block">`;
 const ch=(p.en||p.name).trim().charAt(0).toUpperCase();return `<div style="${v};width:100%;height:${size}px;border-radius:10px;background:radial-gradient(circle at 30% 25%,var(--mk-bg1),var(--mk-bg2) 70%,var(--mk-line));display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--mk-acc2)"><div style="font-family:Georgia,serif;font-style:italic;font-size:${Math.round(size*0.38)}px;line-height:1">${esc(ch)}</div><div style="font-size:10px;letter-spacing:3px;margin-top:6px">${esc(brand(p.brand).name.split(' ')[0].toUpperCase())}</div></div>`}
function pageShell(inner,B,n,tot){return `<div class="mpage" style="${bvars(B)};width:794px;height:1123px;box-sizing:border-box;background:linear-gradient(180deg,var(--mk-bg1),var(--mk-bg2));position:relative;padding:54px 56px;direction:rtl;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;color:#3a2416;overflow:hidden">
 <div style="position:absolute;inset:20px;border:2px solid var(--mk-acc);border-radius:4px"></div><div style="position:absolute;inset:28px;border:1px solid var(--mk-line);border-radius:2px"></div>${inner}
 ${n?`<div style="position:absolute;bottom:34px;left:56px;right:56px;display:flex;justify-content:space-between;font-size:11px;color:#8a7560"><span>${esc(B.name)}</span><span style="direction:ltr">${esc(S.settings.phones||'')}</span><span>${n} / ${tot}</span></div>`:''}</div>`}
function menuPages(b,layout){const B=brand(b);const items=S.products.filter(p=>p.brand===b&&menuOf(p).show).sort((x,y)=>x.cat>y.cat?1:-1);const d=new Date();const dateL=MONTHS[d.getMonth()]+' '+d.getFullYear();
 const logoH=h=>B.logo?`<img src="${esc(B.logo)}" crossorigin="anonymous" alt="" style="height:${h}px;width:auto;display:block;margin:0 auto">`:`<div style="font-family:'El Messiri',serif;font-size:${Math.round(h/2)}px;color:var(--mk-ink);text-align:center">${esc(B.name)}</div>`;
 const info=`<div style="font-size:13px;line-height:2;color:#5b4a40">🕓 ${esc(S.settings.hoursText||'')}<br>⏳ ${esc(S.settings.leadText||'')}<br>📱 ${esc(S.settings.confirmText||'')}<br><b style="direction:ltr;unicode-bidi:embed;font-family:'IBM Plex Mono',monospace">${esc(S.settings.phones||'')}</b></div>`;
 if(layout==='flyer'){const cols=items.length>12?4:3;const ph=cols===4?110:140;
  return [pageShell(`<div style="text-align:center">${logoH(110)}${B.tagline?`<div style="font-family:Georgia,serif;font-style:italic;color:var(--mk-acc2);margin-top:6px">${esc(B.tagline)}</div>`:''}<div style="font-family:'El Messiri',serif;font-size:30px;color:var(--mk-ink);margin-top:6px">قائمة الأسعار · ${dateL}</div></div>
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;margin-top:18px">${items.map(p=>`<div style="background:#fff;border:1px solid var(--mk-line);border-radius:12px;padding:8px;text-align:center">${photoHTML(p,ph)}<div style="font-family:'El Messiri',serif;font-size:16px;margin-top:6px">${esc(p.name)}</div><div style="font-family:Georgia,serif;font-style:italic;font-size:11px;color:#8a7560">${esc(p.en||'')}</div><div style="margin-top:4px">${priceHTML(p,false)}</div></div>`).join('')}</div>
  <div style="position:absolute;bottom:60px;left:56px;right:56px;border-top:1px solid var(--mk-line);padding-top:10px;text-align:center">${info}</div>`,B)]}
 const pages=[`<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px">${logoH(250)}${B.tagline?`<div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:var(--mk-acc2)">${esc(B.tagline)}</div>`:''}<div style="width:220px;height:1px;background:var(--mk-acc);margin:18px 0"></div><div style="font-family:'El Messiri',serif;font-size:46px;color:var(--mk-ink)">قائمة الأسعار</div><div style="font-size:16px;color:#8a7560">${dateL}</div><div style="position:absolute;bottom:70px;font-size:13px;color:#8a7560">${esc(B.use||'')}</div></div>`];
 [...new Set(items.map(p=>p.cat))].forEach(cat=>{const its=items.filter(p=>p.cat===cat);for(let i=0;i<its.length;i+=6){const chunk=its.slice(i,i+6);
  pages.push(`<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--mk-acc);padding-bottom:10px"><div><div style="font-size:12px;letter-spacing:2px;color:var(--mk-acc2)">${esc(B.name)}</div><div style="font-family:'El Messiri',serif;font-size:34px;color:var(--mk-ink);line-height:1.2">${catLbl(b,cat)}</div></div>${B.logo?`<img src="${esc(B.logo)}" crossorigin="anonymous" alt="" style="height:54px">`:''}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px">${chunk.map(p=>{const m=menuOf(p);return `<div style="background:#fff;border:1px solid var(--mk-line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:5px;height:256px">${photoHTML(p,124)}<div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px"><div style="font-family:'El Messiri',serif;font-size:19px">${esc(p.name)}</div><div style="font-family:Georgia,serif;font-style:italic;font-size:11.5px;color:#8a7560">${esc(p.en||'')}</div></div><div style="font-size:11.5px;color:#6a564a;line-height:1.5;min-height:17px">${esc(m.desc||p.finish||'')}</div><div style="margin-top:auto;border-top:1px dashed var(--mk-line);padding-top:6px">${priceHTML(p,true)}</div></div>`}).join('')}</div>`)}});
 pages.push(`<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px">${logoH(120)}<div style="font-family:'El Messiri',serif;font-size:34px;color:var(--mk-ink)">طريقة الطلب</div><div style="max-width:520px">${info}</div>${S.settings.address?`<div style="font-size:13px;color:#8a7560">${esc(S.settings.address)}</div>`:''}<div style="font-size:12px;color:#8a7560">${esc(S.settings.invoiceNote||'')}</div><div style="font-family:Georgia,serif;font-style:italic;color:var(--mk-acc2);font-size:18px;margin-top:10px">${esc(B.tagline||'')}</div></div>`);
 return pages.map((h,i)=>pageShell(h,B,i?i+1:0,pages.length))}
V.menu=()=>{const b=TAB.menuBrand||'melt';const M=TAB.menuGen=TAB.menuGen||{layout:'catalog'};const items=S.products.filter(p=>p.brand===b);const costs=can('cost')?withLastPrices(()=>Object.fromEntries(items.map(p=>[p.id,pcost(p)]))):{};
 return head('المنيو وقائمة الأسعار','منيو لكل براند بالصور والأسعار (القطعة والكرتونة)، يطلع PDF كتالوج أو فلاير',canSee('products')?'<button class="btn" data-a="editProd" data-v="">+ صنف جديد</button>':'')+
 `<div class="tabs">${S.brands.map(x=>`<button class="tab ${b===x.id?'on':''}" data-a="menuBrand" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div>
 <div class="card"><h2>تحميل المنيو</h2><div class="fgrid" style="margin-top:10px"><div class="field full"><label>الشكل</label><div class="seg"><button class="${M.layout==='catalog'?'on':''}" data-a="menuSet" data-v="catalog">كتالوج فخم (صفحات)</button><button class="${M.layout==='flyer'?'on':''}" data-a="menuSet" data-v="flyer">فلاير صفحة واحدة</button></div></div></div>
 <p class="small muted" style="margin-top:8px">المنيو بأسعار عميل معيّن هيتضاف مع العملاء في الدفعة 2.</p><div class="row" style="margin-top:10px"><button class="btn sec" data-a="menuPreview">معاينة</button><button class="btn" data-a="menuPdf">تحميل PDF</button><span class="small muted">${items.filter(p=>menuOf(p).show).length} صنف ظاهر</span></div></div>
 <div class="card" style="margin-top:14px"><h2 class="sec-title">أصناف ${esc(brand(b).name)} ${ti('ارفع صورة لكل صنف، واكتب وصف قصير، واختار طريقة عرض السعر. التكلفة محسوبة بآخر سعر شراء للخامات')}</h2><div class="list" style="margin-top:6px">
 ${items.map(p=>{const m=menuOf(p);const cc=costs[p.id];return `<div class="li" style="align-items:flex-start;flex-wrap:wrap"><label style="cursor:pointer;flex:none;width:86px"${tip('اضغط لرفع صورة الصنف')}>${m.img?`<img src="${esc(m.img)}" alt="" style="width:86px;height:86px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">`:`<div style="width:86px;height:86px;border-radius:12px;border:1px dashed var(--line2);display:grid;place-items:center;color:var(--dim);font-size:12px">+ صورة</div>`}<input type="file" accept="image/*" hidden data-chg="menuImg" data-v="${p.id}"></label>
  <div class="main" style="min-width:200px"><div class="between"><span class="t">${esc(p.name)} <span class="muted small">${esc(p.en)}</span></span><label class="small"><input type="checkbox" ${m.show?'checked':''} data-chg="menuShow" data-v="${p.id}"> يظهر في المنيو</label></div>
  <input type="text" id="md-${p.id}" value="${esc(m.desc)}" placeholder="وصف قصير يظهر في المنيو" data-chg="menuDesc" data-v="${p.id}" style="margin-top:6px">
  <div class="row small" style="margin-top:6px"><select data-chg="menuMode" data-v="${p.id}" style="width:auto">${[['fixed','سعر ثابت'],['from','يبدأ من'],['request','حسب الطلب']].map(([v,t])=>`<option value="${v}" ${m.mode===v?'selected':''}>${t}</option>`).join('')}</select><span class="num b">${fmt(p.price)} ج</span>${p.cat!=='cake'&&p.ppc>1?`<span class="muted">· الكرتونة ${p.ppc} = ${fmt(p.price*p.ppc)} ج</span>`:''}
  ${cc?(cc.missing?'<span class="pill bad">المكونات ناقصة</span>':`<span class="pill ${cc.mat/(p.price||1)>0.8?'bad':cc.mat/(p.price||1)>0.6?'warn':'ok'}"${tip('التكلفة بآخر سعر شراء للخامات والتغليف')}>تكلفة ${fmt(cc.mat,1)} · ${pct(cc.mat/(p.price||1))}</span><span class="muted">مقترح: ${fmt(cc.mat/0.5)} / ${fmt(cc.mat/0.6)} / ${fmt(cc.mat/0.7)}</span>`):''}
  ${canSee('products')?`<button class="btn ghost sm" data-a="editProd" data-v="${p.id}">المكونات</button>`:''}${can('cost')?`<button class="btn ghost sm" data-a="mgFor" data-v="${p.id}">سعّر ↖</button>`:''}</div></div></div>`}).join('')||'<div class="empty">مفيش أصناف للبراند ده لسه</div>'}</div></div>`};
A.menuBrand=el=>{TAB.menuBrand=el.dataset.v;render()};A.menuSet=el=>{TAB.menuGen.layout=el.dataset.v;render()};
A.menuShow=el=>saveMenu(prod(el.dataset.v),{show:el.checked});A.menuDesc=el=>saveMenu(prod(el.dataset.v),{desc:el.value});
A.menuMode=async el=>{await saveMenu(prod(el.dataset.v),{mode:el.value});render()};
A.menuImg=el=>{const f=el.files&&el.files[0];if(!f)return;toast('بيرفع الصورة...');imgToData(f,900,async d=>{const p=prod(el.dataset.v);const url=await uploadImage(dataToBlob(d),'products/'+p.id+'-'+Date.now()+'.jpg');await saveMenu(p,{img:url});render();toast('اتحفظت صورة الصنف')})};
A.menuPreview=()=>{const b=TAB.menuBrand||'melt';const pages=menuPages(b,TAB.menuGen.layout);const z=Math.min(1,(Math.min(window.innerWidth,720)-40)/794);
 sheet(`<div class="between"><h2>معاينة المنيو (${pages.length})</h2><div class="row"><button class="btn sm" data-a="menuPdf">تحميل PDF</button><button class="btn sec sm" data-a="close">إغلاق</button></div></div><div style="margin-top:12px;display:flex;flex-direction:column;gap:12px;align-items:center">${pages.map(h=>`<div style="width:${794*z}px;height:${1123*z}px;overflow:hidden;border-radius:6px;box-shadow:var(--shadow);flex:none"><div style="transform:scale(${z});transform-origin:top right;width:794px">${h}</div></div>`).join('')}</div>`)};
A.menuPdf=async()=>{const b=TAB.menuBrand||'melt';const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:794px';host.innerHTML=menuPages(b,TAB.menuGen.layout).join('');document.body.appendChild(host);
 try{await nodesToPdf([...host.querySelectorAll('.mpage')],(TAB.menuGen.layout==='flyer'?'فلاير':'منيو')+'-'+brand(b).name+'.pdf')}finally{host.remove()}};

// ================= USERS & PERMISSIONS =================
const PERM_FLAGS=[['cost','يشوف التكاليف والأسعار'],['profit','يشوف الأرباح'],['capital','يشوف رأس المال'],['approve','يوافق ويعتمد'],['editPrices','يعدّل أسعار البيع']];
const PRESETS={partner:{screens:SCREENS.filter(s=>!['capital','users'].includes(s.id)).map(s=>s.id),cost:true,profit:false,capital:false,approve:false,editPrices:true},production:{screens:['home','recipes','products','production','stock','returns','materials'],cost:false},courier:{screens:['home','orders','couriers']},accountant:{screens:['home','materials','suppliers','costing','cash','expenses','staff','closing','customers'],cost:true,profit:true}};
V.users=()=>{const owner=me().owner;const us=S.users;
 return head('المستخدمين والصلاحيات',owner?'ضيف كل اللي هيستخدموا السيستم، وحدد لكل واحد بيشوف إيه بالظبط':'التعديل للمالك بس',owner?'<button class="btn" data-a="newUser">+ مستخدم</button>':'')+
 `<div class="card"><div class="list">${us.map(u=>`<div class="li"><div class="main"><div class="t">${esc(u.name)} ${u.owner?'<span class="pill acc">المالك</span>':''} ${u.active?'':'<span class="pill bad">متوقف</span>'}</div><div class="s">${esc(u.role||'')} · <span style="direction:ltr;unicode-bidi:embed">${esc(u.email||'')}</span></div></div>${owner&&!u.owner?`<div class="row"><button class="btn ghost sm" data-a="userPwd" data-v="${u.id}">كلمة سر جديدة</button><button class="btn ghost sm" data-a="userActive" data-v="${u.id}">${u.active?'إيقاف':'تفعيل'}</button></div>`:''}</div>`).join('')}</div></div>
 ${us.length>1?`<div class="card" style="margin-top:14px"><h2>الصلاحيات</h2><div class="tbl-wrap" style="margin-top:8px"><table class="perm-tbl"><tr><th>الصلاحية</th>${us.map(u=>`<th>${esc(u.name)}</th>`).join('')}</tr>
 ${PERM_FLAGS.map(([f,l])=>`<tr><td class="b">${l}</td>${us.map(u=>`<td><input type="checkbox" aria-label="${l} — ${esc(u.name)}" ${u.owner||u.perms[f]?'checked':''} ${!owner||u.owner?'disabled':''} data-chg="permFlag" data-u="${u.id}" data-f="${f}"></td>`).join('')}</tr>`).join('')}
 <tr><td colspan="${us.length+1}" class="small muted">الشاشات</td></tr>${SCREENS.map(s=>`<tr><td>${s.t}${s.b>1?` <span class="soon">الدفعة ${s.b}</span>`:''}</td>${us.map(u=>`<td><input type="checkbox" aria-label="${s.t} — ${esc(u.name)}" ${u.owner||(u.perms.screens||[]).includes(s.id)?'checked':''} ${!owner||u.owner?'disabled':''} data-chg="permScreen" data-u="${u.id}" data-s="${s.id}"></td>`).join('')}</tr>`).join('')}</table></div>
 <p class="note" style="margin-top:10px">الصلاحيات بتتطبق من السيرفر نفسه، يعني اللي مالوش صلاحية التكاليف مش هيقدر يشوفها حتى لو حاول. صلاحيات المالك مقفولة.</p></div>`:''}`};
async function setPerms(uid,perms){await dbx(sb.from('app_users').update({perms}).eq('id',uid));await refresh();toast('اتحفظت الصلاحيات')}
A.permFlag=el=>{const u=S.users.find(x=>x.id===el.dataset.u);setPerms(u.id,Object.assign({},u.perms,{[el.dataset.f]:el.checked}))};
A.permScreen=el=>{const u=S.users.find(x=>x.id===el.dataset.u);const sc=new Set(u.perms.screens||[]);el.checked?sc.add(el.dataset.s):sc.delete(el.dataset.s);setPerms(u.id,Object.assign({},u.perms,{screens:[...sc]}))};
A.newUser=()=>sheet(`<h2>مستخدم جديد</h2><p class="sub">هتديله الإيميل وكلمة السر يدخل بيهم أول مرة، وبعدها يعمل رمز سري أو بصمة على موبايله.</p><div class="fgrid"><div class="field"><label for="nu-n">الاسم</label><input id="nu-n" type="text" placeholder="حمزة"></div><div class="field"><label for="nu-r">الوظيفة</label><input id="nu-r" type="text" placeholder="شريك ومدير تشغيل"></div>
 <div class="field"><label for="nu-e">الإيميل</label><input id="nu-e" type="text" style="direction:ltr"></div><div class="field"><label for="nu-p">كلمة سر مؤقتة (8 حروف على الأقل)</label><input id="nu-p" type="text" style="direction:ltr"></div>
 <div class="field full"><label for="nu-t">ابدأ بصلاحيات</label><select id="nu-t"><option value="partner">شريك / مدير تشغيل (كل حاجة ما عدا رأس المال والأرباح)</option><option value="accountant">محاسب</option><option value="production">مسؤول إنتاج (من غير تكاليف)</option><option value="courier">مندوب</option></select></div></div>
 <button class="btn block" style="margin-top:12px" data-a="newUserSave">إضافة</button>`);
A.newUserSave=async()=>{const body={action:'create',name:val('nu-n').trim(),role:val('nu-r').trim(),email:val('nu-e').trim(),password:val('nu-p'),perms:PRESETS[val('nu-t')]};if(!body.name||!body.email){toast('اكتب الاسم والإيميل');return}
 const {data,error}=await sb.functions.invoke('admin-users',{body});if(error||data?.error){toast('مقدرتش أضيفه: '+(data?.error||error.message));return}closeSheet();await refresh();toast('اتضاف '+body.name+'. ابعتله الإيميل وكلمة السر')};
A.userPwd=el=>sheet(`<h2>كلمة سر جديدة</h2><div class="field"><label for="up-p">كلمة السر (8 حروف على الأقل)</label><input id="up-p" type="text" style="direction:ltr"></div><button class="btn block" style="margin-top:12px" data-a="userPwdSave" data-v="${el.dataset.v}">حفظ</button>`);
A.userPwdSave=async el=>{const {data,error}=await sb.functions.invoke('admin-users',{body:{action:'password',id:el.dataset.v,password:val('up-p')}});if(error||data?.error){toast(data?.error||error.message);return}closeSheet();toast('اتغيرت كلمة السر')};
A.userActive=async el=>{const u=S.users.find(x=>x.id===el.dataset.v);const {data,error}=await sb.functions.invoke('admin-users',{body:{action:'active',id:u.id,active:!u.active}});if(error||data?.error){toast(data?.error||error.message);return}await refresh();toast(u.active?'اتوقف الحساب':'اتفعّل الحساب')};

// ================= SETTINGS =================
V.prefs=()=>{const st=S.settings;const edit=canSee('prefs');
 return head('الإعدادات','بيانات المصنع، البراندات، الخزن، والفود كوست')+`
 <div class="card"><h2>بيانات المصنع (بتظهر في الفاتورة والمنيو)</h2><div class="fgrid" style="margin-top:8px">${[['name','اسم المصنع'],['sub','الوصف'],['cr','السجل التجاري'],['tax','البطاقة الضريبية'],['phones','أرقام التواصل'],['address','العنوان'],['invoiceNote','ملاحظة أسفل الفاتورة']].map(([k,l])=>`<div class="field ${['sub','invoiceNote','address'].includes(k)?'full':''}"><label for="st-${k}">${l}</label><input id="st-${k}" type="text" value="${esc(st[k]||'')}"></div>`).join('')}</div></div>
 <div class="card" style="margin-top:12px"><h2>الفاتورة والمواعيد</h2><div class="fgrid" style="margin-top:8px"><div class="field full"><label for="st-hoursText">مواعيد العمل</label><input id="st-hoursText" type="text" value="${esc(st.hoursText||'')}"></div><div class="field full"><label for="st-leadText">مدة التصنيع والتسليم</label><input id="st-leadText" type="text" value="${esc(st.leadText||'')}"></div><div class="field"><label for="st-leadDays">أيام العمل للتسليم</label><input id="st-leadDays" type="number" value="${st.leadDays||3}"></div><div class="field"><label for="st-confirmText">طريقة التأكيد</label><input id="st-confirmText" type="text" value="${esc(st.confirmText||'')}"></div></div>
 <h3 style="margin-top:12px">رسائل الترحيب (أول شهر، بالتبديل)</h3>${(st.welcome||[]).map((m,i)=>`<textarea id="st-w-${i}" rows="2" style="margin-bottom:6px">${esc(m)}</textarea>`).join('')}<h3 style="margin-top:10px">رسائل الشكر (بعد أول شهر)</h3>${(st.thanks||[]).map((m,i)=>`<textarea id="st-th-${i}" rows="2" style="margin-bottom:6px">${esc(m)}</textarea>`).join('')}</div>
 <div class="card" style="margin-top:12px"><h2>الفود كوست والتنبيهات</h2><div class="fgrid" style="margin-top:8px"><div class="field"><label for="st-priceAlert">تنبيه زيادة السعر لو فوق %</label><input id="st-priceAlert" type="number" value="${st.priceAlert}"></div>
 <div class="field"><label for="st-ohMonthly">المصاريف العامة الشهرية للتوزيع ${ti('المرتبات والإيجار والكهربا والغاز والمنظفات في الشهر. لما المصروفات تتضاف في الدفعة 3 هتتحسب لوحدها')}</label><input id="st-ohMonthly" type="number" value="${st.ohMonthly||0}"></div><div class="field"><label for="st-ohUnits">الإنتاج الشهري (قطع موزونة)</label><input id="st-ohUnits" type="number" value="${st.ohUnits||1500}"></div><div class="field small muted" style="justify-content:flex-end">= ${fmt(ohPerUnit(),2)} ج للقطعة (وزن 1)</div></div></div>
 ${edit?`<button class="btn" style="margin-top:12px" data-a="savePrefs">حفظ الإعدادات</button>`:''}
 <div class="card" style="margin-top:16px"><h2>البراندات واللوجو</h2>${S.brands.map(b=>`<div class="card flat" style="margin-top:10px"><div class="row" style="align-items:flex-start">${b.logo?`<img src="${esc(b.logo)}" alt="" style="height:70px;border-radius:8px;background:#fff;padding:4px;border:1px solid var(--line)">`:''}<div class="fgrid" style="flex:1;min-width:220px"><div class="field"><label for="br-n-${b.id}">الاسم</label><input id="br-n-${b.id}" type="text" value="${esc(b.name)}"></div><div class="field"><label for="br-t-${b.id}">السلوجان</label><input id="br-t-${b.id}" type="text" value="${esc(b.tagline)}"></div><div class="field full"><label for="br-u-${b.id}">بيستخدم لـ</label><input id="br-u-${b.id}" type="text" value="${esc(b.use)}"></div><div class="field"><label for="br-ci-${b.id}">اللون الأساسي</label><input id="br-ci-${b.id}" type="color" value="${(b.c||{}).ink||'#7a5520'}"></div><div class="field"><label for="br-ca-${b.id}">اللون المميز</label><input id="br-ca-${b.id}" type="color" value="${(b.c||{}).acc||'#c9a46a'}"></div><div class="field full"><label for="br-l-${b.id}">تغيير اللوجو</label><input id="br-l-${b.id}" type="file" accept="image/*" data-chg="logoUp" data-v="${b.id}"></div></div></div><button class="btn sec sm" style="margin-top:8px" data-a="saveBrand" data-v="${b.id}">حفظ البراند</button></div>`).join('')}</div>
 ${me().owner?`<div class="card" style="margin-top:12px"><h2 class="sec-title">أرصدة الخزن الافتتاحية ${ti('الفلوس اللي كانت في كل خزنة يوم ما بدأت السيستم. بعد كده الرصيد بيتغير بالحركات بس')}</h2><div class="tbl-wrap" style="margin-top:8px"><table><tr><th>الخزنة</th><th class="n">الافتتاحي</th><th class="n">الرصيد الحالي</th></tr>${S.treasuries.map(t=>`<tr><td>${t.holder} — ${t.method}</td><td class="n"><input class="inp-sm" type="number" id="to-${t.id}" value="${t.opening}"></td><td class="n">${fmt(t.bal)}</td></tr>`).join('')}</table></div><button class="btn sec" style="margin-top:10px" data-a="saveOpenings">حفظ الأرصدة</button></div>`:''}`};
A.savePrefs=async()=>{const d=Object.assign({},S.settings);['name','sub','cr','tax','phones','address','invoiceNote','hoursText','leadText','confirmText'].forEach(k=>d[k]=val('st-'+k));['priceAlert','ohMonthly','ohUnits','leadDays'].forEach(k=>d[k]=num('st-'+k));d.welcome=(d.welcome||[]).map((m,i)=>val('st-w-'+i));d.thanks=(d.thanks||[]).map((m,i)=>val('st-th-'+i));
 await dbx(sb.from('settings').update({data:d,updated_at:new Date().toISOString()}).eq('id',1));await refresh();toast('اتحفظت الإعدادات')};
A.saveBrand=async el=>{const b=brand(el.dataset.v);await dbx(sb.from('brands').update({name:val('br-n-'+b.id),tagline:val('br-t-'+b.id),use_for:val('br-u-'+b.id),colors:Object.assign({},b.c,{ink:val('br-ci-'+b.id),acc:val('br-ca-'+b.id)})}).eq('id',b.id));await refresh();toast('اتحفظ البراند')};
A.logoUp=el=>{const f=el.files&&el.files[0];if(!f)return;toast('بيرفع اللوجو...');imgToData(f,700,d=>whiteToAlpha(d,async d2=>{const url=await uploadImage(dataToBlob(d2),'logos/'+el.dataset.v+'-'+Date.now()+'.png');await dbx(sb.from('brands').update({logo_url:url}).eq('id',el.dataset.v));await refresh();toast('اتغير اللوجو')}),true)};
A.saveOpenings=async()=>{for(const t of S.treasuries){const v=num('to-'+t.id);if(v!==t.opening)await rpc('set_treasury_opening',{p_id:t.id,p_amount:v})}await refresh();toast('اتحفظت الأرصدة')};

// ================= BOOT =================
(async function boot(){try{const t=lsGet('melt-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
 Object.assign(A,A_AUTH);if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 sb.auth.onAuthStateChange((ev,s)=>{if(ev==='PASSWORD_RECOVERY'){SESSION=s;authShell(`<h2>كلمة سر جديدة</h2><div class="field" style="text-align:right"><label for="np-p">كلمة السر (8 حروف على الأقل)</label><input id="np-p" type="password" style="direction:ltr"></div><button class="btn block" style="margin-top:12px" data-a="setNewPwd">حفظ</button>`)}});
 const {data}=await sb.auth.getSession();if(data.session)afterLogin(false);else showLogin()})();
A_AUTH.setNewPwd=async()=>{const p=val('np-p');if(p.length<8){toast('8 حروف على الأقل');return}const {error}=await sb.auth.updateUser({password:p});if(error){toast(error.message);return}toast('اتغيرت كلمة السر');afterLogin(true)};
A.setNewPwd=A_AUTH.setNewPwd;
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);const s=SCREENS.find(x=>x.id===h);if(s&&s.b===1&&h!==VIEW&&!LOCKED){VIEW=h;render()}});
