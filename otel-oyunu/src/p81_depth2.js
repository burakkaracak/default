
// =====================================================================
// DEPTH 2: hotel chain managers, skill tree, staff careers & poaching,
// weekly quests + reward road, trophy ledge, 2x speed, auto cashier
// =====================================================================

// ---------- skill tree (1 point per manager level) ----------
const SKILLS={
  g:{name:'💝 Misafir ilişkileri',list:[['g1','Sıcak karşılama','Her misafir +3 memnuniyetle başlar'],['g2','Bahşiş ustası','Bahşişler %15 fazla'],['g3','Sabır sanatı','Sıradaki misafirler %12 daha sabırlı'],['g4','VIP ağı','Ünlüler daha sık gelir, mutlu misafir %10 fazla ün verir']]},
  o:{name:'⚙️ Operasyon',list:[['o1','Hızlı temizlik','Kendi temizliğin %15 hızlı'],['o2','Ekip lideri','Tüm personel %8 hızlı'],['o3','Büyük depo','Depo kapasitesi +20'],['o4','Verimli yönetim','Maaşlar %12 düşük']]},
  m:{name:'📣 Pazarlama',list:[['m1','Sosyal medya','%10 daha fazla misafir'],['m2','Reklam dehası','Reklam %30 ucuz ve %50 uzun'],['m3','Marka gücü','Rakibe kaçan misafir %30 az'],['m4','Premium algı','Yüksek fiyatın talep cezası yarıya iner']]}};
function skillLv(k){ return (state.skills&&state.skills[k])||0; }
function skillPts(){ let used=0; for(const k in (state.skills||{})) used+=state.skills[k]; return Math.max(0,(state.lvl||1)-1-used); }
function learnSkill(k){ const br=SKILLS[k[0]], i=br.list.findIndex(x=>x[0]===k); if(skillLv(k)||skillPts()<1||(i>0&&!skillLv(br.list[i-1][0]))) return;
  state.skills=state.skills||{}; state.skills[k]=1; sfx('star'); toast(`🧠 Yetenek öğrenildi: ${br.list[i][1]}`); if(player) confettiAt(player.x,player.y+2,player.z,30); save(); renderSheet(); }
function renderSkillSheet(){
  const pts=skillPts();
  let h=`<h3>🧠 Müdür yetenekleri <button class="xbtn" data-close aria-label="Kapat">✖</button></h3><p class="sub">Seviye ${state.lvl||1} · harcanabilir puan: <b style="color:var(--gold2)">${pts}</b> · her seviye 1 puan</p>`;
  for(const b in SKILLS){ const B=SKILLS[b]; h+=`<div class="ugh">${B.name}</div>`;
    B.list.forEach(([k,n,d],i)=>{ const has=skillLv(k), can=!has&&pts>0&&(i===0||skillLv(B.list[i-1][0]));
      h+=`<div class="row${has?' qdone':''}"><div class="ic">${has?'✅':i+1}</div><div class="tx">${n}<small>${d}</small></div>${has?'<button class="btn" disabled>Açık</button>':`<button class="btn gold" data-skill="${k}" ${can?'':'disabled'}>${i>0&&!skillLv(B.list[i-1][0])?'🔒':'Öğren'}</button>`}</div>`; }); }
  h+=`<button class="btn ghost wide" data-achs>🏆 Başarımlar</button>`;
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet; sheet.querySelector('[data-achs]').onclick=()=>openSheet('ach');
  sheet.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>learnSkill(b.dataset.skill));
}

// ---------- hotel chain: managers keep old hotels earning ----------
function chainHotelIncome(h){ return r10(36*40*CITIES[h.city%CITIES.length].mult*0.08*(0.5+(h.stars||3)/5)); }
function managerCost(h){ return r10(1200*CITIES[h.city%CITIES.length].mult); }
function chainIncome(){ let s=0; (state.hist||[]).forEach((h,i)=>{ if(state.mgrs&&state.mgrs[i]) s+=chainHotelIncome(h); }); return s; }
function hireManager(i){ const h=(state.hist||[])[i]; if(!h||(state.mgrs&&state.mgrs[i])||!spend(managerCost(h))) return; state.mgrs=state.mgrs||{}; state.mgrs[i]=true; sfx('build'); toast(`🏨 ${CITIES[h.city%CITIES.length].name} otelinin müdürü atandı · günlük +${fmt(chainHotelIncome(h))} ₺`); save(); openCityMap(); }
function chainHtml(){
  const H=state.hist||[]; if(!H.length) return '';
  return `<div class="ugh">🏨 Zincir otellerin · günlük toplam ${fmt(chainIncome())} ₺</div>`+H.map((h,i)=>{ const C=CITIES[h.city%CITIES.length], on=state.mgrs&&state.mgrs[i];
    return `<div class="row"><div class="ic">${C.e}</div><div class="tx">${C.name} oteli<small>${'★'.repeat(h.stars||3)} · ${on?`müdür yönetiyor · günlük +${fmt(chainHotelIncome(h))} ₺`:`müdür atarsan günlük +${fmt(chainHotelIncome(h))} ₺`}</small></div>${on?'<button class="btn" disabled>✓</button>':`<button class="btn gold" data-mgr="${i}" ${state.money<managerCost(h)?'disabled':''}>Müdür<br>${fmt(managerCost(h))} ₺</button>`}</div>`; }).join('');
}

// ---------- staff careers ----------
const RANKS=['Çaylak','Deneyimli','Kıdemli','Uzman'], RANK_XP=[0,25,70,160];
function crewRec(kind){ state.crew=state.crew||{}; const list=state.crew[kind]=state.crew[kind]||[]; const i=staffEnts.filter(x=>x.kind===kind).length;
  return list[i]||(list[i]={n:rand(STAFF_NAMES),xp:0}); }
function rankOf(e){ const x=e.rec?e.rec.xp:0; let r=0; for(let i=1;i<RANK_XP.length;i++) if(x>=RANK_XP[i]) r=i; return r; }
function careerWorked(e){ if(!e.rec) return; const r0=rankOf(e); e.rec.xp++; const r1=rankOf(e);
  if(r1>r0){ fxEmoji(e.x,e.y+2.3,e.z,e.f,'⭐'); toast(`⭐ ${e.name} terfi etti: ${RANKS[r1]} ${STAFF[e.kind].name} · %${7*r1} hızlı, maaşı +%${8*r1}`); sfx('sparkle'); markSave(); } }
function crewPremium(){ let w=0; staffEnts.forEach(e=>{ w+=staffWage(e.kind)*0.08*rankOf(e); }); return w; }
function crewNames(k){ const L0=staffEnts.filter(e=>e.kind===k); return L0.length?`<small>${L0.map(e=>`${escH(e.name)} <span style="color:var(--gold2)">${RANKS[rankOf(e)]}</span>${(e.energy??100)<30?' 😓':''}`).join(' · ')}</small>`:''; }
function fireStaff(e){ const i=staffEnts.indexOf(e); if(e.job) finishJob(e); if(i>=0) staffEnts.splice(i,1); e.remove(); state.staff[e.kind].n=Math.max(0,state.staff[e.kind].n-1);
  const L0=state.crew&&state.crew[e.kind]; if(L0){ const j=L0.indexOf(e.rec); if(j>=0) L0.splice(j,1); } staffEnts.forEach((x,k)=>x.idx=k); }
function careerDayEnd(){
  if(!rivalOn()||Math.random()>0.22) return; const cands=staffEnts.filter(e=>rankOf(e)>=2&&!e.poachCd); if(!cands.length) return;
  const e=rand(cands), r=rankOf(e), bonus=r10(260*cm()*r);
  setTimeout(()=>{ if(!staffEnts.includes(e)||modalWrap.classList.contains('show')) return;
    openModal(`<h3>🏢 Rakip teklif yaptı!</h3><p class="sub">${escH(state.rival.name)}, ${RANKS[r].toLowerCase()} ${STAFF[e.kind].name.toLowerCase()} <b>${escH(e.name)}</b> ile görüştü. Onu tutmak için prim verebilirsin.</p>
      <button class="btn gold wide" id="pcKeep" ${state.money<bonus?'disabled':''}>💰 Prim ver ve tut · ${fmt(bonus)} ₺</button><button class="btn ghost wide" id="pcGo">👋 Gitmesine izin ver</button>`,m=>{
      m.querySelector('#pcKeep').onclick=()=>{ if(!spend(bonus)) return; e.poachCd=true; e.energy=100; closeModal(); toast(`🤝 ${e.name} kaldı ve çok motive!`); sfx('sparkle'); save(); };
      m.querySelector('#pcGo').onclick=()=>{ closeModal(); toast(`👋 ${e.name} rakip otele geçti`,'bad'); fireStaff(e); save(); }; }); },5200);
}

// ---------- weekly quests ----------
const WDEF={
  guest:{e:'🛎️',t:n=>`Bu hafta ${n} misafir ağırla`,n:()=>clamp(nRoomsNow()*4,20,120),ok:()=>true},
  happy:{e:'😍',t:n=>`${n} misafiri mutlu gönder`,n:()=>clamp(nRoomsNow()*2,10,70),ok:()=>true},
  clean:{e:'🧹',t:n=>`Kendin ${n} oda temizle`,n:()=>clamp(Math.round(nRoomsNow()*1.2),8,40),ok:()=>true},
  earn:{e:'💰',t:n=>`${fmt(n)} ₺ kazan`,n:()=>r10(Math.max(1500,roomRateSum()*20*incomeMult())),ok:()=>true},
  event:{e:'📅',t:()=>'Bir etkinlik düzenle',n:()=>1,ok:()=>built('rest')||built('cafe')||built('pool')},
  linen:{e:'🧦',t:n=>`${n} kirli çarşaf yıka`,n:()=>15,ok:()=>built('laundry')},
  loyal:{e:'💌',t:n=>`${n} sadık misafir ağırla`,n:()=>2,ok:()=>state.day>=5}};
function weekId(){ return Math.floor((state.day-1)/7); }
function ensureWeek(){
  if(state.tut<TUT.length) return; if(state.week&&state.week.w===weekId()) return;
  const keys=Object.keys(WDEF).filter(k=>WDEF[k].ok()), pick=[]; while(pick.length<3&&keys.length) pick.push(keys.splice(Math.floor(Math.random()*keys.length),1)[0]);
  const rew=r10(Math.max(300,roomRateSum()*3*incomeMult()));
  state.week={w:weekId(),list:pick.map(k=>({k,n:WDEF[k].n(),have:0,done:false})),rew}; markSave();
}
function weeklyEv(k,v){
  if(state.sandbox||!state.week||state.week.w!==weekId()) return;
  for(const q of state.week.list){ if(q.k!==k||q.done) continue; q.have=Math.min(q.n,q.have+v);
    if(q.have>=q.n){ q.done=true; addMoney(state.week.rew,player.x,player.y+1.2,player.z,player.f,true); passPts(60);
      banner('📆 Haftalık görev tamam!',`${WDEF[q.k].t(q.n)} · +${fmt(state.week.rew)} ₺ · +60 🎖️`); sfx('star'); } markSave(); }
}

// ---------- reward road (season pass) ----------
const PASS=[['money',200],['key',1],['hat','crown'],['money',400],['key',2],['hat','beret'],['money',800],['fw',1],['key',3],['hat','tophat'],['money',1500],['key',4],['money',2500],['key',5],['title',5000]];
const HAT_N={crown:'Taç',beret:'Bere',tophat:'Silindir'};
function passPts(n){ if(state.sandbox) return; state.pass=state.pass||{pts:0,got:[]}; state.pass.pts+=n; markSave(); }
function passTier(){ return Math.floor(((state.pass&&state.pass.pts)||0)/100); }
function passLabel(r){ const [t,v]=r; return t==='money'?`💰 ${fmt(Math.round(v*cm()))} ₺`:t==='key'?`🗝️ ${v} anahtar`:t==='hat'?`🎩 ${HAT_N[v]} şapka`:t==='fw'?'🎆 Havai fişek gösterisi':`🏆 "Efsane müdür" + ${fmt(Math.round(v*cm()))} ₺`; }
function claimPass(i){
  const P=state.pass; if(!P||P.got.includes(i)||passTier()<=i) return; P.got.push(i); const [t,v]=PASS[i];
  if(t==='money'||t==='title'){ addMoney(Math.round(v*cm()),player.x,player.y+1.2,player.z,player.f,true); if(t==='title') state.custom.title='Efsane müdür'; }
  if(t==='key') state.keys=(state.keys||0)+v;
  if(t==='hat'){ unlockHat(v); state.custom.hat=v; rebuildPlayer(); }
  if(t==='fw') fireworksShow(player.x,player.z);
  sfx('star'); confettiAt(player.x,player.y+2,player.z,50); toast(`🎖️ Ödül yolu: ${passLabel(PASS[i])}`); save(); renderSheet();
}
function unlockHat(v){ if(!CUST.hat.some(x=>x[0]===v)) CUST.hat.push([v,HAT_N[v]]); }
function renderPassSheet(){
  ensureWeek(); const tier=passTier(), pts=(state.pass&&state.pass.pts)||0, got=(state.pass&&state.pass.got)||[];
  let h=`<h3>🎯 Görevler <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>${qTabsHtml('pass')}`+leagueHtml()+`<p class="sub">${pts} puan · her 100 puan bir ödül · puanlar: günlük görev +20, haftalık +60, hedef +5, başarım +10</p>`;
  if(state.week){ h+=`<div class="ugh">📆 Bu haftanın görevleri (${7-((state.day-1)%7)} gün kaldı) · her biri +${fmt(state.week.rew)} ₺</div>`;
    state.week.list.forEach(q=>{ const D=WDEF[q.k]; h+=`<div class="row${q.done?' qdone':''}"><div class="ic">${D.e}</div><div class="tx">${D.t(q.n)}<small>${q.k==='earn'?fmt(q.have)+' / '+fmt(q.n):q.have+' / '+q.n}</small><div class="qbar"><i style="width:${(q.have/q.n*100).toFixed(0)}%"></i></div></div>${q.done?'✅':''}</div>`; }); }
  h+=`<div class="ugh">🎖️ Ödüller</div>`+claimAllBtn(passClaimables().length,'data-pall');
  PASS.forEach((r,i)=>{ const own=got.includes(i), open=tier>i;
    h+=`<div class="row${own?' qdone':''}"><div class="ic">${i+1}</div><div class="tx">${passLabel(r)}<small>${(i+1)*100} puan</small>${!open?`<div class="qbar"><i style="width:${Math.min(100,Math.max(0,(pts-i*100)))}%"></i></div>`:''}</div>${own?'<button class="btn" disabled>Alındı</button>':`<button class="btn gold${open?' qclaim':''}" data-pass="${i}" ${open?'':'disabled'}>${open?'Al 🎁':'🔒'}</button>`}</div>`; });
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h; sheet.querySelector('[data-close]').onclick=closeSheet;
  sheet.querySelectorAll('[data-pass]').forEach(b=>b.onclick=()=>claimPass(+b.dataset.pass)); bindQTabs(sheet); const pa=sheet.querySelector('[data-pall]'); if(pa) pa.onclick=()=>{ pa.disabled=true; claimAllPass(); };
}

// ---------- trophy ledge (cups on the front window sill) ----------
let trophyG=null, trophyN=-1;
function updateTrophies(){
  const n=Math.min(12,Math.floor(Object.keys(state.ach||{}).length/4)); if(n===trophyN) return; const grow=trophyN>=0&&n>trophyN; trophyN=n;
  if(trophyG) trophyG.parent.remove(trophyG); trophyG=new THREE.Group(); floorRoot(0).add(trophyG);
  const gold=mat(0xe8b64a,{metalness:.9,roughness:.2}), silver=mat(0xcfd6dc,{metalness:.9,roughness:.25});
  for(let i=0;i<n;i++){ const c=new THREE.Group(), m=i%3===0?gold:silver; c.position.set(1.7+i*0.44,0.76,7.42);
    c.add(mesh(cyl(0.07,0.09,0.04,10),M.dark,0,0.02,0)); c.add(mesh(cyl(0.02,0.02,0.1,6),m,0,0.09,0)); c.add(mesh(cyl(0.09,0.04,0.14,12),m,0,0.21,0));
    [-1,1].forEach(s=>{ const h=mesh(new THREE.TorusGeometry(0.04,0.01,5,10,Math.PI),m,s*0.095,0.23,0); h.rotation.z=s*Math.PI/2; c.add(h); }); trophyG.add(c); }
  if(grow) popIn(trophyG);
}

// ---------- 2x speed + auto cashier ----------
let autoT=10;
function autoCollect(dt){
  const lv=state.up.auto||0; if(!lv) return; autoT-=dt; if(autoT>0) return; autoT=UPG.auto.vals[lv];
  let n=0; for(const k in state.piles) if(state.piles[k]>0){ collectPile(k); n++; } for(const k in state.rooms) if(state.rooms[k].tip>0){ collectTip(+k); n++; }
  if(n) fxEmoji(player.x,player.y+2.4,player.z,player.f,'💼');
}
function toggleSpeed(){ gameSpeed=gameSpeed===1?2:1; $('spdBtn').classList.toggle('on',gameSpeed>1); $('spdBtn').textContent=gameSpeed>1?'2x':'⏩'; sfx('click'); }

// ---------- hooks ----------
function updateDepth2(dt){ autoCollect(dt); if((gtime|0)!==(updateDepth2.s|0)){ updateDepth2.s=gtime; updateTrophies(); ensureWeek(); } }
function bootDepth2(){
  ['crown','beret','tophat'].forEach(v=>{ if(state.pass&&state.pass.got&&PASS.some((r,i)=>r[1]===v&&state.pass.got.includes(i))) unlockHat(v); });
  $('spdBtn').onclick=toggleSpeed; ensureWeek(); updateTrophies();
}
