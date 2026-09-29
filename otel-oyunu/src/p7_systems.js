
// =====================================================================
// FLOOR VISIBILITY
// =====================================================================
let viewFloor=0, peekFloor=null;
function floorVisible(y){ return y<(viewFloor+0.6)*FH; }
function applyFloorVis(){
  floorRoots.forEach((g,f)=>{ if(g) g.visible=f<=viewFloor; });
  if(cabin) cabin.visible=floorVisible(cabin.position.y);
}

// =====================================================================
// REPUTATION / STARS
// =====================================================================
function changeRep(d){
  if(!d) return;
  const before=stars(); state.rep=clamp(state.rep+d,0,100); const after=stars();
  if(after>before){ confettiAt(player.x,player.y+2,player.z,50); }
  else if(after<before){ toast(`Otel ${after} yıldıza düştü`,'bad'); sfx('fail'); refreshPads(); lastStarsHud=after; }
}

// =====================================================================
// MONEY PILES & COLLECTING
// =====================================================================
const pileVis={};
function pileChanged(k){
  const P=L.piles[k], amt=state.piles[k];
  let v=pileVis[k];
  if(!v){ v=pileVis[k]={g:new THREE.Group(),n:-1,tag:null}; v.g.position.set(P.x,0,P.z); floorRoot(P.f).add(v.g); }
  const n=amt>0?Math.min(16,1+Math.floor(amt/(15*city().mult))):0;
  if(n!==v.n){
    while(v.g.children.length) v.g.remove(v.g.children[0]);
    for(let i=0;i<n;i++){ const col=i%3, lay=Math.floor(i/3);
      const b=mesh(rbox(0.36,0.06,0.2,.015),i%2?M.bill:mat(0x7fc07e,{roughness:.9}),(col-1)*0.2,0.03+lay*0.062,(col%2)*0.05,true); b.rotation.y=rnd(-0.25,0.25); v.g.add(b);
      if(i%2===0) v.g.add(mesh(box(0.08,0.062,0.205),M.billBand,(col-1)*0.2,0.03+lay*0.062,(col%2)*0.05)); }
    if(n>v.n&&v.n>=0) popIn(v.g);
    v.n=n;
  }
  if(amt>0&&!v.tag) v.tag=tagAdd({kind:'pile',key:k,x:P.x,y:1.0,z:P.z,f:P.f});
  if(amt<=0&&v.tag){ tagRemove(v.tag); v.tag=null; }
}
function addMoney(amt,x,y,z,f,noQuest){
  if(amt<=0) return;
  state.money+=amt; state.earned+=amt; coinsFly(x,y,z,f,amt); markSave(); if(!noQuest) qEv('earn',amt);
}
function collectPile(k){
  const amt=state.piles[k]; if(amt<=0) return;
  state.piles[k]=0; const P=L.piles[k]; addMoney(amt,P.x,0.5,P.z,P.f); coinBurst(P.x,P.f*FH+0.3,P.z,Math.min(10,3+amt/(25*city().mult))); pileChanged(k); tutEvent('collect'); if(player) player.sqT=0.4;
}
function collectTip(id){
  const s=state.rooms[id]; if(s.tip<=0) return; const sp=roomSpots(id), amt=s.tip; s.tip=0;
  const ri=roomInfo(id); addMoney(amt,ri.x+TIP_X,0.6,ri.z+TIP_Z,ri.f); coinBurst(ri.x+TIP_X,ri.f*FH+0.2,ri.z+TIP_Z,4); applyRoomState(id); tutEvent('collect'); if(player) player.sqT=0.4;
}

// =====================================================================
// PADS (stand inside to pay & unlock)
// =====================================================================
let PADS=[], PADMAP={};
const padVis={};
function padAvailable(d){ return !built(d.id)&&d.req.every(r=>built(r)); }
function padLocked(d){ return !!d.stars&&stars()<d.stars; }
function refreshPads(){
  PADS.forEach(d=>{
    const show=padAvailable(d), v=padVis[d.id];
    if(show&&!v) createPad(d);
    else if(!show&&v) removePad(d.id);
    else if(v&&v.locked!==padLocked(d)){ removePad(d.id); createPad(d); }
  });
}
function createPad(d){
  const g=new THREE.Group(); g.position.set(d.x,0.03,d.z); floorRoot(d.f).add(g);
  const locked=padLocked(d);
  const base=new THREE.Mesh(plane(d.size,d.size),new THREE.MeshBasicMaterial({map:tex(locked?'padLock':'padDash'),transparent:true,depthWrite:false})); base.rotation.x=-Math.PI/2; g.add(base);
  const fill=new THREE.Mesh(plane(d.size*0.9,d.size*0.9),new THREE.MeshBasicMaterial({color:0x7dffae,transparent:true,opacity:.5,depthWrite:false})); fill.rotation.x=-Math.PI/2; fill.position.y=0.004; g.add(fill);
  const ic=signPlane(d.icon,0.8,0.8,{w:128,h:128,font:'90px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'}); ic.position.set(0,0.62,0); ic.userData.bob=0.62; ic.userData.spinY=true; g.add(ic);
  padVis[d.id]={g,base,fill,ic,locked,tag:tagAdd({kind:'pad',def:d,x:d.x,y:1.25,z:d.z,f:d.f})};
  popIn(g); updatePadFill(d);
}
function removePad(id){ const v=padVis[id]; if(!v) return; v.g.parent.remove(v.g); tagRemove(v.tag); delete padVis[id]; }
function updatePadFill(d){ const v=padVis[d.id]; if(!v) return; const p=clamp((state.paid[d.id]||0)/d.cost,0,1); v.fill.scale.set(1,Math.max(0.001,p),1); v.fill.position.z=d.size*0.45*(1-p); v.fill.visible=p>0.001; }
let padCoinT=0, noMoneyT=0;
function updatePads(dt){
  const p=player; let on=null;
  if(!p.riding) for(const id in padVis){ const d=PADMAP[id]; if(d.f!==p.f) continue; const h=d.size/2; if(Math.abs(p.x-d.x)<h&&Math.abs(p.z-d.z)<h){ on=d; break; } }
  noMoneyT-=dt;
  if(!on) return;
  if(padLocked(on)){ if(noMoneyT<=0){ toast(`Bunun için ${on.stars} yıldız gerekli ⭐`,'bad'); noMoneyT=3; } return; }
  const paid=state.paid[on.id]||0, remain=on.cost-paid, rate=Math.max(on.cost/1.7,40);
  const pay=Math.min(remain,rate*dt,state.money);
  if(pay>0.001){
    state.money-=pay; state.paid[on.id]=paid+pay; updatePadFill(on); markSave();
    padCoinT-=dt; if(padCoinT<=0){ padCoinT=0.07; coinArc(p.x,p.y+1.1,p.z,on.x,on.f*FH+0.2,on.z); sfx('tick',state.paid[on.id]/on.cost); }
  } else if(remain>0.5&&noMoneyT<=0){ toast('Yeterli paran yok — önce para topla 💰','bad'); noMoneyT=3; }
  if((state.paid[on.id]||0)>=on.cost-0.01) completePad(on);
}
let adminBulk=false;
function completePad(d){
  state.built[d.id]=true; delete state.paid[d.id]; removePad(d.id);
  if(d.kind==='room'){ state.rooms[d.room]={type:'eco',decor:{},dirty:false,broken:false,tip:0}; buildRoomVisual(d.room,!adminBulk); if(!adminBulk) toast(`🛏️ Oda ${d.room} açıldı!`); }
  else { buildFeature(d.id,!adminBulk); if(!adminBulk) banner(`${d.icon} ${d.label}`,featureMsg(d.id)); if(d.kind==='floor'){ applyFloorVis(); } }
  if(d.id==='staff'){ state.tips.staff=true; setTimeout(()=>hint('📋 Yönetim menüsünden personel işe alabilirsin',5),1500); }
  if(d.id==='depo') setTimeout(()=>hint('Misafirler artık 🧻 ve 🧺 isteyecek. Depodan alıp odaya götür!',5),1200);
  if(d.id==='f2') setTimeout(()=>hint('Asansöre gir ve katını seç 🛗',5),1200);
  if(d.id==='cafe') setTimeout(()=>hint('Sıradaki misafirler kahve alıp daha sabırlı bekler. Kasadaki parayı toplamayı unutma ☕',5.5),1200);
  qEv('build');
  if(!adminBulk){ confettiAt(d.x,d.f*FH+0.5,d.z,60); sfx('build'); camShake(0.25); }
  ents.forEach(unstick);
  refreshPads(); tutEvent('built:'+d.id); save();
  if(PADS.every(x=>built(x.id))&&!state.done){ state.done=true; setTimeout(()=>{ banner('🏆 Otel tamamlandı!','Yönetim › Otel bölümünden yeni şehre taşınabilirsin'); sfx('star'); },1600); }
}
function featureMsg(id){ return {depo:'Misafir isteklerini buradan karşıla',staff:'Artık personel işe alabilirsin',rest:'Misafirler yemeğe gelecek',pool:'Havuz açıldı, misafirler bayılacak',gym:'Spor salonu açıldı',cafe:'Bekleyen misafirler artık kahve içecek',f2:'Asansörle yukarı çık',spa:'Misafirler masaj ve saunaya gelecek · Spa terapisti işe alabilirsin',laundry:'Kendin temizlediğin odaların kirli çarşaflarını buraya getir',f3:'Otelin büyüyor!'}[id]||''; }

// =====================================================================
// PLAYER INTERACTION ZONES
// =====================================================================
let atDesk=false, elevHere=false, pickT=0, workRing=null;
function roomDoorAt(f,x,z){ for(const k in state.rooms){ const ri=roomInfo(+k); if(ri.f===f&&Math.abs(x-ri.x)<1.0&&z>ri.z+1.3&&z<ri.z+2.5) return +k; } return null; }
function roomAt(f,x,z){ for(const k in state.rooms){ const ri=roomInfo(+k); if(ri.f===f&&Math.abs(x-ri.x)<1.38&&Math.abs(z-ri.z)<1.3) return +k; } return null; }
function playerCleanTime(){ return 2.4/(1+0.35*state.up.clean)/(1+0.15*skillLv('o1')); }
function playerFixTime(){ return 3.2/(1+0.35*state.up.fix); }
// one item per visit to a shelf; more only while open requests still need that item
const pickArmed={paper:true,towel:true,food:true};
function itemDemand(it){ let n=0; for(const k in state.rooms){ const R=RT(+k); if(R.req&&R.req.item===it&&!R.req.by) n++; } return n; }
function canPick(it){ if(pickArmed[it]){ pickArmed[it]=false; return true; } return player.c.items.filter(x=>x===it).length<itemDemand(it); }
function addItem(it){ const items=player.c.items.concat([it]); setHold(player.c,items); updateCarryUI(); sfx('pick'); }
function removeItem(it){ const items=player.c.items.slice(); const i=items.indexOf(it); if(i>=0) items.splice(i,1); setHold(player.c,items); updateCarryUI(); }
function updatePlayerZones(dt){
  const p=player; atDesk=false; elevHere=false; workRing=null; p.anim=null;
  if(p.riding) return;
  const mr=magnetR();
  for(const k in state.rooms){ if(state.rooms[k].tip<=0) continue; const ri=roomInfo(+k); if(ri.f===p.f&&d2(p.x,p.z,ri.x+TIP_X,ri.z+TIP_Z)<(mr+0.7)*(mr+0.7)) collectTip(+k); }
  for(const k in L.piles){ const P=L.piles[k]; if(state.piles[k]>0&&P.f===p.f&&d2(p.x,p.z,P.x,P.z)<mr*mr) collectPile(k); }
  const rid=roomAt(p.f,p.x,p.z)||roomDoorAt(p.f,p.x,p.z);
  if(rid){
    const s=state.rooms[rid], R=RT(rid);
    if(s.tip>0) collectTip(rid);
    if(R.req&&p.c.items.includes(R.req.item)){ removeItem(R.req.item); fulfillReq(rid); tutEvent('deliver'); }
    if(s.dirty){ noteCleanMove(R,p); R.cleanP+=dt/playerCleanTime(); workRing={p:R.cleanP,icon:'🧹'}; if(!p.moving&&!p.path) p.anim='work'; if(R.cleanP>=1) cleanRoom(rid,false); }
    else if(s.broken){ if(R.fixP<0.02&&!fixGame) startFixGame(rid); R.fixP+=dt/playerFixTime(); workRing={p:R.fixP,icon:'🔧'}; if(!p.moving&&!p.path) p.anim='work'; if(R.fixP>=1) fixRoom(rid,false); }
  }
  if(p.f===0&&p.x>L.serve.x0&&p.x<L.serve.x1&&p.z>L.serve.z0&&p.z<L.serve.z1) atDesk=true;
  extraPlayerZones(p,dt); megaZones(p,dt);
  pickT-=dt;
  for(const it in pickArmed){ const s=it==='food'?L.pass:L.shelf[it]; if(s&&(p.f!==0||d2(p.x,p.z,s.x,s.z)>0.64)) pickArmed[it]=true; }
  if(p.f===0&&pickT<=0&&p.c.items.length<capacity()){
    if(built('depo')){ for(const it of ['paper','towel']){ const s=L.shelf[it]; if(d2(p.x,p.z,s.x,s.z)<0.36&&stockHas(it)&&canPick(it)){ useStock(it); addItem(it); pickT=0.5; tutEvent('pick'); break; } } }
    if(built('rest')&&d2(p.x,p.z,L.pass.x,L.pass.z)<0.4&&canPick('food')&&kitchenReady()){ kitchenTake(); addItem('food'); pickT=0.5; }
  }
  if(floorsBuilt()>1&&d2(p.x,p.z,L.elev.x,L.elev.z)<0.3&&!p.moving&&!p.path) elevHere=true;
}
function cleanRoom(id,byStaff){
  const s=state.rooms[id], R=RT(id); if(!s.dirty) return;
  s.dirty=false; R.cleanP=0; const sp=roomSpots(id); sparkleAt(sp.stand.x,sp.stand.f*FH+0.8,sp.stand.z); sfx('sparkle'); applyRoomState(id);
  if(!byStaff){ tutEvent('clean'); qEv('clean'); } cleanQuality(id,byStaff,byStaff?cleanerNow:null); afterRoomCleaned(byStaff); markSave();
}
function fixRoom(id,byStaff){
  const s=state.rooms[id], R=RT(id); if(!s.broken) return;
  s.broken=false; R.fixP=0; const sp=roomSpots(id); sparkleAt(sp.ns.x,sp.ns.f*FH+0.8,sp.ns.z); sfx('fix'); applyRoomState(id); qEv('fix'); markSave();
}

// =====================================================================
// DESK (check-in)
// =====================================================================
let checkinP=0; const deskState={p:0,noRoom:false,server:null};
function updateDesk(dt){
  const head=queue[0];
  const recHere=staffEnts.some(e=>e.kind==='rec'&&!e.leaveNow&&!e.path&&e.f===0&&d2(e.x,e.z,L.recSpot.x,L.recSpot.z)<0.1);
  const server=atDesk?'player':recHere?'rec':null;
  deskState.noRoom=false; deskState.p=0; deskState.server=server; deskState.noPower=powerOut();
  if(deskState.noPower){ checkinP=0; return; }
  if(!head||head.path||head.state!=='queue'){ checkinP=0; return; }
  if(!pickRoom(head)){ deskState.noRoom=true; checkinP=0; return; }
  if(!server){ checkinP=0; return; }
  checkinP+=dt/(server==='player'?0.8/(1+0.3*state.up.desk):2.0/staffSpeedMul('rec'));
  deskState.p=checkinP;
  if(checkinP>=1){ if(deskGate(head,server)){ checkinP=Math.min(checkinP,1); deskState.p=1; return; } checkinP=0; checkIn(head,pickRoom(head)); }
}

// =====================================================================
// TIME, DAY END, SPAWNING, BREAKDOWNS
// =====================================================================
function updateTime(dt){ state.t+=dt/DAY_SEC; if(state.t>=1){ state.t-=1; endDay(); } }
function wageScale(){ return diffWageMul()*city().mult*(1+0.35*(stars()-1))*(1+Math.floor(nRoomsAll()/6)*0.2); }
function staffWage(k){ const s=state.staff[k]; return STAFF[k].wage*(1+0.3*(s.lvl-1))*wageScale()*invWage()*nightWageMul()*(1-0.12*skillLv('o4')); }
function wagesToday(){ let w=crewPremium()+traitWageDelta(); for(const k in STAFF) w+=state.staff[k].n*staffWage(k); return Math.round(w); }
function endDay(){
  repDrift(state.today); const w=wagesToday(); state.money-=w; state.today.wages=w; depthDayEnd();
  const rep=Object.assign({},state.today), day=state.day, repNow=state.rep;
  const oldS=seasonIx(); state.day++;
  if(seasonIx()!==oldS){ setTimeout(()=>seasonFlash(),700); applySeason(); }
  state.weather=rollWeather(); applyWeather();
  state.today=blankToday(); state.today.rep0=state.rep;
  rollEvents(); newQuests(); endDayExtras(); contentDayEnd(rep); ops2DayEnd(rep); worldDayEnd(rep); nextDayEnd(); lodaDayEnd(rep); curveDayEnd(rep);
  try{ localStorage.setItem(SAVE_KEY+'_bak',JSON.stringify(state)); }catch(e){}
  showReport(day,rep,repNow); save();
}
const SEASON_TIPS=['Doğa canlanıyor','Yaz sezonu: daha çok misafir, havuz çok popüler!','Yağmurlu günler artıyor','Kış geldi: havuz kapalı, misafir azalır'];
function rollWeather(){ const w=season().wx; let r=Math.random(), out='sun'; for(const k in w){ r-=w[k]; if(r<=0){ out=k; break; } } if(out==='snow'&&!city().snow) out='rain'; return out; }
// =====================================================================
// EVENTS: inspector, tour bus, coffee
// =====================================================================
function nRoomsNow(){ return Object.keys(state.rooms).length; }
function rollEvents(){
  if(stars()>=2&&state.day>=3&&state.day-state.lastInsp>=3&&Math.random()<0.55) state.inspDue=true;
  if(nRoomsNow()>=5&&state.day-state.lastBus>=2&&Math.random()<0.6) state.busDue=true;
  rollExtras();
}
function updateEventSpawns(dt){
  if(state.tut<TUT.length) return;
  const h=hourNow();
  updateExtraSpawns(dt,h);
  if(state.inspDue&&h>=9&&h<17&&queue.length<6&&Math.random()<dt*0.06){
    state.inspDue=false; state.lastInsp=state.day; spawnGuest('insp');
    banner('🕵️ Otel müfettişi geldi!','Onu mutlu et: bekletme, temiz ve iyi bir oda ver'); sfx('req'); markSave(); }
  if(state.busDue&&!bus&&h>=10&&h<16&&queue.length<=5&&Math.random()<dt*0.08){
    state.busDue=false; state.lastBus=state.day; startBus(); markSave(); }
}
function inspectorVerdict(g,mood){
  if(!state.sandbox) setTimeout(()=>inspReport(g,mood),0);
  if(mood==='happy'){ onGameEvent('insp',1); const b=Math.round(150*incomeMult()); state.piles.desk+=b; pileChanged('desk'); changeRep(6);
    banner('🕵️ Müfettiş çok memnun!',`+6 ün · ${fmt(b)} ₺ ödül masada`); sfx('star'); confettiAt(g.x,g.y+1.5,g.z,50); }
  else if(mood==='neutral'){ changeRep(1); toast('🕵️ Müfettiş: “Fena değil.” +1 ün'); }
  else if(mood==='left'){ changeRep(-8); banner('🕵️ Müfettiş sıkılıp gitti','Kötü rapor: −8 ün'); sfx('fail'); }
  else { changeRep(-6); banner('🕵️ Müfettiş memnun kalmadı','Kötü rapor: −6 ün'); sfx('fail'); }
}
let bus=null;
function startBus(){
  const g=buildBusModel(); g.position.set(-50,0,L.busStop.z); outdoor.add(g);
  bus={g,phase:'in',t:0,n:rint(3,4),drop:0,v:0};
  toast('🚌 Tur otobüsü yaklaşıyor!');
}
function updateBus(dt,t){
  if(!bus) return; const g=bus.g;
  if(bus.phase==='in'){ const d=L.busStop.x-g.position.x, v=clamp(d*0.9,1.0,9);
    g.position.x+=Math.min(d,v*dt);
    if(d<0.02){ bus.phase='stop'; bus.t=0; banner('🚌 Tur grubu geldi!',`${bus.n} turist resepsiyona geliyor`); sfx('ding'); } }
  else if(bus.phase==='stop'){ bus.t+=dt;
    if(bus.drop<bus.n&&bus.t>0.8+bus.drop*0.8){ bus.drop++; if(queue.length<8) spawnGuest('tourist',L.busDoor,true); }
    if(bus.t>0.8+bus.n*0.8+1.4) bus.phase='out'; }
  else { bus.v=Math.min(10,bus.v+dt*3); g.position.x+=bus.v*dt; if(g.position.x>60){ outdoor.remove(g); bus=null; } }
  if(bus) g.position.y=bus.phase==='stop'?0:Math.abs(Math.sin(t*9))*0.015;
}
let cafeWork=0;
function sellCoffee(g){
  g.coffee=true; const fee=Math.round(COFFEE_FEE*(g.T.pay||1)*incomeMult()*invAmen('cafe'));
  state.piles.cafe+=fee; pileChanged('cafe'); state.today.cafe+=fee;
  g.pat=Math.min(g.patMax,g.pat+g.patMax*0.2); setHold(g.c,['coffee']);
  fxEmoji(g.x,2.3,g.z,0,'☕'); cafeWork=1.8; qEv('coffee'); markSave();
}

// =====================================================================
// DAILY QUESTS
// =====================================================================
function roomRateSum(){ let s=0; for(const k in state.rooms) s+=roomRate(+k); return s; }
const r10=v=>Math.max(10,Math.round(v/10)*10);
function upgAvailable(){
  for(const k in UPG) if(upgCost(k)!=null) return true;
  for(const k in STAFF) if(state.staff[k].n>0&&staffLvlCost(k)!=null) return true;
  for(const id in state.rooms) if(roomUpCost(+id)!=null) return true;
  for(const k in LUX) if(!state.lux[k]) return true;
  if(stars()>=4) for(const k in INV) if(invCost(k)!=null) return true;
  if(prjOpen()) for(const k in PRJ) if(prjCost(k)!=null) return true;
  return false;
}
const QDEF={
  guest: {e:'🛎️',t:n=>`${n} misafir ağırla`,        n:r=>clamp(Math.round(r*0.9),3,14), ok:()=>true},
  happy: {e:'😍',t:n=>`${n} misafiri mutlu gönder`,   n:r=>clamp(Math.round(r*0.5),2,10), ok:()=>true},
  clean: {e:'🧹',t:n=>`Kendin ${n} oda temizle`,      n:r=>clamp(Math.round(r*0.4),2,6),  ok:()=>true},
  earn:  {e:'💰',t:n=>`${fmt(n)} ₺ topla`,            n:()=>r10(Math.max(150,roomRateSum()*2.2*incomeMult())), ok:()=>true},
  req:   {e:'🧺',t:n=>`${n} misafir isteğini karşıla`,n:r=>clamp(Math.round(r*0.4),2,8),  ok:()=>built('depo')},
  coffee:{e:'☕',t:n=>`${n} kahve sat`,               n:r=>clamp(Math.round(r*0.8),3,12), ok:()=>built('cafe')},
  amen:  {e:'🍽️',t:n=>`Tesisler ${n} kez kullanılsın`,n:r=>clamp(Math.round(r*0.4),3,12), ok:()=>built('rest')},
  fix:   {e:'🔧',t:n=>`${n} arızalı odayı onar`,      n:r=>clamp(Math.round(r/7),1,3),    ok:()=>nRoomsNow()>=5},
  pet:   {e:'🐱',t:n=>`${catName()} ile ${n} kez ilgilen`, n:()=>2, ok:()=>state.catOn},
  build: {e:'🏗️',t:()=>'Yeni bir alan aç',            n:()=>1, ok:()=>PADS.some(d=>padAvailable(d)&&!padLocked(d))},
  upg:   {e:'⬆️',t:()=>'Bir geliştirme satın al',     n:()=>1, ok:()=>upgAvailable()},
};
function newQuests(){
  const r=nRoomsNow(), keys=Object.keys(QDEF).filter(k=>QDEF[k].ok()), pick=[];
  while(pick.length<3&&keys.length){ const k=keys.splice(Math.floor(Math.random()*keys.length),1)[0]; pick.push(k); }
  const rew=r10(Math.max(60,roomRateSum()*0.3*incomeMult()));
  state.quests={day:state.day,bonus:false,list:pick.map(k=>({k,n:QDEF[k].n(r),have:0,rew,done:false,claimed:false}))};
  markSave();
}
function questText(q){ return QDEF[q.k].t(q.n); }
function questsReady(){ return !!state.quests&&state.quests.list.some(q=>q.done&&!q.claimed); }
function questsOn(){ return state.tut>=TUT.length&&!!state.quests; }
function qEv(k,v=1){
  onGameEvent(k,v); chainEv(k,v);
  if(!questsOn()) return;
  for(const q of state.quests.list){ if(q.k!==k||q.done) continue;
    q.have=Math.min(q.n,q.have+v);
    if(q.have>=q.n){ q.done=true; const qi=state.quests.list.indexOf(q); toast(`✅ Görev tamam: ${questText(q)} · ödül için dokun 🎁`,null,()=>claimQuest(qi)); sfx('sparkle'); }
    markSave(); }
}
function claimQuest(i){
  const Q=state.quests; if(!Q) return; const q=Q.list[i]; if(!q||!q.done||q.claimed) return;
  q.claimed=true; onGameEvent('quest',1); passPts(20); addMoney(q.rew,player.x,player.y+1.2,player.z,player.f,true); state.today.quest+=q.rew; sfx('build');
  if(!Q.bonus&&Q.list.every(x=>x.claimed)){ Q.bonus=true; const b=r10(q.rew*1.5);
    setTimeout(()=>{ addMoney(b,player.x,player.y+1.2,player.z,player.f,true); state.today.quest+=b; changeRep(3);
      banner('🎁 Günün tüm görevleri tamam!',`+${fmt(b)} ₺ bonus · +3 ün`); sfx('star'); confettiAt(player.x,player.y+2,player.z,60); },500); }
  save();
}
let spawnT=4;
function readyCount(){ let n=0; for(const k in state.rooms){ const s=state.rooms[k]; if(!s.dirty&&!s.broken&&!s.hold&&!RT(+k).guest) n++; } return n; }
function updateSpawner(dt){
  const nRooms=Object.keys(state.rooms).length; if(!nRooms) return;
  updateEventSpawns(dt);
  spawnT-=dt; if(spawnT>0) return;
  let f=0.55+0.12*stars()+season().arr*2+WEATHER[state.weather].arr*2+(state.adsUntil>state.day+state.t?0.7:0); if(festivalOn()) f*=1.6; f*=priceDemand()*invDemand()*mgrDemand()*worldDemand()*(1+0.1*skillLv('m1'))*(stormOn()?0.7:1);
  if(isNight()) f*=0.3*(state.lux&&state.lux.led?1.25:1)*mgrNight();
  spawnT=6/Math.max(0.2,f)*rnd(0.7,1.3)*clamp(4/nRooms,0.35,1.3)*flowSpawnMul();
  if(queue.length>=Math.min(6,nRooms+1)) return;
  if(Math.random()<rivalPull()){ spawnPasser(); return; }
  if(state.tut>=TUT.length&&tryLoyalSpawn()) return;
  spawnGuest();
}
let brkT=70;
function updateBreakdowns(dt){
  brkT-=dt; if(brkT>0) return; brkT=rnd(55,95);
  const ids=roomsWhere(id=>!state.rooms[id].broken); if(ids.length<3||Math.random()>0.55*diffBreakMul()) return;
  const id=rand(ids); state.rooms[id].broken=true; applyRoomState(id);
  toast(`🔧 Oda ${id} arızalandı!`,'bad'); sfx('fail'); tutEvent('broken'); markSave();
}

// =====================================================================
// SEASONS, WEATHER, SKY
// =====================================================================
function applySeason(){
  const s=season(), w=isWinter();
  treeMats.forEach((m,k)=>m.color.setHex(s.trees[k])); groundMesh.material.color.setHex(s.grass); updateGrassSeason();
  snowCover.visible=w&&city().snow; if(xmasTree) xmasTree.visible=w;
  if(typeof buildSeasonProps==='function') buildSeasonProps();
}
const RAIN_N=1300, rainPos=new Float32Array(RAIN_N*6);
for(let k=0;k<RAIN_N;k++){ const x=(Math.random()-.5)*46, y=Math.random()*22, z=(Math.random()-.5)*46; rainPos.set([x,y,z,x-0.03,y-0.5,z],k*6); }
const rainGeo=new THREE.BufferGeometry(), rainAttr=new THREE.BufferAttribute(rainPos,3); rainGeo.setAttribute('position',rainAttr);
const rainFx=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xb4cfe8,transparent:true,opacity:.5}));
rainFx.frustumCulled=false; rainFx.visible=false; scene.add(rainFx);
const SNOW_N=1500, snowPos=new Float32Array(SNOW_N*3), snowPh=new Float32Array(SNOW_N);
for(let k=0;k<SNOW_N;k++){ snowPos[k*3]=(Math.random()-.5)*46; snowPos[k*3+1]=Math.random()*22; snowPos[k*3+2]=(Math.random()-.5)*46; snowPh[k]=Math.random()*6.28; }
const snowGeo=new THREE.BufferGeometry(), snowAttr=new THREE.BufferAttribute(snowPos,3); snowGeo.setAttribute('position',snowAttr);
const snowFx=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:0.14,transparent:true,opacity:.9,depthWrite:false}));
snowFx.frustumCulled=false; snowFx.visible=false; scene.add(snowFx);
function applyWeather(){ rainFx.visible=state.weather==='rain'; snowFx.visible=state.weather==='snow'; }
function updateWeatherFx(dt,t,tx,ty,tz){
  if(rainFx.visible){ for(let k=0;k<RAIN_N;k++){ const o=k*6; let y=rainPos[o+1]-17*dt; if(y<0) y+=22; rainPos[o+1]=y; rainPos[o+4]=y-0.5; } rainAttr.needsUpdate=true; rainFx.position.set(tx,ty,tz); }
  if(snowFx.visible){ for(let k=0;k<SNOW_N;k++){ const o=k*3; let y=snowPos[o+1]-1.1*dt; if(y<0) y+=22; snowPos[o+1]=y; snowPos[o]+=Math.sin(t*0.8+snowPh[k])*0.25*dt; } snowAttr.needsUpdate=true; snowFx.position.set(tx,ty,tz); }
}
const SKY={day:new THREE.Color(0x8fc7e8),night:new THREE.Color(0x0e1c2e),dusk:new THREE.Color(0xf0a47a),grey:new THREE.Color(0x8a96a3)};
const tmpC=new THREE.Color(), sunDay=new THREE.Color(0xfff0d8), sunDusk=new THREE.Color(0xff9a5a), moonC=new THREE.Color(0x9fb8ff);
let nightF=0;
function updateSky(tx,tz){
  const H=hourOf(state.t);
  const elev=(H>=6&&H<=21)?Math.sin((H-6)/15*Math.PI):-0.35;
  const dayF=THREE.MathUtils.smoothstep(elev,-0.08,0.3); nightF=1-dayF;
  const dusk=Math.max(0,1-Math.abs(elev-0.1)/0.22)*(elev>-0.1?1:0);
  const wl=WEATHER[state.weather].light;
  tmpC.copy(SKY.night).lerp(SKY.day,dayF).lerp(SKY.dusk,dusk*0.4); tmpC.lerp(SKY.grey,(1-wl)*0.85*dayF);
  scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
  hemi.intensity=(0.09+0.61*dayF)*(0.72+0.28*wl)*(scene.environment?0.6:1); hemi.groundColor.setHex(dayF>0.5?0x6b5a45:0x1a2230);
  const ang=(H-6)/15*Math.PI;
  const sa=ang; sun.position.set(-Math.cos(sa)*30,10+Math.max(0.15,Math.sin(sa))*30,-1+18); sun.target.position.set(0,0,-1);
  sun.intensity=dayF>0.05?(0.12+1.1*dayF)*wl:0.1; sun.color.copy(dayF>0.05?sunDay:moonC); if(dayF>0.05) sun.color.lerp(sunDusk,dusk);
  const po=powerOut()?0.04:1;
  M.lampOn.emissiveIntensity=(0.35+2.4*nightF)*po; M.glow.opacity=nightF*0.8*po;
  M.window.color.setHex(0xb5dcf2).lerp(tmpC.setHex(0x1a2a44),nightF); M.window.emissive.setHex(0x5a8fb8); M.window.emissiveIntensity=0.35*dayF+0.04*nightF;
  M.windowLit.color.copy(M.window.color); M.windowLit.emissive.setHex(nightF>0.5?0xffb860:0x5a8fb8); M.windowLit.emissiveIntensity=(nightF>0.5?1.1*nightF:0.35*dayF)*(po<1?0.08:1);
  lobbyLight.intensity=nightF*1.3*po;
  if(sunPatchM) sunPatchM.opacity=dayF*0.35*wl*(1-dusk*0.5);
  renderer.toneMappingExposure=1.08-nightF*0.2;
}

// =====================================================================
// 3D FX: confetti, sparkles, coin arcs, camera shake
// =====================================================================
const fx3=[];
const CONF_COLS=[0xe0574f,0xf2b632,0x2e86c1,0x27ae60,0x8e44ad,0xffffff];
function confettiAt(x,y,z,n=40){ if(state.lowFx) n=Math.ceil(n/4);
  for(let i=0;i<n;i++){ const m=new THREE.Mesh(plane(0.09,0.15),new THREE.MeshBasicMaterial({color:rand(CONF_COLS),side:THREE.DoubleSide,transparent:true}));
    m.position.set(x,y,z); world.add(m); fx3.push({m,v:new THREE.Vector3(rnd(-3,3),rnd(3.5,7),rnd(-3,3)),s:new THREE.Vector3(rnd(-9,9),rnd(-9,9),rnd(-9,9)),life:1.8,max:1.8,g:9,drag:0.96}); }
}
function sparkleAt(x,y,z){
  for(let i=0;i<14;i++){ const m=new THREE.Mesh(sph(0.05,6,4),new THREE.MeshBasicMaterial({color:rand([0xfff6c2,0xffffff,0xaef0ff]),transparent:true,blending:THREE.AdditiveBlending}));
    m.position.set(x+rnd(-0.6,0.6),y+rnd(-0.3,0.5),z+rnd(-0.6,0.6)); world.add(m); fx3.push({m,v:new THREE.Vector3(0,rnd(0.6,1.4),0),life:0.9,max:0.9,g:0,drag:1,twinkle:true}); }
}
function buildThud(v){
  const R=v.r;
  const ring=new THREE.Mesh(new THREE.RingGeometry(R*0.7,R,32),new THREE.MeshBasicMaterial({color:0xf3ecde,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.set(v.x,v.y+0.06,v.z); world.add(ring); fx3.push({m:ring,v:new THREE.Vector3(),g:0,life:.55,max:.55,grow:4.5/R});
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2, m=new THREE.Mesh(sph(0.1,6,4),new THREE.MeshBasicMaterial({color:0xe8e2d6,transparent:true,opacity:.6,depthWrite:false}));
    m.position.set(v.x+Math.cos(a)*R,v.y+0.12,v.z+Math.sin(a)*R); world.add(m); fx3.push({m,v:new THREE.Vector3(Math.cos(a)*2.4,rnd(0.3,0.9),Math.sin(a)*2.4),life:.6,max:.6,g:0,drag:0.9,grow:0.8}); }
  sfx('thud'); camShake(0.12);
}
const coinGeo=new THREE.CylinderGeometry(0.09,0.09,0.025,12);
function coinArc(ax,ay,az,bx,by,bz){
  const m=new THREE.Mesh(coinGeo,M.gold); m.position.set(ax,ay,az); world.add(m);
  fx3.push({m,arc:{ax,ay,az,bx,by,bz},life:0.38,max:0.38});
}
function updateFx3(dt){
  while(fx3.length>500){ const o=fx3.shift(); world.remove(o.m); if(o.m.material!==M.gold) o.m.material.dispose(); }
  for(let i=fx3.length-1;i>=0;i--){ const f=fx3[i]; f.life-=dt; const k=1-f.life/f.max;
    if(f.arc){ const a=f.arc; f.m.position.set(lerp(a.ax,a.bx,k),lerp(a.ay,a.by,k)+Math.sin(k*Math.PI)*1.2,lerp(a.az,a.bz,k)); f.m.rotation.x+=dt*12; }
    else { f.v.y-=f.g*dt; f.v.multiplyScalar(f.drag||1); f.m.position.addScaledVector(f.v,dt); if(f.bounceY!=null&&f.m.position.y<f.bounceY&&f.v.y<0){ f.m.position.y=f.bounceY; f.v.y*=-0.45; f.v.x*=0.7; f.v.z*=0.7; } if(f.grow) f.m.scale.multiplyScalar(1+f.grow*dt); if(f.s){ f.m.rotation.x+=f.s.x*dt; f.m.rotation.y+=f.s.y*dt; } if(f.m.material.opacity!==undefined) f.m.material.opacity=Math.min(1,f.life/f.max*2)*(f.twinkle?0.6+0.4*Math.sin(f.life*30):1); }
    if(f.life<=0){ world.remove(f.m); if(f.m.material!==M.gold) f.m.material.dispose(); fx3.splice(i,1); }
  }
}
let shake=0;
function camShake(a){ if(state.lowFx) return; shake=Math.max(shake,a); }

// =====================================================================
// TUTORIAL & GOALS
// =====================================================================
const TUT=[
  {text:'Parmağını sürükleyerek yürü',hint:IS_TOUCH?'Ekranda parmağını sürükle ya da gitmek istediğin yere dokun':'WASD / ok tuşlarıyla yürü ya da gitmek istediğin yere tıkla'},
  {text:'Yeşil alana gir: ilk odayı aç',hint:'Yeşil alanın içinde dur, paran otomatik yatırılır'},
  {text:'Resepsiyona geç, misafiri karşıla',hint:'Masanın arkasındaki mavi alanda dur'},
  {text:'Masadaki parayı topla',hint:'Para destelerinin üstünden geç'},
  {text:'Misafir çıkınca odayı temizle',hint:'Kirli odanın içine gir, temizlik kendiliğinden olur'},
];
function tutEvent(ev){
  const s=state.tut;
  const adv=()=>{ state.tut++; sfx('sparkle'); if(state.tut<TUT.length) hint(TUT[state.tut].hint,4.5); else { hint('Harika! Otelini büyüt 🎯 Sağdaki Görevler butonunda günlük ödüller seni bekliyor',6); if(!state.quests||state.quests.day!==state.day) newQuests(); } markSave(); };
  if(s===0&&ev==='moved') adv();
  else if(s===1&&ev==='built:r102') adv();
  else if(s===2&&ev==='checkin') adv();
  else if(s===3&&ev==='collect') adv();
  else if(s===4&&ev==='clean') adv();
  const tips=state.tips;
  if(ev==='request'&&!tips.req){ tips.req=true; hint(built('rest')?'Misafir istekte bulundu! 🧻🧺 depodan, 🍽️ restorandan al ve odaya götür':'Misafir istekte bulundu! Depodan alıp odasına götür',5); }
  if(ev==='broken'&&!tips.brk){ tips.brk=true; hint('Arızalı odaya gir, tamir kendiliğinden olur 🔧',4.5); }
}
function goal(){
  const s=state.tut;
  const cg=crisisGoal(); if(cg) return cg;
  const emg=emergencyGoal(); if(emg) return emg;
  if(s===0) return {icon:'👆',text:TUT[0].text,target:null};
  if(s===1) return {icon:'🛏️',text:TUT[1].text,target:padTarget('r102'),price:PADMAP.r102.cost-(state.paid.r102||0)};
  if(s===2) return {icon:'🛎️',text:TUT[2].text,target:{x:L.serve.cx,y:0,z:L.serve.cz,f:0}};
  if(s===3) return {icon:'💰',text:TUT[3].text,target:{x:L.piles.desk.x,y:0,z:L.piles.desk.z,f:0}};
  if(s===4){ const d=roomsWhere(id=>state.rooms[id].dirty)[0]; if(d){ const sp=roomSpots(d); return {icon:'🧹',text:TUT[4].text,target:{x:sp.stand.x,y:sp.stand.f*FH,z:sp.stand.z,f:sp.stand.f}}; }
    return {icon:'⏳',text:'Misafir odasında… bu arada parayı topla',target:null}; }
  const evg=eventGoal(); if(evg) return evg;
  const chg=chainGoal(); if(chg) return chg;
  const av=PADS.filter(d=>padVis[d.id]);
  if(!av.length) return state.done?{icon:'🏆',text:'Otel tamamlandı! Yeni şehir seni bekliyor',target:null,done:true}:null;
  const open=av.filter(d=>!padLocked(d)).sort((a,b)=>(a.cost-(state.paid[a.id]||0))-(b.cost-(state.paid[b.id]||0)));
  if(open.length){ const d=open[0]; return {icon:d.icon,text:d.label,price:Math.ceil(d.cost-(state.paid[d.id]||0)),target:padTarget(d.id)}; }
  const d=av[0], miss=rawStars()>=d.stars?starMissing(stars()+1):[]; return {icon:'⭐',text:miss.length?`${stars()+1}★ için: ${miss.join(', ')}`:`${d.label} için ${d.stars} yıldıza ulaş`,target:null};
}
function padTarget(id){ const d=PADMAP[id]; return {x:d.x,y:d.f*FH,z:d.z,f:d.f}; }

// ---------- short goal chain: always one small rewarded objective on screen ----------
const CHAIN_KEYS=['guest','clean','happy','earn','req','coffee','amen','fix','upg'];
let chainFlash=0, chainFlashTxt='';
function chainOn(){ return state.tut>=TUT.length&&!state.sandbox; }
function openPads(){ return PADS.filter(d=>padVis[d.id]&&!padLocked(d)).sort((a,b)=>(a.cost-(state.paid[a.id]||0))-(b.cost-(state.paid[b.id]||0))); }
function newChain(){
  const n=state.chainN||0, rr=roomRateSum()*incomeMult(), op=openPads();
  if(n%2===0&&op.length){ const d=op[0]; state.chain={k:'pad',pad:d.id,need:1,have:0,rew:r10(Math.max(40,Math.min(d.cost*0.12,rr*0.8+40)))}; }
  else { const keys=CHAIN_KEYS.filter(k=>QDEF[k].ok()&&k!==(state.chainLast||'')), k=keys[Math.floor(Math.random()*keys.length)]||'guest';
    const need=k==='earn'?r10(Math.max(120,rr*1.2)):k==='upg'||k==='fix'?1:clamp(2+Math.floor(n/5),2,7);
    state.chain={k,need,have:0,rew:r10(Math.max(40,rr*0.35))}; state.chainLast=k; }
  markSave();
}
function chainEv(k,v){ const c=state.chain; if(!chainOn()||!c||c.k!==k) return; c.have=Math.min(c.need,c.have+v); if(c.have>=c.need) chainDone(); else markSave(); }
function chainDone(){
  const c=state.chain; state.chain=null; state.chainN=(state.chainN||0)+1;
  addMoney(c.rew,player.x,player.y+1.2,player.z,player.f,true); gainXP(8); sfx('sparkle'); confettiAt(player.x,player.y+1.8,player.z,30);
  passPts(5); chainFlash=1.6; chainFlashTxt=`Hedef tamam! +${fmt(c.rew)} ₺`; markSave();
}
function chainTarget(k){
  const room=fn=>{ const ids=roomsWhere(fn); if(!ids.length) return null; let best=null,bd=1e9;
    for(const id of ids){ const sp=roomReach(id), d=(sp.f!==player.f?400:0)+d2(player.x,player.z,sp.x,sp.z); if(d<bd){ bd=d; best=sp; } }
    return {x:best.x,y:best.f*FH,z:best.z,f:best.f}; };
  if(k==='clean') return room(id=>state.rooms[id].dirty);
  if(k==='fix') return room(id=>state.rooms[id].broken);
  if(k==='req') return room(id=>!!RT(id).req);
  if(k==='guest') return {x:L.serve.cx,y:0,z:L.serve.cz,f:0};
  if(k==='earn'){ let bk=null; for(const p in state.piles) if(state.piles[p]>0&&(!bk||state.piles[p]>state.piles[bk])) bk=p;
    if(bk){ const P=L.piles[bk]; return {x:P.x,y:P.f*FH,z:P.z,f:P.f}; } }
  return null;
}
function chainGoal(){
  if(!chainOn()) return null;
  if(chainFlash>0) return {icon:'🎉',text:chainFlashTxt,target:null,done:true};
  let c=state.chain; if(c&&c.k!=='pad'&&!QDEF[c.k]) c=state.chain=null;
  if(c&&c.k==='pad'&&(built(c.pad)||!PADMAP[c.pad])){ if(built(c.pad)){ c.have=1; chainDone(); return chainGoal(); } c=state.chain=null; }
  if(c&&c.k==='pad'&&!padVis[c.pad]) c=state.chain=null;
  if(!c){ newChain(); c=state.chain; }
  if(c.k==='pad'){ const d=PADMAP[c.pad]; return {icon:d.icon,text:d.label,price:Math.ceil(d.cost-(state.paid[d.id]||0)),target:padTarget(d.id),prog:(state.paid[d.id]||0)/d.cost,rew:c.rew}; }
  const Q=QDEF[c.k], cnt=c.k==='earn'?`${fmt(c.have)}/${fmt(c.need)}`:`${c.have}/${c.need}`;
  return {icon:Q.e,text:(c.k==='earn'?`${fmt(c.need)} ₺ kazan`:Q.t(c.need))+` <small>${cnt}</small>`,target:chainTarget(c.k),prog:c.have/c.need,rew:c.rew};
}
