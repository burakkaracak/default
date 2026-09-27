
// =====================================================================
// LIVE: canlı etkinlikler (düğün / konferans / konser sahnesi, kalabalık,
// ışık, müzik, coşku), havuz-spor-spa günübirlik ziyaretçileri
// =====================================================================

let live3=null, camFocus=null;   // live3: sahnedeki görsel set (kayıtta state.live)
const LIVE_END=18;
const LIVE_FX={wedding:['🌸','💐','💕','🥂'],conf:['💡','📊','👏','🤝'],concert:['🎵','🎶','🤘','🔥']};
function venueFor(k){
  if((k==='wedding'||k==='conf')&&built('rest')) return {k:'rest',x:-12,z:-0.9,rot:0,pile:'rest'};
  if(k==='concert'&&built('pool')) return {k:'pool',x:12,z:-2.35,rot:0,pile:'pool'};
  return {k:'garden',x:13.7,z:9.8,rot:-Math.PI/2,pile:'desk'};
}
function liveCount(){ return state.lowFx||LOWQ?6:11; }
function mkNpc(G,tp,x,y,z,rot,mode){ const c=makeChar(LOOKS.guest(tp)); c.root.position.set(x,y,z); c.root.rotation.y=rot; c.mode=mode; c.baseMode=mode; c.ph0=Math.random()*6; G.add(c.root); return c; }
function grabSeats(amen){ const out=[]; SEATS.forEach(s=>{ if(s.amen===amen&&!s.busy){ s.busy='live'; out.push(s); } }); return out; }
function slideTex(){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=280; const x=cv.getContext('2d');
  const draw=n=>{ x.fillStyle='#f7f9fc'; x.fillRect(0,0,512,280); x.fillStyle='#2d5d8a'; x.fillRect(0,0,512,54);
    x.fillStyle='#fff'; x.font='700 30px sans-serif'; x.fillText(rand(['Büyüme 2025','Yeni Pazarlar','Satış Raporu','Vizyon & Strateji','Q'+(1+n%4)+' Sonuçları']),20,38);
    const cols=['#e0574f','#f2b632','#27ae60','#2e86c1','#8e44ad']; for(let i=0;i<5;i++){ const h=40+Math.random()*160; x.fillStyle=cols[i]; x.fillRect(40+i*92,262-h,60,h); }
    x.strokeStyle='#333'; x.lineWidth=3; x.beginPath(); x.moveTo(30,262); x.lineTo(490,262); x.stroke(); tx.needsUpdate=true; };
  const tx=new THREE.CanvasTexture(cv); tx.encoding=THREE.sRGBEncoding; draw(0); tx.userData={draw,n:0}; return tx;
}
function buildLiveSet(k){
  const V=venueFor(k), G=new THREE.Group(); outdoor.add(G); const S={k,V,G,npcs:[],crowd:[],stage:[],seats:[],lights:[],spots:[],t:0,fxT:1,momT:rnd(14,22),beat:0,step:0,couple:null,slide:null};
  const white=M.white, gold=M.gold, dark=M.dark, n=liveCount();
  const place=(o,x,y,z)=>{ if(V.k==='garden'){ const c=Math.cos(V.rot), s=Math.sin(V.rot); o.position.set(V.x+x*c+z*s,y,V.z-x*s+z*c); o.rotation.y+=V.rot; } else o.position.set(V.x+x,y,V.z+z); G.add(o); return o; };
  const npc=(tp,x,y,z,rot,mode,crowd)=>{ const c=mkNpc(G,tp,0,0,0,0,mode); place(c.root,x,y,z); c.root.rotation.y=(V.k==='garden'?V.rot:0)+rot; (crowd?S.crowd:S.stage).push(c); S.npcs.push(c); return c; };
  if(V.k==='garden'){ const st=mesh(rbox(2.6,0.3,1.5,.05),tmat('wood',2,1),0,0,0,true); place(st,0,0.15,0); }
  const sy=V.k==='garden'?0.3:0;
  if(k==='wedding'){
    const arch=new THREE.Group(); [-1,1].forEach(sd=>arch.add(mesh(cyl(0.05,0.05,1.5,8),white,sd,0.75,0,true)));
    const ar=mesh(new THREE.TorusGeometry(1,0.06,8,24,Math.PI),white,0,1.5,0); arch.add(ar);
    for(let i=0;i<=14;i++){ const a=i/14*Math.PI; arch.add(mesh(sph(0.1,8,6),mat(i%2?0xf7b6c8:0xffffff),Math.cos(a),1.5+Math.sin(a),0.02)); }
    place(arch,0,sy,-0.55);
    const cake=new THREE.Group(); cake.add(mesh(cyl(0.25,0.25,0.5,10),mat(0xf4efe6),0,0.25,0,true)); [0.3,0.22,0.15].forEach((r,i)=>cake.add(mesh(cyl(r,r,0.16,16),mat(i%2?0xfff3f6:0xffffff),0,0.58+i*0.16,0)));
    cake.add(mesh(sph(0.05,8,6),mat(0xe0574f),0,1.02,0)); place(cake,1.7,sy,0.1);
    const bride=npc('couple',-0.3,sy,0.25,0,'dance'), groom=npc('business',0.3,sy,0.25,0,'dance');
    bride.head.add(mesh(cone(0.3,0.55,10),new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.6}),0,0.05,-0.08)); S.couple=[bride,groom];
  } else if(k==='conf'){
    S.slide=slideTex(); const scr=mesh(plane(2.4,1.3),new THREE.MeshBasicMaterial({map:S.slide}),0,1.75,0); place(scr,-0.2,sy,-0.6);
    place(mesh(box(2.6,1.45,0.06),dark,0,1.75,0),-0.2,sy,-0.65);
    place(mesh(rbox(0.6,1.05,0.45,.05),tmat('woodDark',1,1),0,0.52,0,true),1.25,sy,0.2);
    npc('business',1.25,sy,-0.25,0,'talk');
  } else {
    const st=new THREE.Group(); if(V.k!=='garden'){ st.add(mesh(rbox(4.2,0.45,1.8,.05),dark,0,0.22,0,true)); st.add(mesh(box(4.25,0.05,1.85),gold,0,0.46,0)); }
    const tr=mat(0x7a7f87,{metalness:.8,roughness:.3}); [-2,2].forEach(x=>st.add(mesh(box(0.12,3.0,0.12),tr,x,1.5,-0.8,true))); st.add(mesh(box(4.2,0.14,0.14),tr,0,3.0,-0.8));
    [-2.5,2.5].forEach(x=>{ st.add(mesh(rbox(0.6,1.1,0.5,.04),mat(0x1a1a1a),x,0.55,0.2,true)); st.add(mesh(cyl(0.16,0.16,0.02,14),mat(0x444444),x,0.75,0.46)); st.add(mesh(cyl(0.1,0.1,0.02,12),mat(0x444444),x,0.35,0.46)); });
    place(st,0,sy,0);
    const top=(V.k==='garden'?0.3:0.46);
    [-1.4,-0.45,0.45,1.4].forEach((x,i)=>{ const col=[0xff3a8a,0x3ad2ff,0xffd24a,0x9d7aff][i], m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
      const pv=new THREE.Group(); const c=mesh(new THREE.ConeGeometry(0.9,3.2,16,1,true),m,0,-1.6,0); pv.add(c); place(pv,x,2.95,-0.7); S.spots.push({pv,m,i}); });
    const gtr=npc('student',-1.1,top,0.1,0,'guitar'); gtr.root.add(mesh(rbox(0.5,0.18,0.1,.04),mat(0xc0392b),0.05,0.72,0.2));
    npc('influencer',0,top,0.25,0,'dance'); const dr=npc('athlete',1.1,top,-0.35,0,'work');
    place(mesh(cyl(0.3,0.3,0.4,14),mat(0xe0e0e0),0,0.2,0),1.1,top,0.15);
  }
  // kalabalık
  const types=k==='conf'?['business','business','elderly','student']:k==='wedding'?['couple','family','elderly','vip','tourist']:['student','influencer','tourist','athlete','couple'];
  if(V.k==='rest'){ S.seats=grabSeats('rest'); S.seats.slice(0,n).forEach(s=>{ const c=mkNpc(G,rand(types),s.px,s.py,s.pz,s.rot,k==='wedding'?'sit':'sit'); S.crowd.push(c); S.npcs.push(c); });
    if(k==='wedding') for(let i=0;i<Math.min(4,n);i++){ const c=mkNpc(G,rand(types),-13.3+i*0.9,0,2.45,Math.PI*(i%2),'dance'); S.crowd.push(c); S.npcs.push(c); } }
  else if(V.k==='pool'){ S.seats=grabSeats('pool'); for(let i=0;i<n;i++){ const c=mkNpc(G,rand(types),8.9+(i%7)*1.0+(i>=7?0.5:0),0,i>=7?6.95:6.4,Math.PI,'dance'); S.crowd.push(c); S.npcs.push(c); }
    POOL_SWIM.slice(0,3).forEach(([x,z])=>{ const c=mkNpc(G,rand(types),x,-0.42,z,rnd(0,6),'swim'); S.crowd.push(c); S.npcs.push(c); }); }
  else for(let i=0;i<Math.min(8,n);i++) npc(rand(types),-1.2+(i%4)*0.8,0,1.6+Math.floor(i/4)*0.8,Math.PI,k==='conf'?'clap':'dance',true);
  // ışık zinciri
  const lz=V.k==='rest'?[2.45]:V.k==='pool'?[5.9]:[]; lz.forEach(z=>{ for(let i=0;i<12;i++){ const x0=V.k==='rest'?-15.8:8.5, m=new THREE.MeshBasicMaterial({color:[0xffe08a,0xff9ad5,0x9ad2ff][i%3]}); const b=mesh(sph(0.06,6,4),m,x0+i*0.66,2.35+Math.sin(i*0.9)*0.08,z); G.add(b); S.lights.push(b); } });
  S.npcs.forEach(c=>c.root.traverse(o=>{ o.castShadow=false; }));
  return S;
}
function dropLiveSet(){
  if(!live3) return; live3.seats.forEach(s=>{ if(s.busy==='live') s.busy=null; });
  outdoor.remove(live3.G); if(live3.slide) live3.slide.dispose(); live3=null; liveHud();
}
function startLive(k,score,left){
  state.live={k,score,left,total:0,day:state.day,hype:0.2}; dropLiveSet(); live3=buildLiveSet(k);
  const V=live3.V; camFocus={x:V.x,z:V.z+2.5,t:5}; liveHud(); markSave();
}
function finishLive(silent){
  const L=state.live; if(!L) return; const E=EVT[L.k];
  if(L.left>0){ state.piles.desk+=Math.round(L.left); pileChanged('desk'); state.today.rooms+=Math.round(L.left); L.total+=L.left; }
  if(!silent){ banner(`${E.e} ${E.name} sona erdi!`,`Toplam kazanç ${fmt(Math.round(L.total))} ₺ · coşku %${Math.round((L.hype||0)*100)}`); sfx('star');
    if(live3&&!state.lowFx){ const V=live3.V; if(L.k!=='conf') for(let i=0;i<5;i++) setTimeout(()=>fireworksAt(V.x+rnd(-4,4),rnd(8,11),V.z+rnd(-3,1)),i*450); confettiAt(V.x,1.8,V.z+1,80); }
    if((L.hype||0)>=0.7) changeRep(1); }
  state.live=null; setTimeout(dropLiveSet,silent?0:2600); markSave();
}
// ---------- müzik (mesafeye göre) ----------
function liveVol(){ if(!live3||!Sound.ctx||state.sound===false) return 0; const V=live3.V, d=Math.hypot(player.x-V.x,player.z-V.z)+(player.f?12:0); return clamp(1.15-d/26,0.12,1)*(fpMode||viewFloor===0?1:0.5); }
const WED_MEL=[659,784,880,784,659,587,659,523,587,659,523,440];
function liveMusic(dt){
  const S=live3, v=liveVol(); if(!v) return; S.beat-=dt; if(S.beat>0) return;
  if(S.k==='concert'){ S.beat=0.25; const st=S.step++%16;
    if(st%4===0){ tone(120,.22,'sine',.16*v,0,null,42); }
    if(st%8===4){ noiseBurst(.14,.07*v,1800); }
    if(st%2===1) noiseBurst(.035,.025*v,8000);
    const bass=[110,110,130.8,98][Math.floor(st/4)]; if(st%2===0) tone(bass,.2,'triangle',.07*v);
    if(st%4===2) tone(bass*4*(Math.random()<.5?1:1.5),.18,'sawtooth',.012*v); }
  else if(S.k==='wedding'){ S.beat=0.42; const st=S.step++; tone(WED_MEL[st%WED_MEL.length],.5,'sine',.045*v); if(st%3===0) tone(WED_MEL[st%WED_MEL.length]/2,.9,'triangle',.03*v); }
  else { S.beat=rnd(1.8,3); if(S.clapT>0) for(let i=0;i<10;i++) noiseBurst(.03,.03*v,rnd(1500,3500),i*0.07+Math.random()*0.05); else tone(rnd(140,190),.18,'triangle',.012*v,0,null,rnd(120,200)); }
}
// ---------- per-frame ----------
function updateLive(dt,t){
  if(camFocus&&camFocus.t>0){ camFocus.t-=dt; if(joy.on||Object.keys(keys).some(k=>keys[k])||(player.path&&player.path.length)) camFocus.t=0; }
  const L=state.live;
  if(L&&!live3) live3=buildLiveSet(L.k);
  if(!L){ if(live3) dropLiveSet(); return; }
  if(L.day!==state.day||hourNow()>=LIVE_END||hourNow()<11){ finishLive(L.day!==state.day); return; }
  const S=live3, V=S.V; S.t+=dt;
  // coşku: yakında durmak coşkuyu artırır
  const near=player.f===0&&Math.hypot(player.x-V.x,player.z-(V.z+2))<6.5;
  L.hype=clamp((L.hype||0)+(near?dt*0.06:-dt*0.012),0,1);
  // gelir akışı
  const remH=Math.max(0.05,LIVE_END-hourNow()), remS=remH/24*DAY_SEC, part=Math.min(L.left,L.left*dt/remS);
  if(part>0){ const bonus=part*L.hype*0.6; L.left-=part; L.total+=part+bonus; S.acc=(S.acc||0)+part+bonus;
    if(S.acc>=1){ const a=Math.floor(S.acc); S.acc-=a; state.piles[V.pile]+=a; state.today.rooms+=a; if((S.pc=(S.pc||0)+dt)>1.2){ S.pc=0; pileChanged(V.pile); } } }
  // animasyon
  S.npcs.forEach(c=>animChar(c,dt));
  if(S.couple){ const a=S.t*0.9; S.couple.forEach((c,i)=>{ const sd=i?1:-1; c.root.position.x=V.x+Math.cos(a)*0.32*sd; c.root.position.z=V.z+0.3+Math.sin(a)*0.32*sd; c.root.rotation.y=-a+(i?-Math.PI/2:Math.PI/2); }); }
  S.spots.forEach(s=>{ s.pv.rotation.z=Math.sin(S.t*1.3+s.i*1.7)*0.55; s.pv.rotation.x=0.35+Math.sin(S.t*0.9+s.i)*0.2; s.m.color.setHSL((S.t*0.12+s.i*0.25)%1,0.95,0.55); s.m.opacity=nightF>0.3?0.34:0.2; });
  S.lights.forEach((b,i)=>{ b.scale.setScalar(0.8+0.35*Math.abs(Math.sin(S.t*2+i))); });
  if(S.slide){ S.slideT=(S.slideT||0)+dt; if(S.slideT>7){ S.slideT=0; S.slide.userData.draw(++S.slide.userData.n); } }
  // anlar ve efektler
  S.fxT-=dt; if(S.fxT<=0){ S.fxT=rnd(0.8,1.6); const c=rand(S.npcs); if(c){ const p=new THREE.Vector3(); c.head.getWorldPosition(p); fxEmoji(p.x,p.y+0.5,p.z,0,rand(LIVE_FX[S.k])); } }
  if(S.clapT>0){ S.clapT-=dt; if(S.clapT<=0) S.npcs.forEach(c=>c.mode=c.baseMode); }
  S.momT-=dt; if(S.momT<=0){ S.momT=rnd(18,30); liveMoment(); }
  liveMusic(dt);
  S.hudT=(S.hudT||0)-dt; if(S.hudT<=0){ S.hudT=0.5; liveHud(); }
}
function liveMoment(){
  const S=live3, V=S.V, v=liveVol();
  if(S.k==='wedding'){ toast(rand(['💍 Gelin ve damat ilk dansında!','🥂 Kadeh kaldırıldı!','💐 Gelin çiçeği attı!'])); if(!state.lowFx) confettiAt(V.x,1.8,V.z+0.4,50); }
  else if(S.k==='concert'){ toast(rand(['🎸 Gitar solosu! Kalabalık coştu','🔥 Hit şarkı çalıyor!','🤘 Seyirci eşlik ediyor!'])); S.crowd.forEach(c=>{ if(c.mode==='dance') c.mode='cheer'; }); S.clapT=4; if(!state.lowFx) confettiAt(V.x,2.2,V.z+1,40); }
  else { toast(rand(['👏 Konuşmacı alkış topladı','📊 Yeni sunum başladı','🤝 Ara: kahve molası'])); }
  S.crowd.forEach(c=>{ if(c.mode==='sit') c.mode='sitclap'; else if(c.mode==='clap'||c.mode==='dance'&&S.k!=='concert') c.mode='cheer'; }); S.clapT=Math.max(S.clapT||0,3.5);
  if(v&&S.k!=='concert') for(let i=0;i<16;i++) noiseBurst(.03,.03*v,rnd(1500,3500),i*0.08+Math.random()*0.06);
}
// ---------- HUD ----------
let liveEl=null;
function liveHud(){
  if(!liveEl){ const st=document.createElement('style'); st.textContent=`#livePill{position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);z-index:30;display:none;align-items:center;gap:8px;background:rgba(22,26,40,.9);border:1px solid rgba(255,90,90,.6);border-radius:999px;padding:5px 6px 5px 12px;color:#fff;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35)}
#livePill .dot{width:8px;height:8px;border-radius:50%;background:#ff4d4d;animation:lvp 1s infinite}@keyframes lvp{50%{opacity:.25}}#livePill .hb{width:54px;height:7px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden}#livePill .hb i{display:block;height:100%;background:linear-gradient(90deg,#ffd24a,#ff5a8a)}
#livePill button{border:0;border-radius:999px;background:#ffd24a;color:#3a2600;font-weight:800;padding:5px 10px;font-size:12px;cursor:pointer}@media(max-width:440px){#livePill{top:calc(88px + env(safe-area-inset-top));font-size:12px}#livePill .lbl{max-width:130px;overflow:hidden;text-overflow:ellipsis}}`;
    document.head.appendChild(st); liveEl=document.createElement('div'); liveEl.id='livePill'; document.body.appendChild(liveEl); liveEl.addEventListener('pointerdown',e=>e.stopPropagation()); }
  const L=state.live; if(!L||!live3){ liveEl.style.display='none'; return; }
  const E=EVT[L.k]; liveEl.style.display='flex';
  liveEl.innerHTML=`<span class="dot"></span><span class="lbl">CANLI ${E.e} ${E.name} · ${LIVE_END}:00'e kadar</span><span title="Coşku: yakında dur">🔥</span><span class="hb"><i style="width:${Math.round((L.hype||0)*100)}%"></i></span><button id="lvW">👀 İzle</button>`;
  liveEl.querySelector('#lvW').onclick=e=>{ e.stopPropagation(); const V=live3.V; camFocus={x:V.x,z:V.z+2.5,t:8}; peekFloor=null; sfx('click'); toast('🔥 Etkinliğin yanında durursan coşku ve kazanç artar'); };
}

// ---------- havuz / spor / spa: günübirlik ziyaretçiler ----------
const VIS_T={pool:['tourist','student','family','influencer'],gym:['athlete','athlete','business'],spa:['couple','elderly','vip']};
let visT=10, amenFxT=2;
function visitorsNow(){ return guests.filter(g=>g.visitor&&g.state!=='leave').length; }
function spawnVisitor(){
  const opts=['pool','gym','spa'].filter(a=>amenOpen(a)&&SEATS.some(s=>s.amen===a&&!s.busy)); if(!opts.length) return;
  const a=rand(opts), free=SEATS.filter(s=>s.amen===a&&!s.busy), seat=rand(free), tp=rand(VIS_T[a]); if(!GTYPES[tp]) return;
  const g=new Guest(tp), side=Math.random()<.5?L.spawnL:L.spawnR; g.visitor=a; g.stay=999; g.sat=70;
  g.place(side.x,side.z+rnd(-0.2,0.2),0); seat.busy=g; g.seat=seat; g.state='toAmen';
  if(!g.goTo(seat.f||0,seat.x,seat.z,()=>{ g.pose(seat); g.state='amen'; g.amenLeft=rnd(14,22); fxEmoji(g.x,g.y+2.2,g.z,0,'🎟️'); })){ seat.busy=null; g.remove(); }
}
function updateAmenLife(dt){
  if(state.tut<TUT.length) return;
  visT-=dt; if(visT<=0){ visT=rnd(12,24)/(festivalOn()?1.6:1); if(!isNight()&&visitorsNow()<(stars()>=3?4:2)) spawnVisitor(); }
  amenFxT-=dt; if(amenFxT<=0){ amenFxT=rnd(1.8,3.2);
    const users=guests.filter(g=>g.state==='amen'&&g.seat); const g=users.length?rand(users):null; if(!g) return;
    const a=g.seat.amen, e=a==='pool'?(g.seat.pose==='swim'?'💦':'😎'):a==='gym'?rand(['💪','🏃','🔥']):a==='spa'?rand(['🧖','✨','🌿']):a==='rest'?rand(['😋','🍝']):null;
    if(e) fxEmoji(g.x,g.y+2,g.z,g.f,e);
    if(a==='pool'&&g.seat.pose==='swim'&&Sound.ctx&&state.sound!==false&&viewFloor===0&&!live3){ const d=Math.hypot(player.x-g.x,player.z-g.z); if(d<14) noiseBurst(.25,.025*(1-d/14),1400); } }
}
