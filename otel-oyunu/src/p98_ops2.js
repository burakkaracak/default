
// =====================================================================
// MG6-2 · İŞLETME DERİNLİĞİ: mutfak (oda servisi pişirilir), çamaşırhane →
// depo havlu zinciri, rezervasyon takvimi + overbooking, personel morali
// (vardiya, izin, grev, prim), misafir hafızası
// =====================================================================

// ---------- mutfak: oda servisi siparişleri pişirilir, tepsi hazır olunca alınır ----------
function kitchen(){ return state.kitchen||(state.kitchen={ready:1,cook:0}); }
function foodOrders(){ let n=0; for(const k in state.rooms){ const R=RT(+k); if(R.req&&R.req.item==='food') n++; } return n; }
function kitchenReady(){ return kitchen().ready>0; }
function kitchenTake(){ const K=kitchen(); K.ready=Math.max(0,K.ready-1); }
function cookTime(){ return 7/(1+0.25*invLv('chef'))/(staffEnts.some(e=>e.kind==='cook'&&!e.leaveNow)?1.5:1); }
let trayG=null;
function updateKitchen(dt){
  if(!built('rest')) return; const K=kitchen(), want=Math.min(4,foodOrders()+(restOpen()?1:0));
  if(K.ready<want&&(restOpen()||nightKitchen())){ K.cook+=dt/cookTime(); if(K.cook>=1){ K.cook=0; K.ready++; if(player.f===0&&d2(player.x,player.z,L.pass.x,L.pass.z)<64) sfx('ding'); fxEmoji(L.pass.x,1.6,L.pass.z,0,'🍽️'); } if(Math.random()<dt*0.6) fxEmoji(-12.8,2.1,-2.75,0,rand(['🍳','🔥','🥘'])); } else K.cook=0;
  // tezgâhta hazır tepsiler
  if(!trayG){ trayG=new THREE.Group(); outdoor.add(trayG); for(let i=0;i<4;i++){ const t=new THREE.Group(); t.add(mesh(cyl(0.16,0.16,0.02,14),mat(0xc9d1d8,{metalness:.7,roughness:.3}),0,0,0)); t.add(mesh(new THREE.SphereGeometry(0.12,12,6,0,Math.PI*2,0,Math.PI/2),mat(0xdfe6ec,{metalness:.8,roughness:.25}),0,0.01,0)); t.position.set(L.pass.x-0.45+i*0.3,1.0,L.pass.z-0.35); trayG.add(t); } }
  trayG.children.forEach((t,i)=>t.visible=i<K.ready);
}
function kitchenHtml(){ if(!built('rest')) return ''; const K=kitchen(); return `<div class="row"><div class="ic">👨‍🍳</div><div class="tx">Mutfak · ${K.ready} tepsi hazır<small>Oda servisi siparişi: ${foodOrders()} · her tepsi ${cookTime().toFixed(1)} sn'de pişer (${state.staff.cook&&state.staff.cook.n?'👨‍🍳 aşçı ×1,5':'aşçı işe al: ×1,5'} · şef yatırımı da hızlandırır)</small></div></div>`; }

// ---------- çamaşırhane → depo: yıkanan çarşaf havlu stoğuna döner ----------
function laundryToStock(n){ if(!state.stock) return; const cap=stockCap(); state.stock.towel=Math.min(cap,(state.stock.towel||0)+n*2); }

// ---------- rezervasyon takvimi ----------
const OB=[{k:0,n:'Yok'},{k:0.15,n:'%15'},{k:0.3,n:'%30'}];
function obRate(){ return OB[state.obIx||0].k; }
function bookDay(d){ return (state.book||{})[d]||{n:0,left:0}; }
function bookingsOpen(){ return stars()>=3; }   // yeni oyuncu yormasın: rezervasyon 3★'da açılır
function planBookings(rep){ // gün sonu: 2 gün sonrası için rezervasyon alınır, kapora hemen kasaya girer
  if(state.tut<TUT.length||state.sandbox||!bookingsOpen()) return; state.book=state.book||{}; const d=state.day+2; if(state.book[d]) return;
  const cap=nRoomsNow(); if(cap<4) return; const n=Math.round(cap*rnd(0.18,0.32)*(1+obRate())*priceDemand()*invDemand());
  const dep=r10(n*avgRate()*0.1*incomeMult()); state.book[d]={n,left:n,dep}; state.money+=dep; (rep||state.today).rooms+=dep;   // kapora biten günün raporuna
  for(const k in state.book) if(+k<state.day-1) delete state.book[k];
}
function avgRate(){ let s=0,c=0; for(const k in state.rooms){ s+=roomRate(+k); c++; } return c?s/c:30; }
let bookT=5;
function updateBookings(dt){
  const B=(state.book||{})[state.day]; if(!B||B.left<=0||state.tut<TUT.length) return;
  const h=hourNow(); if(h<9||h>21) return; bookT-=dt; if(bookT>0) return; bookT=DAY_SEC*(12/24)/Math.max(1,B.n)*rnd(0.7,1.3);
  if(queue.length>=10) return; B.left--; const g=spawnGuest(); g.booked=true; g.patMax=g.pat=g.patMax*1.3; if(g.tag) g.tag.y=2.05; fxEmoji(g.x,2.4,g.z,0,'📅');
}
// rezervasyonlu misafir oda bulamayıp giderse: tazminat + ün
function bookedLeft(g){ if(!g.booked) return; const c=r10(avgRate()*incomeMult()*0.6); state.money-=c; changeRep(-1.5);
  const free=roomsWhere(id=>!RT(id).guest&&!state.rooms[id].dirty&&!state.rooms[id].broken).length>0;   // boş oda vardıysa sorun bekletmekti
  toast(free?`📅 Rezervasyonlu ${g.name} resepsiyonda çok bekletildi, gitti: −${fmt(c)} ₺ tazminat, −1.5 ün`:`📅 Rezervasyonlu ${g.name} odasız kaldı: −${fmt(c)} ₺ tazminat, −1.5 ün`,'bad'); }
function bookingHtml(){
  if(!bookingsOpen()) return `<div class="row" style="opacity:.55"><div class="ic">🔒</div><div class="tx">Rezervasyon takvimi<small>3★'da açılır: kapora, rezervasyonlu misafir ve fazla rezervasyon</small></div></div>`;
  const days=[0,1,2].map(i=>state.day+i), cap=nRoomsNow();
  return `<div class="ugh">📅 Rezervasyon takvimi</div><div class="grid2" style="grid-template-columns:repeat(3,1fr)">${days.map(d=>{ const B=bookDay(d); return `<div class="stat">${d===state.day?'Bugün':d-state.day+' gün sonra'}<b>${B.n}${B.left&&d===state.day?` <small>(${B.left} yolda)</small>`:''}</b></div>`; }).join('')}</div>
    <div class="row"><div class="ic">⚖️</div><div class="tx">Fazla rezervasyon (overbooking)<small>Daha çok kapora ve misafir; ama oda bulamayan rezervasyonlu misafir tazminat ve ün kaybettirir · ${cap} oda</small></div></div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px">${OB.map((o,i)=>`<button class="btn ${(state.obIx||0)===i?'gold':'ghost'}" data-ob="${i}" style="flex:1">${o.n}</button>`).join('')}</div>`; }

// ---------- personel morali: vardiya, izin, grev, prim ----------
function morale(){ return state.morale==null?70:state.morale; }
function strikeOn(){ return (state.strike||0)>0; }
function moraleMul(){ return strikeOn()?0.05:0.8+0.4*morale()/100; }
function nightStaffMul(){ return isNight()&&!state.nightShift?0.5:1; }
function nightWageMul(){ return state.nightShift?1.25:1; }
function moraleDay(){
  if(!built('staff')||!staffEnts.length) return; let d=0; const avgE=staffEnts.reduce((a,e)=>a+(e.energy??100),0)/staffEnts.length;
  d+=state.breakroom?2:0; d+=avgE<40?-5:1; d+=state.money<0?-6:0; d+=state.nightShift?-1:0; if(state.leaveDenied===state.day-1) d-=6;
  state.morale=clamp(morale()+d,0,100);
  if(stars()<3||state.sandbox) return;   // grev ve izin talepleri 3★'dan sonra
  if(morale()<25&&Math.random()<0.5){ state.strike=60; banner('✊ Personel grevde!','Moral çok düştü · sabah brifinginden prim verebilirsin'); morningAdd({k:'strike'}); }
  else if(Math.random()<0.35&&staffEnts.length){ const e=rand(staffEnts); morningAdd({k:'leave',kind:e.kind,name:e.name||''}); }
}
function bonusCost(){ return r10(staffEnts.length*60*cm()); }
function giveBonus(){ const c=bonusCost(); if(!spend(c)) return; state.morale=clamp(morale()+18,0,100); state.strike=0; staffEnts.forEach(e=>{ e.energy=100; fxEmoji(e.x,e.y+2.1,e.z,e.f,'🥳'); }); sfx('star'); toast(`💰 Personele prim verildi: moral +18`); markSave(); renderSheet(); }
function onLeave(e){ const L2=state.leaveDay; return !!(L2&&L2.day===state.day&&L2.kind===e.kind&&staffEnts.filter(x=>x.kind===e.kind).indexOf(e)===0); }
function staffHtml2(){ if(!built('staff')) return ''; const m=Math.round(morale());
  return `<div class="ugh">😊 Personel morali</div><div class="row"><div class="ic">${m>=70?'😄':m>=40?'🙂':m>=25?'😟':'😠'}</div><div class="tx">Moral ${m}/100${strikeOn()?' · ✊ GREV':''}<small>Hız ×${moraleMul().toFixed(2)} · düşük moral grev riski · mola odası ve prim moral verir</small>${pips(Math.round(m/20),5)}</div><button class="btn gold" data-bonus ${state.money<bonusCost()?'disabled':''}>Prim<br>${fmt(bonusCost())} ₺</button></div>
    <div class="row"><div class="ic">🌙</div><div class="tx">Gece vardiyası<small>${state.nightShift?'Açık: personel gece de tam hızla çalışır, maaşlar +%25':'Kapalı: gece personel yarı hızla çalışır'}</small></div><button class="btn ${state.nightShift?'gold':''}" data-nshift>${state.nightShift?'Açık':'Kapalı'}</button></div>`; }
function bindOps2(root){ const b=root.querySelector('[data-bonus]'); if(b) b.onclick=giveBonus; const n=root.querySelector('[data-nshift]'); if(n) n.onclick=()=>{ state.nightShift=!state.nightShift; sfx('click'); markSave(); renderSheet(); };
  root.querySelectorAll('[data-ob]').forEach(x=>x.onclick=()=>{ state.obIx=+x.dataset.ob; sfx('click'); markSave(); renderSheet(); }); }


// ---------- sabah brifingi: günün kararları tek kartta, kayıtta kalıcı (yenilemede kaybolmaz) ----------
// kalemler: mgr (müdür kartı), leave (izin talebi), war (fiyat savaşı), strike (grev)
function morningQ(){ const M=state.morning; return M&&M.day===state.day?M.items:[]; }
let briefT=null;
function morningAdd(it){ if(state.sandbox) return; if(!state.morning||state.morning.day!==state.day) state.morning={day:state.day,items:[]};
  const I=state.morning.items; if(I.some(x=>x.k===it.k)) return; I.push(it); markSave(); if(!briefT) briefT=setTimeout(()=>{ briefT=null; openBriefing(); },4600); }
function morningDone(k){ if(!state.morning) return; state.morning.items=state.morning.items.filter(x=>x.k!==k); markSave(); }
function briefItemHtml(it){
  if(it.k==='mgr'){ const O=state.mgrOffer; if(!O||O.day!==state.day) return ''; return `<div class="row"><div class="ic">🗂️</div><div class="tx">Müdür masası<small>Bugünün stratejisi için ${O.ks.length} kart</small></div><button class="btn gold" data-bf="mgr">Seç</button></div>`; }
  if(it.k==='leave') return `<div class="row"><div class="ic">🏖️</div><div class="tx">İzin talebi<small>${escH(it.name||'Bir çalışan')} (${(STAFF[it.kind]||{}).name||''}) yarın izin istiyor · ver: moral +6, reddet: moral −6</small></div><button class="btn gold" data-bf="leaveY">Ver</button><button class="btn ghost" data-bf="leaveN">Reddet</button></div>`;
  if(it.k==='war'){ const r=state.rival; if(!rivalOn()) return ''; return `<div class="row"><div class="ic">📉</div><div class="tx">Fiyat savaşı<small>${escH(r.name)} bugün indirimde · karşılık verirsen bugün fiyatlar −%10 ama misafir kaybı büyük ölçüde durur</small></div><button class="btn gold" data-bf="warY">Karşılık ver</button><button class="btn ghost" data-bf="warN">Boş ver</button></div>`; }
  if(it.k==='strike'){ if(!strikeOn()) return ''; return `<div class="row"><div class="ic">✊</div><div class="tx">Grev<small>Moral çok düştü, personel iş bıraktı · yaklaşık ${Math.ceil(state.strike/60*7.5)} oyun saati sürer</small></div><button class="btn gold" data-bf="strike" ${state.money<bonusCost()?'disabled':''}>Prim ${fmt(bonusCost())} ₺</button></div>`; }
  return ''; }
function openBriefing(){
  const items=morningQ().filter(it=>briefItemHtml(it)); if(!items.length||state.tut<TUT.length) return;
  openModal(`<h3>☀️ Sabah brifingi · ${state.day}. gün</h3><p class="sub">Bugün karar bekleyen işler</p><div id="bfList">${items.map(briefItemHtml).join('')}</div><button class="btn ghost wide" id="bfLater">Sonra (Otel › Genel'den açılır)</button>`,m=>{
    m.querySelector('#bfLater').onclick=closeModal;
    m.querySelectorAll('[data-bf]').forEach(b=>b.onclick=()=>{ const a=b.dataset.bf, it=morningQ().find(x=>a.startsWith(x.k));
      if(a==='mgr'){ morningDone('mgr'); closeModal(); openMgr(); return; }
      if(a==='leaveY'){ state.morale=clamp(morale()+6,0,100); state.leaveDay={day:state.day+1,kind:it.kind}; toast('🏖️ İzin verildi'); morningDone('leave'); }
      if(a==='leaveN'){ state.leaveDenied=state.day; state.morale=clamp(morale()-6,0,100); morningDone('leave'); }
      if(a==='warY'){ state.priceWar=state.day; toast('⚔️ Fiyat savaşına girdin: bugün −%10'); morningDone('war'); }
      if(a==='warN'){ morningDone('war'); }
      if(a==='strike'){ giveBonus(); morningDone('strike'); }
      sfx('click'); markSave(); closeModal(); if(morningQ().some(x=>briefItemHtml(x))) setTimeout(openBriefing,250); }); }); }
function briefingHtml(){ const n=morningQ().filter(it=>briefItemHtml(it)).length; if(!n) return ''; return `<div class="row"><div class="ic">☀️</div><div class="tx">Sabah brifingi<small>${n} karar bekliyor</small></div><button class="btn gold" data-brief>Aç</button></div>`; }
function bootBriefing(){ if(strikeOn()) morningAdd({k:'strike'}); else if(morningQ().length) briefT=setTimeout(()=>{ briefT=null; openBriefing(); },3500); }

// ---------- misafir hafızası ----------
function rememberGuest(g){ if(!g.loyal&&!(state.loyal||[]).some(x=>x.n===g.name)) return; const x=(state.loyal||[]).find(x=>x.n===g.name)||{n:g.name,t:g.type};
  x.room=g.lastRoomId; x.sat=Math.round(g.sat); x.visits=(x.visits||0)+1; x.food=g.ateFood||x.food; if(!(state.loyal||[]).includes(x)){ state.loyal=state.loyal||[]; state.loyal.push(x); } }
function memoryAtDesk(g){ const x=g.memory; if(!x||g.memShown) return; g.memShown=true;
  toast(`🧠 ${g.name} ${x.visits||1}. kez geliyor · geçen sefer ${x.room?'Oda '+x.room:'?'} ${x.sat>=68?'😄':x.sat>=42?'🙂':'😠'}${x.room?' · aynı odayı verirsen sevinir':''}${x.food?' · oda servisini sever 🍽️':''}`); if(x.room) showMemRing(g,x.room); }
function memorySat(g,id){ const x=g.memory; if(!x) return 0; let d=0; hideMemRing(); if(x.food) g.reqT=rnd(4,9); if(x.room===id){ d+=8; const ri=roomInfo(id); fxEmoji(g.x,2.8,g.z,0,'🧠❤️'); if(!state.lowFx) confettiAt(ri.x,ri.f*FH+1.6,ri.z,24); sfx('sparkle'); toast(`🧠❤️ ${g.name} eski odasına kavuştu: +8 memnuniyet`); } if(x.sat<42) d-=6; return d; }
// resepsiyonda sadık misafirin eski odası yerde pembe halka ile parlar
let memRing=null, memGuest=null;
function showMemRing(g,id){ hideMemRing(); if(!state.rooms[id]||RT(id).guest) return; const ri=roomInfo(id);
  memRing=mesh(new THREE.RingGeometry(0.95,1.15,40),new THREE.MeshBasicMaterial({color:0xff7eb6,transparent:true,opacity:0.75,depthWrite:false,side:THREE.DoubleSide}),ri.x,0.09,ri.z); memRing.rotation.x=-Math.PI/2; floorRoot(ri.f).add(memRing); memGuest=g; }
function hideMemRing(){ if(memRing){ memRing.parent&&memRing.parent.remove(memRing); memRing.geometry.dispose(); memRing.material.dispose(); memRing=null; } memGuest=null; }
function updateMemRing(){ if(!memRing) return; if(!memGuest||memGuest.state!=='queue'||memGuest.dead||!guests.includes(memGuest)){ hideMemRing(); return; } const k=1+0.12*Math.sin(performance.now()/180); memRing.scale.set(k,k,k); memRing.material.opacity=0.5+0.3*Math.sin(performance.now()/260); }
function memoryPick(g,rs){ const x=g.memory; return x&&x.room&&rs.includes(x.room)?x.room:null; }

// ---------- hooks ----------
// akşam uyarısı: kasa sabahki maaşlara yetmiyorsa
let wageWarnDay=-1;
function wageWarn(){ if(wageWarnDay===state.day||state.tut<TUT.length||state.sandbox||hourNow()<19) return; wageWarnDay=state.day; const w=wagesToday();
  if(w>0&&state.money<w) toast(`⚠️ Kasada ${fmt(Math.max(0,Math.floor(state.money)))} ₺ var, sabah maaşları ${fmt(w)} ₺ · gece harcamaları dengele`,'bad'); }
function updateOps2(dt){ wageWarn(); if(state.strike>0){ state.strike=Math.max(0,state.strike-dt); if(!state.strike) toast('✊ Grev bitti, personel işe döndü'); } updateKitchen(dt); updateBookings(dt); if(queue[0]&&queue[0].memory&&queue[0].state==='queue'&&!queue[0].path) memoryAtDesk(queue[0]); updateMemRing(); }
function ops2DayEnd(rep){ planBookings(rep); moraleDay(); }
