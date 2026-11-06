
// ---------- greetings render hook + season persistence ----------
const _greetV=V.greetings;V.greetings=()=>{setTimeout(()=>{try{drawCards()}catch(e){}},0);return _greetV()};
A.seasonSave=async()=>{readSeasons();await saveSettings({seasons:S.seasons});toast('اتحفظت المواسم واتحسب التنبؤ من جديد')};
A.seasonAdd=async()=>{readSeasons();S.seasons.push({id:uid('se'),name:'موسم جديد',months:[],pct:0});await saveSettings({seasons:S.seasons})};
A.seasonDel=async el=>{readSeasons();S.seasons=S.seasons.filter(s=>s.id!==el.dataset.v);await saveSettings({seasons:S.seasons})};
const _fcV=V.forecast;V.forecast=()=>{if(!S.months.length&&monthPL(curMonth()).frac<=0.5)return head('التنبؤ بالمبيعات والمصروفات')+emptyState('التنبؤ بيبدأ بعد أول شهر مقفول (أو بعد نص الشهر الحالي). كل ما الشهور تزيد التوقع بيبقى أدق.','<button class="btn sec" data-a="go" data-v="closing">الإقفال</button>');return _fcV()};
// occasions editing (dates of hijri occasions change yearly)
A.occEdit=()=>sheet(`<h2>تواريخ المناسبات</h2><p class="sub">التواريخ الهجرية بتتغير كل سنة، عدّلها هنا.</p>${S.occasions.map((o,i)=>`<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="text" id="oc-n-${i}" value="${esc(o.name)}" style="flex:1"><input type="date" id="oc-d-${i}" value="${o.date}" style="width:150px"></div>`).join('')}<button class="btn block" style="margin-top:12px" data-a="occSave">حفظ</button>`);
A.occSave=async()=>{const occ=S.occasions.map((o,i)=>Object.assign({},o,{name:val('oc-n-'+i),date:val('oc-d-'+i)}));closeSheet();await saveSettings({occasions:occ});toast('اتحفظت التواريخ')};
const _greetV2=V.greetings;V.greetings=()=>_greetV2().replace('<button class="btn" data-a="grCustom">+ مناسبة خاصة</button>','<button class="btn" data-a="grCustom">+ مناسبة خاصة</button><button class="btn sec" data-a="occEdit">تواريخ المناسبات</button>');

// ---------- settings card ----------
const _prefsV=V.prefs;
V.prefs=()=>{const st=S.settings;const g=st.geo;if(!me().owner)return _prefsV();
 const card=`<div class="card" style="margin-top:12px"><h2>الحضور والمرتبات والإقفال</h2><div class="fgrid" style="margin-top:8px">
 <div class="field full"><label>موقع المصنع ${ti('اقف جوه المصنع واضغط الزرار. الموظف مش هيقدر يسجل حضور غير لو جوه المسافة دي')}</label><div class="row"><button class="btn sec sm" data-a="setGeo">📍 حدد موقع المصنع من موبايلي</button><span class="small ${g?'up':'down'}">${g?'متحدد ('+(+g.lat).toFixed(5)+', '+(+g.lng).toFixed(5)+')':'لسه ما اتحددش'}</span>${g?`<a class="small" href="https://maps.google.com/?q=${g.lat},${g.lng}" target="_blank" rel="noopener">شوفه على الخريطة ↗</a>`:''}</div></div>
 <div class="field"><label for="s3-r">المسافة المسموحة (متر)</label><input id="s3-r" type="number" value="${g&&g.radius||st.radius||100}"></div><div class="field"><label for="s3-g">سماح التأخير (دقايق) ${ti('عدد الدقايق اللي ما بتتحسبش تأخير. 0 = أي تأخير بيتخصم')}</label><input id="s3-g" type="number" value="${st.graceMin||0}"></div>
 <div class="field"><label for="s3-oi">قيمة المخزون يوم بداية السيستم ${ti('بتستخدم كمخزون أول المدة لأول شهر يتقفل')}</label><input id="s3-oi" type="number" value="${st.openingInv||0}"></div><div class="field"><label for="s3-vm">مضاعفات التقييم (شهور)</label><input id="s3-vm" type="text" value="${(st.valMult||[24,36]).join('، ')}"></div>
 <div class="field full"><label for="s3-ec">بنود المصروفات</label><input id="s3-ec" type="text" value="${esc((st.expCats||[]).join('، '))}"></div><div class="field full"><label for="s3-fc">المصروفات الثابتة (بتتسأل عنها وقت الإقفال)</label><input id="s3-fc" type="text" value="${esc((st.fixedCats||[]).join('، '))}"></div>
 <div class="field"><label for="s3-cp">تنبيه تغيّر سحب العميل لو أكتر من %</label><input id="s3-cp" type="number" value="${st.changePct}"></div><div class="field"><label for="s3-im">أقصى أيام سكون قبل تنبيه «العميل وقف»</label><input id="s3-im" type="number" value="${st.idleMax}"></div></div>
 <button class="btn" style="margin-top:12px" data-a="saveS3">حفظ</button></div>`;
 return _prefsV().replace('<div class="card" style="margin-top:16px"><h2>البراندات واللوجو</h2>',card+'<div class="card" style="margin-top:16px"><h2>البراندات واللوجو</h2>')};
const splitList=s=>s.split(/[,،\n]/).map(x=>x.trim()).filter(Boolean);
A.saveS3=async()=>{const r=Math.max(20,num('s3-r'));const geo=S.settings.geo?Object.assign({},S.settings.geo,{radius:r}):null;
 await saveSettings({radius:r,geo,graceMin:num('s3-g'),openingInv:num('s3-oi'),valMult:splitList(val('s3-vm')).map(Number).filter(x=>x>0),expCats:splitList(val('s3-ec')),fixedCats:splitList(val('s3-fc')),changePct:num('s3-cp')||20,idleMax:num('s3-im')||10});toast('اتحفظ')};
A.setGeo=()=>{if(!navigator.geolocation){toast('الجهاز ده مفيهوش تحديد موقع');return}toast('بيحدد الموقع...');navigator.geolocation.getCurrentPosition(async p=>{const r=num('s3-r')||S.settings.radius||100;
 await saveSettings({geo:{lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),radius:r,acc:Math.round(p.coords.accuracy),at:new Date().toISOString()}});toast('اتحدد موقع المصنع (دقة '+Math.round(p.coords.accuracy)+' متر)')},e=>toast(e.code===1?'اسمح بتحديد الموقع من إعدادات المتصفح':'مش قادر يحدد الموقع، جرّب تاني'),{enableHighAccuracy:true,timeout:20000,maximumAge:0})};

// ---------- home: month profit + attention ----------
const _homeV=V.home;
V.home=()=>{if(!canSee('home')&&S.myStaff)return V.me();let html=_homeV();const extra=[];
 const pend=S.att.filter(a=>a.status==='pending').length;if(pend&&canSee('staff'))extra.push(['warn','حضور مستني اعتماد',pend+' يوم','staff','att']);
 const accr=S.accruals.filter(a=>a.amt-a.paid>0.5);if(accr.length&&canSee('expenses'))extra.push(['warn','مستحقات لسه ما اتدفعتش',accr.map(a=>a.cat).join('، '),'expenses']);
 const prev=addMonth(curMonth(),-1);if(me().owner&&!isClosed(prev)&&(S.orders.some(o=>outMonth(o)===prev)||S.expenses.some(e=>inMonth(e.d,prev))))extra.push(['bad','شهر '+mName(prev)+' لسه ما اتقفلش','اعتمد الجرد واقفل الشهر','closing']);
 const plan=S.partners.flatMap(p=>p.plan.filter(x=>!x.paid&&x.d<=daysAddISO(today(),7)).map(x=>p.name+' '+fmt(x.amt)));if(plan.length&&me().owner)extra.push(['warn','أقساط شركاء مستحقة',plan.join(' · '),'partners']);
 let box='';if(can('profit')){const m=monthPL(curMonth());box+=`<div class="grid3" style="margin-bottom:14px">${kpi('صافي ربح '+mName(curMonth())+' لحد النهارده',`<span class="${m.net>=0?'up':'down'}">${money(m.net)}</span>`,pct(m.net/(m.sales||1))+' من المبيعات · تقديري لحد الإقفال',{go:'closing'})}${kpi('المرتبات لحد النهارده',mv(m.payroll),'',{go:'staff'})}${kpi('المصروفات',mv(m.otherExp+m.dep),'شامل الإهلاك '+fmt(m.dep),{go:'expenses'})}</div>`}
 if(extra.length)box+=`<div class="card" style="margin-bottom:14px"><h2>محتاج انتباهك</h2>${extra.map(a=>`<div class="alert ${a[0]}" data-a="go" data-v="${a[3]}"${a[4]?` data-tab="${a[4]}"`:''} style="cursor:pointer;margin-top:8px"><span class="dot"></span><div><b>${esc(a[1])}</b><div class="small muted">${esc(a[2])}</div></div></div>`).join('')}</div>`;
 return box?html.replace('<div class="grid4"',box+'<div class="grid4"'):html};
const _loadAll3=loadAll;loadAll=async function(){await _loadAll3();S.closeLog=me()&&me().owner?await q('closing_log','*',{order:'at',asc:false,limit:100}):[]};
