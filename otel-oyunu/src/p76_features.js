
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
  CHORDS.length=0; T.chords.forEach(ch=>CHORDS.push(ch));
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
    if(g.state==='amen'&&g.seat) where+=` Şu an ${({rest:'restoranda yemek yiyorsun',pool:'havuzdasın',gym:'spor salonundasın',roof:'çatıdaki sky bar ve havuzdasın'})[g.seat.amen]}.`; }
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
{"reply":"misafirin cevabı","mood":tam sayı -8 ile 8 arası (müdürün bu mesajı seni ne kadar memnun etti; kaba ise eksi, ilgili ve çözüm odaklı ise artı)}`;
}
function cannedReply(g,msg){
  const m=msg.toLocaleLowerCase('tr-TR'), good=/(hoş ?geldin|nasıl|yardım|özür|indirim|ikram|hediye|teşekkür|rica|hemen|çözeceğ|memnun)/.test(m), bad=/(salak|aptal|git|sus|defol|umurumda)/.test(m);
  const low=g.sat<42, hi=g.sat>=68;
  const lines=bad?['Bu nasıl bir konuşma şekli? Hiç hoş değil.','Açıkçası kırıldım, böyle bir muameleyi beklemezdim.']
    :low?['İyi niyetiniz için teşekkürler ama beklediğim hizmeti alamadım.','Umarım durum bir an önce düzelir, biraz sabrım kaldı.']
    :hi?['Harika bir otel! Her şey çok güzel, teşekkür ederim.','Burada kendimi evimde gibi hissediyorum, eline sağlık!']
    :['Fena değil, idare eder. Biraz daha ilgi hoş olurdu.','Teşekkürler, şimdilik her şey yolunda gibi.'];
  return {reply:rand(lines),mood:bad?-6:good?(low?3:4):1};
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
    const msgs=g.chat.map(m=>`<div class="cb ${m.who}">${escH(m.text)}</div>`).join('')+(chatBusy?'<div class="cb them typing">yazıyor…</div>':'');
    const chips=['Hoş geldiniz! Nasılsınız?','Bir isteğiniz var mı?','Odanız nasıl?','Size bir ikram yapalım 🎁'];
    sheet.innerHTML=`<h3><span id="chHead"></span><button class="xbtn" data-close aria-label="Kapat">✖</button></h3><p class="sub" id="chSub"></p>
      <div class="chat" id="chLog">${msgs||'<div class="note">Misafire bir şey söyle. Cevabı ve ruh hâli söylediklerine göre değişir.</div>'}</div>
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
      if(r&&typeof r.reply==='string'&&r.reply.trim()) res={reply:r.reply.trim().slice(0,400),mood:clamp(Math.round(+r.mood||0),-8,8)};
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
  g.chat.push({who:'them',text:res.reply}); chatBusy=false;
  fxEmoji(g.x,g.y+2.2,g.z,g.f,d>=4?'😊':d<=-4?'😠':'💬'); sfx(d>=4?'sparkle':d<=-4?'fail':'req');
  renderSheet();
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
}
function bootFeatures(){
  const T=THEMES[themeKey()]; if(T) applyHotelTheme();
  window.addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT') return; if(e.key==='v'||e.key==='V') toggleFP(); });
  $('fpBtn').onclick=()=>toggleFP();
}
