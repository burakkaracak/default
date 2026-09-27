
// =====================================================================
// MEGA UPDATE: progression (XP, levels, combos, achievements, lucky
// guests, offline earnings), sandbox admin, wind & weather feel,
// seasons, physics feel, theme props, dynamic camera
// =====================================================================

// ---------- sandbox admin (admin never touches the real save) ----------
function openAdmin(){
  if(state.sandbox){ openSheet('admin'); return; }
  openModal(`<h3>🧪 Deneme modu</h3><p class="sub">Admin paneli ana oyununu bozmasın diye ayrı bir <b>deneme kaydında</b> açılır. Ana oyunun olduğu gibi saklanır; istediğin an geri dönersin. Deneme modunda başarım ve seviye kazanılmaz.</p>
    <button class="btn gold wide" id="sbGo">Deneme moduna geç</button><button class="btn ghost wide" id="sbNo">Vazgeç</button>`,m=>{
    m.querySelector('#sbNo').onclick=closeModal;
    m.querySelector('#sbGo').onclick=()=>{ save(); try{ const s=JSON.parse(JSON.stringify(state)); s.sandbox=true; localStorage.setItem('otel_ustasi_v2_sandbox',JSON.stringify(s)); localStorage.setItem('otel_mode','sandbox'); localStorage.setItem('otel_open_admin','1'); }catch(e){} location.reload(); };
  });
}
function exitSandbox(){ try{ localStorage.setItem('otel_mode','main'); }catch(e){} location.reload(); }

// ---------- XP, levels, combos, stats ----------
const XP_EV={guest:6,clean:5,req:7,happy:4,amen:1,fix:6,build:25,upg:8,coffee:1,pet:3,crisis:25,insp:20,quest:30,chat:2};
function xpNeed(l){ return Math.round(150*Math.pow(1.3,l-1)); }
let combo=0, comboT=0;
function onGameEvent(k,v=1){
  if(!state.stats) state.stats={};
  state.stats[k]=(state.stats[k]||0)+v; weeklyEv(k,v);
  if(state.sandbox) return;
  let xp=k==='earn'?Math.min(12,v/40):(XP_EV[k]||0)*v;
  if(k==='clean'||k==='req'||k==='earn'||k==='fix'){
    combo=comboT>0?Math.min(8,combo+1):1; comboT=6;
    if(combo>=2){ xp*=1+0.15*(combo-1); showCombo();
      if(k==='earn'){ const bonus=Math.round(v*0.02*(combo-1)); if(bonus>0){ state.money+=bonus; state.earned+=bonus; } } }
  }
  if(xp>0) gainXP(xp);
}
function gainXP(n){
  if(state.sandbox) return;
  state.xp=(state.xp||0)+n; if(!state.lvl) state.lvl=1;
  while(state.xp>=xpNeed(state.lvl)){ state.xp-=xpNeed(state.lvl); state.lvl++; levelUp(state.lvl); }
  markSave();
}
function levelUp(l){
  const chest=l%5===0, amt=Math.round((chest?90:18)*l*cm()*(1+nRoomsAll()/12));
  state.money+=amt; state.earned+=amt; if(player) coinsFly(player.x,player.y+1.2,player.z,player.f,amt);
  banner(chest?`💎 Seviye ${l}!`:`🎉 Seviye ${l}!`,chest?`Hazine sandığı: +${fmt(amt)} ₺`:`Ödül: +${fmt(amt)} ₺`);
  sfx('star'); if(player) confettiAt(player.x,player.y+2,player.z,chest?110:60); camShake(fpMode?0:0.15);
}
function showCombo(){
  const el=$('comboFx'); if(!el) return; el.textContent=`KOMBO x${combo}`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop','show');
  if(combo>=3) sfx('tick');
}
function updateCombo(dt){ if(comboT>0){ comboT-=dt; if(comboT<=0){ combo=0; const el=$('comboFx'); if(el) el.classList.remove('show'); } } }
function updateLevelHUD(){
  const n=$('lvlN'), b=$('lvlBar'); if(!n) return; n.textContent=state.lvl||1;
  b.style.width=Math.min(100,(state.xp||0)/xpNeed(state.lvl||1)*100)+'%';
  $('sbBadge').classList.toggle('show',!!state.sandbox);
}

// ---------- lucky golden guest ----------
function luckyJackpot(g){
  const j=Math.round(roomRateSum()*0.25*incomeMult()+100*cm());
  state.piles.desk+=j; pileChanged('desk'); banner('🍀 Şanslı misafir!','Altın misafir büyük ödedi, masadaki parayı topla');
  sfx('star'); confettiAt(g.x,2,g.z,70); onGameEvent('lucky',1);
}

// ---------- achievements ----------
const ACH=[];
[['served','🛎️','Misafirperver',[10,60,250,1000]],['cleaned','🧹','Temizlik ustası',[10,60,250]],['req','🧺','Kurye',[10,50,200]],
 ['earned','💰','Servet',[2000,20000,200000,2000000]],['happy','😍','Mutluluk fabrikası',[25,150,600]],['pet','🐱','Kedi dostu',[5,30]],
 ['crisis','🚨','Kriz yöneticisi',[1,10]],['insp','🕵️','Müfettişin gözdesi',[1,5]],['lvl','🎖️','Deneyimli müdür',[5,10,20,35]],
 ['rooms','🏗️','İnşaatçı',[12,24,36]],['stars','⭐','Yıldız avcısı',[3,4,5]],['coffee','☕','Barista',[50,300]],['chat','💬','Sohbet ustası',[5,40]],
 ['lux','💎','Lüks tutkunu',[1,5]],['lucky','🍀','Şans meleği',[1,5]],['days','📅','Sadık müdür',[7,30,100]]
].forEach(([st,e,name,goals])=>goals.forEach((g,i)=>ACH.push({id:st+i,st,e,name:name+' '+['I','II','III','IV'][i],goal:g,tier:i})));
function achVal(st){ const S=state.stats||{};
  switch(st){ case 'served': return state.served||0; case 'cleaned': return S.clean||0; case 'earned': return state.earned||0;
    case 'lvl': return state.lvl||1; case 'rooms': return nRoomsAll(); case 'stars': return stars(); case 'lux': return Object.keys(state.lux||{}).length; case 'days': return state.day;
    default: return S[st]||0; } }
function achReward(a){ return Math.round([80,300,1200,5000][a.tier]*cm()); }
let achT=0;
function checkAch(dt){
  achT-=dt; if(achT>0||state.sandbox||state.tut<TUT.length) return; achT=1;
  if(!state.ach) state.ach={};
  for(const a of ACH){ if(state.ach[a.id]) continue; if(achVal(a.st)>=a.goal){ state.ach[a.id]=true; const r=achReward(a);
      state.money+=r; state.earned+=r; gainXP(40*(a.tier+1)); passPts(10); toast(`🏆 Başarım: ${a.e} ${a.name} · +${fmt(r)} ₺`); sfx('sparkle'); if(player) confettiAt(player.x,player.y+2,player.z,35); markSave(); break; } }
}
function renderAchSheet(){
  const done=ACH.filter(a=>state.ach&&state.ach[a.id]).length;
  let h=`<h3>🎯 Görevler <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>${qTabsHtml('ach')}<p class="sub">🏆 Başarımlar · ${done}/${ACH.length} tamamlandı · her biri para ve deneyim verir</p>`;
  const seen={};
  for(const a of ACH){ const ok=state.ach&&state.ach[a.id]; if(!ok&&seen[a.st]) continue; if(!ok) seen[a.st]=true;
    const v=Math.min(a.goal,achVal(a.st)), p=v/a.goal;
    h+=`<div class="row${ok?' qdone':''}"><div class="ic">${a.e}</div><div class="tx">${a.name}<small>${ok?'Tamamlandı ✓':`${fmt(v)} / ${fmt(a.goal)}`}</small>${ok?'':`<div class="qbar"><i style="width:${(p*100).toFixed(0)}%"></i></div>`}</div><div style="font-weight:800;color:var(--gold2);font-size:13px;white-space:nowrap">+${fmt(achReward(a))} ₺</div></div>`; }
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h; sheet.querySelector('[data-close]').onclick=closeSheet; bindQTabs(sheet);
}

// ---------- offline earnings ----------
function offlineCheck(){
  const now=Date.now(), last=state.lastSeen||0; state.lastSeen=now;
  if(state.sandbox||!last||state.tut<TUT.length) return;
  const mins=(now-last)/60000; if(mins<5) return;
  const st=state.staff, f=clamp((st.rec.n?0.4:0)+(st.clean.n?0.3:0)+(st.bell.n?0.15:0)+(st.tech.n?0.15:0),0,1); if(f<=0) return;
  const amt=Math.round(Math.min(mins,480)/60*roomRateSum()*incomeMult()*0.9*f); if(amt<10) return;
  setTimeout(()=>openModal(`<h3>💤 Sen yokken</h3><p class="sub">${Math.round(Math.min(mins,480))} dakika boyunca personelin oteli işletti${mins>480?' (en fazla 8 saat sayılır)':''}.</p>
    <div class="stat" style="text-align:center;font-size:15px">Kazanç<b style="font-size:30px;color:var(--gold2)">+${fmt(amt)} ₺</b></div>
    <p class="note">Daha çok personel = daha çok çevrimdışı kazanç.</p><button class="btn gold wide" id="offOk">Topla 🎉</button>`,m=>{
      m.querySelector('#offOk').onclick=()=>{ closeModal(); addMoney(amt,player.x,1,player.z,player.f,true); confettiAt(player.x,player.y+2,player.z,60); sfx('star'); save(); }; }),1600);
}

// ---------- wind, weather feel, lightning, ambience ----------
const WIND={sun:0.25,cloud:0.55,rain:1.0,snow:0.6};
let wind=0.3, flashT=0, nextBolt=8, wetF=0;
const grassU={uTime:{value:0},uWind:{value:0.3}};
let wetMats=null, windAmb=null;
function setupGrassSway(){
  if(!grassMesh) return; const m=grassMesh.material;
  m.onBeforeCompile=sh=>{ sh.uniforms.uTime=grassU.uTime; sh.uniforms.uWind=grassU.uWind;
    sh.vertexShader='uniform float uTime; uniform float uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float hh=max(position.y,0.)*5.; vec4 wp0=instanceMatrix*vec4(0.,0.,0.,1.); transformed.x+=(sin(uTime*2.3+wp0.x*0.8+wp0.z*0.5)*0.35+0.5)*0.05*hh*uWind; transformed.z+=cos(uTime*1.8+wp0.z*0.7)*0.025*hh*uWind;'); };
  m.needsUpdate=true;
}
// şehir ambiyansı ve adım sesi döngüleri (örnekler yüklenince başlar)
const loops={};
function loopOf(k){ if(loops[k]) return loops[k]; const b=SMP[k], c=Sound.ctx; if(!b||!c) return null; const s=c.createBufferSource(), g=c.createGain(); s.buffer=b; s.loop=true; g.gain.value=0; s.connect(g); g.connect(Sound.sfx); s.start(0,Math.random()*b.duration); return loops[k]={s,g}; }
function updateLoops(dt){ if(!Sound.ctx||state.sound===false) return; const sm=(L,v,k)=>{ if(L) L.g.gain.value+=(v-L.g.gain.value)*Math.min(1,dt*k); };
  const amb=loopOf('amb'), ground=(viewFloor===0||fpMode)&&player.f===0; sm(amb,(ground?0.2:0.07)*(1-0.7*nightF)*(state.weather==='rain'?0.5:1),1.2);
  const st=loopOf('steps'), walking=!!(player.moving||player.path&&player.path.length)&&!player.riding; sm(st,walking?0.16:0,8); if(st) st.s.playbackRate.value=Math.min(1.5,playerSpeed()/3.3); }
function startAmbience(){
  if(windAmb||!Sound.ctx||!Sound.noise) return; const c=Sound.ctx;
  const buf=Sound.pink||Sound.noise;
  const mk=(type,freq,q,type2,freq2,off)=>{ const s=c.createBufferSource(); s.buffer=buf; s.loop=true; const f=c.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q; let last=f;
    if(type2){ const f2=c.createBiquadFilter(); f2.type=type2; f2.frequency.value=freq2; f2.Q.value=0.5; f.connect(f2); last=f2; }
    const g=c.createGain(); g.gain.value=0; s.connect(f); last.connect(g); g.connect(Sound.sfx); s.start(0,off||0); return {g,f}; };
  // yağmur: pembe gürültü, alçak ve yüksek frekanslar kırpılmış (tıslama yok) + ayrı damla katmanı
  windAmb={wind:mk('bandpass',420,0.7),rain:mk('highpass',350,0.5,'lowpass',2600,2.1),rainLo:mk('lowpass',260,0.5,null,0,4.3)};
}
function updateWeatherFeel(dt,t){
  const target=(WIND[state.weather]||0.3)*(0.7+0.25*Math.sin(t*0.55)+0.18*Math.sin(t*1.9+1.3));
  wind+=(target-wind)*Math.min(1,dt*0.9); grassU.uTime.value=t; grassU.uWind.value=wind;
  for(const g of SWAY){ g.rotation.z=Math.sin(t*1.4+g.userData.ph)*0.035*wind+wind*0.035; g.rotation.x=Math.cos(t*1.15+g.userData.ph)*0.02*wind; }
  rainFx.rotation.z=-wind*0.3; snowFx.rotation.z=-wind*0.15;
  // wet ground in rain, snow build-up in winter
  if(!wetMats){ wetMats=[]; for(const k in matCache){ const m=matCache[k], n=m.map&&m.map.userData&&m.map.userData.tex; if(n==='paving'||n==='asphalt'||n==='concrete'||n==='stone') wetMats.push([m,m.roughness]); } wetMats.push([groundMesh.material,groundMesh.material.roughness]); }
  const wetT=state.weather==='rain'?1:0; wetF+=(wetT-wetF)*Math.min(1,dt*0.25);
  wetMats.forEach(([m,r])=>{ m.roughness=lerp(r,0.25,wetF); });
  if(snowCover){ const want=isWinter()&&city().snow?(state.weather==='snow'?0.9:0.6):0; const o=snowCover.material.opacity; snowCover.material.opacity=o+(want-o)*Math.min(1,dt*0.2); snowCover.visible=snowCover.material.opacity>0.02; }
  // lightning
  const fx=$('flashFx');
  if(state.weather==='rain'){ nextBolt-=dt; if(nextBolt<=0){ nextBolt=rnd(9,22); flashT=0.35; if(Sound.ctx&&state.sound!==false){ noiseBurst(2.6,0.1,70,0.6); noiseBurst(1.4,0.05,140,0.75); noiseBurst(0.25,0.04,900,0.55); } } }
  if(flashT>0){ flashT-=dt; fx.style.opacity=(flashT>0.2||(flashT>0.08&&flashT<0.14))?0.55:0; } else if(fx.style.opacity!=='0') fx.style.opacity=0;
  // ambience audio
  if(Sound.ctx&&!windAmb) startAmbience();
  updateLoops(dt);
  if(windAmb){ const out=viewFloor===0||fpMode?1:0.6; windAmb.wind.g.gain.value=0.045*wind*out; windAmb.wind.f.frequency.value=300+wind*400; const rw=state.weather==='rain'?(stormOn&&stormOn()?1.4:1):0, sm=(k,v)=>{ k.g.gain.value+=(v-k.g.gain.value)*Math.min(1,dt*1.5); };
    sm(windAmb.rain,rw*0.07*out); sm(windAmb.rainLo,rw*0.05*out);
    if(rw&&state.sound!==false&&Math.random()<dt*9){ const c=Sound.ctx, t=c.currentTime, o=c.createOscillator(), g=c.createGain(); o.type='sine'; const f=rnd(1800,4200); o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*0.55,t+0.035);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.006*out,t+0.003); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05); o.connect(g); g.connect(Sound.sfx); o.start(t); o.stop(t+0.06); } }
}

// ---------- seasons: particles, props, colour tint, transition ----------
const seasonTint=new THREE.Vector3(1,1,1);
const SEASON_TINTS=[[1.0,1.0,1.02],[1.05,1.01,0.94],[1.06,0.97,0.88],[0.93,0.98,1.07]];
let leafFx=null, leafPos=null, leafPh=null, seasonGroup=null;
function buildLeaves(){
  const N=420; leafPos=new Float32Array(N*3); leafPh=new Float32Array(N); const col=new Float32Array(N*3);
  for(let i=0;i<N;i++){ leafPos[i*3]=rnd(-24,24); leafPos[i*3+1]=rnd(0,14); leafPos[i*3+2]=rnd(-24,24); leafPh[i]=rnd(0,6.28); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(leafPos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3));
  leafFx=new THREE.Points(g,new THREE.PointsMaterial({size:0.16,vertexColors:true,transparent:true,opacity:.95,depthWrite:false}));
  leafFx.frustumCulled=false; scene.add(leafFx); colorLeaves();
}
function colorLeaves(){
  if(!leafFx) return; const si=seasonIx(), col=leafFx.geometry.attributes.color, c=new THREE.Color();
  const pal=si===0?[0xffc2d9,0xffffff,0xff9ec4]:si===2?[0xe0762a,0xc94a1f,0xf2b632,0x9a5a2a]:[0xffffff];
  for(let i=0;i<col.count;i++){ c.setHex(rand(pal)); col.setXYZ(i,c.r,c.g,c.b); } col.needsUpdate=true;
  leafFx.visible=(si===0||si===2);
}
function updateLeaves(dt,t){
  if(!leafFx||!leafFx.visible) return; const p=leafFx.geometry.attributes.position;
  for(let i=0;i<p.count;i++){ const o=i*3; let y=leafPos[o+1]-(0.7+Math.sin(t*2+leafPh[i])*0.3)*dt; leafPos[o]+=(wind*1.6+Math.sin(t*1.5+leafPh[i])*0.4)*dt;
    if(y<0.02){ y=14; leafPos[o]=rnd(-24,24); } if(leafPos[o]>24) leafPos[o]-=48; leafPos[o+1]=y; }
  p.needsUpdate=true; leafFx.position.set(cam.tx,cam.ty,cam.tz);
}
function buildSeasonProps(){
  const si=seasonIx(); const T=SEASON_TINTS[si]; seasonTint.set(T[0],T[1],T[2]); colorLeaves();
  if(seasonGroup){ seasonGroup.parent.remove(seasonGroup); removeCols('season'); }
  const G=new THREE.Group(); outdoor.add(G); seasonGroup=G; const cols=[];
  if(si===0){ // spring: tulip pots by the entrance
    [[-2.3,8.95],[2.3,8.95],[-8.2,10.1],[8.2,10.1]].forEach(([x,z])=>{ G.add(mesh(cyl(0.26,0.2,0.38,12),mat(0xc9774a),x,0.19,z,true));
      for(let k=0;k<7;k++){ const a=k/7*6.28; G.add(mesh(cyl(0.01,0.01,0.3,4),mat(0x3f7a3e),x+Math.cos(a)*0.12,0.5,z+Math.sin(a)*0.12)); G.add(mesh(sph(0.055,6,5),mat(rand([0xe0574f,0xf2b632,0xff8fb1,0xc36bd9])),x+Math.cos(a)*0.12,0.68,z+Math.sin(a)*0.12)); } cols.push([0,x-0.28,x+0.28,z-0.28,z+0.28]); }); }
  else if(si===1){ // summer: ice-cream cart + parasols
    const c=new THREE.Group(); c.position.set(11.6,0,10.2); G.add(c);
    c.add(mesh(rbox(1.1,0.7,0.6,.06),mat(0xfff4dc),0,0.55,0,true)); c.add(mesh(box(1.12,0.12,0.62),mat(0xff7aa8),0,0.95,0));
    [-0.4,0.4].forEach(x=>{ const w=mesh(cyl(0.18,0.18,0.06,12),M.dark,x,0.18,0.32); w.rotation.x=Math.PI/2; c.add(w); });
    c.add(mesh(cyl(0.03,0.03,1.4,6),M.white,0,1.3,0)); c.add(mesh(cone(0.75,0.35,12),mat(0x5fd0e0),0,2.05,0,true));
    for(let k=0;k<3;k++) c.add(mesh(sph(0.08,8,6),mat([0xffb6c1,0xfff1a8,0x9be7c4][k]),-0.3+k*0.3,1.07,0));
    cols.push([0,11.0,12.2,9.85,10.55]); }
  else if(si===2){ // autumn: pumpkins on the flower beds + leaf piles
    [-5.8,-4.2,-2.6,2.6,4.2,5.8].forEach((x,i)=>{ const s=rnd(0.14,0.2); const p=mesh(sph(s,12,8),mat(0xe07a1f,{roughness:.6}),x,0.25+s*0.8,7.95,true); p.scale.y=0.78; G.add(p); G.add(mesh(cyl(0.02,0.02,0.08,5),mat(0x4a6a2a),x,0.25+s*1.45,7.95)); });
    [[-10,10.3],[10,10.3],[-14,10.5],[14,10.4]].forEach(([x,z])=>{ const d=decal('stain',1.6,1.1,x,0.07,z); d.material=d.material.clone(); d.material.color.setHex(0xd2691e); G.add(d); }); }
  else { // winter: snowmen + festive lights on the hedges
    [[-11.8,10.15],[11.8,10.15]].forEach(([x,z])=>{ const w=mat(0xffffff,{roughness:.9}); G.add(mesh(sph(0.42,14,10),w,x,0.38,z,true)); G.add(mesh(sph(0.3,14,10),w,x,0.98,z,true)); G.add(mesh(sph(0.21,12,8),w,x,1.42,z,true));
      const nose=mesh(cone(0.04,0.2,6),mat(0xe07a1f),x,1.43,z+0.24); nose.rotation.x=Math.PI/2; G.add(nose); G.add(mesh(cyl(0.16,0.16,0.2,12),M.dark,x,1.7,z)); G.add(mesh(cyl(0.24,0.24,0.02,12),M.dark,x,1.6,z));
      G.add(mesh(box(0.5,0.08,0.08),mat(0xc0392b),x,1.25,z+0.1)); cols.push([0,x-0.45,x+0.45,z-0.45,z+0.45]); });
    const bc=[0xff4d4d,0x4dd2ff,0xffd24d,0x7dff7d];
    [[-17.2,-1.6],[1.6,17.2]].forEach(([a,b])=>{ for(let x=a;x<b;x+=0.55) G.add(mesh(sph(0.05,6,4),new THREE.MeshBasicMaterial({color:bc[Math.floor(x*3)&3]}),x,0.64,11.35)); }); }
  if(cols.length) addCols('season',cols); bakeStatic(G);
}
function seasonFlash(){
  const s=season(), el=$('seasonFx'); el.innerHTML=`<div>${s.e}</div><b>${s.name}</b><small>${SEASON_TIPS[seasonIx()]}</small>`;
  el.className='s'+seasonIx(); void el.offsetWidth; el.classList.add('show'); sfx('star'); logEvent(`${s.e} ${s.name} başladı`);
  setTimeout(()=>el.classList.remove('show'),3200);
}

// ---------- physics feel: coin bursts, dust, carried-item wobble ----------
function coinBurst(x,y,z,n){
  for(let i=0;i<Math.round(n);i++){ const m=new THREE.Mesh(coinGeo,M.gold); m.position.set(x,y,z); world.add(m);
    fx3.push({m,v:new THREE.Vector3(rnd(-1.6,1.6),rnd(2.5,4.2),rnd(-1.6,1.6)),s:new THREE.Vector3(rnd(-12,12),rnd(-12,12),0),life:0.9,max:0.9,g:11,drag:0.99,bounceY:y-0.25}); }
}
let dustT=0, holdW={x:0,z:0,vx:0,vz:0}, lastPV={x:0,z:0}, camLA={x:0,z:0}, camZoomDyn=0, lastPP=null;
function updatePhysicsFeel(dt){
  if(!player||dt<=0) return; const p=player;
  const vx=lastPP?(p.x-lastPP.x)/dt:0, vz=lastPP?(p.z-lastPP.z)/dt:0; lastPP={x:p.x,z:p.z};
  const sp=Math.hypot(vx,vz);
  // dust puffs when running
  dustT-=dt; if(sp>2.6&&dustT<=0&&!p.riding){ dustT=0.16;
    const m=new THREE.Mesh(sph(0.07,6,4),new THREE.MeshBasicMaterial({color:p.f===0&&p.z>7.5?0xcdbfa6:0xe8e2d6,transparent:true,opacity:.5,depthWrite:false}));
    m.position.set(p.x-vx*0.05,p.y+0.06,p.z-vz*0.05); world.add(m); fx3.push({m,v:new THREE.Vector3(rnd(-.3,.3),0.5,rnd(-.3,.3)),life:0.5,max:0.5,g:-0.3,drag:0.9}); }
  // carried stack wobbles with acceleration (spring)
  const ax=(vx-lastPV.x)/dt, az=(vz-lastPV.z)/dt; lastPV={x:vx,z:vz};
  const k=60, d=9, ca=Math.cos(p.rot), sa=Math.sin(p.rot), fwd=ax*sa+az*ca, side=ax*ca-az*sa;
  holdW.vx+=(-k*holdW.x-d*holdW.vx-fwd*0.9)*dt; holdW.vz+=(-k*holdW.z-d*holdW.vz+side*0.9)*dt;
  holdW.x=clamp(holdW.x+holdW.vx*dt,-0.35,0.35); holdW.z=clamp(holdW.z+holdW.vz*dt,-0.35,0.35);
  if(p.c.hold){ p.c.hold.rotation.x=holdW.x*0.8; p.c.hold.rotation.z=holdW.z*0.8; }
  // dynamic camera: look ahead of movement, ease out a little while running
  const la=fpMode?0:0.55; camLA.x+=(vx*la-camLA.x)*Math.min(1,dt*2.5); camLA.z+=(vz*la-camLA.z)*Math.min(1,dt*2.5);
  camZoomDyn+=((sp>1?Math.min(2.2,sp*0.45):0)-camZoomDyn)*Math.min(1,dt*1.5);
}

// ---------- theme extras: colours + signature props ----------
const THEME_X={
  classic:{sofa:0x3f5a7a,cush:0xe8dcc0,canopy:0x2d5d8a,light:0xffc98a},
  ottoman:{sofa:0x7a1c28,cush:0xe8c77a,canopy:0x7a1c28,light:0xffb070,prop:'lantern'},
  modern:{sofa:0x2b2f36,cush:0xd6dde6,canopy:0x2e8bd8,light:0xdfe8ff,prop:'neon'},
  tropic:{sofa:0x16877f,cush:0xfff2d6,canopy:0x16877f,light:0xffd8a0,prop:'tiki'},
  mountain:{sofa:0x5a3a24,cush:0xc8a47c,canopy:0x3b2618,light:0xffa860,prop:'pine'}};
let themeGroup=null, tikiFlames=[];
function applyThemeExtras(){
  const k=themeKey(), X=THEME_X[k]||THEME_X.classic;
  if(lobbySofaM) lobbySofaM.color.setHex(X.sofa); if(lobbyCushM) lobbyCushM.color.setHex(X.cush); if(canopyM) canopyM.color.setHex(X.canopy); lobbyLight.color.setHex(X.light);
  if(themeGroup){ themeGroup.parent.remove(themeGroup); removeCols('themeprops'); } tikiFlames=[];
  const G=new THREE.Group(); floorRoot(0).add(G); themeGroup=G; const cols=[];
  const pair=[[-1.7,9.0],[1.7,9.0]];
  if(X.prop==='lantern'){ const cu=mat(0xb87333,{metalness:.8,roughness:.3});
    pair.forEach(([x,z])=>{ G.add(mesh(cyl(0.05,0.07,1.6,8),cu,x,0.8,z,true)); G.add(mesh(rbox(0.3,0.42,0.3,.04),new THREE.MeshStandardMaterial({color:0xffd9a0,emissive:0xff9a40,emissiveIntensity:1.2,transparent:true,opacity:.85}),x,1.8,z)); G.add(mesh(cone(0.22,0.2,8),cu,x,2.12,z)); cols.push([0,x-0.15,x+0.15,z-0.15,z+0.15]); });
    [[-3,5.2],[0,6.2],[3,4.6]].forEach(([x,z],i)=>{ G.add(mesh(cyl(0.005,0.005,0.6,4),M.dark,x,2.4,z)); G.add(mesh(sph(0.16,10,8),new THREE.MeshStandardMaterial({color:[0xff5a4a,0x4ab0ff,0xffc94a][i],emissive:[0xff3a2a,0x2a90ff,0xffa92a][i],emissiveIntensity:1.1,transparent:true,opacity:.9}),x,2.05,z)); G.add(mesh(cone(0.1,0.12,8),cu,x,2.2,z)); }); }
  else if(X.prop==='neon'){ const nm=new THREE.MeshBasicMaterial({color:0x3ad0ff});
    pair.forEach(([x,z])=>{ G.add(mesh(box(0.5,0.9,0.5),mat(0x2b2f36,{roughness:.3,metalness:.4}),x,0.45,z,true)); G.add(mesh(box(0.52,0.04,0.52),nm,x,0.92,z)); cols.push([0,x-0.26,x+0.26,z-0.26,z+0.26]); });
    G.add(mesh(box(0.03,0.03,4.6),nm,-6.86,2.3,5.1)); G.add(mesh(box(13.6,0.03,0.03),nm,0,0.03,2.66)); }
  else if(X.prop==='tiki'){ const bam=mat(0xc9a15a,{roughness:.9});
    pair.forEach(([x,z])=>{ G.add(mesh(cyl(0.05,0.06,1.7,8),bam,x,0.85,z,true)); G.add(mesh(cyl(0.11,0.08,0.22,8),mat(0x6b4226),x,1.78,z));
      const f=mesh(cone(0.09,0.3,6),new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}),x,2.02,z); G.add(f); tikiFlames.push(f); cols.push([0,x-0.12,x+0.12,z-0.12,z+0.12]); });
    [[-3,5.2],[3,4.6]].forEach(([x,z])=>{ G.add(mesh(cyl(0.005,0.005,0.5,4),M.dark,x,2.45,z)); G.add(mesh(sph(0.22,10,8,0,Math.PI*2,0,Math.PI*0.6),mat(0xc9a15a,{side:THREE.DoubleSide}),x,2.1,z)); }); }
  else if(X.prop==='pine'){ pair.forEach(([x,z])=>{ G.add(mesh(rbox(0.5,0.4,0.5,.05),mat(0x6b4a30),x,0.2,z,true)); [[0.4,0.7,0.85],[0.3,0.55,1.25],[0.2,0.45,1.6]].forEach(([r,h,y])=>{ G.add(mesh(cone(r,h,8),mat(0x2f5e3e),x,y,z,true)); G.add(mesh(cone(r*0.6,h*0.35,8),mat(0xffffff),x,y+h*0.35,z)); }); cols.push([0,x-0.27,x+0.27,z-0.27,z+0.27]); });
    const ant=mat(0xe8d8b8,{roughness:.8}); const a=new THREE.Group(); a.position.set(-6.84,2.1,6.6); a.rotation.y=Math.PI/2; G.add(a); a.add(mesh(rbox(0.3,0.36,0.06,.03),mat(0x5a3a24),0,0,0));
    [-1,1].forEach(sd=>{ const b=mesh(cyl(0.02,0.025,0.45,6),ant,sd*0.14,0.2,0.03); b.rotation.z=-sd*0.7; a.add(b); for(let k=0;k<3;k++){ const t=mesh(cyl(0.012,0.015,0.16,5),ant,sd*(0.12+k*0.07),0.25+k*0.07,0.03); t.rotation.z=sd*0.3; a.add(t); } }); }
  if(cols.length) addCols('themeprops',cols);
}

// ---------- hooks ----------
let megaSeenT=0;
function updateMega(dt,t){
  const gdt=dt*gameSpeed;
  updateCombo(dt); checkAch(dt); updateWeatherFeel(dt,t); updateLeaves(dt,t); updatePhysicsFeel(dt);
  tikiFlames.forEach((f,i)=>{ f.scale.y=0.8+Math.abs(Math.sin(t*9+i*2))*0.5; });
  megaSeenT-=dt; if(megaSeenT<=0){ megaSeenT=5; state.lastSeen=Date.now(); }
}
function bootMega(){
  offlineCheck(); setupGrassSway(); buildLeaves(); buildSeasonProps(); applyThemeExtras();
  $('sbBadge').onclick=()=>openModal(`<h3>🧪 Deneme modu</h3><p class="sub">Şu an admin panelinin deneme kaydındasın.</p><button class="btn gold wide" id="sbBack">Ana oyuna dön</button><button class="btn ghost wide" id="sbStay">Burada kal</button>`,m=>{ m.querySelector('#sbBack').onclick=exitSandbox; m.querySelector('#sbStay').onclick=closeModal; });
  $('lvlBox').onclick=()=>{ sfx('click'); openSheet('skills'); };
  try{ if(state.sandbox&&localStorage.getItem('otel_open_admin')==='1'){ localStorage.removeItem('otel_open_admin'); setTimeout(()=>openSheet('admin'),900); } }catch(e){}
}
