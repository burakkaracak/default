window.simStep=(dt)=>{ updatePlayer(dt); updatePlayerZones(dt); updatePads(dt); updateDesk(dt); updateGuests(dt); updateStaff(dt);
  for(const e of ents.slice()) if(e!==player) e.step(dt); updateBus(dt,0); cafeWork=Math.max(0,cafeWork-dt); updateSpawner(dt); updateBreakdowns(dt); updateMega2(dt); updateDepth(dt); updateOps(dt); updateLive(dt,gtime); updateAmenLife(dt); updateFlow(dt); updateReal(dt); updateOps2(dt); updateWorld(dt); updateEvents3(dt); updateDepth2(dt); updateContent(dt,gtime); updateFx3(dt); updateAnims(dt); updateTime(dt);
  viewFloor=player.f; };
window.botBuy=()=>{ state.stayPol='yes'; state.obIx=1; if(morale()<35&&state.money>bonusCost()*3) giveBonus(); if(built('staff')&&state.day>8) state.nightShift=true;
  // yeni sistemler: seri, albüm, ödül yolu, müdür kartı, etkinlik teklifi, şehir tesisi, kat teması, MAX alım
  if(state.streak&&!state.streak.got) claimStreak();
  albClaimables().forEach(([k])=>claimAlb(k)); passClaimables().forEach(i=>claimPass(i));
  if(state.mgrOffer&&state.mgrOffer.day===state.day){ const ks=state.mgrOffer.ks; pickMgr(ks.includes('flash')?'flash':ks.includes('tour')?'tour':ks.includes('vip')&&roomsOfType('suite')>=3?'vip':''); }
  if(state.offer&&state.money>eventDeposit(state.offer.rew)*4) acceptOffer();
  if(stars()>=3&&!(state.sp&&state.sp.built)&&state.money>spCost()*3) buySpecial();
  for(let f=1;f<Math.min(floorsBuilt(),3);f++){ const F=(state.floors||{})[f]||{}; if(!F.theme&&state.money>floorThemeCost(f)*4) buyFloorTheme(f,'royal'); else if(F.theme&&!F.lounge&&state.money>loungeCost(f)*4) buyLounge(f); }
  for(const k of ['speed','cap','magnet']){ const M=upgMaxInfo(k); if(M.n>=2&&state.money>M.c*3) buyUpgMax(k); } if(stars()>=4) for(const k in INV){ const c=invCost(k); if(c!=null&&state.money>c*2.5&&!wageShort(c)){ buyInv(k,true); break; } }
  if(stars()>=3&&!galOn()&&state.money>galCost()*2.5&&!wageShort(galCost())) buyGallery(); if(galOn()&&!sofaOn()&&state.money>r10(LODA_SOFA.cost*cm())*2.5) buyLodaSofa('ivory'); if(galOn()) for(const k in VITRIN){ if(!vitOn(k)&&state.money>r10(VITRIN[k].cost*cm())*3){ buyVitrin(k); break; } }
  if(prjOpen()){ for(const k in PRJ){ const c=prjCost(k); if(c!=null&&state.money>c*2&&!wageShort(c)){ buyPrj(k,true); break; } } if(state.money>charityCost()*4&&!wageShort(charityCost())) donate(); }
  if(state.saga&&state.saga.pend) sagaChoose(Math.random()<0.6?'a':'b');
  if(state.quests) state.quests.list.forEach((q,i)=>{ if(q.done&&!q.claimed) claimQuest(i); });
  if(built('staff')){
    const plan=[['clean',1],['rec',1],['bell',1],['clean',2],['tech',1],['clean',3],['bell',2],['clean',4],['tech',2],['bell',3],['cook',1],['spaT',1],['laundry',1]];
    for(const [k,n] of plan){ if(state.staff[k].n<n){ const c=staffHireCost(k); if(c!=null&&state.money>c*1.6&&(!STAFF[k].needs||built(STAFF[k].needs))) hireStaff(k); break; } }
  }
  if(built('depo')&&state.stock&&(state.stock.paper<10||state.stock.towel<10)&&!state.order) orderSupply(false);
  for(const k of ['speed','cap','magnet','clean']){ const c=upgCost(k); if(c!=null&&state.money>c*3) buyUpg(k); }
  // oda yükseltmesi gerçek yoldan (spend + qEv + bekleyen yükseltme) — kısayol görevleri/hedefi atlıyordu
  for(const k in state.rooms){ const id=+k, c=roomUpCost(id), s=state.rooms[id]; if(c!=null&&state.money>c*4&&!RT(id).guest&&!s.dirty&&!s.broken&&!s.upPend) orderRoomUpgrade(id); }
  // esnaf: geri dönüşü ~9 gün olduğundan erken alınır
  if(state.day>=3) for(const k in SHOPS){ if(!shopOn(k)&&state.money>shopCost(k)*3&&!wageShort(shopCost(k))){ buyShop(k); break; } }
  // sabah brifingi: izin ver, fiyat savaşına karşılık ver, grevde prim
  morningQ().slice().forEach(it=>{ if(it.k==='leave'){ state.morale=clamp(morale()+6,0,100); state.leaveDay={day:state.day+1,kind:it.kind}; morningDone('leave'); } else if(it.k==='war'){ state.priceWar=state.day; morningDone('war'); } else if(it.k==='strike'&&state.money>bonusCost()){ giveBonus(); morningDone('strike'); } else if(it.k==='mgr') morningDone('mgr'); else if(it.k==='ad'){ if(state.money>adCounterCost()*3) counterAd(); morningDone('ad'); } else if(it.k==='resign'){ if(state.money>resignCost(it.kind)*2) rehireResigned(it); morningDone('resign'); } });
};
window.botTarget=()=>{
  const p=player, items=p.c.items;
  for(const k in state.rooms){ const R=RT(+k); if(R.req&&items.includes(R.req.item)){ return roomReach(+k); } }
  if(state.crisis&&state.crisis.type!=='flu') return {x:state.crisis.x,z:state.crisis.z,f:state.crisis.f};
  if(state.mess) return {x:state.mess.x,z:state.mess.z,f:0};
  const head=queue[0], rec=state.staff.rec.n>0;
  if(head&&!head.path&&head.state==='queue'&&pickRoom(head)&&!rec) return {x:L.serve.cx,z:L.serve.cz,f:0};
  const open=PADS.filter(d=>padVis[d.id]&&!padLocked(d)&&state.money>=d.cost-(state.paid[d.id]||0));
  if(open.length){ open.sort((a,b)=>a.cost-b.cost); const d=open[0]; return {x:d.x,z:d.z,f:d.f}; }
  for(const k in L.piles) if(state.piles[k]>=25*city().mult) return L.piles[k];
  const dirty=roomsWhere(id=>(state.rooms[id].dirty&&!RT(id).task)||(state.rooms[id].broken&&!RT(id).ftask));
  if(dirty.length){ const id=nearestRoom(p,dirty); return roomSpots(id).stand; }
  const reqs=roomsWhere(id=>RT(id).req&&!RT(id).req.by);
  if(reqs.length&&items.length<capacity()){ const it=RT(reqs[0]).req.item; if(it==='food') return {x:L.pass.x,z:L.pass.z,f:0}; return Object.assign({f:0},L.shelf[it]); }
  if(items.length&&!reqs.length) setHold(p.c,[]);
  const tips=roomsWhere(id=>state.rooms[id].tip>0); if(tips.length){ const id=nearestRoom(p,tips), ri=roomInfo(id); return {x:ri.x+TIP_X,z:ri.z+TIP_Z+0.3,f:ri.f}; }
  for(const k in L.piles) if(state.piles[k]>0) return L.piles[k];
  return {x:L.serve.cx,z:L.serve.cz,f:0};
};
window.botThink=()=>{
  if(player.riding||player.path) return;
  botBuy();
  const t=botTarget(); if(!t) return;
  if(Math.hypot(player.x-t.x,player.z-t.z)<0.25&&player.f===t.f) return;
  if(!player.goTo(t.f,t.x,t.z)) { window._fail=(window._fail||0)+1; }
};
window.runSim=(secs)=>{ const dt=0.05; let log=[]; let lastDay=state.day;
  for(let i=0;i<secs/dt;i++){ if(i%3===0) botThink(); simStep(dt);
    if(state.day!==lastDay){ lastDay=state.day; log.push({day:state.day-1,money:Math.round(state.money),stars:stars(),rep:Math.round(state.rep),rooms:Object.keys(state.rooms).length,built:Object.keys(state.built).length,list:Object.keys(state.built).slice(-6).join(','),served:state.served,staff:Object.values(state.staff).map(s=>s.n).join('/'),left:0}); } }
  return log; };
window._reports=[]; const _sr=showReport; showReport=function(day,t,rep){ window._reports.push({day,guests:t.guests,happy:t.happy,neu:t.neutral||0,unh:t.unhappy,left:t.left,inc:t.rooms+t.tips+t.amen+t.req+(t.cafe||0),cafe:t.cafe||0,quest:t.quest||0,wages:t.wages}); };
window._ev=[]; const _iv=inspectorVerdict; inspectorVerdict=function(g,m){ window._ev.push('insp:'+m+'@'+state.day); _iv(g,m); }; const _sb=startBus; startBus=function(){ window._ev.push('bus@'+state.day); _sb(); };
