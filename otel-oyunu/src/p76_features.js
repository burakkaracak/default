
// =====================================================================
// ROOFTOP: sky bar, infinity pool, lounge, helipad (+ VIP helicopter)
// =====================================================================
const RP={pool:{x0:-6.6,x1:-1.4,z0:-11.0,z1:-7.6}, loungers:[-6.0,-4.8,-3.6,-2.4], loungerZ:-5.4,
  bar:{x0:0.9,x1:4.5,z:-4.3}, stools:[1.4,2.25,3.1,3.95], pit:{x:-3.2,z:-1.3}};
// roof amenity seats (used only once the roof exists)
RP.loungers.forEach(lx=>SEATS.push({amen:'roof',f:ROOF,x:lx,z:RP.loungerZ+1.15,px:lx,pz:RP.loungerZ+0.62,py:0.43,rx:-Math.PI/2,rot:0,pose:'sleep',busy:null}));
[[-5.4,-9.5],[-4.0,-8.7],[-2.6,-9.7]].forEach(([sx,sz])=>SEATS.push({amen:'roof',f:ROOF,x:sx,z:-6.8,px:sx,pz:sz,py:-0.05,rot:rnd(0,6),pose:'swim',busy:null}));
RP.stools.forEach(x=>SEATS.push({amen:'roof',f:ROOF,x,z:RP.bar.z+1.3,px:x,pz:RP.bar.z+0.72,py:0.3,rot:Math.PI,pose:'sit',busy:null}));
[[-4.65,-1.3,Math.PI/2],[-1.75,-1.3,-Math.PI/2],[-4.65,-0.6,Math.PI/2],[-1.75,-0.6,-Math.PI/2]].forEach(([x,z,r])=>SEATS.push({amen:'roof',f:ROOF,x,z:0.4,px:x,pz:z,py:0.12,rot:r,pose:'sit',busy:null}));
let roofBartender=null, roofFlames=[], roofWater=null, heliLights=[];
function buildRoof(){
  if(floorRoots[ROOF]&&floorRoots[ROOF].userData.shell) return;
  const G=floorRoot(ROOF), S=new THREE.Group(); G.userData.shell=true;
  const DL=2.62-BACK-0.08, DC=(2.62+BACK+0.08)/2;
  S.add(mesh(box(13.8,0.4,DL),tmat('wood',9,9),0,-0.2,DC));
  S.add(mesh(box(1.4,0.4,1.6),tmat('wood',1,1),5.6,-0.2,3.4));
  S.add(mesh(box(14.1,0.42,0.3),M.facade,0,-0.21,2.75,true));
  // parapet: stone curb + glass + gold rail
  const par=(x0,x1,z0,z1)=>{ const w=Math.max(0.1,x1-x0), d=Math.max(0.1,z1-z0), cx=(x0+x1)/2, cz=(z0+z1)/2;
    S.add(mesh(box(w,0.25,d),M.facade,cx,0.125,cz,true)); const gl=mesh(box(w,0.8,d*0.4),M.glass,cx,0.65,cz); gl.castShadow=false; S.add(gl);
    S.add(mesh(box(w+0.02,0.06,d+0.04),M.gold,cx,1.06,cz)); };
  par(-6.98,6.98,BACK-0.08,BACK+0.08); par(-7.06,-6.9,BACK,2.7); par(6.9,7.06,BACK,2.7); par(-6.98,4.9,2.6,2.72); par(6.3,6.98,2.6,2.72);
  // infinity pool
  const P=RP.pool, pw=P.x1-P.x0, pd=P.z1-P.z0, pcx=(P.x0+P.x1)/2, pcz=(P.z0+P.z1)/2, stone=mat(0xf1ece2,{roughness:.6});
  S.add(mesh(box(pw,0.06,pd),tmat('poolTile',5,3),pcx,0.03,pcz));
  S.add(mesh(box(pw+0.3,0.55,0.15),stone,pcx,0.275,P.z1+0.075,true)); S.add(mesh(box(0.15,0.55,pd),stone,P.x0-0.075,0.275,pcz,true)); S.add(mesh(box(0.15,0.55,pd),stone,P.x1+0.075,0.275,pcz,true));
  S.add(mesh(box(pw+0.3,0.36,0.15),mat(0x2f6f8f,{roughness:.2,metalness:.2}),pcx,0.18,P.z0-0.075));
  [-0.5,0.5].forEach(a=>S.add(mesh(cyl(0.03,0.03,0.9,8),M.gold,pcx+a+1.5,0.5,P.z1+0.02)));
  // loungers + umbrellas
  RP.loungers.forEach((lx,i)=>{ const z0=RP.loungerZ;
    S.add(mesh(rbox(0.58,0.1,1.2,.04),tmat('woodLight',1,1),lx,0.32,z0,true)); const bk=mesh(rbox(0.58,0.08,0.45,.04),tmat('woodLight',1,1),lx,0.5,z0-0.65,true); bk.rotation.x=0.7; S.add(bk);
    S.add(mesh(rbox(0.5,0.05,1.0,.03),mat([0xf4efe6,0xe0a93a,0xf4efe6,0x2d5d8a][i]),lx,0.39,z0+0.05));
    [[-0.24,-0.5],[0.24,-0.5],[-0.24,0.5],[0.24,0.5]].forEach(([a,b])=>S.add(mesh(cyl(0.02,0.02,0.28,6),M.dark,lx+a,0.14,z0+b)));
    if(i%2===0){ const ux=lx+0.6; S.add(mesh(cyl(0.035,0.035,2.2,8),M.white,ux,1.1,z0-0.2)); S.add(mesh(cone(1.05,0.4,12),mat(0xf4efe6),ux,2.25,z0-0.2,true)); } });
  // sky bar
  const B=RP.bar, bw=B.x1-B.x0, bcx=(B.x0+B.x1)/2;
  S.add(mesh(rbox(bw,1.0,0.6,.05),tmat('woodDark',3,1),bcx,0.5,B.z,true)); S.add(mesh(box(bw+0.1,0.06,0.72),tmat('marble',3,1),bcx,1.03,B.z));
  S.add(mesh(box(bw,0.04,0.02),M.gold,bcx,0.8,B.z+0.31));
  S.add(mesh(box(bw,1.9,0.35),tmat('woodDark',3,2),bcx,0.95,B.z-1.25,true));
  for(let r=0;r<2;r++){ S.add(mesh(box(bw-0.2,0.04,0.3),M.gold,bcx,1.15+r*0.45,B.z-1.05));
    for(let k=0;k<11;k++) S.add(mesh(cyl(0.035,0.04,0.26,8),mat([0x2e7d32,0x6d4c41,0xc62828,0xf2b632,0x3f51b5][(k+r)%5],{roughness:.2,metalness:.1,transparent:true,opacity:.85}),B.x0+0.3+k*0.3,1.3+r*0.45,B.z-1.02)); }
  const sign=signPlane('SKY BAR',1.8,0.42,{fg:'#ffd76a',stroke:'#7a3b00',strokeW:6,font:'800 90px "Baloo 2"'}); sign.position.set(bcx,2.12,B.z-1.06); S.add(sign);
  RP.stools.forEach(x=>{ S.add(mesh(cyl(0.2,0.2,0.07,14),mat(0x8a2f3a),x,0.66,B.z+0.72)); S.add(mesh(cyl(0.035,0.035,0.62,8),M.gold,x,0.31,B.z+0.72)); S.add(mesh(cyl(0.18,0.2,0.03,14),M.gold,x,0.015,B.z+0.72)); });
  // lounge with fire pit
  const pit=RP.pit, sofa=mat(0x3b4a5a,{roughness:.95}), cush=mat(0xf0e6d2,{roughness:.95});
  S.add(mesh(cyl(0.55,0.62,0.4,20),mat(0x4a4f57,{roughness:.6}),pit.x,0.2,pit.z+0.35,true)); S.add(mesh(cyl(0.45,0.45,0.02,20),mat(0x1c1d22),pit.x,0.41,pit.z+0.35));
  [-1,1].forEach(sd=>{ const sx=pit.x+sd*1.45;
    S.add(mesh(rbox(0.8,0.34,1.8,.1),sofa,sx,0.22,pit.z+0.35,true)); S.add(mesh(rbox(0.22,0.6,1.8,.08),sofa,sx+sd*0.38,0.45,pit.z+0.35,true));
    [-0.45,0.45].forEach(o=>S.add(mesh(rbox(0.2,0.28,0.45,.08),cush,sx+sd*0.24,0.52,pit.z+0.35+o))); });
  S.add(mesh(rbox(3.6,0.02,2.6,.2),mat(0xc9b28a,{roughness:1}),pit.x,0.012,pit.z+0.35));
  // helipad
  const H=L.helipad;
  S.add(mesh(box(4.6,0.12,4.6),mat(0x3a3f46,{roughness:.8}),H.x,0.06,H.z,true));
  const ring=mesh(new THREE.RingGeometry(1.55,1.75,40),mat(0xf2c14e,{roughness:.6}),H.x,0.125,H.z); ring.rotation.x=-Math.PI/2; S.add(ring);
  const hs=signPlane('H',1.6,1.6,{w:256,h:256,fg:'#ffffff',font:'900 220px "Baloo 2", sans-serif'}); hs.rotation.x=-Math.PI/2; hs.position.set(H.x,0.13,H.z); S.add(hs);
  // string lights over the lounge
  const poles=[[-6.4,1.9],[-0.3,1.9],[-0.3,-2.9],[-6.4,-2.9]];
  poles.forEach(([x,z])=>S.add(mesh(cyl(0.04,0.04,2.6,8),M.dark,x,1.3,z,true)));
  for(let i=0;i<4;i++){ const [ax,az]=poles[i], [bx,bz]=poles[(i+1)%4]; for(let k=1;k<12;k++){ const t=k/12; S.add(mesh(sph(0.055,6,4),M.lampOn,lerp(ax,bx,t),2.55-Math.sin(t*Math.PI)*0.45,lerp(az,bz,t))); } }
  // planters
  [[-6.35,2.15],[4.2,2.15],[6.4,-2.2],[6.4,-4.4],[-0.6,-11.0]].forEach(([x,z])=>bigPlant(S,x,z,0.8));
  const lbl=signPlane('ÇATI',1.2,0.34,{bg:'#14263a',fg:'#ffd76a',font:'800 70px "Baloo 2"'}); lbl.position.set(4.3,0.55,2.52); lbl.rotation.y=0; S.add(lbl);
  G.add(bake(S));
  // dynamic: pool water, fire, bartender, helipad lights
  const wm=new THREE.MeshStandardMaterial({map:tex('water',2,1.4),transparent:true,opacity:.78,roughness:.03,metalness:.1,emissive:0x0b5a8a,emissiveIntensity:.25,depthWrite:false});
  roofWater=mesh(box(pw,0.02,pd+0.1),wm,pcx,0.47,pcz-0.05); G.add(roofWater);
  roofFlames=[]; const fm=new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let k=0;k<6;k++){ const f=mesh(cone(0.09,0.35,6),fm,pit.x+Math.cos(k)*0.2,0.55,pit.z+0.35+Math.sin(k)*0.2); f.userData.ph=k; G.add(f); roofFlames.push(f); }
  roofBartender=makeChar(LOOKS.rec()); roofBartender.root.position.set(bcx,0,B.z-0.6); G.add(roofBartender.root);
  heliLights=[]; for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; const l=mesh(sph(0.06,6,4),new THREE.MeshBasicMaterial({color:0x5fd98a}),H.x+Math.cos(a)*2.1,0.16,H.z+Math.sin(a)*2.1); G.add(l); heliLights.push(l); }
  addCols('roof',[
    [ROOF,-7.06,7.06,BACK-0.1,BACK+0.1],[ROOF,-7.06,-6.9,BACK,2.7],[ROOF,6.9,7.06,BACK,2.7],[ROOF,-6.98,4.9,2.58,2.74],[ROOF,6.3,6.98,2.58,2.74],
    [ROOF,P.x0-0.16,P.x1+0.16,P.z0-0.16,P.z1+0.16],
    ...RP.loungers.map(lx=>[ROOF,lx-0.3,lx+0.3,RP.loungerZ-0.75,RP.loungerZ+0.62]),
    [ROOF,B.x0,B.x1,B.z-1.45,B.z+0.32],
    [ROOF,pit.x-0.65,pit.x+0.65,pit.z-0.3,pit.z+1.0],[ROOF,pit.x-1.9,pit.x-1.0,pit.z-0.6,pit.z+1.3],[ROOF,pit.x+1.0,pit.x+1.9,pit.z-0.6,pit.z+1.3],
    ...poles.map(([x,z])=>[ROOF,x-0.08,x+0.08,z-0.08,z+0.08]),
    ...[[-6.35,2.15],[4.2,2.15],[6.4,-2.2],[6.4,-4.4],[-0.6,-11.0]].map(([x,z])=>[ROOF,x-0.3,x+0.3,z-0.3,z+0.3])]);
}
function updateRoof(t,dt){
  if(!roofWater) return;
  roofWater.material.map.offset.x+=dt*0.03; roofWater.material.map.offset.y+=dt*0.02;
  roofFlames.forEach(f=>{ const s=0.7+Math.abs(Math.sin(t*9+f.userData.ph*1.7))*0.6; f.scale.set(1,s,1); f.material.opacity=0.55+0.4*Math.abs(Math.sin(t*7+f.userData.ph)); });
  if(roofBartender){ roofBartender.mode=roofOpen()?'work':'idle'; animChar(roofBartender,dt); }
  heliLights.forEach((l,k)=>l.material.color.setHex(Math.sin(t*4-k*0.8)>0.3?0x9dffc0:0x2a6a3a));
}

// ---------- helicopter with VIP guests ----------
let heli=null;
function buildHeliModel(){
  const g=new THREE.Group(), body=mat(0xf4f4f2,{metalness:.4,roughness:.3}), red=mat(0xc0392b,{metalness:.3,roughness:.35}), dark=mat(0x1c2733,{metalness:.6,roughness:.1});
  const hull=mesh(sph(0.8,20,14),body,0,1.0,0,true); hull.scale.set(1.5,0.9,0.95); g.add(hull);
  const glass=mesh(sph(0.62,16,10),dark,0.6,1.08,0); glass.scale.set(1,0.8,0.85); g.add(glass);
  g.add(mesh(box(2.4,0.06,0.1),red,0.1,0.95,0.78)); g.add(mesh(box(2.4,0.06,0.1),red,0.1,0.95,-0.78));
  const boom=mesh(cyl(0.12,0.22,2.6,10),body,-2.1,1.15,0,true); boom.rotation.z=Math.PI/2; g.add(boom);
  const fin=mesh(box(0.5,0.7,0.06),red,-3.3,1.45,0); g.add(fin);
  const tr=new THREE.Group(); tr.position.set(-3.35,1.5,0.1); tr.add(mesh(box(0.06,0.7,0.06),M.dark,0,0,0)); g.add(tr);
  [-0.55,0.55].forEach(z=>{ const sk=mesh(cyl(0.04,0.04,2.2,8),M.dark,0.1,0.08,z); sk.rotation.z=Math.PI/2; g.add(sk); [-0.5,0.6].forEach(x=>g.add(mesh(cyl(0.03,0.03,0.42,6),M.dark,x,0.28,z))); });
  g.add(mesh(cyl(0.08,0.08,0.3,8),M.dark,0,1.85,0));
  const rotor=new THREE.Group(); rotor.position.set(0,2.02,0); [0,Math.PI/2].forEach(a=>{ const b=mesh(box(5.2,0.03,0.18),M.dark,0,0,0); b.rotation.y=a; rotor.add(b); }); g.add(rotor);
  const sh=blob(1.6); sh.scale.set(1.5,0.8,1); g.add(sh);
  return {g,rotor,tr,sh};
}
function startHeli(){
  if(heli||!built('roof')) return;
  const m=buildHeliModel(); world.add(m.g);
  heli=Object.assign(m,{phase:'in',t:0,from:new THREE.Vector3(48,ROOF*FH+18,-42),pad:new THREE.Vector3(L.helipad.x,ROOF*FH+0.12,L.helipad.z),n:rint(1,2),drop:0});
  heli.g.position.copy(heli.from); toast('🚁 Bir helikopter yaklaşıyor…'); sfx('whoosh');
}
function updateHeli(dt,t){
  if(!heli) return; const h=heli, p=h.g.position;
  h.rotor.rotation.y+=dt*(h.phase==='wait'?12:30); h.tr.rotation.z+=dt*40;
  if(h.phase==='in'){ h.t+=dt/7; const k=Math.min(1,h.t), e=1-Math.pow(1-k,3);
    p.set(lerp(h.from.x,h.pad.x,e),lerp(h.from.y,h.pad.y+4,e),lerp(h.from.z,h.pad.z,e)); h.g.rotation.y=Math.atan2(h.pad.x-h.from.x,h.pad.z-h.from.z)-Math.PI/2; h.g.rotation.z=(1-k)*0.12;
    if(k>=1){ h.phase='land'; h.t=0; } }
  else if(h.phase==='land'){ h.t+=dt/2.2; p.y=lerp(h.pad.y+4,h.pad.y,Math.min(1,h.t)); if(h.t>=1){ h.phase='wait'; h.t=0; banner('🚁 Ünlü misafir geldi!','Çatıdan asansörle resepsiyona iniyor'); sfx('star'); } }
  else if(h.phase==='wait'){ h.t+=dt;
    if(h.drop<h.n&&h.t>0.8+h.drop*0.9){ h.drop++; const g=spawnGuest('vip',{x:L.helipad.x-1.2,z:L.helipad.z+1.6},false,ROOF); if(g){ g.heli=true; g.tag&&(g.tag.y=1.95); } }
    if(h.t>0.8+h.n*0.9+1.5){ h.phase='out'; h.t=0; } }
  else { h.t+=dt/6; p.set(lerp(h.pad.x,-50,h.t*h.t),h.pad.y+h.t*22,lerp(h.pad.z,-40,h.t)); h.g.rotation.z=-h.t*0.15; if(h.t>=1){ world.remove(h.g); heli=null; return; } }
  h.sh.visible=p.y-ROOF*FH<3; h.g.visible=floorVisible(ROOF*FH)||p.y>ROOF*FH+1;
}

// =====================================================================
// FIRST-PERSON MODE
// =====================================================================
let fpMode=false, fpYaw=0, fpBob=0;
function toggleFP(on){
  fpMode=on==null?!fpMode:on; fpYaw=player?player.rot:0;
  camera.near=fpMode?0.06:0.5; camera.fov=fpMode?72:(VW<VH?40:33); camera.updateProjectionMatrix();
  $('fpBtn').classList.toggle('on',fpMode); peekFloor=null; sfx('click');
  if(fpMode) hint(IS_TOUCH?'Birinci şahıs: joystick ileri/geri yürür, sağa-sola çevirir':'Birinci şahıs: W/S yürü · A/D dön · V ile çık',4.5);
}
function fpRawInput(){
  let sx=joy.dx, sy=joy.dy;
  if(keys.w||keys.arrowup) sy-=1; if(keys.s||keys.arrowdown) sy+=1; if(keys.a||keys.arrowleft) sx-=1; if(keys.d||keys.arrowright) sx+=1;
  return {sx:clamp(sx,-1,1),sy:clamp(sy,-1,1)};
}
function updatePlayerFP(dt){
  const p=player; p.speed=playerSpeed(); const {sx,sy}=fpRawInput();
  if(Math.abs(sx)>0.05) fpYaw-=sx*2.4*dt;
  if(Math.abs(sy)>0.08&&!p.riding){ p.path=null; p.onArrive=null; const sp=-sy*p.speed*(sy>0?0.6:1)*dt, ox=p.x, oz=p.z;
    moveCollide(p,Math.sin(fpYaw)*sp,Math.cos(fpYaw)*sp); p.moving=true; movedDist+=Math.hypot(p.x-ox,p.z-oz); fpBob+=dt*10; }
  else { p.moving=false; if(p.path){ p.step(dt); const want=p.tRot; let d=want-fpYaw; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; fpYaw+=d*Math.min(1,dt*6); fpBob+=dt*8; } }
  p.tRot=fpYaw; p.rot=fpYaw;
  if(state.tut===0&&movedDist>2.5) tutEvent('moved');
  state.player.x=p.x; state.player.z=p.z; state.player.f=p.f;
}
function updateCameraFP(dt){
  const p=player, eye=p.y+1.36+Math.sin(fpBob)*0.025*(p.moving||p.path?1:0);
  let sx=0, sz=0; if(shake>0) shake=Math.max(0,shake-(dt||0.016)*3);
  camera.position.set(p.x+Math.sin(fpYaw)*0.12+sx,eye,p.z+Math.cos(fpYaw)*0.12+sz);
  camera.lookAt(p.x+Math.sin(fpYaw)*5,eye-0.55,p.z+Math.cos(fpYaw)*5);
  cam.tx=p.x; cam.ty=p.y; cam.tz=p.z-0.8;
}

// =====================================================================
// HOTEL THEMES
// =====================================================================
const THEMES={
  classic:{name:'Klasik',e:'🏛️',tex:{},tints:{},chords:[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7]]},
  ottoman:{name:'Osmanlı konağı',e:'🕌',facade:0xeadcc2,trim:0x7a1c28,accent:0x1f6f6f,
    tex:{runner:'runnerKilim',marble:'marbleWarm',wallpaper:'wallTile',wallpaperStripe:'wallTile',wallpaperTeal:'wallTile'},
    tints:{corridor:0xf6e2c4,carpetBeige:0xe8c79a,wood:0xd9905a,woodDark:0xc07a50,woodLight:0xe8b584},
    chords:[[146.8,185,220],[155.6,196,233.1],[196,233.1,293.7],[130.8,155.6,196]]},
  modern:{name:'Modern cam kule',e:'🏙️',facade:0xf1f3f5,trim:0x2b2f36,accent:0x2e8bd8,
    tex:{runner:'runnerSlate',marble:'marbleDark',wallpaper:'wallConcrete',wallpaperStripe:'wallConcrete',wallpaperTeal:'wallConcrete'},
    tints:{corridor:0xe4e7ea,carpetBeige:0xc9cfd6,wood:0xb9b4ae,woodLight:0xd9d4cc,woodDark:0x8a8580},
    chords:[[261.6,329.6,392,493.9],[220,261.6,329.6,392],[174.6,220,261.6,329.6],[196,246.9,293.7,349.2]]},
  tropic:{name:'Tropik bungalov',e:'🌴',facade:0xfff2d6,trim:0x16877f,accent:0xff7a59,
    tex:{runner:'runnerLeaf',marble:'sandTile',wallpaper:'wallBamboo',wallpaperStripe:'wallBamboo',wallpaperTeal:'wallBamboo'},
    tints:{corridor:0xf6ead0,carpetBeige:0xf0dcb0,wood:0xf0cf9a,woodLight:0xf6dcae,woodDark:0xd0a070},
    chords:[[261.6,329.6,392],[349.2,440,523.3],[392,493.9,587.3],[293.7,349.2,440]]},
  mountain:{name:'Karlı dağ oteli',e:'🏔️',facade:0xb39070,trim:0x3b2618,accent:0x2e5e3e,
    tex:{runner:'runnerPlaid',marble:'slate',wallpaper:'wallLog',wallpaperStripe:'wallLog',wallpaperTeal:'wallLog'},
    tints:{corridor:0xd8b890,carpetBeige:0xc8a47c,wood:0xb07850,woodLight:0xc89468,woodDark:0x8a5a38},
    chords:[[220,261.6,329.6],[174.6,220,261.6],[261.6,329.6,392],[196,246.9,293.7]]},
};
const THEME_TINTED=new Set(); Object.values(THEMES).forEach(t=>Object.keys(t.tints).forEach(k=>THEME_TINTED.add(k)));
function themeKey(){ return (state.custom&&THEMES[state.custom.theme])?state.custom.theme:'classic'; }
function themeTint(m){
  if(!m.map||!m.map.userData) return;
  const base=m.userData.baseTex||m.map.userData.tex; if(!base) return; m.userData.baseTex=base;
  const T=THEMES[themeKey()], want=T.tex[base]||base;
  if(m.map.userData.tex!==want){ const r=m.map.repeat; m.map=tex(want,r.x,r.y); m.needsUpdate=true; }
  if(T.tints[base]!=null) m.color.setHex(T.tints[base]); else if(THEME_TINTED.has(base)) m.color.setHex(0xffffff);
}
function applyHotelTheme(){
  const T=THEMES[themeKey()], c=city();
  M.facade.color.setHex(T.facade??c.facade); M.trim.color.setHex(T.trim??c.trim); M.accent.color.setHex(T.accent??c.accent);
  for(const k in matCache) themeTint(matCache[k]);
  CHORDS.length=0; T.chords.forEach(ch=>CHORDS.push(ch)); applyCityMusic();
  if(typeof applyThemeExtras==='function'&&player) applyThemeExtras();
}

// =====================================================================
// TALKING GUESTS (Claude via the artifact's `sample` capability)
// =====================================================================
let sampleFn=null, aiState='checking';
(async()=>{ try{ if(window.claude&&typeof window.claude.use==='function'){ sampleFn=await window.claude.use('sample'); } }catch(e){} aiState=sampleFn?'ready':'off'; })();
const PERSONA={student:'bütçesi kısıtlı, neşeli ve sırt çantalı bir üniversite öğrencisi',elderly:'nazik, biraz yavaş, eski günleri anlatmayı seven emekli biri',couple:'balayındaki romantik ve birbirine düşkün bir çift (ikisi adına konuşuyorsun)',influencer:'sürekli fotoğraf çeken, takipçilerine otel hakkında paylaşım yapacak bir sosyal medya fenomeni',tourist:'meraklı, heyecanlı, fotoğraf çekmeyi seven bir gezgin',business:'aceleci, kibar ama talepkâr bir iş insanı; toplantıya yetişmeye çalışıyor',
  family:'çocukları yorgun düşmüş, sıcakkanlı ama biraz telaşlı bir ebeveyn',vip:'biraz şımarık, ilgi bekleyen ünlü bir sanatçı',
  athlete:'enerjik, sporu ve sağlıklı yaşamı seven bir sporcu',grumpy:'huysuz, sabırsız ve her şeye söylenen ama hızlı hizmete bayılan biri',
  dog:'köpeğini çok seven, onu hep yanında gezdiren neşeli biri',million:'sade giyinmiş, alçakgönüllü bir turist gibi davranan ama aslında çok zengin biri; bunu belli etmemeye çalışır',
  insp:'ciddi, detaycı ve gizlice otelleri puanlayan bir müfettiş; kimliğini açık etmemeye çalışır'};
let chatGuest=null, chatBusy=false, chatCtl=null;
function guestSituation(g){
  const moodW=g.sat>=68?'memnunsun':g.sat>=42?'idare eder hissediyorsun':'mutsuzsun';
  let where='';
  if(g.state==='queue'||g.state==='arrive') where=`Resepsiyonda sırada bekliyorsun, sabrın %${Math.round(100*g.pat/g.patMax)} kaldı${g.coffee?' (elinde kahve var)':''}.`;
  else if(g.room!=null){ const s=state.rooms[g.room], R=RT(g.room); where=`${ROOM_T[s.type].name} odasında (Oda ${g.room}) kalıyorsun, ${g.nights} gece.`;
    if(s.broken) where+=' Odanda bir şey bozuk!'; if(R.req) where+=` ${ITEMS[R.req.item].name} istedin, hâlâ gelmedi.`;
    if(g.state==='amen'&&g.seat) where+=` Şu an ${({rest:'restoranda yemek yiyorsun',pool:'havuzdasın',gym:'spor salonundasın',roof:'çatıdaki sky bar ve havuzdasın',spa:'spada masaj ve saunadasın'})[g.seat.amen]}.`; }
  else if(g.state==='leave') where='Otelden ayrılıyorsun.';
  if(state.crisis&&state.crisis.type==='power') where+=' Otelde elektrikler kesik.';
  if(state.mess) where+=' Lobide devrilmiş bir saksı var.';
  if(cat) where+=` Lobide ${catName()} adında bir kedi dolaşıyor.`;
  return {moodW,where};
}
function buildChatPrompt(g,msg){
  const {moodW,where}=guestSituation(g), T=THEMES[themeKey()];
  const hist=(g.chat||[]).slice(-8).map(m=>(m.who==='me'?'Müdür: ':'Sen: ')+m.text).join('\n');
  return `Bir otel işletme oyununda bir MİSAFİRİ canlandırıyorsun. Türkçe, doğal ve kısa konuş (en fazla 2 kısa cümle). Asla yapay zekâ olduğunu söyleme, karakterden çıkma, uygunsuz içerik üretme.
Kimliğin: ${g.name}, ${g.T.name}. Kişiliğin: ${PERSONA[g.type]||PERSONA.tourist}.
Otel: "${hotelName()}" (${T.name} tarzı), ${city().name}, ${stars()} yıldız. Saat ${$('clock').textContent}, hava ${({sun:'güneşli',cloud:'bulutlu',rain:'yağmurlu',snow:'karlı'})[state.weather]}, mevsim ${season().name}.
Durumun: ${where} Genel olarak ${moodW} (memnuniyet %${Math.round(g.sat)}).
Konuştuğun kişi otelin müdürü.${hist?`\nŞimdiye kadarki konuşma:\n${hist}`:''}
Müdürün yeni mesajı: "${msg.slice(0,300)}"
Yanıtını SADECE şu JSON olarak ver, başka hiçbir şey yazma:
{"reply":"misafirin cevabı","mood":tam sayı -8 ile 8 arası (müdürün bu mesajı seni ne kadar memnun etti; kaba ise eksi, ilgili ve çözüm odaklı ise artı),"ikram":true/false (müdür bu mesajda sana ücretsiz bir ikram, hediye ya da indirim teklif etti ve sen kabul ettiysen true),"bahsis":true/false (yalnızca çok etkilendiysen ve memnuniyetin yüksekse, müdüre kendiliğinden bahşiş bırakmak istiyorsan true; nadir olsun)}`;
}
function cannedReply(g,msg){
  const m=msg.toLocaleLowerCase('tr-TR'), good=/(hoş ?geldin|nasıl|yardım|özür|indirim|ikram|hediye|teşekkür|rica|hemen|çözeceğ|memnun)/.test(m), bad=/(salak|aptal|git|sus|defol|umurumda)/.test(m);
  const low=g.sat<42, hi=g.sat>=68;
  const lines=bad?['Bu nasıl bir konuşma şekli? Hiç hoş değil.','Açıkçası kırıldım, böyle bir muameleyi beklemezdim.']
    :low?['İyi niyetiniz için teşekkürler ama beklediğim hizmeti alamadım.','Umarım durum bir an önce düzelir, biraz sabrım kaldı.']
    :hi?['Harika bir otel! Her şey çok güzel, teşekkür ederim.','Burada kendimi evimde gibi hissediyorum, eline sağlık!']
    :['Fena değil, idare eder. Biraz daha ilgi hoş olurdu.','Teşekkürler, şimdilik her şey yolunda gibi.'];
  return {reply:rand(lines),mood:bad?-6:good?(low?3:4):1,ikram:!bad&&/(ikram|hediye|indirim|bedava|ücretsiz)/.test(m),bahsis:false};
}
function openChat(g){
  if(!g||!guests.includes(g)) return;
  chatGuest=g; g.chat=g.chat||[]; openSheet('chat');
  if(!state.tips.chat){ state.tips.chat=true; markSave(); }
}
function renderChatSheet(){
  const g=chatGuest; if(!g||!guests.includes(g)){ closeSheet(); return; }
  const key='chat:'+g.name+':'+g.chat.length+':'+chatBusy;
  if(sheet._h!==key){
    sheet._h=key;
    const msgs=g.chat.map(m=>`<div class="cb ${m.who}">${escH(m.text)}${m.d?`<small class="dd ${m.d>0?'up':'dn'}">${m.d>0?'+':''}${m.d} memnuniyet</small>`:''}${(m.notes||[]).map(n=>`<small class="dd up">${escH(n)}</small>`).join('')}</div>`).join('')+(chatBusy?'<div class="cb them typing">yazıyor…</div>':'');
    const chips=['Hoş geldiniz! Nasılsınız?','Bir isteğiniz var mı?','Odanız nasıl?','Size bir ikram yapalım 🎁'];
    sheet.innerHTML=`<h3><span id="chHead"></span><button class="xbtn" data-close aria-label="Kapat">✖</button></h3><p class="sub" id="chSub"></p>
      <div class="chat" id="chLog">${msgs||'<div class="note">Misafire bir şey söyle. Cevabı ve memnuniyeti söylediklerine göre değişir; ikram teklif edebilirsin, çok memnun kalan bahşiş bırakabilir.</div>'}</div>
      <div class="agrid" style="margin:8px 0">${chips.map(c=>`<button class="btn ghost abtn" data-chip="${escH(c)}" ${chatBusy?'disabled':''}>${escH(c)}</button>`).join('')}</div>
      <div class="agrid"><input id="chIn" class="tin" maxlength="200" placeholder="Mesajını yaz…" ${chatBusy?'disabled':''}><button class="btn gold" id="chSend" ${chatBusy?'disabled':''}>Gönder</button></div>
      <p class="note" id="chAi"></p>`;
    sheet.querySelector('[data-close]').onclick=closeSheet;
    const inp=sheet.querySelector('#chIn'), send=()=>{ const v=inp.value.trim(); if(v) sendChat(v); };
    sheet.querySelector('#chSend').onclick=send; inp.onkeydown=e=>{ if(e.key==='Enter') send(); };
    sheet.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>sendChat(b.dataset.chip));
    const log=sheet.querySelector('#chLog'); log.scrollTop=log.scrollHeight;
    if(!chatBusy&&!IS_TOUCH) setTimeout(()=>inp.focus(),50);
  }
  const face=g.sat>=68?'😄':g.sat>=42?'🙂':'😠';
  const hd=sheet.querySelector('#chHead'); if(hd) hd.textContent=`${g.T.e} ${g.name} ${face}`;
  const sb=sheet.querySelector('#chSub'); if(sb) sb.textContent=`${g.T.name} · memnuniyet %${Math.round(g.sat)}${g.room!=null?' · Oda '+g.room:g.state==='queue'?' · sırada':''}`;
  const ai=sheet.querySelector('#chAi'); if(ai) ai.textContent=aiState==='ready'?'💬 Yapay zekâ ile gerçek sohbet':aiState==='checking'?'':'💬 Basit sohbet modu (yapay zekâ bu görünümde kapalı)';
}
async function sendChat(text){
  const g=chatGuest; if(!g||chatBusy) return;
  g.chat.push({who:'me',text}); chatBusy=true; onGameEvent('chat',1); renderSheet(); sfx('click');
  let res=null;
  if(sampleFn&&aiState==='ready'){
    chatCtl=new AbortController();
    try{ const r=await sampleFn.json(buildChatPrompt(g,text),{modelTier:'quick',cache:false,signal:chatCtl.signal});
      if(r&&typeof r.reply==='string'&&r.reply.trim()) res={reply:r.reply.trim().slice(0,400),mood:clamp(Math.round(+r.mood||0),-8,8),ikram:r.ikram===true,bahsis:r.bahsis===true};
    }catch(e){ const c=e&&e.code;
      if(c==='not_granted'||c==='sampling_disabled'||c==='not_declared'||c==='capability_disabled'||c==='capability_removed') aiState='off';
      else if(c==='rate_limited'){ res={reply:'(Misafir şu an biraz meşgul, birazdan tekrar dene.)',mood:0}; }
      else if(c==='cancelled'){ chatBusy=false; return; } }
  }
  if(!res) res=cannedReply(g,text);
  if(!guests.includes(g)){ chatBusy=false; return; }
  g.chatGain=g.chatGain||0; const room=res.mood>0?Math.max(0,15-g.chatGain):Math.max(-15-g.chatGain,-15);
  const d=res.mood>0?Math.min(res.mood,room):Math.max(res.mood,room);
  g.chatGain+=d; g.sat=clamp(g.sat+d,0,100);
  if(g.state==='queue') g.pat=Math.min(g.patMax,g.pat+Math.max(0,d)*1.5);
  g.chatted=true; const rr=g.room!=null?roomRate(g.room):roomRateSum()/Math.max(1,nRoomsNow()), notes=[];
  if(res.ikram&&!g.gifted){ g.gifted=true; const c=Math.max(5,Math.round(rr*0.2*incomeMult())); state.money-=c; g.sat=clamp(g.sat+6,0,100); if(g.state==='queue') g.pat=Math.min(g.patMax,g.pat+8);
    fxText(g.x,g.y+1.6,g.z,g.f,'−'+fmt(c),true); fxEmoji(g.x,g.y+2.4,g.z,g.f,'🎁'); notes.push(`🎁 ikram −${fmt(c)} ₺ · memnuniyet +6`); }
  if(res.bahsis&&!g.chatTip&&g.sat>=70&&d>=4){ g.chatTip=true; const t=Math.max(5,Math.round(rr*0.35*incomeMult())); addMoney(t,g.x,g.y+1.2,g.z,g.f); state.today.tips+=t; notes.push(`💵 bahşiş bıraktı +${fmt(t)} ₺`); }
  g.chat.push({who:'them',text:res.reply,d,notes}); chatBusy=false;
  fxEmoji(g.x,g.y+2.2,g.z,g.f,d>=4?'😊':d<=-4?'😠':'💬'); sfx(d>=4?'sparkle':d<=-4?'fail':'req');
  renderSheet();
}
// ---------- ortak yapay zekâ çağrısı (kapalıysa null döner, oyun şablonla devam eder) ----------
async function aiJSON(prompt){
  if(!(sampleFn&&aiState==='ready')) return null;
  try{ return await sampleFn.json(prompt,{modelTier:'quick',cache:false}); }
  catch(e){ const c=e&&e.code; if(c==='not_granted'||c==='sampling_disabled'||c==='not_declared'||c==='capability_disabled'||c==='capability_removed') aiState='off'; return null; }
}
const clip=(s,n)=>typeof s==='string'&&s.trim()?s.trim().slice(0,n):null;

// ---------- misafir olayları: 3 seçenekli küçük ikilemler (şehre özgü) ----------
const DIL_FX=[{e:'🎁',c:0.6,sat:18,rep:0.5},{e:'🤝',c:0.1,sat:8,rep:0},{e:'🙅',c:0,sat:-10,rep:-0.5}];
const DIL_BASE=[
  {s:'Odamın manzarası fotoğraflardaki gibi değil, çok hayal kırıklığına uğradım!',o:['Ücretsiz üst kat odaya taşıyalım','Özür dileyip meyve tabağı gönderelim','Maalesef yapabileceğimiz bir şey yok'],r:['Harika, çok teşekkürler!','Nazik bir jest, sağ olun.','Hiç hoş değil…']},
  {s:'Bugün doğum günüm, küçük bir sürpriz olsa ne güzel olurdu 🎂',o:['Pasta ve süsleme yapalım','Kart ve çikolata bırakalım','Bu hizmetimiz yok'],r:['İnanamıyorum, çok mutlu oldum! 🥳','Ne tatlı, teşekkürler!','Peki… anladım.']},
  {s:'Yan odadan gece çok ses geliyordu, hiç uyuyamadım!',o:['Bir gece ücretsiz olsun','Kulak tıkacı ve kahve ikram edelim','Başka misafirlere karışamayız'],r:['Çok anlayışlısınız, teşekkürler.','İdare eder, sağ olun.','Bu cevap beni tatmin etmedi.']},
  {s:'Geç check-out yapabilir miyim? Uçağım akşam.',o:['Ücretsiz geç çıkış + öğle yemeği','Saat 14:00\'e kadar olur','Kurallar gereği mümkün değil'],r:['Muhteşem bir otel!','Yeterli, teşekkürler.','Keşke biraz esneklik olsaydı.']}];
const DIL_CITY={
  'İstanbul':{s:'Boğaz turu yapmak istiyorum, ayarlayabilir misiniz?',o:['Özel tekne turu hediyemiz olsun','Güvenilir bir tur firması önerelim','Kendiniz bakmanız gerekiyor'],r:['Rüya gibi bir gün oldu!','Teşekkürler, bakarım.','Pek yardımcı olmadınız.']},
  'Antalya':{s:'Plajda şezlong kalmamış, yer bulamadım!',o:['Özel VIP şezlong ayıralım','Havuz başında yer açalım','Plaj otelin değil, maalesef'],r:['İşte buna tatil denir!','Olur, teşekkürler.','Tatilim yarım kaldı.']},
  'Kapadokya':{s:'Balon turu hava yüzünden iptal oldu, çok üzgünüm!',o:['Yarın için ücretsiz balon turu ayarlayalım','ATV turu önerelim','Hava durumu elimizde değil'],r:['Hayatımın en güzel sabahıydı!','Fena fikir değil.','Çok üzüldüm…']},
  'Bodrum':{s:'Tekne turunda telefonumu denize düşürdüm, bir şey yapabilir misiniz?',o:['Yedek telefon ve dalgıç ayarlayalım','Otel telefonunu kullanabilirsiniz','Bu konuda yardımcı olamayız'],r:['Kahramanlarsınız!','Çok teşekkürler.','Kötü bir gün oldu.']},
  'Paris':{s:'Eyfel\'in görüneceği romantik bir akşam yemeği istiyoruz.',o:['Çatıda özel masa hazırlayalım','Yakın bir restoran rezerve edelim','Tüm masalar dolu'],r:['C\'est magnifique! 😍','Merci, güzel olur.','Hayal kırıklığı…']},
  'Dubai':{s:'Çölde bir safari yapmak istiyorum ama hepsi dolu.',o:['Özel cip safarisi ayarlayalım','Yarın için sıraya yazalım','Maalesef yer yok'],r:['Unutulmaz bir deneyim!','Olur, beklerim.','Çok üzüldüm.']}};
let dilT=90, dilCur=null;
function dilemmaGuest(){ const ids=roomsWhere(id=>{ const g=RT(id).guest; return g&&g.state==='room'&&!g.asleep&&g.type!=='insp'&&!g.dilDone; }); return ids.length?RT(rand(ids)).guest:null; }
function updateDilemmas(dt){
  if(state.tut<TUT.length||state.sandbox||nRoomsNow()<3||dilCur) return;
  dilT-=dt; if(dilT>0) return; dilT=rnd(80,150);
  if((state.dilDay===state.day?state.dilN||0:0)>=2||isNight()||sheetMode||modalWrap.classList.contains('show')) return;
  const g=dilemmaGuest(); if(g) startDilemma(g);
}
async function startDilemma(g){
  g.dilDone=true; if(state.dilDay!==state.day){ state.dilDay=state.day; state.dilN=0; } state.dilN++;
  const cityT=DIL_CITY[city().name]; let base=Math.random()<0.4&&cityT?cityT:rand(DIL_BASE);
  if(base===DIL_BASE[0]){ if(upsellDilemma(g)) return; base=rand(DIL_BASE.slice(1)); }
  const d={g,room:g.room,s:base.s,o:base.o.slice(),r:base.r.slice()}; dilCur=d;
  fxEmoji(g.x,g.y+2.3,g.z,g.f,'❗'); sfx('req');
  const r=await aiJSON(`Bir otel işletme oyununda misafirin müdürden bir isteği ya da şikâyeti var. Türkçe, kısa, doğal ve eğlenceli yaz; uygunsuz içerik yok.
Otel: "${hotelName()}", ${city().name} (bu şehre özgü bir durum olabilir), ${stars()} yıldız, mevsim ${season().name}, hava ${({sun:'güneşli',cloud:'bulutlu',rain:'yağmurlu',snow:'karlı'})[state.weather]}.
Misafir: ${g.name}, ${g.T.name} (${PERSONA[g.type]||PERSONA.tourist}), ${ROOM_T[state.rooms[g.room].type].name} odada.
Örnek (kopyalama, yeni bir tane üret): "${base.s}"
Oda değişikliği ya da ücretsiz oda yükseltmesi konusu YAZMA (yükseltme sadece ücretli yapılır). Üç seçenek yaz: 0 = cömert ve masraflı çözüm, 1 = ilgili ama ucuz çözüm, 2 = kibarca reddetme. Her seçenek için misafirin kısa tepkisini de yaz.
SADECE JSON: {"durum":"misafirin sözü (en fazla 2 cümle)","secenekler":["0","1","2"],"tepkiler":["0","1","2"]}`);
  if(dilCur!==d) return;
  if(r&&clip(r.durum,220)&&Array.isArray(r.secenekler)&&r.secenekler.length===3&&Array.isArray(r.tepkiler)&&r.tepkiler.length===3&&r.secenekler.every(x=>clip(x,70))){
    d.s=clip(r.durum,220); d.o=r.secenekler.map(x=>clip(x,70)); d.r=r.tepkiler.map((x,i)=>clip(x,140)||d.r[i]); }
  showDilemma(d);
}
function dilCost(d,i){ return Math.round(roomRate(d.room)*DIL_FX[i].c*incomeMult()); }
function showDilemma(d){
  if(dilCur!==d) return; const g=d.g;
  if(modalWrap.classList.contains('show')){ setTimeout(()=>showDilemma(d),1500); return; }
  openModal(`<h3>🛎️ Oda ${d.room} <small style="font-size:13px;color:var(--muted)">${g.T.e} ${escH(g.name)}</small></h3>
    <div class="cb them" style="max-width:100%;margin:6px 0 10px">${escH(d.s)}</div>
    ${d.o.map((t,i)=>{ const c=dilCost(d,i); return `<button class="btn ${i===0?'gold':i===1?'':'ghost'} wide" data-dil="${i}" ${c>state.money?'disabled':''}>${DIL_FX[i].e} ${escH(t)}${c?` · ${fmt(c)} ₺`:''}</button>`; }).join('')}
    <p class="note">Cevap vermezsen misafir kırılır.</p>`,m=>{ m.querySelectorAll('[data-dil]').forEach(b=>b.onclick=()=>resolveDilemma(d,+b.dataset.dil)); });
  d.timer=setTimeout(()=>{ if(dilCur===d){ closeModal(); resolveDilemma(d,-1); } },25000);
}
function resolveDilemma(d,i){
  if(dilCur!==d) return; dilCur=null; clearTimeout(d.timer); closeModal();
  const g=d.g; if(!guests.includes(g)||g.room!==d.room) return;
  if(i<0){ g.sat=clamp(g.sat-6,0,100); fxEmoji(g.x,g.y+2.2,g.z,g.f,'😒'); toast(`${g.T.e} ${g.name} cevapsız kaldı · memnuniyet −6`,'bad'); return; }
  const F=DIL_FX[i], c=dilCost(d,i); if(c){ state.money-=c; }
  g.sat=clamp(g.sat+F.sat,0,100); if(F.rep) changeRep(F.rep*(g.T.rep||1));
  fxEmoji(g.x,g.y+2.2,g.z,g.f,i===0?'😍':i===1?'🙂':'😠'); sfx(i<2?'sparkle':'fail'); onGameEvent('chat',1);
  toast(`${g.T.e} “${d.r[i]}” · memnuniyet ${F.sat>0?'+':''}${F.sat}${c?` · −${fmt(c)} ₺`:''}`,i===2?'bad':null); markSave();
}

// ---------- otel danışmanı ----------
function ruleTips(){
  const t=[], P=hotelProgress(), dirty=roomsWhere(id=>state.rooms[id].dirty).length, broken=roomsWhere(id=>state.rooms[id].broken).length, st=state.staff, nR=nRoomsNow();
  if(dirty>=3&&st.clean.n<STAFF.clean.max) t.push([9,`🧹 ${dirty} kirli oda var: bir temizlikçi daha al, misafirler kapıda beklemesin.`]);
  if(broken>=2&&st.tech.n<STAFF.tech.max&&built('staff')) t.push([8,`🔧 ${broken} arızalı oda var: teknisyen işe al.`]);
  if(!st.rec.n&&built('staff')) t.push([8,'🛎️ Resepsiyonist al: sen odalarla uğraşırken misafirler kayıt olmaya devam eder.']);
  if(state.today.left>=2) t.push([8,`😤 Bugün ${state.today.left} misafir beklemekten sıkılıp gitti: Karşılama ve Sakinlik yeteneklerini yükselt.`]);
  const miss=starMissing(stars()+1); if(stars()<5&&miss.length) t.push([7,`⭐ ${stars()+1} yıldız için eksikler: ${miss.join(', ')}.`]);
  const op=openPads()[0]; if(op) t.push([6,`🏗️ Sıradaki en ucuz alan: ${op.label} (${fmt(op.cost-(state.paid[op.id]||0))} ₺).`]);
  const eco=roomsWhere(id=>state.rooms[id].type==='eco').length; if(eco>=4&&stars()>=2) t.push([6,`🛏️ ${eco} ekonomi odan var: birkaçını Deluxe'e yükseltmek geliri ciddi artırır.`]);
  if(state.money>upgCost('magnet')&&state.up.magnet<2) t.push([4,'🧲 Mıknatıs yükseltmesiyle parayı uzaktan toplarsın, çok zaman kazandırır.']);
  if(wagesToday()>0&&state.today.rooms<wagesToday()) t.push([7,'💸 Maaşlar oda gelirini geçiyor: fazla personeli değil, oda sayısını artır.']);
  if(state.done) t.push([10,'🚚 Otelin tamamlandı! Taşınıp 🗝️ anahtar kazan, miras bonusları al.']);
  if(!t.length) t.push([1,'👍 Her şey yolunda görünüyor. Günlük görevleri tamamlamayı unutma!']);
  return t.sort((a,b)=>b[0]-a[0]).map(x=>x[1]).slice(0,4);
}
let advCd=0, advBusy=false;
async function openAdvisor(){
  if(advBusy) return; const tips=ruleTips();
  const draw=(txt,note)=>openModal(`<h3>🧠 Otel danışmanı <button class="xbtn" id="advX" aria-label="Kapat">✖</button></h3><p class="sub">${city().e||''} ${city().name} · ${state.day}. gün · ${'★'.repeat(stars())}</p>${txt.map(t=>`<div class="row" style="font-weight:700;font-size:14px">${escH(t)}</div>`).join('')}<p class="note">${note}</p>`,m=>{ m.querySelector('#advX').onclick=closeModal; });
  const canAI=sampleFn&&aiState==='ready'&&performance.now()>advCd;
  draw(tips,canAI?'🧠 Danışman düşünüyor…':'Kural tabanlı analiz');
  if(!canAI) return; advBusy=true; advCd=performance.now()+45000;
  const r=await aiJSON(`Bir otel işletme oyununda oyuncunun deneyimli, samimi otel danışmanısın. Türkçe, kısa ve somut konuş.
Durum: ${city().name}, gün ${state.day}, para ${fmt(state.money)} ₺, ${stars()} yıldız (ün ${Math.round(state.rep)}/100), ${nRoomsNow()} oda, otel ilerlemesi %${Math.round(hotelProgress().p*100)}, personel: resepsiyon ${state.staff.rec.n}, temizlik ${state.staff.clean.n}, kat görevlisi ${state.staff.bell.n}, teknisyen ${state.staff.tech.n}. Bugün: ${state.today.guests} misafir, ${state.today.happy} mutlu, ${state.today.unhappy} mutsuz, ${state.today.left} bekleyip gitti. Günlük maaş ${fmt(wagesToday())} ₺.
Oyunun kendi analizi: ${tips.join(' | ')}
Bu analize dayanarak en önemli 3 öneriyi, her biri tek cümle ve başında uygun bir emoji olacak şekilde yaz. Oyunda olmayan özellik uydurma.
SADECE JSON: {"oneriler":["...","...","..."]}`);
  advBusy=false;
  const L=r&&Array.isArray(r.oneriler)?r.oneriler.map(x=>clip(x,200)).filter(Boolean).slice(0,3):null;
  if(modal.querySelector('#advX')) draw(L&&L.length?L:tips,L&&L.length?'🧠 Yapay zekâ danışman':'Kural tabanlı analiz');
}

// ---------- müfettiş raporu ----------
async function inspReport(g,mood){
  const score={happy:9,neutral:6,unhappy:3,left:1}[mood]||5, dirty=roomsWhere(id=>state.rooms[id].dirty).length, broken=roomsWhere(id=>state.rooms[id].broken).length;
  const facts=[mood==='left'?`Resepsiyonda ${Math.round(g.patMax)} saniyeden fazla bekledi ve ayrıldı.`:`Resepsiyonda ${Math.round(g.waited||0)} sn bekledi, ${g.lastRoomT||'standart'} odada kaldı, memnuniyet %${Math.round(g.sat)}.`,
    `Otelde şu an ${dirty} kirli, ${broken} arızalı oda var.`, `Otel ${stars()} yıldızlı, ${nRoomsNow()} odalı.`];
  const canned={happy:'Kusursuz hizmet, temiz odalar ve güler yüzlü personel. Kesinlikle tavsiye edilir.',neutral:'Genel olarak yeterli; bekleme süreleri ve oda bakımı geliştirilebilir.',unhappy:'Hizmet kalitesi beklentinin altında. Temizlik ve bakım acilen iyileştirilmeli.',left:'Resepsiyonda kabul edilemez bir bekleme yaşandı; değerlendirme yapılamadı.'}[mood]||'';
  let text=canned;
  const r=await aiJSON(`Bir otel işletme oyununda gizli otel müfettişisin. Resmi ama akıcı Türkçe ile 2-3 cümlelik kısa bir denetim raporu yaz. Puan: ${score}/10 (tonu buna uygun olsun). Gözlemler: ${facts.join(' ')} Otel: "${hotelName()}", ${city().name}.
SADECE JSON: {"rapor":"..."}`);
  if(r&&clip(r.rapor,400)) text=clip(r.rapor,400);
  state.reports=(state.reports||[]).concat([{d:state.day,s:score,t:text}]).slice(-10); logEvent(`🕵️ Müfettiş raporu (${score}/10): ${text}`); markSave();
  const show=()=>{ if(modalWrap.classList.contains('show')){ setTimeout(show,2000); return; }
    openModal(`<h3>🕵️ Denetim raporu</h3><p class="sub">${escH(hotelName())} · ${city().name} · ${state.day}. gün</p><div class="stat" style="text-align:center">Puan<b style="font-size:30px;color:${score>=7?'#9dffc0':score>=5?'var(--gold2)':'#ff9d8f'}">${score}/10</b></div><div class="cb them" style="max-width:100%;margin:10px 0">${escH(text)}</div><button class="btn wide" id="irOk">Tamam</button>`,m=>{ m.querySelector('#irOk').onclick=closeModal; }); };
  setTimeout(show,2800);
}

// ---------- gün sonu misafir yorumları ----------
let dayGuests=[];
function noteGuestDay(g,mood,left){ if(g.type==='insp') return; perfNote(g.sat,left);
  dayGuests.push({name:g.name,type:g.T.name,e:g.T.e,sat:Math.round(g.sat),left:!!left,room:g.lastRoomT||'',waited:Math.round(g.waited||0),chatted:!!g.chatted,gifted:!!g.gifted,persona:PERSONA[g.type]||PERSONA.tourist});
  if(dayGuests.length>40) dayGuests.shift(); }
function reviewStars(x){ return x.left?1:x.sat>=85?5:x.sat>=68?4:x.sat>=50?3:x.sat>=35?2:1; }
function pickReviewGuests(){ if(!dayGuests.length) return []; const L=dayGuests.slice().sort((a,b)=>a.sat-b.sat), out=[L[L.length-1]];
  if(L.length>1) out.push(L[0]); if(L.length>2){ const mid=L[1+Math.floor(Math.random()*(L.length-2))]; out.splice(1,0,mid); } return out; }
function cannedReview(x,st){ const n=x.name.split(' ')[0];
  const T={5:['Harika bir deneyimdi, kesinlikle tekrar geleceğim!','Personel çok ilgiliydi, oda tertemizdi. Tavsiye ederim.'],4:['Güzel bir konaklamaydı, birkaç küçük eksik dışında memnun kaldım.','Oda rahattı, fiyatına göre gayet iyi.'],
    3:['İdare eder. Biraz daha özen gösterilebilir.','Ne iyi ne kötü; beklediğim kadar.'],2:['Beklediğimin altında kaldı, oda ve hizmet vasattı.','Çok bekledim, pek memnun kalmadım.'],1:[x.left?'Resepsiyonda o kadar bekledim ki sonunda çıkıp gittim.':'Kötü bir deneyimdi, tavsiye etmem.','Hiç memnun kalmadım.']}[st];
  return rand(T)+(x.gifted&&st>=3?' Müdürün ikramı çok hoştu.':'')+(x.chatted&&st>=4?' Müdür bizzat ilgilendi!':''); }
function buildReviewPrompt(list){
  return `Bir otel işletme oyununda gün sonunda misafirlerin bıraktığı kısa internet yorumlarını yazıyorsun. Türkçe, doğal, samimi, her biri en fazla 2 kısa cümle. Emoji en fazla 1. Uygunsuz içerik yok. Verilen yıldız sayısına uygun ton kullan.
Otel: "${hotelName()}", ${city().name}, ${stars()} yıldızlı.
Misafirler:
${list.map((x,i)=>`${i}. ${x.name} (${x.type}; ${x.persona}). Yorum yıldızı: ${reviewStars(x)}/5. ${x.left?'Sırada çok bekleyip odaya girmeden gitti.':`Kaldığı oda: ${x.room||'standart'}. Memnuniyet %${x.sat}.`} ${x.waited>12?'Resepsiyonda uzun bekledi.':'Resepsiyonda fazla beklemedi.'}${x.chatted?' Müdür onunla sohbet etti.':''}${x.gifted?' Müdür ikram yaptı.':''}`).join('\n')}
SADECE şu JSON'u ver: {"reviews":[{"i":misafir numarası,"text":"yorum"}]}`; }
async function fillReviews(box){
  const list=pickReviewGuests(); dayGuests=[]; if(!list.length){ box.innerHTML='<p class="note">Bugün ayrılan misafir yok.</p>'; return; }
  const out=list.map(x=>({x,st:reviewStars(x),text:null}));
  const draw=()=>{ box.innerHTML=out.map(o=>`<div class="rev"><div class="rh">${o.x.e} <b>${escH(o.x.name)}</b> <span class="rs">${'★'.repeat(o.st)}${'☆'.repeat(5-o.st)}</span></div><div class="rt">${o.text?escH(o.text):'<i>yazıyor…</i>'}</div></div>`).join(''); };
  draw();
  if(sampleFn&&aiState==='ready'){ try{ const r=await sampleFn.json(buildReviewPrompt(list),{modelTier:'quick',cache:false});
      (r&&Array.isArray(r.reviews)?r.reviews:[]).forEach(v=>{ const o=out[+v.i]; if(o&&typeof v.text==='string'&&v.text.trim()) o.text=v.text.trim().slice(0,240); }); }catch(e){} }
  out.forEach(o=>{ if(!o.text) o.text=cannedReview(o.x,o.st); }); draw();
  let dr=0; out.forEach(o=>{ dr+=o.st===5?0.5:o.st<=2?-0.5:0; }); if(dr) changeRep(dr);
  state.reviews=(state.reviews||[]).concat(out.map(o=>({n:o.x.name,e:o.x.e,s:o.st,t:o.text,d:state.day-1}))).slice(-15); markSave();
}
function pickGuestAt(sx,sy){
  const list=guests.filter(g=>g.c.root.visible&&g.state!=='leave'), roots=list.map(g=>g.c.root);
  const hits=ray.intersectObjects(roots,true); if(!hits.length) return null;
  let o=hits[0].object; while(o&&!roots.includes(o)) o=o.parent; return o?list[roots.indexOf(o)]:null;
}

// ---------- per-frame + boot hooks ----------
function updateFeatures(dt,t){
  updateRoof(t,dt); updateHeli(dt*gameSpeed,t);
  if(fpMode&&player) player.c.root.visible=false;
  guests.forEach(g=>{ if(g.type==='influencer'&&(g.state==='amen'||g.state==='queue')&&Math.random()<dt*0.12) fxEmoji(g.x,g.y+2.1,g.z,g.f,'📸'); if(g.state==='queue'&&Math.random()<dt*0.2){ const r=g.pat/g.patMax, e=g.type==='grumpy'?(r<0.7?'💢':'😤'):r<0.3?'😠':r<0.55?'😐':null; if(e) fxEmoji(g.x,g.y+2.3,g.z,g.f,e); }
    if(g.type==='athlete'&&g.state==='amen'&&g.seat&&g.seat.amen==='gym'&&Math.random()<dt*0.3) fxEmoji(g.x,g.y+2.1,g.z,g.f,'💪');
    if(g.type==='dog'&&g.path&&Math.random()<dt*0.25) fxEmoji(g.x-0.5,g.y+0.9,g.z,g.f,'🐾');
    if(g.lucky&&Math.random()<dt*2) fxEmoji(g.x+rnd(-0.3,0.3),g.y+rnd(0.8,1.9),g.z,g.f,'✨'); });
  if(sheetMode==='chat') renderChatSheet();
  updateDilemmas(dt*gameSpeed);
}
function bootFeatures(){
  const T=THEMES[themeKey()]; if(T) applyHotelTheme();
  window.addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT') return; if(e.key==='v'||e.key==='V') toggleFP(); });
  $('fpBtn').onclick=()=>toggleFP();
}
