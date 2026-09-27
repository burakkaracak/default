
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
function cookTime(){ return 7/(1+0.25*invLv('chef'))/(state.staff.cook&&state.staff.cook.n?1.5:1); }
let trayG=null;
function updateKitchen(dt){
  if(!built('rest')) return; const K=kitchen(), want=Math.min(4,foodOrders()+(restOpen()?1:0));
  if(K.ready<want&&restOpen()){ K.cook+=dt/cookTime(); if(K.cook>=1){ K.cook=0; K.ready++; if(player.f===0&&d2(player.x,player.z,L.pass.x,L.pass.z)<64) sfx('ding'); fxEmoji(L.pass.x,1.6,L.pass.z,0,'🍽️'); } if(Math.random()<dt*0.6) fxEmoji(-12.8,2.1,-2.75,0,rand(['🍳','🔥','🥘'])); } else K.cook=0;
  // tezgâhta hazır tepsiler
  if(!trayG){ trayG=new THREE.Group(); outdoor.add(trayG); for(let i=0;i<4;i++){ const t=new THREE.Group(); t.add(mesh(cyl(0.16,0.16,0.02,14),mat(0xc9d1d8,{metalness:.7,roughness:.3}),0,0,0)); t.add(mesh(new THREE.SphereGeometry(0.12,12,6,0,Math.PI*2,0,Math.PI/2),mat(0xdfe6ec,{metalness:.8,roughness:.25}),0,0.01,0)); t.position.set(L.pass.x-0.45+i*0.3,1.0,L.pass.z-0.35); trayG.add(t); } }
  trayG.children.forEach((t,i)=>t.visible=i<K.ready);
}
function kitchenHtml(){ if(!built('rest')) return ''; const K=kitchen(); return `<div class="row"><div class="ic">👨‍🍳</div><div class="tx">Mutfak · ${K.ready} tepsi hazır<small>Oda servisi siparişi: ${foodOrders()} · her tepsi ${cookTime().toFixed(1)} sn'de pişer (Ödüllü şef hızlandırır)</small></div></div>`; }

// ---------- çamaşırhane → depo: yıkanan çarşaf havlu stoğuna döner ----------
function laundryToStock(n){ if(!state.stock) return; const cap=stockCap(); state.stock.towel=Math.min(cap,(state.stock.towel||0)+n*2); }

// ---------- rezervasyon takvimi ----------
const OB=[{k:0,n:'Yok'},{k:0.15,n:'%15'},{k:0.3,n:'%30'}];
function obRate(){ return OB[state.obIx||0].k; }
function bookDay(d){ return (state.book||{})[d]||{n:0,left:0}; }
function planBookings(){ // gün sonu: 2 gün sonrası için rezervasyon alınır, kapora hemen kasaya girer
  if(state.tut<TUT.length||state.sandbox) return; state.book=state.book||{}; const d=state.day+2; if(state.book[d]) return;
  const cap=nRoomsNow(); if(cap<4) return; const n=Math.round(cap*rnd(0.18,0.32)*(1+obRate())*priceDemand()*invDemand());
  const dep=r10(n*avgRate()*0.1*incomeMult()); state.book[d]={n,left:n,dep}; state.money+=dep; state.today.rooms+=dep;
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
function bookedLeft(g){ if(!g.booked) return; const c=r10(avgRate()*incomeMult()*0.6); state.money-=c; changeRep(-1.5); toast(`📅 Rezervasyonlu ${g.name} odasız kaldı: −${fmt(c)} ₺ tazminat, −1.5 ün`,'bad'); }
function bookingHtml(){
  const days=[0,1,2].map(i=>state.day+i), cap=nRoomsNow();
  return `<div class="ugh">📅 Rezervasyon takvimi</div><div class="grid2" style="grid-template-columns:repeat(3,1fr)">${days.map(d=>{ const B=bookDay(d); return `<div class="stat">${d===state.day?'Bugün':d-state.day+' gün sonra'}<b>${B.n}${B.left&&d===state.day?` <small>(${B.left} yolda)</small>`:''}</b></div>`; }).join('')}</div>
    <div class="row"><div class="ic">⚖️</div><div class="tx">Fazla rezervasyon (overbooking)<small>Daha çok kapora ve misafir; ama oda bulamayan rezervasyonlu misafir tazminat ve ün kaybettirir · ${cap} oda</small></div></div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px">${OB.map((o,i)=>`<button class="btn ${(state.obIx||0)===i?'gold':'ghost'}" data-ob="${i}" style="flex:1">${o.n}</button>`).join('')}</div>`; }

// ---------- personel morali: vardiya, izin, grev, prim ----------
function morale(){ return state.morale==null?70:state.morale; }
function moraleMul(){ return (state.strike&&state.strike>gtime)?0.05:0.8+0.4*morale()/100; }
function nightStaffMul(){ return isNight()&&!state.nightShift?0.5:1; }
function nightWageMul(){ return state.nightShift?1.25:1; }
function moraleDay(){
  if(!built('staff')||!staffEnts.length) return; let d=0; const avgE=staffEnts.reduce((a,e)=>a+(e.energy??100),0)/staffEnts.length;
  d+=state.breakroom?2:0; d+=avgE<40?-5:1; d+=state.money<0?-6:0; d+=state.nightShift?-1:0; if(state.leaveDenied===state.day-1) d-=6;
  state.morale=clamp(morale()+d,0,100);
  if(morale()<25&&Math.random()<0.5&&!state.sandbox){ state.strike=gtime+60; setTimeout(()=>openStrike(),5000); }
  else if(Math.random()<0.35&&!state.sandbox) setTimeout(()=>askLeave(),9000);
}
function bonusCost(){ return r10(staffEnts.length*60*cm()); }
function giveBonus(){ const c=bonusCost(); if(!spend(c)) return; state.morale=clamp(morale()+18,0,100); state.strike=0; staffEnts.forEach(e=>{ e.energy=100; fxEmoji(e.x,e.y+2.1,e.z,e.f,'🥳'); }); sfx('star'); toast(`💰 Personele prim verildi: moral +18`); markSave(); renderSheet(); }
function openStrike(){ if(!(state.strike>gtime)) return; banner('✊ Personel grevde!','Moral çok düştü · prim ver ya da 1 saat bekle'); sfx('alarm');
  openModal(`<h3>✊ Grev</h3><p class="sub">Personel moral düşüklüğü yüzünden iş bıraktı. Prim verirsen hemen işe dönerler.</p><button class="btn gold wide" id="skB">💰 Prim ver · ${fmt(bonusCost())} ₺</button><button class="btn ghost wide" id="skW">Bekle</button>`,m=>{ m.querySelector('#skB').onclick=()=>{ giveBonus(); closeModal(); }; m.querySelector('#skW').onclick=closeModal; }); }
function askLeave(){ if(!staffEnts.length) return; const e=rand(staffEnts), nm=e.name||'Bir çalışan';
  openModal(`<h3>🏖️ İzin talebi</h3><p class="sub">${escH(nm)} (${STAFF[e.kind].name}) yarın izin istiyor.</p><button class="btn gold wide" id="lvY">✅ İzin ver (moral +6, yarın 1 kişi eksik)</button><button class="btn ghost wide" id="lvN">❌ Reddet (moral −6)</button>`,m=>{
    m.querySelector('#lvY').onclick=()=>{ state.morale=clamp(morale()+6,0,100); state.leaveDay={day:state.day+1,kind:e.kind}; closeModal(); toast('🏖️ İzin verildi'); markSave(); };
    m.querySelector('#lvN').onclick=()=>{ state.leaveDenied=state.day; state.morale=clamp(morale()-6,0,100); closeModal(); markSave(); }; }); }
function onLeave(e){ const L2=state.leaveDay; return !!(L2&&L2.day===state.day&&L2.kind===e.kind&&staffEnts.filter(x=>x.kind===e.kind).indexOf(e)===0); }
function staffHtml2(){ if(!built('staff')) return ''; const m=Math.round(morale());
  return `<div class="ugh">😊 Personel morali</div><div class="row"><div class="ic">${m>=70?'😄':m>=40?'🙂':m>=25?'😟':'😠'}</div><div class="tx">Moral ${m}/100${state.strike>gtime?' · ✊ GREV':''}<small>Hız ×${moraleMul().toFixed(2)} · düşük moral grev riski · mola odası ve prim moral verir</small>${pips(Math.round(m/20),5)}</div><button class="btn gold" data-bonus ${state.money<bonusCost()?'disabled':''}>Prim<br>${fmt(bonusCost())} ₺</button></div>
    <div class="row"><div class="ic">🌙</div><div class="tx">Gece vardiyası<small>${state.nightShift?'Açık: personel gece de tam hızla çalışır, maaşlar +%25':'Kapalı: gece personel yarı hızla çalışır'}</small></div><button class="btn ${state.nightShift?'gold':''}" data-nshift>${state.nightShift?'Açık':'Kapalı'}</button></div>`; }
function bindOps2(root){ const b=root.querySelector('[data-bonus]'); if(b) b.onclick=giveBonus; const n=root.querySelector('[data-nshift]'); if(n) n.onclick=()=>{ state.nightShift=!state.nightShift; sfx('click'); markSave(); renderSheet(); };
  root.querySelectorAll('[data-ob]').forEach(x=>x.onclick=()=>{ state.obIx=+x.dataset.ob; sfx('click'); markSave(); renderSheet(); }); }

// ---------- misafir hafızası ----------
function rememberGuest(g){ if(!g.loyal&&!(state.loyal||[]).some(x=>x.n===g.name)) return; const x=(state.loyal||[]).find(x=>x.n===g.name)||{n:g.name,t:g.type};
  x.room=g.lastRoomId; x.sat=Math.round(g.sat); x.visits=(x.visits||0)+1; x.food=g.ateFood||x.food; if(!(state.loyal||[]).includes(x)){ state.loyal=state.loyal||[]; state.loyal.push(x); } }
function memoryAtDesk(g){ const x=g.memory; if(!x||g.memShown) return; g.memShown=true;
  toast(`🧠 ${g.name} ${x.visits||1}. kez geliyor · geçen sefer ${x.room?'Oda '+x.room:'?'} ${x.sat>=68?'😄':x.sat>=42?'🙂':'😠'}${x.room?' · aynı odayı verirsen sevinir':''}`); }
function memorySat(g,id){ const x=g.memory; if(!x) return 0; let d=0; if(x.room===id){ d+=8; fxEmoji(g.x,2.8,g.z,0,'🧠❤️'); } if(x.sat<42) d-=6; return d; }
function memoryPick(g,rs){ const x=g.memory; return x&&x.room&&rs.includes(x.room)?x.room:null; }

// ---------- hooks ----------
function updateOps2(dt){ updateKitchen(dt); updateBookings(dt); if(queue[0]&&queue[0].memory&&queue[0].state==='queue'&&!queue[0].path) memoryAtDesk(queue[0]); }
function ops2DayEnd(){ planBookings(); moraleDay(); }
