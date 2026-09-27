
// ===== TEMP VISUAL-INSPECTION MODE (removed before final release) =====
let DEMO=false, demoBuf='';
window.addEventListener('keydown',e=>{
  if(e.key.length!==1) return; demoBuf=(demoBuf+e.key.toLowerCase()).slice(-7);
  if(demoBuf==='otelgez'&&!DEMO){ DEMO=true; window.save=()=>{}; saveDirty=false;
    state.money=1e6; state.rep=85; state.t=0.25; state.weather='sun'; state.tut=TUT.length;
    PADS.forEach(d=>{ if(!built(d.id)&&(d.f<1||d.id==='f3'||/^r2/.test(d.id))) completePad(d); });
    Object.keys(state.rooms).forEach((k,i)=>{ const s=state.rooms[k]; s.type=ROOM_ORDER[i%3]; s.decor={art:i%2===0,plant:i%3===0,bar:i%4===0}; if(i%5===1) s.dirty=true; if(i%7===3) s.broken=true; buildRoomVisual(+k,false); });
    state.staff.rec.n=1; spawnStaff('rec'); for(let i=0;i<2;i++){ state.staff.clean.n++; spawnStaff('clean'); } state.staff.bell.n=1; spawnStaff('bell');
    for(let i=0;i<5;i++) spawnGuest();
    if(!state.quests) newQuests(); player.place(2.4,4.2,0); unstick(player); hint('İnceleme modu: 9 otobüs · 0 görev · 1 lobi · 2 restoran · 3 havuz · 4 spor · 5 2.kat · 6 sokak · 7 gece · 8 kış',8); }
  if(!DEMO) return;
  const tp=(f,x,z)=>{ player.place(x,z,f); unstick(player); peekFloor=null; };
  if(e.key==='1') tp(0,-2,4); if(e.key==='2') tp(0,-12,3); if(e.key==='3') tp(0,12,5); if(e.key==='4') tp(0,12,-5.5);
  if(e.key==='5') tp(1,0,1.9); if(e.key==='6') tp(0,0,11.5);
  if(e.key==='7') state.t=state.t<0.74?0.8:0.25;
  if(e.key==='9'){ startBus(); spawnGuest('insp'); tp(0,0,10.5); }
  if(e.key==='0'){ state.quests.list.forEach(q=>qEv(q.k,q.n)); openSheet('quests'); }
  if(e.key==='8'){ state.day=state.day<13?13:1; applySeason(); state.weather=isWinter()?'snow':'sun'; applyWeather(); }
});
