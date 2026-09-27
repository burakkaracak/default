
// =====================================================================
// MEGA UPDATE 2: spa & laundry, event bookings + festivals, staff energy
// & employee of the day, room themes + guest theme wishes
// =====================================================================

// ---------- spa & laundry buildings (left back lawn, reached via the side lanes) ----------
const SPA={x0:-16.3,x1:-11.0,z0:-11.2,z1:-4.3,door:[-14.2,-13.0]}, LAUN={x0:-10.6,x1:-8.0,z0:-11.2,z1:-4.3,door:[-9.9,-8.8]};
const SPA_TABLES=[-15.3,-13.65,-12.0];
SPA_TABLES.forEach(tx=>SEATS.push({amen:'spa',x:tx,z:-7.75,px:tx,pz:-9.2,py:0.62,rx:-Math.PI/2,rot:0,pose:'sleep',busy:null}));
[-7.1,-6.1].forEach(z=>SEATS.push({amen:'spa',x:-12.25,z,px:-11.52,pz:z,py:0.12,rot:-Math.PI/2,pose:'sit',busy:null}));
function spaOpen(){ const h=hourNow(); return built('spa')&&h>=8&&h<22; }
function amenBonus(a){ return (a==='spa'&&state.staff.spaT&&state.staff.spaT.n>0?1.6:1)*(wxEv('heat')&&(a==='pool'||a==='spa')?1.6:1); }
function shellWalls(S,B,wallM,trimM){
  const cx=(B.x0+B.x1)/2, cz=(B.z0+B.z1)/2, w=B.x1-B.x0, d=B.z1-B.z0;
  S.add(mesh(box(w,2.4,0.16),wallM,cx,1.2,B.z0-0.08,true)); S.add(mesh(box(0.16,2.4,d),wallM,B.x0-0.08,1.2,cz,true)); S.add(mesh(box(0.16,2.4,d),wallM,B.x1+0.08,1.2,cz,true));
  S.add(mesh(box(w+0.3,0.16,0.24),trimM,cx,2.48,B.z0-0.08,true));
  [[B.x0,B.door[0]],[B.door[1],B.x1]].forEach(([a,b])=>{ S.add(mesh(box(b-a,0.9,0.16),wallM,(a+b)/2,0.45,B.z1+0.08,true)); S.add(mesh(box(b-a,0.07,0.22),M.gold,(a+b)/2,0.93,B.z1+0.08)); });
  return [[0,B.x0-0.16,B.x1+0.16,B.z0-0.16,B.z0],[0,B.x0-0.16,B.x0,B.z0,B.z1+0.16],[0,B.x1,B.x1+0.16,B.z0,B.z1+0.16],[0,B.x0,B.door[0],B.z1,B.z1+0.16],[0,B.door[1],B.x1,B.z1,B.z1+0.16]];
}
let spaTherapist=null;
function buildSpa(){
  const G=new THREE.Group(); outdoor.add(G); const S=new THREE.Group(), B=SPA, cx=(B.x0+B.x1)/2, cz=(B.z0+B.z1)/2;
  S.add(mesh(box(B.x1-B.x0,0.2,B.z1-B.z0),tmat('sandTile',4,5),cx,-0.1,cz));
  const cols=shellWalls(S,B,mat(0xe6efe6),mat(0x6f8f7a));
  const towelM=mat(0xf4efe6), wood=tmat('woodLight',1,1);
  SPA_TABLES.forEach(tx=>{ S.add(mesh(rbox(0.72,0.5,1.9,.06),wood,tx,0.25,-9.2,true)); S.add(mesh(rbox(0.7,0.08,1.85,.04),towelM,tx,0.54,-9.2));
    S.add(mesh(rbox(0.3,0.06,0.2,.03),M.white,tx,0.6,-10.0)); cols.push([0,tx-0.38,tx+0.38,-10.18,-8.22]); });
  // sauna bench + hot stones
  S.add(mesh(rbox(0.6,0.42,2.4,.04),tmat('wood',1,2),-11.5,0.21,-6.6,true)); S.add(mesh(rbox(0.16,0.9,2.4,.03),tmat('wood',1,2),-11.2,0.7,-6.6,true)); cols.push([0,-11.82,-11.0,-7.85,-5.35]);
  S.add(mesh(cyl(0.3,0.34,0.35,10),mat(0x4a4f57),-11.6,0.18,-5.0,true)); for(let k=0;k<6;k++) S.add(mesh(new THREE.IcosahedronGeometry(0.08,0),mat(0x6d6f73,{flatShading:true}),-11.6+rnd(-0.15,0.15),0.4,-5.0+rnd(-0.15,0.15))); cols.push([0,-11.95,-11.25,-5.35,-4.65]);
  [[-16.0,-10.8],[-11.3,-10.8],[-16.0,-4.7]].forEach(([x,z])=>bigPlant(S,x,z,0.8));
  for(let k=0;k<5;k++) S.add(mesh(cyl(0.035,0.035,0.08,8),mat(0xfff3d0),-15.9,0.95+0.001*k,-7.4+k*0.25));
  S.add(mesh(box(0.1,0.9,1.6),wood,-16.2,0.45,-6.9,true));
  const sg=signPlane('SPA & SAUNA',2.2,0.42,{bg:'#6f8f7a',fg:'#fff',font:'800 64px "Baloo 2"'}); sg.position.set(cx,1.35,B.z1+0.18); S.add(sg);
  G.add(bake(S));
  const water=mesh(cyl(0.45,0.45,0.02,20),new THREE.MeshStandardMaterial({map:tex('water',1,1),roughness:.05,emissive:0x0b5a8a,emissiveIntensity:.3}),-14.1,0.06,-5.6); G.add(water);
  const rim=mesh(new THREE.TorusGeometry(0.47,0.06,6,20),mat(0xf1ece2),-14.1,0.07,-5.6); rim.rotation.x=Math.PI/2; G.add(rim); cols.push([0,-14.6,-13.6,-6.1,-5.1]);
  addCols('spa',cols); return G;
}
function buildLaundry(){
  const G=new THREE.Group(); outdoor.add(G); const S=new THREE.Group(), B=LAUN, cx=(B.x0+B.x1)/2, cz=(B.z0+B.z1)/2;
  S.add(mesh(box(B.x1-B.x0,0.2,B.z1-B.z0),tmat('tile',3,5),cx,-0.1,cz));
  const cols=shellWalls(S,B,mat(0xdfe8f0),mat(0x2d5d8a));
  for(let k=0;k<3;k++){ const x=B.x0+0.5+k*0.8;
    S.add(mesh(rbox(0.72,0.85,0.7,.05),M.white,x,0.43,-10.7,true)); const dr=mesh(cyl(0.22,0.22,0.03,20),mat(0x9fc8e8,{metalness:.3,roughness:.1}),x,0.45,-10.34); dr.rotation.x=Math.PI/2; S.add(dr);
    S.add(mesh(new THREE.TorusGeometry(0.23,0.03,6,20),mat(0xb8c0c8,{metalness:.7}),x,0.45,-10.33)); S.add(mesh(box(0.5,0.06,0.02),M.dark,x,0.8,-10.34)); }
  cols.push([0,B.x0,B.x1,-11.2,-10.3]);
  S.add(mesh(rbox(1.2,0.8,0.6,.04),tmat('woodLight',2,1),-9.3,0.4,-7.8,true)); cols.push([0,-9.9,-8.7,-8.1,-7.5]);
  [[-9.68,0x5d9fd6],[-9.3,0xffffff],[-8.92,0xf2b632]].forEach(([x,c],k)=>{ for(let i=0;i<3;i++) S.add(mesh(rbox(0.32,0.08,0.3,.03),mat(c),x,0.84+i*0.085,-7.8)); });
  S.add(mesh(rbox(0.7,0.55,0.5,.08),mat(0xc9a15a),-8.5,0.28,-5.4,true)); cols.push([0,-8.85,-8.15,-5.65,-5.15]);
  const sg=signPlane('ÇAMAŞIRHANE',1.9,0.36,{bg:'#2d5d8a',fg:'#fff',font:'800 56px "Baloo 2"',fit:true}); sg.position.set(cx,1.35,B.z1+0.18); S.add(sg);
  G.add(bake(S)); addCols('laundry',cols); return G;
}
const LINEN_FEE=9;
function linenFee(){ return Math.round(LINEN_FEE*incomeMult()*(state.staff.laundry&&state.staff.laundry.n>0?1.5:1)); }
function afterRoomCleaned(byStaff){
  if(!built('laundry')) return;
  if(byStaff){ if(state.staff.laundry&&state.staff.laundry.n>0){ state.piles.laundry+=linenFee(); pileChanged('laundry'); } }
  else if(player&&player.c.items.length<capacity()){ addItem('linen'); if(!state.tips.linen){ state.tips.linen=true; hint('🧦 Kirli çarşafı çamaşırhaneye götür, para kazan',5); } }
}
function megaZones(p,dt){
  if(p.f!==0||!built('laundry')) return;
  const n=p.c.items.filter(i=>i==='linen').length;
  if(n&&d2(p.x,p.z,L.laundryDrop.x,L.laundryDrop.z)<0.9*0.9){
    setHold(p.c,p.c.items.filter(i=>i!=='linen')); updateCarryUI();
    const amt=n*linenFee(); addMoney(amt,L.laundryDrop.x,0.8,L.laundryDrop.z,0); state.today.req+=amt; sfx('drop'); onGameEvent('linen',n); }
}
function staffPost(e){
  const sp=e.kind==='spaT'?L.spaT:L.laundryW;
  if(d2(e.x,e.z,sp.x,sp.z)>0.05||e.f!==0){ e.anim=null; if(!e.path) e.goTo(0,sp.x,sp.z,()=>{ e.tRot=Math.PI; }); return; }
  const busy=e.kind==='spaT'?SEATS.some(s=>s.amen==='spa'&&s.busy&&s.busy.state==='amen'):state.piles.laundry>0||staffEnts.some(x=>x.kind==='clean'&&x.job&&x.job.working);
  e.anim=busy?'work':null;
}

// ---------- staff energy + employee of the day ----------
const STAFF_NAMES=['Ayşe','Fatma','Ali','Veli','Hasan','Zehra','Emine','Murat','Ömer','Hülya','Serkan','Yasemin','Levent','Nazlı'];
function staffEnergyMul(e){ return ((e.energy??100)<30?0.7:(e.star?1.15:1))*(1+0.07*rankOf(e)); }
function staffWorked(e){
  careerWorked(e); e.jobs=(e.jobs||0)+1; e.energy=Math.max(0,(e.energy??100)-(state.breakroom?4:7));
  if(e.energy<30&&!e.tiredShown){ e.tiredShown=true; fxEmoji(e.x,e.y+2.1,e.z,e.f,'😓'); }
}
function staffRest(e,dt){ if(state.breakroom&&(e.energy??100)<100){ e.energy=Math.min(100,(e.energy??100)+dt*3); if(e.energy>=40) e.tiredShown=false; } }
function staffDayEnd(){
  let best=null; for(const e of staffEnts){ if(e.kind==='rec') continue; if(!best||(e.jobs||0)>(best.jobs||0)) best=e; }
  staffEnts.forEach(e=>{ e.star=false; });
  if(best&&(best.jobs||0)>=3){ best.star=true; state.eotd={n:best.name,k:best.kind,j:best.jobs,d:state.day};
    setTimeout(()=>toast(`🏅 Günün çalışanı: ${best.name} (${STAFF[best.kind].name}, ${best.jobs} iş) · bugün %15 hızlı`),2200); changeRep(0.5); }
  staffEnts.forEach(e=>{ e.jobs=0; e.energy=100; e.tiredShown=false; });
}
function breakroomCost(){ return Math.round(800*cm()); }
function staffExtraHtml(){
  const tired=staffEnts.filter(e=>(e.energy??100)<30).length, E=state.eotd;
  return `<div class="row"><div class="ic">☕</div><div class="tx">Personel mola odası<small>Personel boşta dinlenir ve iş başına daha az yorulur${tired?` · şu an ${tired} yorgun 😓`:''}</small></div>${state.breakroom?'<button class="btn" disabled>Var ✓</button>':`<button class="btn gold" data-break ${state.money<breakroomCost()?'disabled':''}>${fmt(breakroomCost())} ₺</button>`}</div>`+
    (E?`<p class="note">🏅 Günün çalışanı: <b>${escH(E.n)}</b> (${STAFF[E.k]?STAFF[E.k].name:''}, ${E.j} iş)</p>`:'');
}
function buyBreakroom(){ if(state.breakroom||!spend(breakroomCost())) return; state.breakroom=true; sfx('build'); toast('☕ Mola odası açıldı: personel artık daha az yoruluyor'); save(); renderSheet(); }

// ---------- room themes + guests who want a theme ----------
const RTHEMES={
  sea:   {e:'🌊',name:'Deniz',   wall:0xcfe6f2,duvet:0x2e86c1},
  forest:{e:'🌲',name:'Orman',   wall:0xd6ead0,duvet:0x3f7a3e},
  retro: {e:'🕺',name:'Retro',   wall:0xf6dcb4,duvet:0xe0574f},
  royal: {e:'👑',name:'Kraliyet',wall:0xe6d8f0,duvet:0x6b3fa0}};
function roomThemeCost(id){ return Math.round(260*FLOOR_MULT[roomInfo(id).f]*cm()); }
function themedWall(name,th){ const m=tmat(name,2,1.2).clone(); m.color.setHex(RTHEMES[th].wall); return m; }
function anyThemed(){ for(const k in state.rooms) if(state.rooms[k].theme) return true; return false; }
function roomThemeHtml(id){
  const s=state.rooms[id], c=roomThemeCost(id), ok=!RT(id).guest;
  return `<div class="row" style="flex-wrap:wrap"><div class="ic">🎨</div><div class="tx">Oda teması${s.theme?`: ${RTHEMES[s.theme].e} ${RTHEMES[s.theme].name}`:''}<small>Bazı misafirler belli bir tema ister: eşleşirse +10 memnuniyet${ok?'':' · oda boşken değiştirilebilir'}</small></div>
    <div class="agrid" style="width:100%;justify-content:flex-end">${Object.keys(RTHEMES).map(k=>`<button class="btn ${s.theme===k?'':'ghost'} abtn" data-rth="${k}" ${s.theme===k||!ok||state.money<c?'disabled':''}>${RTHEMES[k].e} ${RTHEMES[k].name}</button>`).join('')}</div><small style="width:100%;text-align:right;color:var(--muted)">${fmt(c)} ₺</small></div>`;
}
function setRoomTheme(id,k){ const s=state.rooms[id]; if(!s||s.theme===k||RT(id).guest||!spend(roomThemeCost(id))) return; s.theme=k; qEv('upg'); buildRoomVisual(id,true); sfx('build'); save(); }

// ---------- event bookings & festivals ----------
const EVT={
  wedding:{e:'💒',name:'Düğün',     need:'rest',needN:'Restoran',   rooms:4,types:['couple','family','elderly'],n:5,rew:900},
  conf:   {e:'🎤',name:'Konferans', need:'cafe',needN:'Kahve köşesi',rooms:5,types:['business'],n:5,rew:750},
  concert:{e:'🎸',name:'Konser',    need:'pool',needN:'Havuz',      rooms:4,types:['influencer','tourist','student'],n:6,rew:1000}};
const FEST=[{e:'🌷',name:'Lale Festivali'},{e:'🎶',name:'Yaz Konser Festivali'},{e:'🍇',name:'Hasat Festivali'},{e:'🎄',name:'Yılbaşı Festivali'}];
function festivalOn(){ return !!state&&state.day>=3&&(state.day-1)%(SEASON_DAYS*2)===2; }
function festival(){ return cityFestOn()?CITY_FEST[city().name]:FEST[seasonIx()]; }
function eventReady(){ return readyRooms().length; }
function eventsDayEnd(){ events3DayEnd();
  if(state.offer&&state.offer.made<state.day){ toast(`📅 ${EVT[state.offer.k].name} teklifi zaman aşımına uğradı`,'bad'); state.offer=null; }
  if(state.event&&!state.event.started&&state.day>state.event.day){ failEvent('Etkinlik günü geçti'); }
  if(!state.event&&!state.offer&&state.tut>=TUT.length&&!state.sandbox&&state.day>=4&&nRoomsNow()>=6&&Math.random()<0.45){
    const ks=Object.keys(EVT).filter(k=>built(EVT[k].need));
    if(ks.length){ const k=rand(ks), E=EVT[k]; state.offer={k,made:state.day,day:state.day+2,rew:r10(E.rew*cm()*(1+stars()*0.15))};
      setTimeout(()=>{ banner(`📅 ${E.e} ${E.name} teklifi!`,`${state.offer?state.offer.day:''}. gün · ödül ${fmt(state.offer?state.offer.rew:0)} ₺ · Yönetim › Otel`); sfx('req'); },3000); } }
  if(state.event&&state.day===state.event.day){ const E=EVT[state.event.k]; setTimeout(()=>banner(`${E.e} Bugün ${E.name} var!`,`12:00'ye kadar ${E.rooms} hazır oda ve ${E.needN} gerekli`),3200); }
  if(festivalOn()){ const F=festival(); setTimeout(()=>{ banner(`${F.e} ${F.name}!`,'Bugün misafir akını var ve gelirler %15 fazla'); sfx('star'); },4200); }
  staffDayEnd();
}
function acceptOffer(){ if(!state.offer) return; state.event=Object.assign({started:false},state.offer); state.offer=null; sfx('build'); toast(`${EVT[state.event.k].e} Rezervasyon onaylandı: ${state.event.day}. gün 12:00`); save(); renderSheet(); }
function declineOffer(){ state.offer=null; sfx('click'); save(); renderSheet(); }
function failEvent(why){ const E=EVT[state.event.k]; state.event=null; changeRep(-3); banner(`${E.e} ${E.name} iptal oldu`,`${why} · −3 ün`); sfx('fail'); markSave(); }
function updateEvents(dt){
  const ev=state.event; if(!ev||ev.started||state.day!==ev.day||hourNow()<12||hourNow()>=22) return;
  ev.started=true; const E=EVT[ev.k], ready=eventReady(ev), fac=built(E.need), calm=!state.crisis&&!state.mess;
  const score=Math.min(1,ready/E.rooms)*0.7+(fac?0.2:0)+(calm?0.1:0), pay=Math.round(ev.rew*score);
  state.piles.desk+=pay; pileChanged('desk'); state.today.rooms+=pay; onGameEvent('event',1);
  changeRep(score>=0.9?3:score>=0.6?1:-2);
  banner(`${E.e} ${E.name} ${score>=0.9?'kusursuz geçti!':score>=0.6?'başladı':'aksak başladı'}`,`Hazırlık %${Math.round(score*100)} · ${fmt(pay)} ₺ masada`);
  sfx(score>=0.6?'star':'fail'); confettiAt(L.desk.x,1.5,L.desk.z,score>=0.9?90:40);
  for(let i=0;i<E.n;i++) setTimeout(()=>{ if(queue.length<10){ const g=spawnGuest(rand(E.types),rand([L.spawnL,L.spawnR]),true); g.evt=ev.k; } },i*900);
  state.event=null; markSave();
}
function eventGoal(){
  const ev=state.event; if(!ev||ev.started||state.day!==ev.day||state.tut<TUT.length) return null;
  const E=EVT[ev.k], r=eventReady(ev);
  if(!built(E.need)) return {icon:E.e,text:`${E.name}: ${E.needN} gerekli!`,target:null};
  return {icon:E.e,text:`${E.name} 12:00'de · ${Math.min(r,E.rooms)}/${E.rooms} hazır oda`,target:r<E.rooms?chainTarget('clean'):null,prog:Math.min(1,r/E.rooms),done:r>=E.rooms};
}
function eventsHtml(){
  let h=`<div class="ugh">📅 Etkinlikler ve festivaller</div>`;
  const O=state.offer, V=state.event;
  if(O){ const E=EVT[O.k]; h+=`<div class="row"><div class="ic">${E.e}</div><div class="tx">${E.name} teklifi · ${O.day}. gün 12:00<small>Gerekli: ${E.rooms} hazır oda + ${E.needN} · ${E.n} misafir gelir · ödül ${fmt(O.rew)} ₺ (hazırlığa göre)</small></div><div style="display:flex;flex-direction:column;gap:4px"><button class="btn gold" data-evt="yes">Kabul</button><button class="btn ghost" data-evt="no">Reddet</button></div></div>`; }
  else if(V){ const E=EVT[V.k]; h+=`<div class="row"><div class="ic">${E.e}</div><div class="tx">${E.name} · ${V.day}. gün 12:00<small>Şu an ${eventReady(V)}/${E.rooms} hazır oda · ${E.needN} ${built(E.need)?'✅':'❌'} · ödül ${fmt(V.rew)} ₺</small></div></div>`; }
  else h+=`<p class="note">Şu an teklif yok. Otel büyüdükçe düğün, konferans ve konser teklifleri gelir.</p>`;
  let next=1; while(next<20&&((state.day+next-1)%(SEASON_DAYS*2)!==2||state.day+next<3)) next++;
  h+=festivalOn()?`<p class="note">${festival().e} Bugün <b>${festival().name}</b>: misafir akını, gelir +%15</p>`:`<p class="note">🎉 Sıradaki festival ${next} gün sonra</p>`;
  return h;
}

// ---------- hooks ----------
function updateMega2(dt){ updateEvents(dt); for(const e of staffEnts) if(!e.job&&!e.path) staffRest(e,dt); }
