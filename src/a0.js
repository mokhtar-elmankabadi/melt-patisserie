'use strict';
// ================= CONFIG =================
const SB_URL='https://puhpfyuvpmxzzigbssqv.supabase.co';
const SB_KEY='sb_publishable_HvzQOXqGOp11jgTTBBPb0w_1Tem0xqN';
const APP_VERSION='3.2.1 · الاستيراد والكيبورد';const APP_BATCH=3;
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
const unitLbl=u=>({g:'جم',ml:'مل',pc:'قطعة',m:'متر'}[u]||u);
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
function canSee(s){const u=me();if(u.owner||((u.perms||{}).screens||[]).includes(s))return true;return (s==='orders'&&!!S.myCourier)||(s==='me'&&!!S.myStaff)}

let _netErr=false;async function q(table,sel,opts){let r=sb.from(table).select(sel||'*');if(opts&&opts.order)r=r.order(opts.order,{ascending:opts.asc!==false});if(opts&&opts.limit)r=r.limit(opts.limit);const {data,error}=await r;if(error){if(/fetch|network|timeout|load failed/i.test(error.message))_netErr=true;if(/permission|policy|denied/i.test(error.message))return [];console.warn(table,error.message);return []}return data||[]}
async function loadAll(){
 const [users,settings,brands,treas,cash,sups,mats,costs,mprices,hist,alerts,purs,plines,spays,recs,rins,prods,pcomps,plog,
  custs,cours,ords,olines,pays,cust,fees,exps,rets,prodn,counts,mlog,
  staff,att,advs,sadj,ppay,parts,ptx,pplan,assets,amaint,accr,clos,closedM]=await Promise.all([
  q('app_users'),q('settings'),q('brands','*',{order:'sort'}),q('treasuries','*',{order:'sort'}),q('cash_movements','*',{order:'created_at',asc:false,limit:400}),
  q('suppliers','*',{order:'name'}),q('materials','*',{order:'name'}),q('material_costs'),q('material_prices'),q('price_history','*',{order:'d'}),q('price_alerts','*',{order:'d'}),
  q('purchases','*',{order:'no'}),q('purchase_lines'),q('supplier_payments','*',{order:'d'}),q('recipes','*',{order:'name'}),q('recipe_inputs','*',{order:'ord'}),
  q('products','*',{order:'name'}),q('product_comps','*',{order:'ord'}),q('price_log','*',{order:'d'}),
  q('customers','*',{order:'name'}),q('couriers','*',{order:'name'}),q('orders','*',{order:'created_at'}),q('order_lines','*',{order:'ord'}),q('payments','*',{order:'created_at'}),q('custody','*',{order:'created_at'}),
  q('courier_fees','*',{order:'created_at'}),q('expenses','*',{order:'created_at'}),q('returns','*',{order:'created_at'}),q('production','*',{order:'created_at',asc:false,limit:300}),q('stock_counts'),q('menu_log','*',{order:'d'}),
  q('staff','*',{order:'name'}),q('attendance','*',{order:'d',asc:false,limit:5000}),q('advances','*',{order:'d'}),q('staff_adjust'),q('payroll_payments','*',{order:'d'}),q('partners','*',{order:'created_at'}),q('partner_tx','*',{order:'created_at'}),q('partner_plan','*',{order:'d'}),q('assets','*',{order:'d'}),q('asset_maint','*',{order:'d'}),q('accruals','*',{order:'created_at'}),q('closings','*',{order:'month'}),
  sb.rpc('closed_months').then(r=>r.data||[],()=>[])]);
 const N=v=>v==null?0:+v;
 S.users=users.map(u=>({id:u.id,name:u.name,role:u.role,email:u.email,owner:u.is_owner,active:u.active,perms:u.perms||{}}));
 S.settings=Object.assign({priceAlert:3,ohMonthly:0,ohUnits:1500,leadDays:3,welcome:['','',''],thanks:['','','']},(settings[0]||{}).data||{});
 S.brands=brands.map(b=>({id:b.id,name:b.name,tagline:b.tagline||'',use:b.use_for||'',logo:b.logo_url||'',c:b.colors||{}}));
 if(!S.brands.length)S.brands=[{id:'melt',name:'MELT Patisserie',tagline:'',use:'',logo:'logo-melt.png',c:{}}];
 S.treasuries=treas.map(t=>({id:t.id,holder:t.holder,method:t.method,bal:N(t.balance),opening:N(t.opening)}));
 S.cashLog=cash.map(c=>({d:c.d,t:c.treasury_id,amt:N(c.amount),note:c.note,by:(S.users.find(u=>u.id===c.user_id)||{}).name||''}));
 S.suppliers=sups.map(s=>({id:s.id,name:s.name,phone:s.phone||'',terms:s.terms||'كاش',days:s.days||0,opening:N(s.opening_balance),info:s.info||{}}));
 const cm=Object.fromEntries(costs.map(c=>[c.material_id,c]));
 S.materials=mats.filter(m=>m.active!==false).map(m=>{const c=cm[m.id]||{};return {id:m.id,name:m.name,cat:m.cat,base:m.base,pu:m.pu,size:N(m.size)||1,pw:N(m.pw),units:Array.isArray(m.units)?m.units.filter(u=>u&&u.n&&+u.s>0).map(u=>({n:u.n,s:+u.s})):[],stock:N(m.stock),min:N(m.min_stock),avg:N(c.avg_cost),
  last:c.last_price!=null?{s:c.last_supplier,b:c.last_quality||'',p:N(c.last_price),d:c.last_date}:null,
  prices:mprices.filter(p=>p.material_id===m.id).map(p=>({id:p.id,s:p.supplier_id,b:p.quality||'',p:N(p.price)})),
  hist:hist.filter(h=>h.material_id===m.id).map(h=>({d:h.d,s:h.supplier_id,b:h.quality||'',p:N(h.price)}))}});
 S.priceAlerts=alerts.map(a=>({id:a.id,d:a.d,mid:a.material_id,s:a.supplier_id,old:N(a.old_price),nw:N(a.new_price),pct:N(a.pct),res:a.resolution||''}));
 S.purchases=purs.map(p=>({id:p.id,no:p.no,d:p.d,s:p.supplier_id,paid:N(p.paid),t:p.treasury_id,notes:p.notes||'',lines:plines.filter(l=>l.purchase_id===p.id).map(l=>({mid:l.material_id,q:N(l.qty),p:N(l.price),b:l.quality||''}))}));
 S.supPay=spays.map(p=>({id:p.id,d:p.d,s:p.supplier_id,amt:N(p.amount),t:p.treasury_id}));
 S.recipes=recs.map(r=>({id:r.id,name:r.name,out:r.out_unit,yield:N(r.yield),byproduct:r.byproduct,src:r.src_recipe,by:r.by_recipe?{id:r.by_recipe,q:N(r.by_qty)}:null,stock:N(r.stock),
  inputs:rins.filter(i=>i.recipe_id===r.id).map(i=>({k:i.kind,id:i.item_id,q:N(i.qty),u:i.unit||''}))}));
 S.products=prods.map(p=>({id:p.id,name:p.name,en:p.en||'',brand:p.brand,cat:p.cat,price:N(p.price),ppc:p.ppc||1,w:N(p.weight)||1,slices:p.slices,finish:p.finish||'',menu:p.menu||{},stock:N(p.stock),
  comps:pcomps.filter(c=>c.product_id===p.id&&!c.is_pack).map(c=>({k:c.kind,id:c.item_id,q:N(c.qty),u:c.unit||''})),
  pack:pcomps.filter(c=>c.product_id===p.id&&c.is_pack).map(c=>({k:'m',id:c.item_id,q:N(c.qty),perCarton:c.per_carton}))}));
 S.priceLog=plog.map(l=>({d:l.d,pid:l.product_id,old:N(l.old_price),nw:N(l.new_price),how:l.how||'',by:l.user_name||''}));
 S.customers=custs.map(c=>({id:c.id,opening:N(c.opening_balance),name:c.name,brand:c.brand,kind:c.kind,type:c.type||'',phone:c.phone||'',pay:c.pay,days:c.days||0,limit:N(c.credit_limit),disc:N(c.disc),special:c.special||{},info:c.info||{},active:c.active!==false}));
 S.couriers=cours.map(c=>({id:c.id,name:c.name,kind:c.kind,phone:c.phone||'',salary:N(c.salary),comm:N(c.comm),commOn:c.comm_on,perOrder:N(c.per_order),userId:c.user_id,active:c.active!==false}));
 S.orders=ords.map(o=>({id:o.id,outAt:o.out_at,brand:o.brand,no:o.no,inv:o.inv_no,cu:o.cu,date:o.d,due:o.due||'',status:o.status,courier:o.courier_id,fee:N(o.fee),feeOn:o.fee_on,discType:o.disc_type,discVal:N(o.disc_val),extras:o.extras||[],notes:o.notes||'',approvalReason:o.approval_reason||'',approvedBy:o.approved_by||'',
  sub:N(o.sub),custDisc:N(o.cust_disc),discAmt:N(o.disc_amt),odisc:N(o.odisc),extrasTotal:N(o.extras_total),feeCharged:N(o.fee_charged),total:N(o.total),cost:N(o.cost),stockOut:o.stock_out,
  lines:olines.filter(l=>l.order_id===o.id).map(l=>({pid:l.product_id,q:N(l.qty),price:N(l.price),cost:N(l.cost)}))}));
 S.payments=pays.map(p=>({id:p.id,d:p.d,cu:p.cu,order:p.order_id,amt:N(p.amount),t:p.treasury_id,courier:p.courier_id,by:(S.users.find(u=>u.id===p.user_id)||{}).name||''}));
 S.custody=cust.map(c=>({d:c.d,courier:c.courier_id,amt:N(c.amount),note:c.note||''}));
 S.fees=fees.map(f=>({courier:f.courier_id,order:f.order_id,amt:N(f.amount),settled:f.settled,d:f.d}));
 S.expenses=exps.map(e=>({id:e.id,d:e.d,cat:e.cat,amt:N(e.amount),t:e.treasury_id,courier:e.courier_id,note:e.note||'',acc:e.accrual_id,asset:e.asset_id,by:(S.users.find(u=>u.id===e.user_id)||{}).name||''}));
 S.returns=rets.map(r=>({id:r.id,d:r.d,cu:r.cu,order:r.order_id,pid:r.product_id,q:N(r.qty),kind:r.kind,reason:r.reason,value:N(r.value),cost:N(r.cost)}));
 S.production=prodn.map(x=>({id:x.id,d:x.d,k:x.kind,item:x.item_id,qty:N(x.qty),by:x.user_name||''}));
 S.counts=Object.fromEntries(counts.map(c=>[c.month,{status:c.status,items:c.items||{},value:N(c.value),loss:N(c.var_loss),gain:N(c.var_gain),by:c.approved_by,at:c.approved_at}]));
 S.menuLog=mlog.map(m=>({d:m.d,brand:m.brand,cu:m.cu,layout:m.layout}));
 S.myCourier=S.couriers.find(c=>c.userId&&c.userId===SESSION?.user?.id)||null;
 S.staff=staff.map(w=>({id:w.id,name:w.name,job:w.job||'',phone:w.phone||'',type:w.type,salary:N(w.salary),payMode:w.pay_mode,start:w.shift_start||'16:00',end:w.shift_end||'00:00',userId:w.user_id,courier:w.courier_id,since:w.start_date,active:w.active!==false}));
 S.att=att.map(a=>({id:a.id,w:a.staff_id,d:a.d,in:a.check_in,out:a.check_out,inDist:a.in_dist,outDist:a.out_dist,status:a.status,src:a.source,late:N(a.late_min),ot:N(a.ot_min),note:a.note||'',by:a.approved_by||''}));
 S.advances=advs.map(a=>({id:a.id,w:a.staff_id,d:a.d,amt:N(a.amount),t:a.treasury_id,mode:a.mode,inst:N(a.inst_amount),repaid:N(a.repaid),note:a.note||''}));
 S.adjust=sadj.map(a=>({id:a.id,w:a.staff_id,m:a.month,kind:a.kind,amt:N(a.amount),note:a.note||''}));
 S.payroll=ppay.map(x=>({id:x.id,w:x.staff_id,d:x.d,m:x.month,from:x.period_from,to:x.period_to,gross:N(x.gross),adv:N(x.adv_ded),net:N(x.net),t:x.treasury_id,details:x.details||{},note:x.note||''}));
 S.partners=parts.map(p=>({id:p.id,name:p.name,phone:p.phone||'',kind:p.kind,share:N(p.share),method:p.method,rate:N(p.rate),capital:N(p.capital),start:p.start_d,end:p.end_d,exited:p.exited,acct:ptx.filter(t=>t.partner_id===p.id).map(t=>({id:t.id,d:t.d,type:t.type,amt:N(t.amount),note:t.note||'',t:t.treasury_id,m:t.month})),plan:pplan.filter(x=>x.partner_id===p.id).map(x=>({d:x.d,amt:N(x.amount),paid:x.paid}))}));
 S.assets=assets.map(a=>({id:a.id,name:a.name,cost:N(a.cost),date:a.d,life:a.life_months||60,salvage:N(a.salvage),partner:a.partner_id,disposed:a.disposed_at,note:a.note||'',maint:amaint.filter(m=>m.asset_id===a.id).map(m=>({d:m.d,cost:N(m.cost),note:m.note||''}))}));
 S.accruals=accr.map(a=>({id:a.id,m:a.month,cat:a.cat,amt:N(a.amount),paid:N(a.paid),note:a.note||''}));
 S.closings=Object.fromEntries(clos.map(c=>[c.month,{status:c.status,pl:c.pl||{},reserve:N(c.reserve),dist:c.dist||[],by:c.closed_by,at:c.closed_at}]));
 S.closedM=closedM||[];
 S.months=clos.filter(c=>c.status==='closed'&&/^\d{4}-\d{2}$/.test(c.month)&&c.pl&&c.pl.sales!=null).map(c=>Object.assign({k:c.month},c.pl));
 S.myStaff=S.staff.find(w=>w.userId&&w.userId===SESSION?.user?.id)||null;
 S.ready=true;recalc();
}
// DB helpers
async function dbx(promise,okMsg){if(S.offline||!navigator.onLine){toast('مفيش نت دلوقتي، التسجيل هيشتغل أول ما النت يرجع');throw new Error('offline')}const {data,error}=await promise;if(error){toast('حصلت مشكلة: '+error.message);throw error}if(okMsg)toast(okMsg);return data}
async function rpc(fn,args,okMsg){return dbx(sb.rpc(fn,args),okMsg)}
let _reloadT=null;async function refresh(){await loadAll();render()}
function scheduleRefresh(){clearTimeout(_reloadT);_reloadT=setTimeout(()=>{const ae=document.activeElement;if(ae&&ae.closest&&ae.closest('#view')&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)){scheduleRefresh();return}if(S.ready&&!LOCKED)refresh()},600)}
function subscribeRealtime(){const ch=sb.channel('melt-all');['settings','brands','treasuries','cash_movements','suppliers','materials','material_costs','material_prices','price_alerts','purchases','supplier_payments','recipes','recipe_inputs','products','product_comps','price_log','app_users','customers','couriers','orders','order_lines','payments','custody','courier_fees','expenses','returns','production','stock_counts','staff','attendance','advances','staff_adjust','payroll_payments','partners','partner_tx','partner_plan','assets','asset_maint','accruals','closings'].forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},scheduleRefresh));ch.subscribe()}
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
async function afterLogin(fresh){const {data}=await sb.auth.getSession();SESSION=data.session;if(!SESSION){const off=await offlineSession();if(!off){showLogin();return}SESSION=off}
 document.getElementById('app').innerHTML='<div class="loading">بيحمّل البيانات...</div>';
 await loadAll();const u=me();
 if(!u.id){authShell(`<h2>حسابك لسه مش مفعّل</h2><p class="muted">اطلب من المالك يضيفك من «المستخدمين والصلاحيات».</p><button class="btn sec" data-a="logout">خروج</button>`);return}
 if(!u.active){authShell(`<h2>الحساب ده متوقف</h2><p class="muted">كلّم المالك.</p><button class="btn sec" data-a="logout">خروج</button>`);return}
 subscribeRealtime();
 if(fresh&&!lsGet(PIN_KEY())){showPinSetup();return}
 if(!fresh&&lsGet(PIN_KEY())){showLock();return}
 startApp()}
function startApp(){LOCKED=false;const h=(location.hash||'').slice(1);if(SCREENS.some(s=>s.id===h&&s.b<=APP_BATCH))VIEW=h;if(!canSee(VIEW)&&S.myCourier)VIEW='orders';else if(!canSee(VIEW)&&S.myStaff)VIEW='me';render();armIdle()}
function pinPad(title,sub,act,extra){PIN_BUF='';authShell(`<h2 style="margin:6px 0 2px">${title}</h2><p class="small muted">${sub}</p><div class="pin-dots" id="pdots">${'<i></i>'.repeat(6)}</div>
 <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-a="pinKey" data-v="${n}">${n}</button>`).join('')}<button data-a="pinKey" data-v="del" aria-label="مسح">⌫</button><button data-a="pinKey" data-v="0">0</button><button data-a="pinKey" data-v="ok" data-next="${act}" aria-label="تأكيد">✓</button></div>${extra||''}<p class="small muted kb-hint" style="margin-top:10px">⌨️ على الكمبيوتر تقدر تكتب الرمز بالكيبورد وتدوس Enter</p>`)}
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
