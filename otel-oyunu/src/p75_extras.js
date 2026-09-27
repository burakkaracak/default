
// =====================================================================
// EXTRAS: crisis days, hotel cat, hotel name & character customization
// =====================================================================
function powerOut(){ return !!state.crisis&&state.crisis.type==='power'; }
function catName(){ return (state.custom&&state.custom.cat)||'Pamuk'; }

// ---------- generator (always there, needed during power cuts) ----------
let genLight=null;
function buildGenerator(){
  const g=new THREE.Group(); g.position.set(L.gen.x,0,L.gen.z); outdoor.add(g);
  const S=new THREE.Group();
  S.add(mesh(box(1.06,0.08,0.68),mat(0x3b434b),0,0.04,0));
  S.add(mesh(rbox(1.0,0.72,0.62,.05),mat(0x6d7a86,{metalness:.5,roughness:.45}),0,0.44,0,true));
  for(let k=0;k<5;k++) S.add(mesh(box(0.05,0.36,0.02),M.dark,-0.36+k*0.1,0.46,0.315));
  S.add(mesh(box(1.02,0.07,0.64),mat(0xf2c14e),0,0.82,0));
  S.add(mesh(cyl(0.045,0.045,0.5,8),M.dark,0.36,1.08,-0.16,true));
  const sg=signPlane('JENERATÖR',0.46,0.13,{bg:'#f2c14e',fg:'#2a1c00',font:'800 60px "Baloo 2"',fit:true}); sg.position.set(0.2,0.6,0.322); S.add(sg);
  g.add(bake(S));
  genLight=mesh(sph(0.045,8,6),new THREE.MeshBasicMaterial({color:0x5fd98a}),-0.42,0.72,0.33); g.add(genLight);
  addCols('gen',[[0,L.gen.x-0.53,L.gen.x+0.53,L.gen.z-0.34,L.gen.z+0.34]]);
}

// ---------- crises ----------
const CRISIS={
  power:{e:'⚡',title:'⚡ Elektrik kesildi!',sub:'Resepsiyon çalışmıyor. Dışarıdaki jeneratörü çalıştır!',goal:'Jeneratörü çalıştır',time:3,done:'⚡ Elektrik geri geldi!'},
  flood:{e:'💧',title:'💧 Boru patladı!',goal:'Su baskınını onar',time:3.2,done:'💧 Boru tamir edildi!'},
  flu:{e:'🤧',title:'🤧 Grip salgını!'}};
let crisisVis=null;
function startCrisis(type){
  if(type==='flu') return startFlu();
  if(state.crisis) return;
  const c={type,p:0,by:null};
  if(type==='power') Object.assign(c,{x:L.genSpot.x,z:L.genSpot.z,f:0});
  else {
    const f=rint(0,Math.min(3,floorsBuilt())-1);
    const cand=[[-4.2,CORR[0]],[3.2,CORR[0]],[-1.8,CORR[0]],[0,-1.2],[0,-5],[-3.2,CORR[1]],[3.2,CORR[1]],[-3.2,CORR[2]],[3.2,CORR[2]],[0,-9.2]].filter(([x,z])=>!blockedAt(f,x,z,0.3));
    const [x,z]=cand.length?rand(cand):[0,CORR[0]]; Object.assign(c,{x,z,f});
  }
  state.crisis=c; state.lastCrisis=state.day; buildCrisisVis();
  for(const k in state.rooms) applyRoomState(+k);
  const C=CRISIS[type]; banner(C.title,type==='flood'?`${c.f+1}. katta su baskını! Misafirler rahatsız, hemen onar`:C.sub);
  sfx('alarm'); camShake(0.2); markSave();
}
function buildCrisisVis(){
  removeCrisisVis(); const c=state.crisis; if(!c) return;
  const g=new THREE.Group(); crisisVis={g,drips:[],type:c.type};
  if(c.type==='flood'){
    g.position.set(c.x,0,c.z); floorRoot(c.f).add(g);
    const pud=decal('puddle',1.6,1.2,0,0.035,0); pud.renderOrder=2; g.add(pud); crisisVis.pud=pud;
    const pipe=mat(0x9aa4ad,{metalness:.6,roughness:.35});
    const p1=mesh(cyl(0.07,0.07,1.6,10),pipe,0,2.62,0); p1.rotation.z=Math.PI/2; g.add(p1);
    g.add(mesh(new THREE.TorusGeometry(0.09,0.03,6,12),mat(0x6d7a86,{metalness:.6}),0,2.62,0));
    const wm=new THREE.MeshBasicMaterial({color:0x7fc4ff,transparent:true,opacity:.85});
    for(let k=0;k<9;k++){ const d=mesh(sph(0.035,6,4),wm,rnd(-0.12,0.12),2.5,rnd(-0.12,0.12)); d.userData.ph=k/9; g.add(d); crisisVis.drips.push(d); }
  } else { outdoor.add(g); }
}
function removeCrisisVis(){ if(crisisVis){ if(crisisVis.g.parent) crisisVis.g.parent.remove(crisisVis.g); crisisVis=null; } }
function resolveCrisis(byStaff){
  const c=state.crisis; if(!c) return;
  state.crisis=null; removeCrisisVis();
  for(const k in state.rooms) applyRoomState(+k);
  sparkleAt(c.x,c.f*FH+0.8,c.z); sfx('fix'); changeRep(1); onGameEvent('crisis',1);
  banner(CRISIS[c.type].done,byStaff?'Teknisyen halletti · +1 ün':'Kahramanca! +1 ün'); markSave();
}
function crisisGoal(){
  const c=state.crisis;
  if(c&&c.type!=='flu') return {icon:CRISIS[c.type].e,text:CRISIS[c.type].goal,target:{x:c.x,y:c.f*FH,z:c.z,f:c.f},crisis:true};
  const m=state.mess;
  if(m&&state.tut>=TUT.length) return {icon:'🪴',text:'Devrilen saksıyı temizle',target:{x:m.x,y:0,z:m.z,f:0}};
  return null;
}
// flu: some staff go home sick until tomorrow
function startFlu(){
  const pool=staffEnts.filter(e=>e.kind!=='rec'&&!e.sick);
  if(pool.length<2){ toast('Grip için en az 2 personel gerekli'); return; }
  const n=Math.min(pool.length-1,Math.max(1,Math.round(pool.length/3)));
  for(let i=0;i<n;i++){ const e=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    if(e.job) finishJob(e); e.sick=true; e.anim=null; e.speed=1.4; fxEmoji(e.x,e.y+2.1,e.z,e.f,'🤒');
    if(!e.goTo(0,rnd(-0.6,0.6),10.6,()=>{ e.gone=true; })) e.gone=true; }
  banner('🤧 Grip salgını!',`${n} personel bugün hasta, işler sana kaldı. Yarın dönecekler`); sfx('fail'); markSave();
}
function healAll(){
  let n=0; staffEnts.forEach(e=>{ if(e.sick){ n++; e.sick=false; e.gone=false; e.place(rnd(-0.5,0.5),8.6,0); e.idleDone=false; e.wait=0; e.c.root.visible=true; } });
  return n;
}

// ---------- cat mess ----------
let messVis=null;
const MESS_SPOTS=[[1.2,6.45],[-5.7,3.0],[4.45,7.1]];
function catKnock(){
  if(state.mess) return;
  const ok=MESS_SPOTS.filter(([x,z])=>!blockedAt(0,x,z,0.22)); if(!ok.length) return;
  const [x,z]=rand(ok); state.mess={x,z,f:0,p:0,by:null}; buildMessVis();
  if(cat){ cat.x=x+0.4; cat.z=z-0.3; unstickCat(); catRunAway(); }
  toast(`🐱 ${catName()} saksıyı devirdi! Temizle 🧹`,'bad'); sfx('fail'); markSave();
}
function buildMessVis(){
  if(messVis&&messVis.parent) messVis.parent.remove(messVis);
  const m=state.mess; if(!m) return;
  const g=new THREE.Group(); g.position.set(m.x,0,m.z); floorRoot(0).add(g); messVis=g;
  const soil=decal('stain',0.9,0.75,0,0.03,0); soil.material=soil.material.clone(); soil.material.color.setHex(0x6b4a2a); soil.renderOrder=2; g.add(soil);
  const pot=mesh(cyl(0.13,0.1,0.24,12),mat(0xc9774a),0.18,0.12,-0.05,true); pot.rotation.z=Math.PI/2.2; g.add(pot);
  for(let k=0;k<5;k++){ const lf=mesh(sph(0.06,6,4),mat(0x3f7a3e),rnd(-0.3,0.2),0.04,rnd(-0.25,0.25)); lf.scale.set(1.4,0.35,0.8); lf.rotation.y=rnd(0,3); g.add(lf); }
  for(let k=0;k<3;k++) g.add(mesh(new THREE.IcosahedronGeometry(0.04,0),mat(0x5a3d22,{flatShading:true}),rnd(-0.3,0.3),0.03,rnd(-0.2,0.2)));
}
function cleanMess(byStaff){
  const m=state.mess; if(!m) return; state.mess=null;
  if(messVis&&messVis.parent) messVis.parent.remove(messVis); messVis=null;
  sparkleAt(m.x,0.6,m.z); sfx('sparkle'); if(!byStaff) toast('🪴 Saksı toplandı'); markSave();
}
// staff helper: go to a spot job (mess for cleaners, crisis for technicians)
function staffSpotJob(e,kind){
  const o=kind==='mess'?state.mess:(state.crisis&&state.crisis.type!=='flu'?state.crisis:null);
  if(!o||o.by!=null) return false;
  o.by=e.idx; e.job={type:kind,id:-1,working:false,t:kind==='mess'?1.6:4.5};
  const ok=e.goTo(o.f,o.x+rnd(-0.1,0.1),o.z+rnd(-0.1,0.1),()=>{ if(e.job&&e.job.type===kind){ e.job.working=true; e.tRot=Math.PI; } });
  if(!ok){ o.by=null; e.job=null; return false; }
  return true;
}

// ---------- the hotel cat ----------
let cat=null;
function makeCatModel(){
  const g=new THREE.Group(), fur=mat(0xf6f1e8,{roughness:.95}), patch=mat(0xe8923e,{roughness:.95}), pink=mat(0xf2a0a8);
  const body=new THREE.Group(); g.add(body);
  const torso=mesh(capsule(0.1,0.2,10),fur,0,0.19,0,true); torso.rotation.x=Math.PI/2; body.add(torso);
  const sp=mesh(sph(0.085,10,8),patch,0.02,0.25,-0.06); sp.scale.set(1,0.5,1.3); body.add(sp);
  const head=new THREE.Group(); head.position.set(0,0.3,0.19); body.add(head);
  head.add(mesh(sph(0.1,14,10),fur,0,0,0,true));
  const hp=mesh(sph(0.07,8,6),patch,0.04,0.05,-0.01); hp.scale.set(1,0.7,1); head.add(hp);
  [-1,1].forEach(sd=>{ const ear=mesh(cone(0.04,0.08,6),sd>0?patch:fur,0.055*sd,0.09,-0.01); ear.rotation.z=-0.25*sd; head.add(ear);
    const eye=mesh(sph(0.017,8,6),M.dark,0.04*sd,0.02,0.088); head.add(eye);
    const wh=mesh(box(0.08,0.004,0.004),M.white,0.07*sd,-0.02,0.08); wh.rotation.z=0.15*sd; head.add(wh); });
  head.add(mesh(sph(0.013,6,4),pink,0,-0.005,0.1));
  const legs=[]; [[-0.055,0.11],[0.055,0.11],[-0.055,-0.1],[0.055,-0.1]].forEach(([x,z])=>{ const p=new THREE.Group(); p.position.set(x,0.13,z); body.add(p);
    p.add(mesh(cyl(0.025,0.022,0.13,6),fur,0,-0.065,0)); legs.push(p); });
  const tail=new THREE.Group(); tail.position.set(0,0.22,-0.18); body.add(tail);
  let seg=tail; for(let k=0;k<3;k++){ const s=new THREE.Group(); s.position.set(0,k?0.075:0,0); seg.add(s); const m=mesh(cyl(0.022,0.02,0.08,6),k===2?patch:fur,0,0.04,0); s.add(m); if(!k) s.rotation.x=-0.9; seg=s; }
  const sh=blob(0.22); sh.scale.set(0.8,1.3,1); g.add(sh);
  return {g,body,head,legs,tail};
}
function spawnCat(){
  if(cat) return; const m=makeCatModel(); floorRoot(0).add(m.g);
  cat=Object.assign(m,{x:0.6,z:5.2,y:0,rot:0,tRot:0,state:'idle',t:2,path:null,pi:0,ph:Math.random()*6,petCd:0,speed:0.9});
  unstickCat();
}
function catArrive(){ state.catOn=true; spawnCat(); if(cat){ cat.x=0; cat.z=9.3; catWalkTo(0.4,5.6,1.2); }
  banner(`🐱 ${catName()} otele yerleşti!`,'Lobide dolaşan kediyi sev, misafirler bayılacak ❤️'); sfx('meow'); markSave(); }
function unstickCat(){ if(!cat) return; if(blockedAt(0,cat.x,cat.z,0.15)){ const g=gridFor(0), c=nearestFree(g,cellI(g,cat.x),cellJ(g,cat.z)); if(c){ cat.x=cx_(g,c[0]); cat.z=cz_(g,c[1]); } } }
function catWalkTo(x,z,speed){ const p=findPath(0,cat.x,cat.z,x,z); if(!p){ cat.state='idle'; cat.t=2; return false; } cat.path=p; cat.pi=0; cat.state='walk'; cat.speed=speed||0.9; cat.y=0; return true; }
function catRunAway(){ for(let i=0;i<12;i++){ const x=rnd(-2,6.3), z=rnd(3,7.1); if(!blockedAt(0,x,z,0.2)&&d2(x,z,cat.x,cat.z)>4){ catWalkTo(x,z,2.6); return; } } }
function catPet(){
  const c=cat; c.state='pet'; c.t=2.4; c.path=null; c.y=0; c.petCd=7;
  fxEmoji(c.x,1.0,c.z,0,'❤️'); setTimeout(()=>{ if(cat) fxEmoji(cat.x+0.2,1.25,cat.z,0,'💕'); },350); sfx('meow');
  state.catPets=(state.catPets||0)+1; qEv('pet');
  if(state.catPetDay!==state.day){ state.catPetDay=state.day; changeRep(1); toast(`🐱 ${catName()} mırladı · +1 ün`); }
  markSave();
}
function updateCat(dt,t){
  const c=cat; if(!c) return;
  c.petCd=Math.max(0,c.petCd-dt);
  if(c.state==='walk'&&c.path){
    let remain=c.speed*dt;
    while(remain>0&&c.path&&c.pi<c.path.length){ const p=c.path[c.pi], dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz);
      if(d>0.001) c.tRot=Math.atan2(dx,dz);
      if(d<=remain){ c.x=p.x; c.z=p.z; remain-=d; c.pi++; } else { c.x+=dx/d*remain; c.z+=dz/d*remain; remain=0; } }
    if(c.pi>=c.path.length){ c.path=null; c.state='idle'; c.t=rnd(3,8); }
  } else if(c.state==='idle'){
    c.t-=dt;
    if(c.t<=0){
      if(Math.random()<0.28){ c.state='sleep'; c.t=rnd(14,26); c.x=2.7+rnd(-0.55,0.55); c.z=5.85; c.y=0.42; c.tRot=Math.PI+rnd(-0.4,0.4); c.path=null; }
      else if(Math.random()<0.3&&queue.length){ const g=rand(queue); catWalkTo(g.x+rnd(-0.4,0.4),g.z-0.45); }
      else { for(let i=0;i<10;i++){ const x=rnd(-2.2,6.3), z=rnd(3,7.1); if(!blockedAt(0,x,z,0.2)){ catWalkTo(x,z); break; } } if(c.state==='idle') c.t=2; }
    }
  } else if(c.state==='sleep'){
    c.t-=dt; if(Math.random()<dt*0.25) fxEmoji(c.x,c.y+0.7,c.z,0,'💤');
    if(c.t<=0){ c.y=0; c.z=4.2; c.x=clamp(c.x,1.7,3.7); unstickCat(); c.state='idle'; c.t=rnd(2,5); }
  } else if(c.state==='pet'){
    c.t-=dt; if(player) c.tRot=Math.atan2(player.x-c.x,player.z-c.z);
    if(c.t<=0){ if(c.y>0){ c.y=0; c.z=4.2; unstickCat(); } c.state='idle'; c.t=rnd(1,3); }
  }
  // pose
  let dr=c.tRot-c.rot; while(dr>Math.PI) dr-=2*Math.PI; while(dr<-Math.PI) dr+=2*Math.PI; c.rot+=dr*Math.min(1,dt*8);
  c.g.position.set(c.x,c.y,c.z); c.g.rotation.y=c.rot; c.g.visible=floorVisible(0);
  const walking=c.state==='walk', sleeping=c.state==='sleep'&&c.y>0, ph=t*(walking?c.speed*14:2)+c.ph;
  c.legs.forEach((l,i)=>{ l.rotation.x=walking?Math.sin(ph+(i===0||i===3?0:Math.PI))*0.7:0; l.visible=!sleeping; });
  c.tail.rotation.y=Math.sin(t*(c.state==='pet'?7:2.2)+c.ph)*(c.state==='pet'?0.7:0.4); c.tail.rotation.x=sleeping?0.9:0;
  c.body.scale.set(1,sleeping?0.75+Math.sin(t*1.6)*0.03:1,sleeping?0.85:1); c.body.position.y=walking?Math.abs(Math.sin(ph))*0.015:0;
  c.head.rotation.x=sleeping?0.5:c.state==='pet'?-0.25+Math.sin(t*6)*0.08:Math.sin(t*0.7+c.ph)*0.1;
}

// ---------- scheduling ----------
function rollExtras(){
  if(state.tut<TUT.length) return;
  if(built('roof')&&Math.random()<0.6) state.heliDue=true;
  if(!state.catOn) state.catDue=true;
  else if(Math.random()<0.35) state.messDue=true;
  if(state.day>=4&&state.day-(state.lastCrisis||0)>=2&&Math.random()<0.4){
    const opts=['power']; if(nRoomsNow()>=4) opts.push('flood','flood'); if(staffEnts.filter(e=>e.kind!=='rec').length>=3) opts.push('flu');
    state.crisisDue=rand(opts); }
}
function updateExtraSpawns(dt,h){
  if(state.heliDue&&!heli&&h>=11&&h<18&&Math.random()<dt*0.05){ state.heliDue=false; startHeli(); }
  if(state.catDue&&!state.catOn&&h>=8&&h<20&&Math.random()<dt*0.08){ state.catDue=false; catArrive(); }
  if(state.messDue&&cat&&!state.mess&&h>=9&&h<20&&Math.random()<dt*0.015){ state.messDue=false; catKnock(); }
  if(state.crisisDue&&!state.crisis&&h>=10&&h<17&&Math.random()<dt*0.03){ const k=state.crisisDue; state.crisisDue=null; startCrisis(k); }
}
function endDayExtras(){ eventsDayEnd(); if(state.crisis&&state.crisis.type!=='flu'){ state.crisis=null; removeCrisisVis(); for(const k in state.rooms) applyRoomState(+k); changeRep(-3); setTimeout(()=>toast('🚨 Kriz gece boyunca ekipçe giderildi · −3 ün','bad'),1200); } const n=healAll(); if(n) setTimeout(()=>toast(`💪 ${n} personel iyileşip işe döndü`),1500); }
function extraPlayerZones(p,dt){
  if(p.riding) return;
  const c=state.crisis;
  if(c&&c.type!=='flu'&&p.f===c.f&&d2(p.x,p.z,c.x,c.z)<0.9*0.9){ c.p+=dt/CRISIS[c.type].time*(1+0.35*state.up.fix); workRing={p:c.p,icon:c.type==='power'?'⚡':'🔧'}; if(!p.moving&&!p.path) p.anim='work'; if(c.p>=1) resolveCrisis(false); return; }
  const m=state.mess;
  if(m&&p.f===0&&d2(p.x,p.z,m.x,m.z)<0.75*0.75){ m.p+=dt/1.3; workRing={p:m.p,icon:'🧹'}; if(!p.moving&&!p.path) p.anim='work'; if(m.p>=1) cleanMess(false); return; }
  if(cat&&p.f===0&&cat.petCd<=0&&cat.state!=='walk'&&d2(p.x,p.z,cat.x,cat.z)<0.95*0.95) catPet();
}
function updateExtras(dt,t){
  const gdt=dt*gameSpeed;
  updateCat(gdt,t);
  const c=state.crisis;
  if(c&&c.type!=='flu') changeRep(-gdt*0.02);
  if(genLight){ const out=powerOut(); genLight.material.color.setHex(out?(Math.sin(t*10)>0?0xff3b30:0x551111):0x5fd98a); }
  if(crisisVis&&crisisVis.type==='flood'){
    crisisVis.drips.forEach(d=>{ const k=(t*1.3+d.userData.ph)%1; d.position.y=2.5-k*2.45; d.scale.setScalar(1-k*0.3); });
    const s=1+Math.min(0.8,(c?c.p:0)*0+Math.sin(t*2)*0.03+0.3); crisisVis.pud.scale.set(s,s,s);
  }
  const pf=$('powerFx'); const on=powerOut(); if(pf.classList.contains('on')!==on) pf.classList.toggle('on',on);
  if(on&&deskMonitor) deskMonitor.visible=Math.random()>0.9; else if(deskMonitor&&!deskMonitor.visible) deskMonitor.visible=true;
  for(const e of staffEnts) if(e.gone) e.c.root.visible=false;
}
function bootExtras(){
  bootGfx(); bootFeatures(); bootPolish(); bootMega();
  buildGenerator();
  if(state.crisis){ if(state.crisis.type==='flu') state.crisis=null; else { state.crisis.by=null; buildCrisisVis(); } }
  if(state.mess){ state.mess.by=null; buildMessVis(); }
  if(state.catOn) spawnCat(); else if(state.tut>=TUT.length&&state.day>=2) state.catDue=true;
  tagAdd({kind:'spot',get:()=>state.crisis&&state.crisis.type!=='flu'?state.crisis:null,iconF:()=>CRISIS[state.crisis.type].e,cls:'warn',y:1.7});
  tagAdd({kind:'spot',get:()=>state.mess,icon:'🪴',cls:'warn',y:1.3});
  for(const k in state.rooms) applyRoomState(+k);
}

// ---------- customization ----------
const CUST={
  skin:SKINS, hair:[0x2b1d14,0x4a3020,0x8a5a2e,0xd8b26a,0x1a1a1a,0xb04a2a,0x9a9a9a,0xe06a9a],
  top:[0x1f3450,0x8a2f3a,0x2e7d4f,0x5c3d7a,0x2b2b2b,0xe0a93a,0xf4efe6,0x2e86c1],
  tie:[0xe0a93a,0xc0392b,0x2980b9,0x27ae60,0xf06292,0x1a1a1a],
  hs:[['quiff','Kabarık'],['short','Kısa'],['long','Uzun'],['bun','Topuz'],['bald','Kel']],
  hat:[['none','Yok'],['cap','Kep'],['sun','Hasır'],['fedora','Fötr'],['pillbox','Otel şapkası']]};
function rebuildPlayer(){
  const items=player.c.items.slice(); world.remove(player.c.root);
  player.c=makeChar(LOOKS.player()); world.add(player.c.root); setHold(player.c,items);
}
function setHotelName(n){
  n=(n||'').replace(/\s+/g,' ').trim().slice(0,22)||'Otel Ustası'; state.custom.name=n;
  logoSign.material.map=textTex(n.toLocaleUpperCase('tr-TR'),{fg:'#e8b64a',font:'800 70px "Baloo 2", serif',fit:true}); logoSign.material.needsUpdate=true;
  canopySign.material.map=textTex(n,{fg:'#ffd76a',stroke:'#4a2a00',strokeW:10,font:'800 96px "Baloo 2", serif',fit:true}); canopySign.material.needsUpdate=true;
  markSave();
}
const hex=v=>'#'+v.toString(16).padStart(6,'0');
const escH=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function renderCustomSheet(){
  const C=state.custom;
  const sw=(k,list)=>list.map(v=>`<button class="sw${C[k]===v?' on':''}" style="background:${hex(v)}" data-ck="${k}" data-cv="${v}" aria-label="renk"></button>`).join('');
  const opt=(k,list)=>list.map(([v,l])=>`<button class="btn ghost abtn${C[k]===v?' on':''}" data-ck="${k}" data-cv="${v}">${l}</button>`).join('');
  const h=`<h3>🎨 Otelim ve karakterim <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>
    <div class="asec"><div class="at">🏨 Otelin adı</div><div class="agrid"><input id="cName" class="tin" maxlength="22" value="${escH(C.name)}"><button class="btn gold" id="cNameOk">Uygula</button></div></div>
    <div class="asec"><div class="at">🐱 Kedinin adı</div><div class="agrid"><input id="cCat" class="tin" maxlength="14" value="${escH(C.cat||'Pamuk')}"><button class="btn gold" id="cCatOk">Uygula</button></div></div>
    <div class="asec"><div class="at">🏨 Otel teması</div><div class="agrid">${Object.keys(THEMES).map(k=>`<button class="btn ghost abtn${themeKey()===k?' on':''}" data-theme="${k}">${THEMES[k].e} ${THEMES[k].name}</button>`).join('')}</div></div>
    <div class="asec"><div class="at">💇 Saç modeli</div><div class="agrid">${opt('hs',CUST.hs)}</div></div>
    <div class="asec"><div class="at">🎨 Saç rengi</div><div class="agrid">${sw('hair',CUST.hair)}</div></div>
    <div class="asec"><div class="at">🙂 Ten rengi</div><div class="agrid">${sw('skin',CUST.skin)}</div></div>
    <div class="asec"><div class="at">👔 Kıyafet</div><div class="agrid">${sw('top',CUST.top)}</div></div>
    <div class="asec"><div class="at">🎀 Kravat</div><div class="agrid">${sw('tie',CUST.tie)}</div></div>
    <div class="asec"><div class="at">🎩 Şapka</div><div class="agrid">${opt('hat',CUST.hat)}</div></div>`;
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet;
  sheet.querySelectorAll('[data-theme]').forEach(el=>el.onclick=()=>{ C.theme=el.dataset.theme; applyHotelTheme(); sfx('build'); toast(`${THEMES[C.theme].e} Otel teması: ${THEMES[C.theme].name}`); save(); renderSheet(); });
  sheet.querySelectorAll('[data-ck]').forEach(el=>el.onclick=()=>{ const k=el.dataset.ck, v=el.dataset.cv; C[k]=isNaN(+v)?v:+v; rebuildPlayer(); sfx('click'); save(); renderSheet(); });
  const nm=sheet.querySelector('#cName'), ok=()=>{ setHotelName(nm.value); sfx('build'); toast(`🏨 Otelin adı artık “${state.custom.name}”`); save(); renderSheet(); };
  sheet.querySelector('#cNameOk').onclick=ok; nm.onkeydown=e=>{ if(e.key==='Enter') ok(); };
  const cn=sheet.querySelector('#cCat'), ok2=()=>{ C.cat=(cn.value||'').trim().slice(0,14)||'Pamuk'; sfx('meow'); toast(`🐱 Kedinin adı artık ${C.cat}`); save(); renderSheet(); };
  sheet.querySelector('#cCatOk').onclick=ok2; cn.onkeydown=e=>{ if(e.key==='Enter') ok2(); };
}
