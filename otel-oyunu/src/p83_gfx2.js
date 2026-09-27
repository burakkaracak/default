
// =====================================================================
// GRAPHICS 2: fireworks, LED facade, morning fog, rain puddles, facial
// expressions, cinematic camera, TV glow in rooms, butterflies, snowy
// hedges, summer cicadas
// =====================================================================

// ---------- fireworks ----------
const FW_COLS=[0xff5a5a,0xffd24a,0x5ad2ff,0x9dff7a,0xff7ad9,0xffffff,0xffa040];
function fireworksAt(x,y,z){
  const col=rand(FW_COLS), col2=rand(FW_COLS), n=36;
  const rk=new THREE.Mesh(sph(0.07,6,4),new THREE.MeshBasicMaterial({color:0xfff3c0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  rk.position.set(x,y-7,z); world.add(rk); fx3.push({m:rk,v:new THREE.Vector3(0,9.2,0),life:0.75,max:0.75,g:3,drag:1});
  setTimeout(()=>{ for(let i=0;i<n;i++){ const th=Math.random()*Math.PI*2, ph=Math.acos(rnd(-1,1)), sp=rnd(3.2,4.6);
      const m=new THREE.Mesh(sph(0.075,5,4),new THREE.MeshBasicMaterial({color:i%3?col:col2,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
      m.position.set(x,y,z); world.add(m); fx3.push({m,v:new THREE.Vector3(Math.sin(ph)*Math.cos(th)*sp,Math.cos(ph)*sp,Math.sin(ph)*Math.sin(th)*sp),life:1.7,max:1.7,g:2.2,drag:0.975,twinkle:true}); }
    if(Sound.ctx&&state.sound!==false){ noiseBurst(0.5,0.1,300); tone(rnd(900,1400),0.25,'sine',0.02,0.05,null,rnd(300,500)); } },750);
}
function fwSpot(){ return [cam.tx+rnd(-7,7),cam.ty+rnd(8,11),cam.tz+rnd(-9,-4)]; }
function fireworksShow(){ for(let k=0;k<8;k++) setTimeout(()=>fireworksAt(...fwSpot()),k*420); }
let fwT=2;
function updateFireworks(dt){
  if(!festivalOn()||nightF<0.45||fpMode||state.lowFx) return;
  fwT-=dt; if(fwT>0) return; fwT=rnd(1.2,2.8); fireworksAt(...fwSpot());
}

// ---------- LED facade (luxury purchase) ----------
let ledStrips=null;
function buildLed(){
  const G=floorRoot(0), g=new THREE.Group(); G.add(g); const m=new THREE.MeshBasicMaterial({color:0xff00aa});
  const n=floorsBuilt(), top=(n-1)*FH+2.8;
  g.add(mesh(box(14.2,0.12,0.12),m,0,2.78,7.66)); g.add(mesh(box(3.5,0.12,0.12),m,0,3.05,8.96));
  [[-7.12,7.66],[7.12,7.66]].forEach(([x,z])=>g.add(mesh(box(0.12,2.7,0.12),m,x,1.4,z)));
  [[-7.12,2.8],[7.12,2.8]].forEach(([x,z])=>g.add(mesh(box(0.12,top,0.12),m,x,top/2,z)));
  for(let f=1;f<n;f++) g.add(mesh(box(14.2,0.12,0.12),m,0,f*FH+0.02,2.86));
  ledStrips={g,m};
}
function updateLed(t){ if(!ledStrips) return; const on=nightF>0.3&&!powerOut(); ledStrips.g.visible=on; if(on) ledStrips.m.color.setHSL((t*0.08)%1,0.9,0.55); }

// ---------- morning fog (autumn/winter or cloudy mornings) ----------
function updateFog(){
  const h=hourNow(), si=seasonIx(), want=(si>=2||state.weather!=='sun')&&h>=6&&h<9.5?(1-Math.abs(h-7.3)/2.2):0, k=clamp(want,0,1)*(state.weather==='snow'?1.2:1);
  scene.fog.near=lerp(48,14,k); scene.fog.far=lerp(110,58,k);
}

// ---------- rain puddles ----------
let puddles=[];
function buildPuddles(){
  const pm=new THREE.MeshBasicMaterial({map:tex('puddle'),transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  [[-9,8.9,0.035],[-3,8.7,0.035],[4,9.1,0.035],[10,8.8,0.035],[0,10.5,0.035],[-12,12.3,0.075],[-5,12.1,0.075],[3,12.4,0.075],[9,12.2,0.075],[14,12.3,0.075],[-7,15.2,0.03],[6,14.9,0.03]].forEach(([x,z,y])=>{
    const m=new THREE.Mesh(plane(rnd(1.1,1.8),rnd(0.8,1.2)),pm); m.rotation.x=-Math.PI/2; m.rotation.z=rnd(0,3); m.position.set(x,y,z); outdoor.add(m); puddles.push(m); });
  puddles.mat=pm;
}
function updatePuddles(){ if(puddles.mat) puddles.mat.opacity=clamp(wetF,0,1)*0.55; }

// ---------- facial expressions ----------
function addFace(head){
  const dm=mat(0x3a1f1a,{roughness:.6}), f={};
  f.smile=mesh(new THREE.TorusGeometry(0.05,0.012,5,10,Math.PI),dm,0,-0.07,0.245); f.smile.rotation.z=Math.PI; head.add(f.smile);
  f.frown=mesh(new THREE.TorusGeometry(0.045,0.012,5,10,Math.PI),dm,0,-0.1,0.245); head.add(f.frown); f.frown.visible=false;
  f.flat=mesh(box(0.07,0.014,0.01),dm,0,-0.08,0.25); head.add(f.flat); f.flat.visible=false;
  f.brows=[-1,1].map(sd=>{ const b=mesh(box(0.07,0.014,0.01),dm,0.09*sd,0.1,0.235); b.rotation.z=sd*0.35; head.add(b); b.visible=false; return b; });
  f.cur='smile'; return f;
}
function setFace(c,m){ const f=c.face; if(!f||f.cur===m) return; f.cur=m; f.smile.visible=m==='smile'; f.frown.visible=m==='frown'; f.flat.visible=m==='flat'; f.brows.forEach(b=>b.visible=m==='frown'); }
function faceFor(e){
  if(e===player) return 'smile';
  if(e instanceof Guest){ if(e.state==='queue'){ const r=e.pat/e.patMax; return r<0.3?'frown':r<0.6?'flat':'smile'; } return e.sat>=68?'smile':e.sat>=42?'flat':'frown'; }
  if(e.kind) return (e.energy??100)<30?'frown':'smile';
  return 'smile';
}

// ---------- cinematic camera ----------
let cine=null;
function cinematic(dur=3.4){ if(fpMode||cine||state.lowFx) return; cine={t:0,dur,yaw0:cam.yaw,dist0:cam.dist}; }
function updateCine(dt){
  if(!cine) return; cine.t+=dt; const k=cine.t/cine.dur, e=Math.sin(Math.min(1,k)*Math.PI);
  cam.yaw=cine.yaw0+Math.sin(k*Math.PI*2)*0.55*e; cam.dist=cine.dist0*(1-0.28*e);
  if(k>=1){ cam.yaw=cine.yaw0; cam.dist=cine.dist0; cine=null; }
}

// ---------- TV glow in deluxe rooms ----------
function addTvGlow(G,parts){ const m=new THREE.MeshBasicMaterial({map:tex('glow'),color:0x6fb4ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const p=mesh(plane(1.6,1.6),m,0.95,0.06,0); p.rotation.x=-Math.PI/2; G.add(p); parts.tv=p; }
function updateTvGlow(t){
  for(const k in state.rooms){ const R=RT(+k), P=R.parts; if(!P||!P.tv) continue;
    const g=R.guest, on=g&&g.inRoom&&!g.asleep&&nightF>0.15&&!powerOut(); P.tv.visible=!!on;
    if(on) P.tv.material.opacity=0.35+0.25*Math.abs(Math.sin(t*7+(+k)))*Math.abs(Math.sin(t*2.3+(+k)*0.7)); }
}

// ---------- butterflies (spring) & snow on hedges (winter) & cicadas (summer) ----------
let flies=[], hedgeSnow=null, cicadaT=3;
function buildNature(){
  for(let i=0;i<7;i++){ const g=new THREE.Group(), m=new THREE.MeshBasicMaterial({color:rand([0xffd24a,0xff9ad5,0xffffff,0x9ad2ff]),side:THREE.DoubleSide});
    const w1=mesh(plane(0.16,0.12),m,-0.08,0,0), w2=mesh(plane(0.16,0.12),m,0.08,0,0); w1.rotation.x=w2.rotation.x=-Math.PI/2;
    const p1=new THREE.Group(), p2=new THREE.Group(); p1.add(w1); p2.add(w2); g.add(p1,p2); outdoor.add(g);
    flies.push({g,p1,p2,cx:rnd(-14,14),cz:rnd(8.4,10.8),r:rnd(0.6,1.6),sp:rnd(0.6,1.2),ph:rnd(0,6)}); }
  hedgeSnow=new THREE.Group(); outdoor.add(hedgeSnow); const sm=mat(0xffffff,{roughness:1});
  [[-17.5,-1.5],[1.5,17.5]].forEach(([a,b])=>hedgeSnow.add(mesh(rbox(b-a,0.1,0.46,.05),sm,(a+b)/2,0.63,11.35)));
}
function updateNature(dt,t){
  const si=seasonIx(), spring=si===0&&nightF<0.5&&state.weather!=='rain';
  flies.forEach(f=>{ f.g.visible=spring; if(!spring) return; const a=t*f.sp+f.ph;
    f.g.position.set(f.cx+Math.cos(a)*f.r,0.8+Math.sin(t*2+f.ph)*0.35,f.cz+Math.sin(a*1.3)*f.r*0.6); f.g.rotation.y=-a; const fl=Math.sin(t*18+f.ph)*0.9; f.p1.rotation.z=fl; f.p2.rotation.z=-fl; });
  if(hedgeSnow) hedgeSnow.visible=isWinter()&&city().snow;
  if(si===1&&nightF<0.3&&Sound.ctx&&state.sound!==false&&viewFloor===0&&!fpMode){ cicadaT-=dt; if(cicadaT<=0){ cicadaT=rnd(4,9); for(let k=0;k<6;k++) tone(rnd(4200,5200),0.05,'square',0.004,k*0.07); } }
}

// ---------- hooks ----------
function updateGfx2(dt,t){ updateFireworks(dt); updateLed(t); updateFog(); updatePuddles(); updateTvGlow(t); updateNature(dt,t); updateCine(dt); }
function bootGfx2(){ buildPuddles(); buildNature(); if(state.lux&&state.lux.led) buildLed(); }
