/* دروسي – منطق التطبيق: الحسابات، المحتوى، الواجهات، لوحة الإدارة */
/* ---------- config ---------- */
const FIREBASE_CONFIG={apiKey:"AIzaSyCB7sxDa-QwEiOOL-4SyOBYLRuRHJzzkdU",authDomain:"durusi-8ad89.firebaseapp.com",projectId:"durusi-8ad89",storageBucket:"durusi-8ad89.firebasestorage.app",messagingSenderId:"248966453604",appId:"1:248966453604:web:0257f1985a16c3ad2dc271"};
const ADMIN_EMAIL='aboabd366@gmail.com'.trim().toLowerCase();
const SITE_URL='https://hameed366.github.io/durusi/';
const SITE=SITE_URL;
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const siteLink=f=>(NATIVE?SITE:'')+f;
const CONFIGURED=!!(FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey);
const GRADES=[6,7,8,9,10,11,12];
let installEvt=null;

/* ---------- state ---------- */
let AUTH='loading',ME=null,auth=null,db=null,unsubMe=null,unsubGrade={},PENDING=null;
const CONTENT={},URLS={},URLS_LOADED={};
let ADM={tab:'students',users:null,codes:null,progress:null,q:'',busy:false,codeFilter:'unused'};
function localSkin(){try{return localStorage.getItem('durusi_skin')||'emerald'}catch(e){return 'emerald'}}
function blankS(){return {grade:10,done:{},marks:{},last:null,schedule:[],skin:localSkin()}}
let S=blankS();
const LKEY=()=>'durusi_u_'+(ME?ME.uid:'anon');
let syncT=null;
const serverTs=()=>firebase.firestore.FieldValue.serverTimestamp();
function save(){
 try{localStorage.setItem(LKEY(),JSON.stringify(S));localStorage.setItem('durusi_skin',S.skin||'emerald')}catch(e){}
 if(db&&ME){clearTimeout(syncT);syncT=setTimeout(()=>{db.collection('progress').doc(ME.uid).set({done:S.done,marks:S.marks,last:S.last||null,schedule:S.schedule,skin:S.skin||'emerald',grade:S.grade,updatedAt:serverTs()}).catch(()=>{})},1200)}
}
let V={view:'home',subj:null,sem:1,open:null,lesson:null,quiz:null,confirm:null,authMode:'login'};

/* ---------- roles ---------- */
const isAdmin=()=>!!ME&&!!ADMIN_EMAIL&&ME.email===ADMIN_EMAIL&&ME.verified;
const isAdminEmail=()=>!!ME&&!!ADMIN_EMAIL&&ME.email===ADMIN_EMAIL;
const isTeacher=()=>!!ME&&ME.role==='teacher';
const isStaff=()=>isAdmin()||isTeacher();
const subjectsFor=g=>g<=9?['islamic','arabic','english','quran','math','sci','social','computer']:['islamic','arabic','english','quran','computer','bio','phys','chem','math'];
const ckeyG=(g,sid)=>`g${g}_${sid}`;
const ckey=sid=>ckeyG(S.grade,sid);
const parseCk=ck=>{const m=/^g(\d+)_(\w+)$/.exec(ck)||[];return{g:+m[1],sid:m[2]}};
const ckName=ck=>{const p=parseCk(ck);return `${(SUBJ[p.sid]||{name:p.sid}).name} ${p.g}`};
const canEdit=sid=>isAdmin()||(isTeacher()&&(ME.subjects||[]).includes(ckey(sid)));
const toDate=t=>t&&t.toDate?t.toDate():(t instanceof Date?t:null);
function accessOf(u){if(!u||!u.active)return 'off';const d=toDate(u.activeUntil);if(d&&d<new Date())return 'exp';return 'on'}
const hasAccess=(g=S.grade)=>isStaff()||(accessOf(ME)==='on'&&(!ME.accessGrade||ME.accessGrade===g));
const unitLocked=u=>!u.free&&!hasAccess();
const roleName=()=>isAdmin()?'مدير المنصة':isTeacher()?'معلم':'طالب';
const fmtDate=d=>d?d.toLocaleDateString('ar-KW-u-nu-latn',{year:'numeric',month:'long',day:'numeric'}):'';
const stPill=st=>({on:'<span class="st on">مشترك</span>',off:'<span class="st off">غير مشترك</span>',exp:'<span class="st exp">انتهى الاشتراك</span>'}[st]);
function statusTag(){if(isAdminEmail()&&!ME.verified)return '<span class="st off">مدير · بانتظار التحقق</span>';if(isAdmin())return '<span class="st role">مدير المنصة</span>';if(isTeacher())return '<span class="st role">معلم</span>';return stPill(accessOf(ME))}
function errMsg(e){const c=(e&&e.code)||'';return({
 'auth/invalid-email':'الإيميل غير صحيح','auth/user-not-found':'الإيميل أو كلمة المرور غير صحيحة','auth/wrong-password':'الإيميل أو كلمة المرور غير صحيحة',
 'auth/invalid-credential':'الإيميل أو كلمة المرور غير صحيحة','auth/invalid-login-credentials':'الإيميل أو كلمة المرور غير صحيحة',
 'auth/email-already-in-use':'هذا الإيميل مسجّل مسبقًا','auth/weak-password':'كلمة المرور قصيرة، 6 أحرف على الأقل',
 'auth/network-request-failed':'تحقّق من اتصال الإنترنت','auth/too-many-requests':'محاولات كثيرة، انتظر قليلًا ثم حاول',
 'auth/missing-email':'اكتب الإيميل أولًا','permission-denied':'ليست لديك صلاحية لهذا الإجراء','unavailable':'تحقّق من اتصال الإنترنت',
 'auth/unauthorized-domain':'رابط الموقع غير مضاف في Firebase (Authorized domains)'}[c])||('حدث خطأ، حاول مرة أخرى'+(c?` (${c})`:''))}

/* ---------- content ---------- */
function defaultContent(sid){
 const T=TOPICS[sid]||[['الوحدة الأولى','الوحدة الثانية'],['الوحدة الثالثة','الوحدة الرابعة']];
 const out={1:[],2:[]};
 [1,2].forEach(sem=>{
  const u=out[sem]; let n=0;
  const addU=(title,lessons,free)=>{u.push({id:`${sid}-s${sem}-u${n}`,title,free:!!free,lessons:lessons.map((l,j)=>({id:`${sid}-s${sem}-u${n}-l${j}`,title:l[0],type:l[1],dur:l[2],url:''}))});n++};
  if(sem===1){addU('التجربة المجانية',[['شرح تجريبي مجاني','video','12 د']],true);addU('مراجعة القصير',[['مراجعة شاملة للاختبار القصير','video','40 د'],['ملخص شرح القصير','pdf','8 صفحات'],['نموذج اختبار قصير','quiz','10 أسئلة']]);addU('مقدمة المادة',[['تعرّف على المنهج وطريقة الدراسة','video','8 د']])}
  else addU('مقدمة الفصل الثاني',[['خطة الفصل الثاني','video','7 د']]);
  T[sem-1].forEach(t=>addU(t,[[`شرح ${t} – الجزء الأول`,'video','25 د'],[`شرح ${t} – الجزء الثاني`,'video','22 د'],[`حل تمارين ${t}`,'video','30 د'],[`ملخص ${t}`,'pdf','6 صفحات'],[`اختبار قصير: ${t}`,'quiz','10 أسئلة']]));
  if(sem===2)addU('مراجعة نهائية',[['مراجعة ليلة الاختبار','video','45 د'],['مذكرة المراجعة النهائية','pdf','20 صفحة']]);
 });
 return out;
}
function contentG(g,sid){const ck=ckeyG(g,sid),d=CONTENT[ck];const C=d&&d.s1?{1:JSON.parse(JSON.stringify(d.s1)),2:JSON.parse(JSON.stringify(d.s2||[]))}:isStaff()?Object.assign(defaultContent(sid),{tpl:true}):{1:[],2:[]};
 const U=URLS[ck];if(U)[1,2].forEach(s=>C[s].forEach(u=>u.lessons.forEach(l=>{if(!l.url&&U[l.id])l.url=U[l.id]})));return C}
const content=sid=>contentG(S.grade,sid);
const editable=sid=>{const C=content(sid);delete C.tpl;return C};
async function commit(sid,C){
 const ck=ckey(sid),urls={};
 const strip=units=>units.map(u=>({id:u.id,title:u.title,free:!!u.free,lessons:u.lessons.map(l=>{if(l.url)urls[l.id]=l.url;return{id:l.id,title:l.title||'',type:l.type||'video',dur:l.dur||'',url:u.free?(l.url||''):''}})}));
 const pub={grade:S.grade,sid,s1:strip(C[1]),s2:strip(C[2]),updatedBy:ME.name||ME.email};
 CONTENT[ck]=Object.assign({},CONTENT[ck],pub);URLS[ck]=urls;URLS_LOADED[ck]=1;render();
 try{const ref=db.collection('content').doc(ck),b=db.batch();b.set(ref,Object.assign({},pub,{updatedAt:serverTs()}),{merge:true});b.set(ref.collection('secure').doc('urls'),{urls});await b.commit()}
 catch(e){toast(errMsg(e))}
}
const isDone=id=>!!S.done[S.grade+'|'+id];
const teacherOf=sid=>Object.assign({name:'',qual:''},(CONTENT[ckey(sid)]||{}).teacher||{});
function stats(sid,sem){let a=0,d=0;const C=content(sid);(sem?[sem]:[1,2]).forEach(s=>C[s].forEach(u=>u.lessons.forEach(l=>{a++;if(isDone(l.id))d++})));return {a,d,p:a?Math.round(d/a*100):0}}
function findLesson(sid,id){const C=content(sid);for(const s of [1,2])for(const u of C[s]){const i=u.lessons.findIndex(l=>l.id===id);if(i>-1)return{sem:s,unit:u,lesson:u.lessons[i],idx:i}}return null}
function watchGrade(g){if(!db||unsubGrade[g])return;unsubGrade[g]=db.collection('content').where('grade','==',g).onSnapshot(qs=>{qs.docChanges().forEach(ch=>{if(ch.type==='removed')delete CONTENT[ch.doc.id];else CONTENT[ch.doc.id]=ch.doc.data()});softRender()},()=>{})}
async function loadUrls(sid){const ck=ckey(sid);if(!db||URLS_LOADED[ck]||!hasAccess())return;URLS_LOADED[ck]=1;
 try{const d=await db.collection('content').doc(ck).collection('secure').doc('urls').get();URLS[ck]=(d.exists&&d.data().urls)||{};if(V.view==='subject'||V.view==='lesson')softRender()}catch(e){URLS_LOADED[ck]=0}}

function embedOf(u){try{const x=new URL(u);const h=x.hostname.replace(/^(www|m)\./,'');let id=null;
 if(h==='youtu.be')id=x.pathname.slice(1).split('/')[0];
 else if(h.endsWith('youtube.com')||h.endsWith('youtube-nocookie.com')){id=x.searchParams.get('v');if(!id){const m=x.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{6,})/);if(m)id=m[2]}}
 if(id)return{k:'yt',id,src:`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`};
 if(h.endsWith('vimeo.com')){const m=x.pathname.match(/(\d{6,})/);if(m)return{k:'vm',src:`https://player.vimeo.com/video/${m[1]}?playsinline=1`}}
 if(h==='drive.google.com'){const m=x.pathname.match(/\/d\/([\w-]+)/)||[0,x.searchParams.get('id')];if(m[1])return{k:'drive',src:`https://drive.google.com/file/d/${m[1]}/preview`}}
 if(/\.(mp4|webm|mov)$/i.test(x.pathname))return{k:'file',src:u};
}catch(e){}return null}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ring=(p,c)=>{const r=24,C=2*Math.PI*r;return `<div class="ring"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="7"/><circle cx="30" cy="30" r="${r}" fill="none" style="stroke:${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C*p/100} ${C}"/></svg><span>${p}%</span></div>`};
const typeIcon={video:'chevL',pdf:'file',quiz:'quiz'};
const typeName={video:'فيديو',pdf:'ملف PDF',quiz:'اختبار'};
const initial=n=>esc((n||'').trim().replace(/^أ\.\s*/,'')[0]||'ط');

/* ---------- auth views ---------- */
function vAuth(){
 if(AUTH==='loading')return `<div class="spin" role="status" aria-label="جارٍ التحميل"></div>`;
 const head=`<img class="logo" src="icon-192.png" alt=""><h1>دروسي</h1><p class="muted" style="margin:0">شروحات ومذكرات واختبارات لكل صف</p>`;
 if(AUTH==='setup')return `<div class="auth">${head}<div class="card">المنصة غير مربوطة بقاعدة البيانات بعد. أضف إعدادات Firebase في ملف index.html.</div></div>`;
 if(AUTH==='neterr')return `<div class="auth">${head}<div class="card">تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة.<div style="margin-top:12px"><button class="btn primary" data-act="reload">إعادة المحاولة</button></div></div></div>`;
 const m=V.authMode;
 return `<div class="auth">${head}
 <div class="tabs" role="tablist" style="margin-top:6px"><button role="tab" aria-selected="${m==='login'}" data-act="amode" data-v="login">تسجيل الدخول</button><button role="tab" aria-selected="${m==='signup'}" data-act="amode" data-v="signup">حساب جديد</button></div>
 ${m==='login'?`<form id="loginF" class="card"><label for="le" style="margin-top:0">الإيميل</label><input id="le" type="email" dir="ltr" autocomplete="email" required>
 <label for="lp">كلمة المرور</label><input id="lp" type="password" dir="ltr" autocomplete="current-password" required>
 <p id="aerr" class="err" hidden></p><button class="btn primary" style="width:100%;margin-top:16px">دخول</button>
 <button type="button" class="linkbtn" data-act="forgot">نسيت كلمة المرور؟</button></form>`
 :`<form id="signF" class="card"><label for="sn2" style="margin-top:0">الاسم</label><input id="sn2" autocomplete="name" required>
 <label for="se">الإيميل</label><input id="se" type="email" dir="ltr" autocomplete="email" required>
 <label for="sp">كلمة المرور (6 أحرف على الأقل)</label><input id="sp" type="password" dir="ltr" autocomplete="new-password" minlength="6" required>
 <label for="sg">الصف</label><select id="sg">${GRADES.map(g=>`<option value="${g}" ${g===10?'selected':''}>الصف ${g}</option>`).join('')}</select>
 <p id="aerr" class="err" hidden></p><button class="btn primary" style="width:100%;margin-top:16px">إنشاء الحساب</button></form>`}
 </div>`;
}

/* ---------- views ---------- */
function contBanner(){
 const L=S.last; if(!L||L.grade!==S.grade||!SUBJ[L.subj])return '';
 const f=findLesson(L.subj,L.id); if(!f)return '';
 const st=stats(L.subj);
 return `<button class="cont" data-act="lesson" data-s="${L.subj}" data-id="${L.id}"><div class="disc" style="--p:${Math.max(st.p,6)}%"><span>${play}</span></div><div class="t"><b>اكمل الدراسة</b><small>${esc(SUBJ[L.subj].name)} · ${esc(f.lesson.title)}</small></div>${ic('chevL')}</button>`;
}
function notices(){
 let h='';
 if(isAdminEmail()&&!ME.verified)h+=`<div class="cta">${ic('shield')}<div class="t"><b>فعّل صلاحيات المدير</b><div class="muted" style="font-size:14px">أكّد بريدك الإلكتروني من الرابط اللي وصلك، ثم اضغط «تحققت»</div></div><div style="display:grid;gap:6px"><button class="btn primary" data-act="checkVerify">تحققت</button><button class="btn" data-act="sendVerify">إرسال الرابط</button></div></div>`;
 if(!isStaff()&&!isAdminEmail()&&!hasAccess()){const st=accessOf(ME);
  h+=`<div class="cta">${ic('lock')}<div class="t"><b>${st==='exp'?'انتهى اشتراكك':st==='on'?'اشتراكك لصف آخر':'فعّل اشتراكك'}</b><div class="muted" style="font-size:14px">التجربة المجانية متاحة. لفتح كل الدروس أدخل كود التفعيل</div></div><button class="btn primary" data-act="redeem">${ic('key')} الكود</button></div>`}
 return h;
}
function vHome(){
 const subs=subjectsFor(S.grade);
 return `<div class="hello"><div class="avatar">${initial(ME.name)}</div><div class="who"><h1>أهلاً${ME.name?'، '+esc(ME.name):' بك'}</h1><div class="muted" style="font-weight:700">${isStaff()?'تعرض مواد الصف ':'الصف '}${S.grade}</div><div>${statusTag()}</div></div>
 <button class="iconbtn" data-act="skins" aria-label="ألوان المنصة">${ic('palette')}</button><button class="iconbtn" data-act="toast" data-m="لا توجد إشعارات جديدة" aria-label="الإشعارات">${ic('bell')}</button></div>
 ${notices()}${contBanner()}
 <div class="sec-head"><h2>المواد الدراسية</h2><button class="pill-btn" data-act="grade">${isStaff()?'اختر الصف':'صفي'}</button></div>
 <div class="grid">${subs.map(sid=>{const s=SUBJ[sid],st=stats(sid);
  const badge=isStaff()?(canEdit(sid)?`<span class="badge">مادتك <i>${ic('edit')}</i></span>`:`<span class="badge lock">عرض</span>`):hasAccess()?`<span class="badge">مشترك <i>${ic('check')}</i></span>`:`<span class="badge lock">مقفل <i>${ic('lock')}</i></span>`;
  return `<button class="scard" style="--c:${s.c}" data-act="subj" data-s="${sid}">
  <div class="top"><div class="sicon">${ic(s.icon)}</div>${badge}</div>
  <div><h3>${s.name}</h3><div class="bar"><span style="width:${st.p}%"></span></div><small>${st.a?`${st.d} من ${st.a} درس`:(isStaff()?'لم يُنشر محتوى بعد':'المحتوى قريبًا')}</small></div>
  <div class="sphere">${ic(s.icon)}</div></button>`}).join('')}</div>`;
}
function vSubjects(){
 return `<h1 style="font-size:24px">المواد</h1><p class="muted" style="margin:4px 0 16px">التقدّم في مواد الصف ${S.grade}</p>`+
 subjectsFor(S.grade).map(sid=>{const s=SUBJ[sid],st=stats(sid);return `<button class="item" style="--c:${s.c}" data-act="subj" data-s="${sid}"><div class="sicon" style="--c:${s.c}">${ic(s.icon)}</div><div class="t"><b>${s.name}</b><small>${teacherOf(sid).name?esc(teacherOf(sid).name)+' · ':''}${st.a?`${st.d}/${st.a} درس`:'المحتوى قريبًا'}</small><div class="pbar"><span style="width:${st.p}%"></span></div></div>${ic('chevL')}</button>`}).join('');
}
function vSubject(){
 const sid=V.subj,s=SUBJ[sid],T=teacherOf(sid),C=content(sid)[V.sem],E=canEdit(sid);
 loadUrls(sid);
 const back=`<button class="iconbtn" data-act="back" aria-label="رجوع" style="height:auto;min-height:60px">${ic('chevR')}</button>`;
 const cb=contBanner();
 return `<div class="topbar">${back}${cb||`<div style="flex:1;align-self:center;font:800 18px var(--display)">${s.name}</div>`}</div>
 <section class="hero" style="--c:${s.c}"><div class="sphere">${ic(s.icon)}</div>
  <div class="h"><h1>${s.name}</h1><span class="muted" style="font-weight:800;font-family:var(--display)">الصف ${S.grade}</span></div>
  <p>${s.d}</p>
  ${T.name?`<div class="teacher"><div class="tav">${initial(T.name)}</div><div class="t"><b>${esc(T.name)}</b>${T.qual?`<small>المؤهل العلمي:</small><small>${esc(T.qual)}</small>`:''}</div>
  ${E?`<button class="iconbtn" data-act="editT" aria-label="تعديل بيانات المعلم">${ic('edit')}</button>`:`<button class="iconbtn" data-act="tinfo" aria-label="عن المعلم">${ic('info')}</button>`}</div>`:E?`<div class="teacher"><div class="tav">؟</div><div class="t"><b>لم تُضَف بيانات المعلم</b><small>اضغط زر التعديل لإضافة الاسم والمؤهل</small></div><button class="iconbtn" data-act="editT" aria-label="إضافة بيانات المعلم">${ic('edit')}</button></div>`:''}
 </section>
 <div class="tabs" role="tablist"><button role="tab" aria-selected="${V.sem===1}" data-act="sem" data-v="1">الفصل الأول</button><button role="tab" aria-selected="${V.sem===2}" data-act="sem" data-v="2">الفصل الثاني</button></div>
 <div class="quick"><button data-act="notes"><span class="q">${ic('notes')}</span>مذكرات شاملة</button><button data-act="quiz"><span class="q">${ic('bubble')}</span>حافظ وفاهم؟</button><button data-act="marks"><span class="q">${ic('mark')}</span>مرجعك</button></div>
 <div class="sec-head"><h2>محتويات المادة</h2>${E?`<button class="pill-btn" data-act="addU">+ وحدة</button>`:''}</div>
 ${content(sid).tpl?`<div class="cta">${ic('info')}<div class="t"><b>قالب مقترح غير منشور</b><div class="muted" style="font-size:14px">${E?'الطلاب يرون هذه المادة فارغة. عدّل القالب أو انشره كما هو، أو احذف ما لا تحتاجه.':'هذه الوحدات اقتراح فقط ولا تظهر للطلاب حتى ينشرها معلم المادة أو المدير.'}</div></div>${E?`<button class="btn primary" data-act="pubTpl">نشر</button>`:''}</div>`:''}
 ${C.length?C.map(u=>{const a=u.lessons.length,d=u.lessons.filter(l=>isDone(l.id)).length,p=a?Math.round(d/a*100):0,open=V.open===u.id,lk=unitLocked(u);
  return `<div class="unit ${open?'open':''}"><button class="uhead" data-act="unit" data-id="${u.id}" aria-expanded="${open}">${ic('chevD','i chev')}<div class="t"><b>${esc(u.title)}</b><small>${a} دروس ${u.free?'<span class="st on">مجاني</span>':lk?`<span class="st off">${ic('lock','i sm')} للمشتركين</span>`:''}</small></div>${ring(p,open?'#fff':'var(--accent)')}</button>
  ${open?`<div class="lessons">${u.lessons.map(l=>`<button class="lesson" data-act="lesson" data-s="${sid}" data-id="${l.id}"><span class="lt">${l.type==='video'?'<svg viewBox="0 0 24 24" style="fill:#fff;width:16px;height:16px"><path d="M8 5v14l11-7z"/></svg>':ic(typeIcon[l.type])}</span><span class="t">${esc(l.title)}<br><small>${typeName[l.type]} · ${esc(l.dur)}</small></span>${lk?`<span class="done">${ic('lock','i sm')}</span>`:`<span class="done ${isDone(l.id)?'on':''}">${isDone(l.id)?ic('check'):''}</span>`}</button>`).join('')||'<div class="muted" style="padding:6px">لا توجد دروس بعد</div>'}</div>
  ${E?`<div class="tools"><button class="ghost" data-act="addL" data-u="${u.id}">+ درس</button><button class="ghost" data-act="renU" data-u="${u.id}">إعادة تسمية</button><button class="ghost" data-act="freeU" data-u="${u.id}">${u.free?'جعلها للمشتركين':'جعلها مجانية'}</button><button class="ghost danger" data-act="delU" data-u="${u.id}">${V.confirm==='u'+u.id?'اضغط للتأكيد':'حذف الوحدة'}</button></div>`:''}`:''}</div>`}).join(''):`<div class="empty">${E?'لا توجد وحدات في هذا الفصل – أضف وحدة من الزر أعلاه':'لم يُضف محتوى لهذا الفصل بعد. سيظهر هنا فور نشره.'}</div>`}`;
}
function lessonActs(){const done=isDone(V.lesson),mk=!!S.marks[S.grade+'|'+V.lesson];return `<button class="btn ${done?'okb':'primary'}" data-act="done">${ic('check')} ${done?'تم الإنهاء':'تحديد كمكتمل'}</button><button class="btn" data-act="mark">${ic('mark')} ${mk?'محفوظ في مرجعك':'حفظ في مرجعك'}</button>`}
function vLesson(){
 const sid=V.subj,s=SUBJ[sid],f=findLesson(sid,V.lesson); if(!f){V.view='subject';return vSubject()}
 loadUrls(sid);
 const l=f.lesson,u=f.unit,E=canEdit(sid),lk=unitLocked(u);
 const prev=u.lessons[f.idx-1],next=u.lessons[f.idx+1];
 let media,pcls='player',ylink='';const em=(!lk&&l.url)?embedOf(l.url):null;
 if(lk)media=`<div><div class="pb">${ic('lock')}</div><b>هذا الدرس للمشتركين</b><div class="muted" style="font-size:13px;margin:4px 0 12px">أدخل كود التفعيل لفتح كل الدروس</div><button class="btn primary" data-act="redeem">${ic('key')} تفعيل الاشتراك</button></div>`;
 else if(em&&l.type!=='quiz'){pcls='player embed';if(em.k==='yt'&&NATIVE)em.src=SITE+'player.html?v='+encodeURIComponent(em.id);ylink=em.k==='yt'?`<a class="ylink" href="https://www.youtube.com/watch?v=${esc(em.id)}" target="_blank" rel="noopener">لا يعمل الفيديو؟ افتحه في يوتيوب</a>`:'';media=em.k==='file'?`<video src="${esc(em.src)}" controls playsinline preload="metadata"></video>`:`<iframe src="${esc(em.src)}" title="${esc(l.title)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`}
 else if(l.type==='quiz')media=`<div><div class="pb">${ic('quiz')}</div><b>${esc(l.title)}</b><div style="margin-top:12px"><button class="btn primary" data-act="quiz">ابدأ الاختبار</button></div></div>`;
 else if(l.url)media=`<div><div class="pb">${l.type==='pdf'?ic('file'):play}</div><a class="btn primary" href="${esc(l.url)}" target="_blank" rel="noopener">${l.type==='pdf'?'فتح الملف':'تشغيل الفيديو'} ${ic('link')}</a><div class="muted" style="font-size:13px;margin-top:8px">يفتح في نافذة جديدة</div></div>`;
 else media=`<div><div class="pb">${l.type==='pdf'?ic('file'):play}</div><b>${l.type==='pdf'?'الملف':'الفيديو'} قيد الإضافة</b><div class="muted" style="font-size:13px">${E?'أضف الرابط من زر التعديل بالأسفل':'سيضيفه المعلم قريبًا'}</div></div>`;
 return `<div class="topbar"><button class="iconbtn" data-act="toSubj" aria-label="رجوع">${ic('chevR')}</button><div style="flex:1;min-width:0;align-self:center"><div class="muted" style="font-size:13px">${s.name} · ${esc(u.title)}</div><h1 style="font-size:20px">${esc(l.title)}</h1></div></div>
 <div class="${pcls}" style="--c:${s.c}">${media}</div>${ylink}
 ${lk?'':`<div class="actions" id="lact">${lessonActs()}</div>`}
 <div class="card"><div class="row" style="justify-content:space-between"><span class="muted">النوع</span><b>${typeName[l.type]}</b></div><div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">المدة / الحجم</span><b>${esc(l.dur)}</b></div>${teacherOf(sid).name?`<div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">المعلم</span><b>${esc(teacherOf(sid).name)}</b></div>`:''}</div>
 ${E?`<div class="actions"><button class="btn" data-act="editL">${ic('edit')} تعديل الدرس</button><button class="btn" data-act="delL" style="color:#fecaca">${ic('trash')} ${V.confirm==='l'+l.id?'اضغط للتأكيد':'حذف'}</button></div>`:''}
 <div class="actions">${prev?`<button class="btn" data-act="lesson" data-s="${sid}" data-id="${prev.id}">${ic('chevR')} السابق</button>`:'<span></span>'}${next?`<button class="btn" data-act="lesson" data-s="${sid}" data-id="${next.id}">التالي ${ic('chevL')}</button>`:'<span></span>'}</div>`;
}
function vSchedule(){
 const by=DAYS.map((d,i)=>({d,i,items:S.schedule.map((x,k)=>({...x,k})).filter(x=>x.day===i).sort((a,b)=>a.time.localeCompare(b.time))})).filter(x=>x.items.length);
 return `<div class="sec-head" style="margin-top:0"><div><h1 style="font-size:24px">جدولي</h1><div class="muted">مواعيد مذاكرتك خلال الأسبوع</div></div><button class="pill-btn" data-act="addSlot">+ موعد</button></div>
 ${by.length?by.map(g=>`<div class="day"><h3>${g.d}</h3>${g.items.map(x=>{const s=SUBJ[x.subj]||{name:x.subj,c:'#888'};return `<div class="slot" style="--c:${s.c}"><span class="time">${esc(x.time)}</span><div class="t"><b>${esc(s.name)}</b><div class="muted" style="font-size:14px">${esc(x.note)}</div></div><button class="iconbtn" style="width:38px;height:38px" data-act="delSlot" data-k="${x.k}" aria-label="حذف">${V.confirm==='s'+x.k?ic('check'):ic('trash')}</button></div>`}).join('')}</div>`).join(''):'<div class="empty">لا توجد مواعيد بعد. أضف أول موعد مذاكرة من زر «+ موعد».</div>'}`;
}
function vAccount(){
 const subs=subjectsFor(S.grade);let a=0,d=0;subs.forEach(s=>{const t=stats(s);a+=t.a;d+=t.d});
 const mk=Object.keys(S.marks).filter(k=>k.startsWith(S.grade+'|')).length;
 const st=accessOf(ME),until=toDate(ME.activeUntil);
 return `<div class="hello"><div class="avatar">${initial(ME.name)}</div><div class="who"><h1>${esc(ME.name||'حسابي')}</h1><div class="muted" dir="ltr" style="text-align:right;font-size:14px">${esc(ME.email)}</div><div>${statusTag()}</div></div></div>
 ${notices()}
 ${isStaff()||isAdminEmail()?'':`<div class="card"><div class="row" style="justify-content:space-between"><b style="font-family:var(--display)">الاشتراك</b>${stPill(st)}</div>
  <div class="muted" style="font-size:14px;margin-top:6px">${st==='on'?`${ME.accessGrade?`للصف ${ME.accessGrade}`:'لكل الصفوف'}${until?` · ينتهي في ${fmtDate(until)}`:''}`:st==='exp'?`انتهى في ${fmtDate(until)}`:'غير مفعّل بعد'}</div>
  <button class="btn ${st==='on'?'':'primary'}" style="width:100%;margin-top:12px" data-act="redeem">${ic('key')} ${st==='on'?'تجديد بكود جديد':'إدخال كود التفعيل'}</button></div>
 <div class="stats"><div><b>${d}</b><small>درس مكتمل</small></div><div><b>${a?Math.round(d/a*100):0}%</b><small>نسبة الإنجاز</small></div><div><b>${mk}</b><small>في مرجعك</small></div></div>`}
 ${isTeacher()?`<div class="card"><b style="font-family:var(--display)">موادك</b><div class="chips">${(ME.subjects||[]).map(ck=>`<button class="chip" data-act="openCk" data-v="${ck}">${esc(ckName(ck))}</button>`).join('')||'<span class="muted">لم يحدد لك المدير مواد بعد</span>'}</div></div>`:''}
 <div class="card"><label for="nm" style="margin-top:0">الاسم</label><input id="nm" value="${esc(ME.name)}"><label for="gr">${isStaff()?'الصف المعروض':'الصف'}</label><select id="gr">${GRADES.map(g=>`<option value="${g}" ${g===S.grade?'selected':''}>الصف ${g}</option>`).join('')}</select>
 <div style="margin-top:14px"><button class="btn primary" data-act="saveAcc">حفظ</button></div></div>
 <div class="card"><b style="font-family:var(--display)">ألوان المنصة ✦</b><div class="muted" style="font-size:14px">اختر الثيم اللي يعجبك</div>${skinGrid()}</div>
 ${standalone()?'':`<div class="card"><div class="switch"><div><b style="font-family:var(--display)">تثبيت التطبيق</b><div class="muted" style="font-size:14px">أضف دروسي إلى الشاشة الرئيسية ليعمل كتطبيق</div></div><button class="btn primary" data-act="install">تثبيت</button></div></div>`}
 <div class="card"><b style="font-family:var(--display)">إعادة ضبط التقدّم</b><div class="muted" style="font-size:14px;margin-bottom:10px">يمسح الدروس المكتملة والمحفوظات لهذا الصف</div><button class="btn" style="color:#fecaca" data-act="reset">${V.confirm==='reset'?'اضغط مرة أخرى للتأكيد':'إعادة الضبط'}</button></div>
 <div class="actions"><a class="btn" href="${siteLink('privacy.html')}">سياسة الخصوصية</a><button class="btn" style="color:#fecaca" data-act="logout">${ic('logout')} تسجيل الخروج</button></div>`;
}

/* ---------- dashboard ---------- */
async function loadDash(force){
 if(!isStaff()||(ADM.busy)||(ADM.users&&!force))return;
 ADM.busy=true;softRender();
 try{
  const [us,pr]=await Promise.all([db.collection('users').get(),db.collection('progress').get()]);
  ADM.users=us.docs.map(d=>Object.assign({uid:d.id},d.data()));
  ADM.progress={};pr.docs.forEach(d=>ADM.progress[d.id]=d.data());
  if(isAdmin()){const cs=await db.collection('codes').orderBy('createdAt','desc').get();ADM.codes=cs.docs.map(d=>Object.assign({id:d.id},d.data()))}
 }catch(e){toast(errMsg(e));ADM.users=ADM.users||[]}
 ADM.busy=false;softRender();
}
const userName=uid=>{const u=(ADM.users||[]).find(x=>x.uid===uid);return u?(u.name||u.email):'طالب'};
function doneCount(uid,pref){const p=(ADM.progress||{})[uid];if(!p||!p.done)return 0;return Object.keys(p.done).filter(k=>pref.some(x=>k.startsWith(x))).length}
function teacherGrades(){return [...new Set((ME.subjects||[]).map(ck=>parseCk(ck).g))]}
function vDash(){
 if(!isStaff())return '';
 loadDash();
 const tabs=isAdmin()?[['students','الطلاب'],['teachers','المعلمون'],['codes','الأكواد'],['data','البيانات']]:[['students','طلابي'],['mysubj','موادي']];
 if(!tabs.some(t=>t[0]===ADM.tab))ADM.tab='students';
 let body='';
 if(ADM.busy&&!ADM.users)body='<div class="spin" style="margin-top:40px"></div>';
 else if(ADM.tab==='students')body=dashStudents();
 else if(ADM.tab==='teachers')body=dashTeachers();
 else if(ADM.tab==='codes')body=dashCodes();
 else if(ADM.tab==='data')body=dashData();
 else body=dashMySubj();
 return `<div class="sec-head" style="margin-top:0"><div><h1 style="font-size:24px">${isAdmin()?'لوحة الإدارة':'لوحة المعلم'}</h1><div class="muted">${isAdmin()?'المستخدمون والمعلمون وأكواد التفعيل':'طلابك وموادك'}</div></div><button class="iconbtn" data-act="dashRefresh" aria-label="تحديث">${ic('refresh')}</button></div>
 <div class="tabs" role="tablist" style="grid-template-columns:repeat(${tabs.length},1fr)">${tabs.map(([k,n])=>`<button role="tab" aria-selected="${ADM.tab===k}" data-act="dtab" data-v="${k}" style="font-size:${tabs.length>3?14:16}px;padding:12px 4px">${n}</button>`).join('')}</div>${body}`;
}
function dashStudents(){
 let list=(ADM.users||[]).filter(u=>(u.role||'student')==='student'&&(u.email||'')!==ADMIN_EMAIL);
 let pref=null;
 if(!isAdmin()){const gs=teacherGrades();list=list.filter(u=>gs.includes(u.grade));}
 const q=ADM.q.trim().toLowerCase();
 const shown=q?list.filter(u=>(u.name||'').toLowerCase().includes(q)||(u.email||'').includes(q)):list;
 const on=list.filter(u=>accessOf(u)==='on').length;
 return `<div class="stats"><div><b>${list.length}</b><small>طالب</small></div><div><b>${on}</b><small>مشترك</small></div><div><b>${list.length-on}</b><small>غير مشترك</small></div></div>
 <input id="dq" class="search" placeholder="ابحث بالاسم أو الإيميل" value="${esc(ADM.q)}" style="margin-top:14px">
 <div style="margin-top:12px">${shown.length?shown.map(u=>{
  const prefs=isAdmin()?[`${u.grade}|`]:(ME.subjects||[]).filter(ck=>parseCk(ck).g===u.grade).map(ck=>`${u.grade}|${parseCk(ck).sid}-`);
  return `<button class="item" data-act="user" data-v="${u.uid}"><div class="avatar sm">${initial(u.name)}</div><div class="t"><b>${esc(u.name||'—')}</b><small dir="ltr" style="display:block;text-align:right">${esc(u.email||'')}</small><small>الصف ${u.grade||'—'} · ${doneCount(u.uid,prefs)} درس مكتمل</small></div>${stPill(accessOf(u))}</button>`}).join(''):'<div class="empty">لا يوجد طلاب بعد</div>'}</div>`;
}
function dashTeachers(){
 const list=(ADM.users||[]).filter(u=>u.role==='teacher');
 return `<button class="btn primary" style="width:100%;margin-top:14px" data-act="addTeacher">${ic('plus')} إضافة معلم</button>
 <div style="margin-top:12px">${list.length?list.map(u=>`<button class="item" data-act="user" data-v="${u.uid}"><div class="avatar sm">${initial(u.name)}</div><div class="t"><b>${esc(u.name||'—')}</b><small dir="ltr" style="display:block;text-align:right">${esc(u.email||'')}</small><small>${(u.subjects||[]).map(ckName).join('، ')||'بدون مواد'}</small></div>${ic('chevL')}</button>`).join(''):'<div class="empty">لا يوجد معلمون بعد. أضف أول معلم من الزر أعلاه.</div>'}</div>`;
}
function dashCodes(){
 const all=ADM.codes||[];const f=ADM.codeFilter;
 const list=all.filter(c=>f==='all'||(f==='unused'?!c.usedBy:!!c.usedBy));
 return `<form id="codeF" class="card"><b style="font-family:var(--display)">توليد أكواد تفعيل</b>
 <div class="fgrid"><div><label for="cn">العدد</label><input id="cn" type="number" min="1" max="50" value="5" inputmode="numeric"></div>
 <div><label for="cg">الصف</label><select id="cg"><option value="0">كل الصفوف</option>${GRADES.map(g=>`<option value="${g}">الصف ${g}</option>`).join('')}</select></div></div>
 <label for="cx">ينتهي الاشتراك في (اختياري)</label><input id="cx" type="date">
 <label for="cnote">ملاحظة (اختياري)</label><input id="cnote" placeholder="مثال: الفصل الأول 2026">
 <button class="btn primary" style="width:100%;margin-top:14px">${ic('key')} توليد</button></form>
 <div class="row" style="margin-top:14px;flex-wrap:wrap">${[['unused','غير مستخدمة'],['used','مستخدمة'],['all','الكل']].map(([k,n])=>`<button class="chip ${f===k?'on':''}" data-act="cfilter" data-v="${k}">${n} (${all.filter(c=>k==='all'||(k==='unused'?!c.usedBy:!!c.usedBy)).length})</button>`).join('')}
 ${f==='unused'&&list.length?`<button class="chip" data-act="copyCodes">${ic('copy','i sm')} نسخ الكل</button>`:''}</div>
 <div style="margin-top:10px">${list.length?list.map(c=>{const ex=toDate(c.expires);return `<div class="item"><div class="t"><div class="code">${esc(c.id)}</div><small>${c.grade?`الصف ${c.grade}`:'كل الصفوف'}${ex?` · حتى ${fmtDate(ex)}`:''}${c.note?` · ${esc(c.note)}`:''}</small>${c.usedBy?`<small style="display:block;color:var(--accent-hi)">استخدمه: ${esc(userName(c.usedBy))}</small>`:''}</div>
 ${c.usedBy?'':`<button class="iconbtn" style="width:40px;height:40px" data-act="copyCode" data-v="${esc(c.id)}" aria-label="نسخ">${ic('copy')}</button><button class="iconbtn" style="width:40px;height:40px" data-act="delCode" data-v="${esc(c.id)}" aria-label="حذف">${V.confirm==='c'+c.id?ic('check'):ic('trash')}</button>`}</div>`}).join(''):'<div class="empty">لا توجد أكواد هنا</div>'}</div>`;
}
function dashData(){
 return `<div class="card"><b style="font-family:var(--display)">نقل الدروس من الموقع القديم</b><div class="muted" style="font-size:14px;margin:4px 0 12px">يقرأ ملف content.json الموجود في موقعك على GitHub وينقل الوحدات والدروس والروابط وبيانات المعلمين. المواد اللي لها محتوى منشور هنا لا تُستبدل.</div><button class="btn primary" style="width:100%" data-act="importOld">${ic('refresh')} نقل الدروس القديمة</button><p id="imsg" class="muted" style="font-size:14px;margin:10px 0 0" hidden></p></div>
 <div class="card"><b style="font-family:var(--display)">نسخة احتياطية</b><div class="muted" style="font-size:14px;margin:4px 0 12px">ملف واحد فيه كل المحتوى والروابط، وقائمة المستخدمين والأكواد للرجوع إليها.</div><button class="btn primary" style="width:100%" data-act="backup">تنزيل نسخة احتياطية</button></div>
 <div class="card"><b style="font-family:var(--display)">استعادة المحتوى</b><div class="muted" style="font-size:14px;margin:4px 0 12px">يستبدل محتوى المواد الموجودة في الملف بالنسخة المحفوظة. لا يغيّر الحسابات ولا الأكواد.</div><label class="btn" style="width:100%;margin:0">اختيار ملف النسخة<input type="file" id="restoreFile" accept="application/json,.json" hidden></label><p id="rmsg" class="muted" style="font-size:14px;margin:10px 0 0" hidden></p></div>`;
}
function setMsg(id,m){const e=document.getElementById(id);if(e){e.textContent=m;e.hidden=false}}
function writeContentBatches(entries){let chain=Promise.resolve();for(let i=0;i<entries.length;i+=200){const part=entries.slice(i,i+200);chain=chain.then(()=>{const b=db.batch();part.forEach(([ck,pub,urls])=>{const ref=db.collection('content').doc(ck);b.set(ref,pub,{merge:true});if(urls)b.set(ref.collection('secure').doc('urls'),{urls})});return b.commit()})}return chain}
async function importOld(){
 setMsg('imsg','جارٍ القراءة…');
 const r=await fetch('content.json',{cache:'no-store'});if(!r.ok)throw{message:'لم أجد ملف content.json في الموقع'};
 const d=await r.json(),custom=d.custom||{},teachers=d.teachers||{};
 const keys=[...new Set(Object.keys(custom).concat(Object.keys(teachers)))].filter(k=>/^\d+\|\w+$/.test(k));
 if(!keys.length){setMsg('imsg','الملف القديم لا يحتوي دروسًا أو بيانات معلمين، لا يوجد شيء للنقل.');return}
 const out=[];let skipped=0,lessons=0;
 for(const k of keys){const [g,sid]=k.split('|'),ck=ckeyG(+g,sid);const ex=await db.collection('content').doc(ck).get();
  const pub={grade:+g,sid,importedAt:serverTs()};let urls=null;
  if(custom[k]&&!(ex.exists&&ex.data().s1)){urls={};const conv=units=>(units||[]).map(u=>{const free=/-s1-u0$/.test(u.id)||u.title==='التجربة المجانية';return{id:u.id,title:u.title||'',free,lessons:(u.lessons||[]).map(l=>{lessons++;if(l.url)urls[l.id]=l.url;return{id:l.id,title:l.title||'',type:l.type||'video',dur:l.dur||'',url:free?(l.url||''):''}})}});
   pub.s1=conv(custom[k][1]||custom[k]['1']);pub.s2=conv(custom[k][2]||custom[k]['2']);}
  else if(custom[k])skipped++;
  if(teachers[k]&&!(ex.exists&&ex.data().teacher))pub.teacher={name:teachers[k].name||'',qual:teachers[k].qual||''};
  if(pub.s1||pub.teacher)out.push([ck,pub,urls]);}
 await writeContentBatches(out);
 out.forEach(([ck,pub,urls])=>{CONTENT[ck]=Object.assign({},CONTENT[ck],pub);if(urls){URLS[ck]=urls;URLS_LOADED[ck]=1}});
 setMsg('imsg',`تم نقل ${out.length} مادة (${lessons} درس)${skipped?`، وتُرك ${skipped} لأن لها محتوى منشورًا هنا`:''}.`);
}
const plain=o=>JSON.parse(JSON.stringify(o,(k,v)=>v&&typeof v.toDate==='function'?v.toDate().toISOString():v));
async function backup(){
 toast('جارٍ تجهيز النسخة…');
 const cs=await db.collection('content').get(),content={};
 for(const d of cs.docs){let urls={};try{const u=await d.ref.collection('secure').doc('urls').get();urls=(u.exists&&u.data().urls)||{}}catch(e){}content[d.id]=Object.assign(plain(d.data()),{urls})}
 const [us,co]=await Promise.all([db.collection('users').get(),db.collection('codes').get()]);
 const data={app:'durusi',version:1,exportedAt:new Date().toISOString(),content,users:us.docs.map(d=>Object.assign({uid:d.id},plain(d.data()))),codes:co.docs.map(d=>Object.assign({id:d.id},plain(d.data())))};
 const b=new Blob([JSON.stringify(data,null,1)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download=`durusi-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();
 toast(`تم تنزيل النسخة: ${Object.keys(content).length} مادة، ${data.users.length} مستخدم`);
}
async function restoreFrom(file){
 const d=JSON.parse(await file.text());if(d.app!=='durusi'||!d.content)throw{message:'هذا الملف ليس نسخة احتياطية من دروسي'};
 const out=Object.entries(d.content).filter(([ck])=>/^g\d+_\w+$/.test(ck)).map(([ck,c])=>{const {urls,updatedAt,importedAt,...pub}=c;return[ck,pub,urls||{}]});
 await writeContentBatches(out);
 out.forEach(([ck,pub,urls])=>{CONTENT[ck]=pub;URLS[ck]=urls;URLS_LOADED[ck]=1});
 setMsg('rmsg',`تمت استعادة ${out.length} مادة من نسخة ${fmtDate(new Date(d.exportedAt))}.`);
}
function dashMySubj(){
 const L=ME.subjects||[];
 return `<div style="margin-top:14px">${L.length?L.map(ck=>{const p=parseCk(ck),s=SUBJ[p.sid]||{name:p.sid,c:'#888',icon:'book'};return `<button class="item" data-act="openCk" data-v="${ck}"><div class="sicon" style="--c:${s.c}">${ic(s.icon)}</div><div class="t"><b>${s.name}</b><small>الصف ${p.g}</small></div>${ic('chevL')}</button>`}).join(''):'<div class="empty">لم يحدد لك المدير مواد بعد</div>'}</div>`;
}
function subjPicker(sel){sel=sel||[];
 return `<div class="subjpick">${GRADES.map(g=>{const any=subjectsFor(g).some(sid=>sel.includes(ckeyG(g,sid)));return `<details ${any?'open':''}><summary>الصف ${g}</summary><div class="chips">${subjectsFor(g).map(sid=>{const ck=ckeyG(g,sid);return `<label class="chip"><input type="checkbox" name="subj" value="${ck}" ${sel.includes(ck)?'checked':''}> ${SUBJ[sid].name}</label>`}).join('')}</div></details>`}).join('')}</div>`;
}
function userSheet(uid){
 const u=(ADM.users||[]).find(x=>x.uid===uid);if(!u)return;
 const st=accessOf(u),until=toDate(u.activeUntil),p=(ADM.progress||{})[uid]||{};
 const doneN=p.done?Object.keys(p.done).length:0;
 const head=`<div class="row"><div class="avatar sm">${initial(u.name)}</div><div style="min-width:0"><h2 style="margin:0">${esc(u.name||'—')}</h2><div class="muted" dir="ltr" style="text-align:right;font-size:14px">${esc(u.email||'')}</div></div></div>
 <div class="row" style="margin-top:10px;flex-wrap:wrap">${u.role==='teacher'?'<span class="st role">معلم</span>':stPill(st)}<span class="muted" style="font-size:14px">الصف ${u.grade||'—'} · ${doneN} درس مكتمل${u.code?` · الكود ${esc(u.code)}`:''}</span></div>`;
 if(!isAdmin()){sheet(head);return}
 const ds=d=>d?new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10):'';
 sheet(`${head}<form id="userF" data-uid="${uid}">
 <label for="ur">نوع الحساب</label><select id="ur"><option value="student" ${u.role!=='teacher'?'selected':''}>طالب</option><option value="teacher" ${u.role==='teacher'?'selected':''}>معلم</option></select>
 <div id="stuBox" ${u.role==='teacher'?'hidden':''}>
 <div class="switch" style="margin-top:14px"><b>الاشتراك مفعّل</b><button type="button" class="toggle" id="uact" aria-pressed="${!!u.active}" data-act="tgl" aria-label="الاشتراك مفعّل"></button></div>
 <div class="fgrid"><div><label for="uag">يفتح</label><select id="uag"><option value="0">كل الصفوف</option>${GRADES.map(g=>`<option value="${g}" ${u.accessGrade===g?'selected':''}>الصف ${g}</option>`).join('')}</select></div>
 <div><label for="uun">ينتهي في</label><input id="uun" type="date" value="${ds(until)}"></div></div></div>
 <div id="tchBox" ${u.role==='teacher'?'':'hidden'}><label>المواد اللي يدرّسها</label>${subjPicker(u.subjects)}</div>
 <p id="uerr" class="err" hidden></p><button class="btn primary" style="width:100%;margin-top:16px">حفظ</button></form>`);
}
function addTeacherSheet(){
 sheet(`<h2>إضافة معلم</h2><p class="muted" style="margin:0">ننشئ له حسابًا ويدخل بالإيميل وكلمة المرور اللي تحددها</p><form id="teachF">
 <label for="tn2">الاسم</label><input id="tn2" required placeholder="أ. أحمد يوسف">
 <label for="te">الإيميل</label><input id="te" type="email" dir="ltr" required>
 <label for="tp">كلمة المرور (6 أحرف على الأقل)</label><input id="tp" type="text" dir="ltr" minlength="6" required>
 <label>المواد</label>${subjPicker([])}
 <p id="terr" class="err" hidden></p><button class="btn primary" style="width:100%;margin-top:16px">إضافة المعلم</button></form>`);
}
function redeemSheet(){
 sheet(`<h2>تفعيل الاشتراك</h2><p class="muted" style="margin:0">اكتب الكود اللي وصلك بعد الدفع</p><form id="redeemF">
 <input id="rc" class="code" style="margin-top:12px;text-align:center;font-size:22px" placeholder="XXXX-XXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" required>
 <p id="rerr" class="err" hidden></p><button class="btn primary" style="width:100%;margin-top:14px">${ic('key')} تفعيل</button></form>`);
 setTimeout(()=>{const i=document.getElementById('rc');if(i)i.focus()},60);
}
const CODE_AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(){const a=new Uint32Array(8);crypto.getRandomValues(a);let s='';a.forEach((v,i)=>{s+=CODE_AB[v%CODE_AB.length];if(i===3)s+='-'});return s}
const normCode=s=>{const t=s.toUpperCase().replace(/[^A-Z0-9]/g,'');return t.length===8?t.slice(0,4)+'-'+t.slice(4):t};
async function copyText(txt,ok){try{await navigator.clipboard.writeText(txt);toast(ok||'تم النسخ')}catch(e){sheet(`<h2>انسخ النص</h2><textarea id="cpt" rows="8" dir="ltr" readonly>${esc(txt)}</textarea>`);const t=document.getElementById('cpt');t.focus();t.select()}}

/* ---------- sheets ---------- */
function sheet(html){document.getElementById('layer').innerHTML=`<div class="veil" data-act="close"><div class="sheet" role="dialog"><div class="grip"></div>${html}</div></div>`}
function closeSheet(){document.getElementById('layer').innerHTML=''}
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function showErr(id,m){const e=document.getElementById(id);if(e){e.textContent=m;e.hidden=false}}
function busyBtn(form,on){const b=form&&form.querySelector('button:not([type=button])');if(b){b.disabled=on;b.style.opacity=on?.6:1}}
function notesSheet(){
 const C=content(V.subj)[V.sem];const items=[];C.forEach(u=>u.lessons.filter(l=>l.type==='pdf').forEach(l=>items.push({u,l})));
 sheet(`<h2>مذكرات شاملة – الفصل ${V.sem===1?'الأول':'الثاني'}</h2><p class="muted" style="margin:0 0 12px">ملخصات ومذكرات ${SUBJ[V.subj].name}</p>${items.length?items.map(x=>`<button class="item" data-act="lesson" data-s="${V.subj}" data-id="${x.l.id}"><span class="sicon" style="--c:var(--accent2)">${ic(unitLocked(x.u)?'lock':'file')}</span><div class="t"><b>${esc(x.l.title)}</b><small>${esc(x.u.title)} · ${esc(x.l.dur)}</small></div>${ic('chevL')}</button>`).join(''):'<div class="empty">لا توجد مذكرات في هذا الفصل</div>'}`);
}
function marksSheet(){
 const items=[];const C=content(V.subj);[1,2].forEach(s=>C[s].forEach(u=>u.lessons.forEach(l=>{if(S.marks[S.grade+'|'+l.id])items.push({u,l})})));
 sheet(`<h2>مرجعك</h2><p class="muted" style="margin:0 0 12px">الدروس التي حفظتها للرجوع إليها</p>${items.length?items.map(x=>`<button class="item" data-act="lesson" data-s="${V.subj}" data-id="${x.l.id}"><span class="sicon" style="--c:var(--accent2)">${ic('mark')}</span><div class="t"><b>${esc(x.l.title)}</b><small>${esc(x.u.title)}</small></div>${ic('chevL')}</button>`).join(''):'<div class="empty">لم تحفظ أي درس بعد. اضغط «حفظ في مرجعك» داخل أي درس.</div>'}`);
}
function quizSheet(){
 const Q=V.quiz; const bank=QB[V.subj]||QB.math;
 if(Q.i>=bank.length){sheet(`<h2>النتيجة</h2><div style="text-align:center;padding:20px 0"><div style="font:800 48px var(--display)">${Q.score}/${bank.length}</div><p class="muted">${Q.score===bank.length?'ممتاز! حافظ وفاهم 👏':Q.score>=bank.length/2?'جيد، راجع الأخطاء وحاول مرة أخرى':'راجع الدروس ثم أعد المحاولة'}</p></div><button class="btn primary" style="width:100%" data-act="quizRe">إعادة الاختبار</button>`);return}
 const [q,opts,ans]=bank[Q.i]; if(!Q.order)Q.order=opts.map((_,i)=>i).sort(()=>Math.random()-.5);
 sheet(`<div class="row" style="justify-content:space-between"><h2>حافظ وفاهم؟</h2><span class="muted">${Q.i+1} / ${bank.length}</span></div><p style="font-weight:700;font-size:18px;margin:10px 0" dir="auto">${esc(q)}</p>
 ${Q.order.map(i=>`<button class="opt ${Q.pick!=null?(i===ans?'right':i===Q.pick?'wrong':''):''}" data-act="qpick" data-i="${i}" dir="auto">${esc(opts[i])}</button>`).join('')}
 ${Q.pick!=null?`<button class="btn primary" style="width:100%;margin-top:14px" data-act="qnext">${Q.i+1<bank.length?'السؤال التالي':'عرض النتيجة'}</button>`:''}`);
}
function lessonForm(l){
 sheet(`<h2>${l?'تعديل الدرس':'درس جديد'}</h2><form id="lf"><label for="lt">عنوان الدرس</label><input id="lt" required value="${esc(l?.title||'')}">
 <label for="ly">النوع</label><select id="ly">${['video','pdf','quiz'].map(t=>`<option value="${t}" ${l?.type===t?'selected':''}>${typeName[t]}</option>`).join('')}</select>
 <label for="ld">المدة أو الحجم</label><input id="ld" value="${esc(l?.dur||'20 د')}">
 <label for="lu">الرابط: فيديو يوتيوب أو Vimeo، أو ملف من Google Drive</label><input id="lu" dir="ltr" placeholder="https://" value="${esc(l?.url||'')}">
 <button class="btn primary" style="width:100%;margin-top:16px">حفظ</button></form>`);
}

/* ---------- render ---------- */
function navItems(){const it=[['home','home','الرئيسية'],['subjects','grid','المواد'],['schedule','cal','جدولي']];if(isStaff())it.push(['dash','shield',isAdmin()?'الإدارة':'لوحتي']);it.push(['account','user','حسابي']);return it}
function render(){
 const app=document.getElementById('app'),nav=document.querySelector('.nav');
 if(AUTH!=='in'||!ME){app.innerHTML=vAuth();nav.hidden=true;return}
 nav.hidden=false;
 if(V.view==='dash'&&!isStaff())V.view='home';
 const map={home:vHome,subjects:vSubjects,subject:vSubject,lesson:vLesson,schedule:vSchedule,account:vAccount,dash:vDash};
 app.innerHTML=map[V.view]();
 const tab={home:'home',subject:'home',lesson:'home',subjects:'subjects',schedule:'schedule',account:'account',dash:'dash'}[V.view];
 const items=navItems(),n=document.getElementById('nav');n.style.setProperty('--n',items.length);
 n.innerHTML=items.map(([v,i,t])=>`<button class="${tab===v?'on':''}" data-act="nav" data-v="${v}">${ic(i)}${t}</button>`).join('');
}
function softRender(){const a=document.activeElement;if(a&&document.getElementById('app').contains(a)&&a.matches('input,select,textarea'))return;render()}
function go(view,extra){Object.assign(V,{view,confirm:null},extra||{});closeSheet();render();window.scrollTo(0,0)}
function setGrade(g){S.grade=g;save();watchGrade(g);if(!isStaff()&&db&&ME&&ME.grade!==g){ME.grade=g;db.collection('users').doc(ME.uid).update({grade:g}).catch(e=>toast(errMsg(e)))}}

document.addEventListener('input',e=>{if(e.target.id==='dq'){ADM.q=e.target.value;const pos=e.target.selectionStart;render();const i=document.getElementById('dq');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(x){}}}});
document.addEventListener('change',async e=>{if(e.target.id==='restoreFile'&&e.target.files[0]){const f=e.target.files[0];e.target.value='';
  V.pendingRestore=f;const m=document.getElementById('rmsg');if(m){m.hidden=false;m.innerHTML=`اخترت «${esc(f.name)}». سيُستبدل محتوى المواد الموجودة فيه.<br><button class="btn primary" style="width:100%;margin-top:10px" data-act="doRestore">تأكيد الاستعادة</button>`}return}if(e.target.id==='ur'){const t=e.target.value==='teacher';document.getElementById('stuBox').hidden=t;document.getElementById('tchBox').hidden=!t}});
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-act]'); if(!el)return;
 const a=el.dataset.act;
 if(a==='close'){if(e.target===el)closeSheet();return}
 const sid=V.subj;
 switch(a){
  case 'reload':location.reload();break;
  case 'amode':V.authMode=el.dataset.v;render();break;
  case 'forgot':{const em=(document.getElementById('le')||{}).value||'';if(!em.trim()){showErr('aerr','اكتب إيميلك في الخانة أولًا ثم اضغط «نسيت كلمة المرور؟»');break}
   try{await auth.sendPasswordResetEmail(em.trim());toast('أرسلنا رابط تغيير كلمة المرور إلى بريدك')}catch(x){showErr('aerr',errMsg(x))}break}
  case 'logout':await auth.signOut();break;
  case 'sendVerify':try{await auth.currentUser.sendEmailVerification();toast('أرسلنا رابط التحقق إلى بريدك')}catch(x){toast(errMsg(x))}break;
  case 'checkVerify':try{await auth.currentUser.reload();await auth.currentUser.getIdToken(true);ME.verified=auth.currentUser.emailVerified;if(ME.verified){toast('تم تفعيل صلاحيات المدير ✦');burst(e.clientX,e.clientY,40)}else toast('لم يتم التحقق بعد. افتح الرابط في بريدك أولًا');render()}catch(x){toast(errMsg(x))}break;
  case 'nav':go(el.dataset.v);break;
  case 'subj':go('subject',{subj:el.dataset.s,sem:1,open:null,prevView:['home','subjects'].includes(V.view)?V.view:'home'});break;
  case 'openCk':{const p=parseCk(el.dataset.v);setGrade(p.g);go('subject',{subj:p.sid,sem:1,open:null,prevView:V.view});break}
  case 'back':go(V.prevView||'home');break;
  case 'toSubj':go('subject');break;
  case 'sem':V.sem=+el.dataset.v;V.open=null;render();break;
  case 'unit':V.open=V.open===el.dataset.id?null:el.dataset.id;V.confirm=null;render();break;
  case 'lesson':{const s=el.dataset.s,id=el.dataset.id;const f=findLesson(s,id);if(f&&!unitLocked(f.unit)){S.last={grade:S.grade,subj:s,id};save()}go('lesson',{subj:s,lesson:id,sem:f?f.sem:V.sem,open:f?f.unit.id:V.open});break}
  case 'done':{const k=S.grade+'|'+V.lesson;if(S.done[k])delete S.done[k];else{S.done[k]=1;burst(e.clientX,e.clientY,40);toast('أحسنت! تم تسجيل الدرس كمكتمل ✦')}save();const la=document.getElementById('lact');if(la)la.innerHTML=lessonActs();else render();break}
  case 'mark':{const k=S.grade+'|'+V.lesson;if(S.marks[k])delete S.marks[k];else{S.marks[k]=1;toast('تم الحفظ في مرجعك')}save();const la2=document.getElementById('lact');if(la2)la2.innerHTML=lessonActs();else render();break}
  case 'notes':notesSheet();break;
  case 'marks':marksSheet();break;
  case 'quiz':case 'quizRe':V.quiz={i:0,score:0,pick:null};quizSheet();break;
  case 'qpick':{if(V.quiz.pick!=null)return;const i=+el.dataset.i;V.quiz.pick=i;if(i===(QB[sid]||QB.math)[V.quiz.i][2]){V.quiz.score++;burst(e.clientX,e.clientY,26)}quizSheet();break}
  case 'qnext':V.quiz.i++;V.quiz.pick=null;V.quiz.order=null;quizSheet();break;
  case 'tinfo':{const T=teacherOf(sid);sheet(`<h2>${esc(T.name)}</h2><p class="muted">معلم ${SUBJ[sid].name} – الصف ${S.grade}</p>${T.qual?`<div class="card"><b>المؤهل العلمي</b><p style="margin:4px 0 0">${esc(T.qual)}</p></div>`:''}`);break}
  case 'editT':{const T=teacherOf(sid);sheet(`<h2>بيانات المعلم</h2><form id="tf"><label for="tn">الاسم</label><input id="tn" value="${esc(T.name)}"><label for="tq">المؤهل العلمي</label><input id="tq" value="${esc(T.qual)}"><button class="btn primary" style="width:100%;margin-top:16px">حفظ</button></form>`);break}
  case 'grade':sheet(`<h2>${isStaff()?'اختر الصف':'صفي الدراسي'}</h2><p class="muted" style="margin:0">تتغيّر المواد والمحتوى حسب الصف</p><div class="grades">${GRADES.map(g=>`<button class="${g===S.grade?'on':''}" data-act="setG" data-v="${g}">${g}</button>`).join('')}</div>`);break;
  case 'setG':setGrade(+el.dataset.v);go('home');toast('تم التبديل إلى الصف '+S.grade);break;
  case 'toast':toast(el.dataset.m);break;
  case 'skins':sheet(`<h2>ألوان المنصة ✦</h2><p class="muted" style="margin:0">اختر الثيم اللي يعجبك</p>${skinGrid()}`);break;
  case 'skin':{S.skin=el.dataset.v;save();applySkin();const r=el.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/3,34);document.querySelectorAll('.skin').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.skin));if(V.view==='account')render();break}
  case 'install':if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;render()})}else sheet(`<h2>تثبيت التطبيق</h2><div class="card"><b>آيفون (Safari)</b><p style="margin:4px 0 0">اضغط زر المشاركة <b>⬆</b> أسفل الشاشة، ثم «إضافة إلى الشاشة الرئيسية».</p></div><div class="card"><b>أندرويد (Chrome)</b><p style="margin:4px 0 0">اضغط القائمة ⋮ أعلى الشاشة، ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p></div>`);break;
  case 'saveAcc':{const nm=document.getElementById('nm').value.trim(),g=+document.getElementById('gr').value;
   try{if(nm&&nm!==ME.name){await db.collection('users').doc(ME.uid).update({name:nm});ME.name=nm}setGrade(g);render();toast('تم الحفظ')}catch(x){toast(errMsg(x))}break}
  case 'reset':if(V.confirm!=='reset'){V.confirm='reset';render();break}Object.keys(S.done).filter(k=>k.startsWith(S.grade+'|')).forEach(k=>delete S.done[k]);Object.keys(S.marks).filter(k=>k.startsWith(S.grade+'|')).forEach(k=>delete S.marks[k]);if(S.last&&S.last.grade===S.grade)S.last=null;save();V.confirm=null;render();toast('تمت إعادة الضبط');break;
  case 'redeem':redeemSheet();break;
  case 'addU':sheet(`<h2>وحدة جديدة</h2><form id="uf"><label for="ut">اسم الوحدة</label><input id="ut" required placeholder="مثال: الوحدة الرابعة – الدوال"><button class="btn primary" style="width:100%;margin-top:16px">إضافة</button></form>`);V.formU=null;break;
  case 'renU':{const u=content(sid)[V.sem].find(x=>x.id===el.dataset.u);V.formU=u.id;sheet(`<h2>إعادة تسمية الوحدة</h2><form id="uf"><label for="ut">اسم الوحدة</label><input id="ut" required value="${esc(u.title)}"><button class="btn primary" style="width:100%;margin-top:16px">حفظ</button></form>`);break}
  case 'freeU':{const C=editable(sid),u=C[V.sem].find(x=>x.id===el.dataset.u);u.free=!u.free;await commit(sid,C);toast(u.free?'الوحدة الآن مجانية للجميع':'الوحدة الآن للمشتركين فقط');break}
  case 'delU':{const id=el.dataset.u;if(V.confirm!=='u'+id){V.confirm='u'+id;render();break}const C=editable(sid);C[V.sem]=C[V.sem].filter(x=>x.id!==id);V.confirm=null;await commit(sid,C);toast('تم حذف الوحدة');break}
  case 'addL':V.formL={u:el.dataset.u,id:null};lessonForm(null);break;
  case 'editL':{const f=findLesson(sid,V.lesson);V.formL={u:f.unit.id,id:V.lesson};lessonForm(f.lesson);break}
  case 'delL':{if(V.confirm!=='l'+V.lesson){V.confirm='l'+V.lesson;render();break}const C=editable(sid);C[V.sem].forEach(u=>u.lessons=u.lessons.filter(l=>l.id!==V.lesson));go('subject');await commit(sid,C);toast('تم حذف الدرس');break}
  case 'addSlot':{const subs=subjectsFor(S.grade);sheet(`<h2>موعد مذاكرة</h2><form id="sf"><label for="sd">اليوم</label><select id="sd">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select><label for="st">الوقت</label><input id="st" type="time" value="16:00" required><label for="ss">المادة</label><select id="ss">${subs.map(s=>`<option value="${s}">${SUBJ[s].name}</option>`).join('')}</select><label for="sn">ملاحظة</label><input id="sn" placeholder="مثال: حل تمارين الوحدة الأولى"><button class="btn primary" style="width:100%;margin-top:16px">إضافة</button></form>`);break}
  case 'delSlot':{const k=+el.dataset.k;if(V.confirm!=='s'+k){V.confirm='s'+k;render();break}S.schedule.splice(k,1);save();V.confirm=null;render();break}
  case 'pubTpl':{await commit(sid,editable(sid));toast('تم نشر محتوى المادة للطلاب ✦');break}
  case 'importOld':busyBtn(el.closest('.card'),true);try{await importOld()}catch(x){setMsg('imsg',x.message&&!x.code?x.message:errMsg(x))}busyBtn(el.closest('.card'),false);break;
  case 'doRestore':{const f=V.pendingRestore;if(!f)break;V.pendingRestore=null;setMsg('rmsg','جارٍ الاستعادة…');try{await restoreFrom(f)}catch(x){setMsg('rmsg',x.message&&!x.code?x.message:errMsg(x))}break}
  case 'backup':try{await backup()}catch(x){toast(errMsg(x))}break;
  case 'dtab':ADM.tab=el.dataset.v;V.confirm=null;render();break;
  case 'dashRefresh':loadDash(true);break;
  case 'user':userSheet(el.dataset.v);break;
  case 'tgl':el.setAttribute('aria-pressed',el.getAttribute('aria-pressed')!=='true');break;
  case 'addTeacher':addTeacherSheet();break;
  case 'cfilter':ADM.codeFilter=el.dataset.v;V.confirm=null;render();break;
  case 'copyCode':copyText(el.dataset.v,'تم نسخ الكود');break;
  case 'copyCodes':copyText((ADM.codes||[]).filter(c=>!c.usedBy).map(c=>c.id).join('\n'),'تم نسخ الأكواد');break;
  case 'delCode':{const id=el.dataset.v;if(V.confirm!=='c'+id){V.confirm='c'+id;render();break}V.confirm=null;try{await db.collection('codes').doc(id).delete();ADM.codes=ADM.codes.filter(c=>c.id!==id);render();toast('تم حذف الكود')}catch(x){toast(errMsg(x))}break}
 }
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,sid=V.subj,$=id=>{const x=document.getElementById(id);return x?x.value.trim():''};
 if(f.id==='loginF'){busyBtn(f,true);try{await auth.signInWithEmailAndPassword($('le'),document.getElementById('lp').value)}catch(x){showErr('aerr',errMsg(x));busyBtn(f,false)}return}
 if(f.id==='signF'){busyBtn(f,true);PENDING={name:$('sn2'),grade:+$('sg')};
  try{const cr=await auth.createUserWithEmailAndPassword($('se'),document.getElementById('sp').value);
   if(ADMIN_EMAIL&&cr.user.email.toLowerCase()===ADMIN_EMAIL){try{await cr.user.sendEmailVerification()}catch(x){}}}
  catch(x){PENDING=null;showErr('aerr',errMsg(x));busyBtn(f,false)}return}
 if(f.id==='redeemF'){const code=normCode($('rc'));if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)){showErr('rerr','الكود يتكون من 8 حروف وأرقام');return}
  busyBtn(f,true);
  try{const ref=db.collection('codes').doc(code),d=await ref.get();
   if(!d.exists){showErr('rerr','الكود غير صحيح، تأكد منه وحاول مرة أخرى');busyBtn(f,false);return}
   const c=d.data();if(c.usedBy&&c.usedBy!==ME.uid){showErr('rerr','هذا الكود مستخدم من قبل');busyBtn(f,false);return}
   const ex=toDate(c.expires);if(ex&&ex<new Date()){showErr('rerr','انتهت صلاحية هذا الكود');busyBtn(f,false);return}
   const b=db.batch();if(!c.usedBy)b.update(ref,{usedBy:ME.uid,usedAt:serverTs()});
   b.update(db.collection('users').doc(ME.uid),{active:true,activeUntil:c.expires||null,accessGrade:c.grade||0,code});await b.commit();
   Object.assign(ME,{active:true,activeUntil:ex,accessGrade:c.grade||0});for(const k in URLS_LOADED)delete URLS_LOADED[k];
   if(c.grade&&c.grade!==S.grade)setGrade(c.grade);
   closeSheet();render();burst(innerWidth/2,innerHeight/3,70);toast('تم تفعيل اشتراكك ✦ بالتوفيق!');
  }catch(x){showErr('rerr',errMsg(x));busyBtn(f,false)}return}
 if(f.id==='userF'){const uid=f.dataset.uid,role=$('ur');const upd={role};
  if(role==='teacher'){upd.subjects=[...f.querySelectorAll('input[name=subj]:checked')].map(i=>i.value)}
  else{upd.active=document.getElementById('uact').getAttribute('aria-pressed')==='true';upd.accessGrade=+$('uag');const dv=$('uun');upd.activeUntil=dv?firebase.firestore.Timestamp.fromDate(new Date(dv+'T23:59:59')):null}
  busyBtn(f,true);try{await db.collection('users').doc(uid).update(upd);const u=ADM.users.find(x=>x.uid===uid);Object.assign(u,upd);closeSheet();render();toast('تم الحفظ')}catch(x){showErr('uerr',errMsg(x));busyBtn(f,false)}return}
 if(f.id==='teachF'){const subs=[...f.querySelectorAll('input[name=subj]:checked')].map(i=>i.value);busyBtn(f,true);
  let sec;try{sec=firebase.apps.find(x=>x.name==='secondary')||firebase.initializeApp(FIREBASE_CONFIG,'secondary');
   const cr=await sec.auth().createUserWithEmailAndPassword($('te'),$('tp'));
   const rec={name:$('tn2'),email:$('te').toLowerCase(),grade:0,role:'teacher',active:true,subjects:subs,createdAt:serverTs()};
   await db.collection('users').doc(cr.user.uid).set(rec);await sec.auth().signOut();
   (ADM.users=ADM.users||[]).push(Object.assign({uid:cr.user.uid},rec));closeSheet();render();
   copyText(`دروسي – حساب المعلم\nالرابط: ${SITE}\nالإيميل: ${rec.email}\nكلمة المرور: ${$('tp')||''}`,'تمت إضافة المعلم ✦ ونسخ بيانات دخوله');
  }catch(x){busyBtn(f,false);showErr('terr',x.code==='auth/email-already-in-use'?'هذا الإيميل مسجّل. افتح حسابه من تبويب «الطلاب» وغيّر نوعه إلى معلم':errMsg(x))}return}
 if(f.id==='codeF'){const n=Math.max(1,Math.min(50,+$('cn')||1)),g=+$('cg'),dv=$('cx'),note=$('cnote');
  const expires=dv?firebase.firestore.Timestamp.fromDate(new Date(dv+'T23:59:59')):null;busyBtn(f,true);
  try{const b=db.batch(),made=[];for(let i=0;i<n;i++){const id=newCode();made.push(id);b.set(db.collection('codes').doc(id),{grade:g,expires,note,usedBy:null,usedAt:null,createdAt:serverTs()})}
   await b.commit();ADM.codes=made.map(id=>({id,grade:g,expires,note,usedBy:null})).concat(ADM.codes||[]);ADM.codeFilter='unused';render();toast(`تم توليد ${n} ${n>2&&n<11?'أكواد':'كود'}`)}
  catch(x){toast(errMsg(x));busyBtn(f,false)}return}
 if(f.id==='uf'){const C=editable(sid);if(V.formU){C[V.sem].find(x=>x.id===V.formU).title=$('ut')}else{const id=`${sid}-c${Date.now()}`;C[V.sem].push({id,title:$('ut'),free:false,lessons:[]});V.open=id}V.formU=null;closeSheet();await commit(sid,C);return}
 if(f.id==='lf'){const C=editable(sid);const u=C[V.sem].find(x=>x.id===V.formL.u)||C[1].concat(C[2]).find(x=>x.id===V.formL.u);const data={title:$('lt'),type:$('ly'),dur:$('ld'),url:$('lu')};
  if(V.formL.id){Object.assign(u.lessons.find(l=>l.id===V.formL.id),data)}else u.lessons.push({id:`${sid}-c${Date.now()}`,...data});closeSheet();await commit(sid,C);toast('تم حفظ الدرس');return}
 if(f.id==='tf'){const T={name:$('tn'),qual:$('tq')};const ck=ckey(sid);CONTENT[ck]=Object.assign({},CONTENT[ck],{teacher:T});closeSheet();render();
  try{await db.collection('content').doc(ck).set({grade:S.grade,sid,teacher:T},{merge:true})}catch(x){toast(errMsg(x))}return}
 if(f.id==='sf'){S.schedule.push({day:+$('sd'),time:$('st'),subj:$('ss'),note:$('sn')});save();closeSheet();render();toast('تمت إضافة الموعد');return}
});

/* ---------- magic ---------- */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.createElement('canvas');cv.id='magic';document.body.prepend(cv);
const cx=cv.getContext('2d');let W=0,H=0,DPR=Math.min(2,devicePixelRatio||1),COL=['#fff','#fcd34d'];
const stars=[],sparks=[];
function size(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',size);size();
for(let i=0;i<38;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.4,s:Math.random()*.25+.05,t:Math.random()*6.28,k:Math.random()<.5?0:1});
function star4(x,y,r){cx.beginPath();cx.moveTo(x,y-r);cx.quadraticCurveTo(x,y,x+r,y);cx.quadraticCurveTo(x,y,x,y+r);cx.quadraticCurveTo(x,y,x-r,y);cx.quadraticCurveTo(x,y,x,y-r);cx.fill()}
function burst(x,y,n){if(RM)return;for(let i=0;i<n;i++){const a=Math.random()*6.28,v=Math.random()*5+2;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,life:1,r:Math.random()*5+3,k:i%3?1:0})}if(!running)loop()}
let running=false;
function loop(){running=true;cx.clearRect(0,0,W,H);
 for(const s of stars){s.t+=.03;s.y-=s.s;if(s.y<-5){s.y=H+5;s.x=Math.random()*W}cx.globalAlpha=.25+.45*Math.abs(Math.sin(s.t));cx.fillStyle=COL[s.k];s.r>1.4?star4(s.x,s.y,s.r*2.4):(cx.beginPath(),cx.arc(s.x,s.y,s.r,0,6.28),cx.fill())}
 for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.vx*=.98;p.life-=.02;if(p.life<=0){sparks.splice(i,1);continue}cx.globalAlpha=p.life;cx.fillStyle=COL[p.k];star4(p.x,p.y,p.r*p.life+1)}
 cx.globalAlpha=1;if(RM&&!sparks.length){running=false;return}requestAnimationFrame(loop)}
function applySkin(){const r=document.documentElement;r.dataset.skin=S.skin||'emerald';const cs=getComputedStyle(r);COL=[cs.getPropertyValue('--accent-hi').trim()||'#fff',cs.getPropertyValue('--fg').trim()||'#fff'];const m=document.querySelector('meta[name=theme-color]');if(m)m.content=cs.getPropertyValue('--bg').trim()}
applySkin();loop();
function standalone(){return NATIVE||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
if(!NATIVE&&'serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ---------- firebase ---------- */
async function pullProgress(){
 try{const d=await db.collection('progress').doc(ME.uid).get();if(!d.exists){save();return}
  const p=d.data();Object.assign(S.done,p.done||{});Object.assign(S.marks,p.marks||{});
  if(!S.last&&p.last)S.last=p.last;if(!S.schedule.length&&p.schedule)S.schedule=p.schedule;if(p.skin)S.skin=p.skin;
  if(isStaff()&&p.grade)S.grade=p.grade;
  applySkin();save();softRender();
 }catch(e){}
}
function resetData(){
 if(unsubMe){unsubMe();unsubMe=null}
 Object.values(unsubGrade).forEach(f=>{try{f()}catch(e){}});unsubGrade={};
 [CONTENT,URLS,URLS_LOADED].forEach(o=>{for(const k in o)delete o[k]});
 ADM={tab:'students',users:null,codes:null,progress:null,q:'',busy:false,codeFilter:'unused'};
}
function migrateOld(){try{const raw=localStorage.getItem('durusi_v1');if(!raw||localStorage.getItem('durusi_v1_moved'))return;const o=JSON.parse(raw);
 Object.assign(S.done,o.done||{});Object.assign(S.marks,o.marks||{});if(!S.schedule.length&&Array.isArray(o.schedule))S.schedule=o.schedule;if(!S.last&&o.last)S.last=o.last;if(o.skin)S.skin=o.skin;
 localStorage.setItem('durusi_v1_moved','1');save()}catch(e){}}
function onUser(u){
 resetData();
 if(!u){ME=null;AUTH='out';V.authMode='login';S=blankS();applySkin();closeSheet();render();return}
 ME={uid:u.uid,email:(u.email||'').toLowerCase(),verified:!!u.emailVerified,name:'',role:'student',grade:10,active:false,activeUntil:null,accessGrade:0,subjects:[]};
 S=blankS();try{Object.assign(S,JSON.parse(localStorage.getItem(LKEY())||'{}'))}catch(e){}
 migrateOld();
 const ref=db.collection('users').doc(u.uid);
 unsubMe=ref.onSnapshot(d=>{
  if(!d.exists){const pp=PENDING||{};PENDING=null;
   ref.set({name:pp.name||ME.email.split('@')[0],email:ME.email,grade:pp.grade||S.grade||10,role:'student',active:false,createdAt:serverTs()}).catch(e=>{AUTH='in';render();toast(errMsg(e))});return}
  const p=d.data(),before=accessOf(ME)+'|'+ME.accessGrade+'|'+ME.role;
  Object.assign(ME,{name:p.name||'',role:p.role||'student',grade:p.grade||10,active:!!p.active,activeUntil:toDate(p.activeUntil),accessGrade:p.accessGrade||0,subjects:p.subjects||[]});
  if(before!==accessOf(ME)+'|'+ME.accessGrade+'|'+ME.role)for(const k in URLS_LOADED)delete URLS_LOADED[k];
  if(!isStaff())S.grade=ME.grade;
  else if(isTeacher()&&!(()=>{try{return localStorage.getItem(LKEY())}catch(e){return null}})()&&ME.subjects[0])S.grade=parseCk(ME.subjects[0]).g;
  const first=AUTH!=='in';AUTH='in';watchGrade(S.grade);
  if(first){applySkin();V.view='home';closeSheet();render();pullProgress()}else softRender();
 },e=>{AUTH='in';render();toast(errMsg(e))});
}
function boot(){
 if(!CONFIGURED){AUTH='setup';render();return}
 if(!window.firebase){AUTH='neterr';render();return}
 firebase.initializeApp(FIREBASE_CONFIG);auth=firebase.auth();db=firebase.firestore();
 try{auth.languageCode='ar'}catch(e){}
 try{db.settings({ignoreUndefinedProperties:true,merge:true})}catch(e){}
 try{db.enablePersistence({synchronizeTabs:true}).catch(()=>{})}catch(e){}
 auth.onAuthStateChanged(onUser);
}
render();boot();
