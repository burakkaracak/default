
// =====================================================================
// MESCİT KATI: çatının üstünde en manzaralı kat. Mihrap, minber, kürsü,
// çini, mermer sütunlar, kandil avizesi, saf çizgili halı, kubbe (içeriden),
// minare. İstanbul vakitlerine göre (Diyanet yöntemi, adhan-js) ezan,
// imam namaz kıldırır, cemaat gelir; Cuma öğlesi kalabalık + hutbe.
// =====================================================================
const MF=4, MZ0=-6.35, MZ1=2.62;               // mescit katı ve ön/arka sınırı
const EZAN_SRC=window.__EZAN||'ezan.mp3';
function mescitOn(){ return built('mescit'); }

// ---------- namaz vakitleri (İstanbul, Diyanet) ----------
const IST={lat:41.0082,lng:28.9784};
const VAKIT=[['fajr','Sabah',2],['dhuhr','Öğle',4],['asr','İkindi',4],['maghrib','Akşam',3],['isha','Yatsı',4]];
let vakitCache={key:null,list:null};
function istDate(d){ const s=d.toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'}); return s; }         // YYYY-MM-DD (İstanbul)
function istWeekday(d){ return new Date(d.toLocaleString('en-US',{timeZone:'Europe/Istanbul'})).getDay(); }   // 5 = Cuma
function istHM(d){ return d.toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}); }
function vakitler(now){
  now=now||new Date(); const key=istDate(now); if(vakitCache.key===key) return vakitCache.list;
  let list=null;
  try{ if(window.adhan){ const [y,m,dd]=key.split('-').map(Number), day=new Date(Date.UTC(y,m-1,dd,9));
      const pt=new adhan.PrayerTimes(new adhan.Coordinates(IST.lat,IST.lng),day,adhan.CalculationMethod.Turkey());
      list=VAKIT.map(([k,n,r])=>({k,n,r,t:pt[k].getTime()})); } }catch(e){ list=null; }
  vakitCache={key,list}; return list;
}
function nextVakit(now){ now=now||new Date(); const L=vakitler(now); if(!L) return null; const n=L.find(v=>v.t>now.getTime()); if(n) return n;
  const L2=vakitler(new Date(now.getTime()+864e5)); return L2?L2[0]:null; }

// ---------- ezan sesi ----------
let ezanEl=null, ezanOn=false;
function ezanVol(){ const V=state.vol||{sfx:.55}; return state.sound===false||state.ezan==='mute'?0:clamp((V.sfx+0.25)*(player.f===MF?1:0.6),0,1); }
function playEzan(){
  if(state.ezan==='off') return;
  try{ if(!ezanEl){ ezanEl=new Audio(EZAN_SRC); ezanEl.preload='auto'; ezanEl.addEventListener('ended',()=>{ ezanOn=false; }); ezanEl.addEventListener('error',()=>{ ezanOn=false; }); }
    ezanEl.currentTime=0; ezanEl.volume=ezanVol(); const p=ezanEl.play(); ezanOn=true; if(p&&p.catch) p.catch(()=>{ ezanOn=false; }); }catch(e){ ezanOn=false; }
}
function stopEzan(){ if(ezanEl){ try{ ezanEl.pause(); }catch(e){} } ezanOn=false; }

// ---------- görsel: mescit katı ----------
function tileTex(){ // lale motifli çini
  const cv=document.createElement('canvas'); cv.width=cv.height=128; const x=cv.getContext('2d');
  x.fillStyle='#f4f7fb'; x.fillRect(0,0,128,128); x.strokeStyle='#1f5aa6'; x.lineWidth=3; x.strokeRect(2,2,124,124);
  x.fillStyle='#1f5aa6'; [[0,0],[128,0],[0,128],[128,128]].forEach(([a,b])=>{ x.beginPath(); x.arc(a,b,26,0,7); x.fill(); });
  x.fillStyle='#2e9bb5'; x.beginPath(); x.moveTo(64,34); x.bezierCurveTo(44,50,50,78,64,84); x.bezierCurveTo(78,78,84,50,64,34); x.fill();
  x.fillStyle='#c62f3a'; x.beginPath(); x.moveTo(64,40); x.bezierCurveTo(56,52,58,70,64,74); x.bezierCurveTo(70,70,72,52,64,40); x.fill();
  x.strokeStyle='#2e7d4f'; x.lineWidth=4; x.beginPath(); x.moveTo(64,84); x.lineTo(64,108); x.stroke(); x.beginPath(); x.moveTo(64,100); x.quadraticCurveTo(46,92,42,76); x.stroke(); x.beginPath(); x.moveTo(64,100); x.quadraticCurveTo(82,92,86,76); x.stroke();
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; return t; }
function carpetTex(){ // saf çizgili cami halısı: her sırada kemerli seccade motifi
  const cv=document.createElement('canvas'); cv.width=256; cv.height=128; const x=cv.getContext('2d');
  x.fillStyle='#8e1b2a'; x.fillRect(0,0,256,128);
  for(let i=0;i<4;i++){ const cx=32+i*64; x.fillStyle='#a8283a'; x.fillRect(cx-28,10,56,108); x.fillStyle='#6d1320';
    x.beginPath(); x.moveTo(cx-22,118); x.lineTo(cx-22,44); x.quadraticCurveTo(cx,6,cx+22,44); x.lineTo(cx+22,118); x.fill();
    x.strokeStyle='#e0b85a'; x.lineWidth=3; x.stroke(); x.fillStyle='#e0b85a'; x.beginPath(); x.arc(cx,70,6,0,7); x.fill(); }
  x.fillStyle='#e0b85a'; x.fillRect(0,0,256,4); x.fillRect(0,124,256,4);
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t; }
function hatPlate(txt,bg){ const cv=document.createElement('canvas'); cv.width=cv.height=256; const x=cv.getContext('2d');
  x.fillStyle='#caa24a'; x.beginPath(); x.arc(128,128,126,0,7); x.fill(); x.fillStyle=bg; x.beginPath(); x.arc(128,128,112,0,7); x.fill();
  x.fillStyle='#f2d48a'; x.font='bold 96px "Amiri","Scheherazade New","Noto Naskh Arabic","Times New Roman",serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,128,122);
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return new THREE.Mesh(new THREE.CircleGeometry(0.55,40),new THREE.MeshBasicMaterial({map:t,transparent:true})); }
let mescitG=null, mescitDome=null, minaretG=null, mKandil=[];
function buildMescit(){
  const G=floorRoot(MF); if(G.userData.shell) return; G.userData.shell=true; const S=new THREE.Group();
  const D=MZ1-MZ0, C=(MZ0+MZ1)/2, marble=tmat('marble',6,4), gold=M.gold, white=mat(0xf6f1e6,{roughness:.35}), tile=new THREE.MeshStandardMaterial({map:tileTex(),roughness:.3});
  tile.map.repeat.set(10,1.2);
  // döşeme + halı
  S.add(mesh(box(13.96,0.4,D),marble,0,-0.2,C));
  const cp=carpetTex(); cp.repeat.set(6,6); const carpet=mesh(plane(12.4,7.4),new THREE.MeshStandardMaterial({map:cp,roughness:.95}),0,0.012,-2.3); carpet.rotation.x=-Math.PI/2; S.add(carpet);
  S.add(mesh(box(12.6,0.02,0.12),gold,0,0.02,1.42)); S.add(mesh(box(12.6,0.02,0.12),gold,0,0.02,-6.02));
  // arka (kıble) duvarı: çini bant + mihrap
  S.add(mesh(box(13.96,3.4,0.2),white,0,1.7,MZ0-0.1,true));
  S.add(mesh(box(13.96,0.9,0.03),tile,0,1.05,MZ0+0.01));
  S.add(mesh(box(14.1,0.12,0.26),gold,0,3.45,MZ0-0.08)); S.add(mesh(box(14.1,0.06,0.06),gold,0,0.62,MZ0+0.03)); S.add(mesh(box(14.1,0.06,0.06),gold,0,1.52,MZ0+0.03));
  const mh=new THREE.Group(); mh.position.set(0,0,MZ0+0.05); S.add(mh);
  mh.add(mesh(box(1.7,2.7,0.12),mat(0x1f4f8a,{roughness:.4}),0,1.35,0.02)); mh.add(mesh(box(1.2,2.1,0.1),mat(0x0f2f5a,{roughness:.5}),0,1.05,0.06));
  const arc=mesh(new THREE.TorusGeometry(0.62,0.07,8,24,Math.PI),gold,0,2.1,0.11); mh.add(arc); [-0.62,0.62].forEach(x=>mh.add(mesh(box(0.14,2.1,0.1),gold,x,1.05,0.11)));
  const mt=new THREE.MeshStandardMaterial({map:tileTex(),roughness:.3}); mt.map.repeat.set(2,3); mh.add(mesh(box(1.0,1.7,0.02),mt,0,0.95,0.12));
  mh.add(mesh(sph(0.09,10,8),gold,0,2.85,0.1)); mh.add(mesh(box(2.0,0.14,0.2),gold,0,2.85,0.05));
  // hat levhaları
  [[-3.2,'الله','#1f5a3a'],[3.2,'محمد','#1f5a3a']].forEach(([x,t,bg])=>{ const p=hatPlate(t,bg); p.position.set(x,2.35,MZ0+0.02); S.add(p); });
  // minber (sağda) ve kürsü (solda)
  const mb=new THREE.Group(); mb.position.set(1.55,0,MZ0+0.9); S.add(mb); const wd=tmat('woodDark',1,1);
  for(let i=0;i<6;i++) mb.add(mesh(box(0.7,0.25*(i+1),0.3),white,0,0.125*(i+1),1.3-i*0.3,true));
  [-0.37,0.37].forEach(x=>{ const r=mesh(box(0.05,0.9,1.9),gold,x,1.35,0.55); r.rotation.x=-0.6; mb.add(r); });
  mb.add(mesh(box(0.8,2.2,0.1),white,0,1.1,-0.35)); mb.add(mesh(cone(0.42,1.1,8),mat(0x2c6e8f,{metalness:.3,roughness:.4}),0,2.35,-0.1)); mb.add(mesh(sph(0.07,8,6),gold,0,2.95,-0.1));
  const kr=new THREE.Group(); kr.position.set(-1.9,0,MZ0+0.8); S.add(kr); kr.add(mesh(rbox(0.9,0.7,0.8,.05),wd,0,0.35,0,true)); kr.add(mesh(box(0.95,0.05,0.85),gold,0,0.72,0)); const rh=mesh(box(0.5,0.04,0.35),wd,0,0.95,0.1); rh.rotation.x=-0.5; kr.add(rh);
  // yan duvarlar: alt mermer + kemerli camlar
  [-1,1].forEach(sd=>{ const x=sd*6.98; S.add(mesh(box(0.2,1.1,D),white,x,0.55,C,true)); S.add(mesh(box(0.24,0.08,D),gold,x,1.12,C));
    for(let z=MZ0+1.1;z<MZ1-0.6;z+=1.55){ const gl=mesh(box(0.05,1.3,0.9),M.glass,x,1.8,z); gl.castShadow=false; S.add(gl); const a=mesh(new THREE.TorusGeometry(0.45,0.04,6,14,Math.PI),gold,x,2.45,z); a.rotation.y=Math.PI/2; S.add(a); } });
  // ön korkuluk (manzara)
  [[-6.98,4.8],[6.35,6.98]].forEach(([a,b])=>{ S.add(mesh(box(b-a,0.5,0.14),white,(a+b)/2,0.25,MZ1-0.04,true)); const gl=mesh(box(b-a,0.6,0.04),M.glass,(a+b)/2,0.8,MZ1-0.04); gl.castShadow=false; S.add(gl); S.add(mesh(box(b-a,0.05,0.16),gold,(a+b)/2,1.12,MZ1-0.04)); });
  // mermer sütunlar
  [[-5.4,-4.9],[5.4,-4.9],[-5.4,0.6],[5.4,0.6]].forEach(([x,z])=>{ S.add(mesh(cyl(0.2,0.24,3.3,16),tmat('marble',1,2),x,1.65,z,true)); S.add(mesh(cyl(0.3,0.3,0.14,16),gold,x,3.3,z)); S.add(mesh(cyl(0.3,0.26,0.14,16),gold,x,0.07,z)); });
  // ayakkabılık + abdest musluğu
  S.add(mesh(rbox(1.3,0.8,0.35,.03),wd,3.7,0.4,2.25,true)); for(let i=0;i<3;i++) S.add(mesh(box(1.25,0.02,0.3),gold,3.7,0.2+i*0.25,2.28));
  S.add(mesh(rbox(1.6,0.55,0.5,.05),tmat('marble',1,1),-5.8,0.28,2.05,true)); for(let i=0;i<4;i++){ const t=mesh(cyl(0.025,0.025,0.18,6),gold,-6.4+i*0.4,0.75,1.95); t.rotation.x=Math.PI/2; S.add(t); }
  const sg=signPlane('🕌 MESCİT',1.8,0.4,{bg:'#1f5a3a',fg:'#f2d48a',font:'800 64px "Baloo 2"'}); sg.position.set(0,3.05,MZ0+0.02); S.add(sg);
  G.add(bake(S));
  // kandil avizesi
  const ch=new THREE.Group(); ch.position.set(0,2.9,-2.4); G.add(ch); mKandil=[];
  const r1=mesh(new THREE.TorusGeometry(2.2,0.05,8,48),gold,0,0,0); r1.rotation.x=Math.PI/2; ch.add(r1);
  const r2=mesh(new THREE.TorusGeometry(1.2,0.04,8,40),gold,0,0.1,0); r2.rotation.x=Math.PI/2; ch.add(r2);
  for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, r=i%2?2.2:1.2, k=mesh(sph(0.07,8,6),new THREE.MeshBasicMaterial({color:0xffe6a0}),Math.cos(a)*r,-0.08,Math.sin(a)*r); ch.add(k); mKandil.push(k); }
  for(let i=0;i<4;i++){ const a=i/4*Math.PI*2; const c=mesh(cyl(0.012,0.012,1.2,4),gold,Math.cos(a)*2.2*0.5,0.6,Math.sin(a)*2.2*0.5); c.rotation.z=Math.cos(a)*0.9; c.rotation.x=-Math.sin(a)*0.9; ch.add(c); }
  ch.add(glowDecal(3.2,0,-2.9,0.03)); // ışık halesi yerde
  // kubbe (sadece içeriden, birinci şahısta görünür)
  const dm=new THREE.MeshStandardMaterial({map:tileTex(),roughness:.5,side:THREE.BackSide}); dm.map.repeat.set(16,6);
  mescitDome=mesh(new THREE.SphereGeometry(6.6,40,20,0,Math.PI*2,0,Math.PI/2),dm,0,3.4,-1.9); mescitDome.scale.y=0.55; mescitDome.visible=false; G.add(mescitDome);
  addCols('mescit',[[MF,-6.98,6.98,MZ0-0.2,MZ0+0.05],[MF,-7.1,-6.88,MZ0,MZ1],[MF,6.88,7.1,MZ0,MZ1],[MF,-6.98,4.8,MZ1-0.12,MZ1+0.1],[MF,6.35,6.98,MZ1-0.12,MZ1+0.1],
    [MF,1.15,1.95,MZ0,MZ0+2.3],[MF,-2.4,-1.4,MZ0+0.35,MZ0+1.25],[MF,3.0,4.4,2.05,2.45],[MF,-6.6,-5.0,1.8,2.35],
    ...[[-5.4,-4.9],[5.4,-4.9],[-5.4,0.6],[5.4,0.6]].map(([x,z])=>[MF,x-0.28,x+0.28,z-0.28,z+0.28])]);
  buildMinaret(); mescitG=G;
}
function buildMinaret(){ // arka sol köşede yerden yükselen minare: her katta görünür
  if(minaretG) return; const g=new THREE.Group(); g.position.set(-7.55,0,-11.95); world.add(g); minaretG=g;
  const w=mat(0xf1ece2,{roughness:.5}), lead=mat(0x6f7d8c,{metalness:.5,roughness:.35});
  g.add(mesh(cyl(0.62,0.7,1.2,12),w,0,0.6,0,true)); g.add(mesh(cyl(0.42,0.48,16,12),w,0,8.6,0,true));
  [9.5,13.8].forEach(y=>{ g.add(mesh(cyl(0.62,0.42,0.35,12),w,0,y,0,true)); const rg=mesh(new THREE.TorusGeometry(0.62,0.04,6,20),M.gold,0,y+0.45,0); rg.rotation.x=Math.PI/2; g.add(rg); });
  g.add(mesh(cyl(0.36,0.4,2.6,12),w,0,15.6,0,true)); g.add(mesh(cone(0.44,3.2,12),lead,0,18.5,0,true));
  g.add(mesh(cyl(0.03,0.03,0.9,6),M.gold,0,20.4,0)); const cr=mesh(new THREE.TorusGeometry(0.2,0.045,8,20,Math.PI*1.4),M.gold,0,21.0,0); cr.rotation.z=Math.PI*0.8; g.add(cr);
}

// ---------- imam ve cemaat ----------
const IMAM_LOOK=()=>({skin:0xe7bf94,hair:0x2a1f18,hs:'short',beard:true,top:0x1f2330,bottom:0x1f2330});
function addSarik(c){ const h=c.head; h.add(mesh(cyl(0.22,0.24,0.16,16),M.white,0,0.2,0)); const t=mesh(new THREE.TorusGeometry(0.22,0.07,8,20),mat(0xf7f3ea),0,0.17,0); t.rotation.x=Math.PI/2; h.add(t); }
function addTakke(c){ c.head.add(mesh(new THREE.SphereGeometry(0.2,14,8,0,Math.PI*2,0,Math.PI/2.6),M.white,0,0.14,-0.02)); }
let imam=null, cemaat=[], namaz=null;
function npcAt(G,look,x,z,rot){ const c=makeChar(look); c.root.position.set(x,0,z); c.root.rotation.y=rot; c.mode='idle'; G.add(c.root); c.root.traverse(o=>o.castShadow=false); return c; }
function ensureImam(){ if(imam||!mescitG) return; imam=npcAt(mescitG,IMAM_LOOK(),-1.9,MZ0+1.55,Math.PI); addSarik(imam); imam.mode='kade'; imam.home={x:-1.9,z:MZ0+1.55}; imam.root.position.y=0; }
const SAF_Z=[-4.75,-3.85,-2.95,-2.05,-1.15,-0.25];
function safSpots(n){ const out=[]; for(const z of SAF_Z){ for(let k=0;k<12&&out.length<n;k++){ const x=(k%2?1:-1)*Math.ceil(k/2)*0.72+(k?0:0); out.push({x:clamp(x,-4.6,4.6),z}); } if(out.length>=n) break; } return out; }
function gatherCemaat(n,cuma){
  if(!mescitG) return; dismissCemaat(true); const sp=safSpots(n), types=['elderly','business','tourist','student','family','athlete','couple','vip'];
  sp.forEach((s,i)=>{ const look=LOOKS.guest(rand(types)); look.child=false; look.dog=null; look.pack=false; look.bag=null; look.phone=false; look.partner=false; look.cane=false; look.brief=false; const c=npcAt(mescitG,look,5.6,2.2,Math.PI); if(Math.random()<0.6) addTakke(c);
    c.walk={x:s.x,z:s.z,t:i*0.35}; c.mode='idle'; cemaat.push(c); });
}
function dismissCemaat(now){ cemaat.forEach(c=>{ if(now) mescitG.remove(c.root); else c.leave={t:rnd(0,3)}; }); if(now) cemaat=[]; }
// namaz akışı: kıyam, rükû, kavme, secde, celse, secde … son oturuş, selam
function namazSeq(rekat){ const s=[]; for(let r=1;r<=rekat;r++){ s.push(['kiyam',r===1?7:5],['ruku',3],['kiyam',1.6],['secde',2.6],['kade',1.4],['secde',2.6]); if(r===2&&rekat>2) s.push(['kade',4]); } s.push(['kade',6],['selamR',1.6],['selamL',1.6],['kade',2]); return s; }
function startNamaz(v,cuma){ namaz={v,cuma,seq:namazSeq(v.r),i:0,t:0,hutbe:cuma?22:0}; ensureImam(); imam.root.position.set(0,0,MZ0+0.95); imam.root.rotation.y=Math.PI; imam.mode=cuma?'talk':'kiyam';
  if(cuma){ imam.root.position.set(1.55,1.52,MZ0+1.05); imam.root.rotation.y=0; toast('🕌 Cuma hutbesi başladı'); } }
function namazMode(){ if(!namaz) return null; if(namaz.hutbe>0) return 'otur'; const st=namaz.seq[namaz.i]; return st?st[0]:null; }

// ---------- akış ----------
let mescitT=0, lastVakitKey=null, mState={phase:'idle'};
function updateMescit(dt){
  if(!mescitOn()) return; if(!mescitG) buildMescit(); ensureImam();
  const inside=player.f===MF, t=performance.now()/1000;
  if(mescitDome) mescitDome.visible=fpMode&&inside;
  mKandil.forEach((k,i)=>k.scale.setScalar(0.85+0.2*Math.abs(Math.sin(t*1.5+i))));
  if(ezanEl&&ezanOn) ezanEl.volume=ezanVol();
  // vakit kontrolü (gerçek İstanbul saati)
  mescitT-=dt; if(mescitT<=0){ mescitT=5; const now=new Date(), L=vakitler(now);
    if(L){ const cur=L.find(v=>now.getTime()>=v.t&&now.getTime()-v.t<90000); const key=cur&&istDate(now)+cur.k;
      if(cur&&key!==lastVakitKey&&state.lastVakit!==key){ lastVakitKey=key; state.lastVakit=key; triggerVakit(cur,false); } } }
  // hazırlık → namaz → dağılma
  if(mState.phase==='ezan'){ mState.t-=dt; if(mState.t<=0){ mState.phase='namaz'; startNamaz(mState.v,mState.cuma); } }
  if(namaz){ if(namaz.hutbe>0){ namaz.hutbe-=dt; if(namaz.hutbe<=0){ imam.root.position.set(0,0,MZ0+0.95); imam.root.rotation.y=Math.PI; } }
    else { namaz.t+=dt; const st=namaz.seq[namaz.i]; if(st&&namaz.t>=st[1]){ namaz.t=0; namaz.i++; if(namaz.i===namaz.seq.length-4&&inside) sfx('bell'); }
      if(namaz.i>=namaz.seq.length){ namaz=null; mState.phase='idle'; dismissCemaat(false); imam.mode='kade'; imam.root.position.set(imam.home.x,0,imam.home.z); imam.root.rotation.y=Math.PI;
        if(inside) toast('🤲 Namaz kılındı · Allah kabul etsin'); state.stats.cemaat=(state.stats.cemaat||0)+1; } } }
  // imam pozu
  const nm=namazMode(); if(imam){ if(nm&&nm!=='otur') imam.mode=nm; else if(namaz&&namaz.hutbe>0) imam.mode='talk'; animChar(imam,dt); }
  // cemaat: yürüyüş, namaz pozu, ayrılış
  for(let i=cemaat.length-1;i>=0;i--){ const c=cemaat[i], r=c.root;
    if(c.leave){ c.leave.t-=dt; if(c.leave.t<=0){ const dx=5.6-r.position.x, dz=2.3-r.position.z, d=Math.hypot(dx,dz); if(d<0.2){ mescitG.remove(r); cemaat.splice(i,1); continue; }
        r.position.x+=dx/d*Math.min(d,dt*1.6); r.position.z+=dz/d*Math.min(d,dt*1.6); r.rotation.y=Math.atan2(dx,dz); c.mode='walk'; } else c.mode='idle'; }
    else if(c.walk){ c.walk.t-=dt; if(c.walk.t<=0){ const dx=c.walk.x-r.position.x, dz=c.walk.z-r.position.z, d=Math.hypot(dx,dz);
        if(d<0.05){ c.walk=null; r.rotation.y=Math.PI; } else { r.position.x+=dx/d*Math.min(d,dt*1.6); r.position.z+=dz/d*Math.min(d,dt*1.6); r.rotation.y=Math.atan2(dx,dz); c.mode='walk'; } } }
    else { r.rotation.y=Math.PI; c.mode=nm&&nm!=='otur'?nm:namaz&&namaz.hutbe>0?'kade':'kiyamIdle'; }
    c.spd=0.8; if(mescitG.visible) animChar(c,dt); }
}
function triggerVakit(v,test){
  if(!mescitOn()) return; const cuma=v.k==='dhuhr'&&istWeekday(new Date())===5;
  const n=cuma?rint(20,26):rint(5,10); gatherCemaat(n,cuma); mState={phase:'ezan',t:test?20:(ezanEl&&ezanEl.duration>30?Math.min(ezanEl.duration,215):60)+10,v,cuma};
  playEzan(); if(ezanEl&&!test&&ezanEl.duration>30) mState.t=ezanEl.duration+8;
  banner(`🕌 ${v.n} ezanı${cuma?' · Cuma':''}`,cuma?'Cuma namazı: cemaat kalabalık, önce hutbe':'Cemaat mescide geliyor');
}
// ---------- yönetim satırı ----------
function mescitHtml(){
  if(!mescitOn()) return `<div class="ugh">🕌 Mescit</div><p class="note">Çatı katı açıldıktan sonra çatıdaki yeşil alandan mescit katı kurulur (otelin en üst, en manzaralı katı).</p>`;
  const nv=nextVakit(); const L=vakitler();
  return `<div class="ugh">🕌 Mescit · İstanbul vakitleri (Diyanet)</div>
    <div class="row"><div class="ic">🕌</div><div class="tx">${L?L.map(v=>`${v.n} ${istHM(new Date(v.t))}`).join(' · '):'Vakitler hesaplanamadı'}<small>${nv?`Sıradaki: ${nv.n} ${istHM(new Date(nv.t))}`:''}${namaz?' · şu an namaz kılınıyor':''}</small></div></div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px">${[['on','🔊 Ezan açık'],['mute','🔇 Sessiz'],['off','⛔ Kapalı']].map(([k,l])=>`<button class="btn ${(state.ezan||'on')===k?'gold':'ghost'}" data-ezan="${k}" style="flex:1">${l}</button>`).join('')}</div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px"><button class="btn wide" data-ezanplay>▶️ Ezanı dinle</button><button class="btn wide" data-mgo>🛗 Mescide çık</button></div>
    <p class="note" style="font-size:11px">Ezan kaydı: Mescid-i Nebevî, açık kaynak al-azan uygulamasından (github.com/meypod/al-azan, AGPL-3.0). Vakit hesabı: adhan-js (MIT).</p>`;
}
function bindMescit(root){
  root.querySelectorAll('[data-ezan]').forEach(b=>b.onclick=()=>{ state.ezan=b.dataset.ezan; if(state.ezan==='off') stopEzan(); sfx('click'); markSave(); renderSheet(); });
  const p=root.querySelector('[data-ezanplay]'); if(p) p.onclick=()=>{ if(ezanOn) stopEzan(); else { const s=state.ezan; state.ezan='on'; playEzan(); state.ezan=s; } };
  const g=root.querySelector('[data-mgo]'); if(g) g.onclick=()=>{ closeSheet(); peekFloor=null; player.goTo(MF,0,-0.5); };
}
function bootMescit(){ if(mescitOn()) buildMescit(); }
