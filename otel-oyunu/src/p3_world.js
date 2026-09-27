
// =====================================================================
// WORLD ROOTS
// =====================================================================
const world=new THREE.Group(); scene.add(world);
const outdoor=new THREE.Group(); world.add(outdoor);
const floorRoots=[];
function floorRoot(f){ if(!floorRoots[f]){ const g=new THREE.Group(); g.position.y=f*FH; world.add(g); floorRoots[f]=g; } return floorRoots[f]; }
const anims=[];   // pop-in animations
function popIn(obj,delay=0){ obj.scale.setScalar(0.001); anims.push({obj,t:-delay,dur:.6}); }
const easeOutBounce=t=>{ const n=7.5625,d=2.75; if(t<1/d) return n*t*t; if(t<2/d) return n*(t-=1.5/d)*t+.75; if(t<2.5/d) return n*(t-=2.25/d)*t+.9375; return n*(t-=2.625/d)*t+.984375; };
// build juice: children drop from the sky one after another, bounce, then a dust ring + thud
function dropIn(G){
  const bb=new THREE.Box3().setFromObject(G), c=bb.getCenter(new THREE.Vector3()), sz=bb.getSize(new THREE.Vector3());
  const spot=bb.isEmpty()?null:{x:c.x,y:bb.min.y,z:c.z,r:clamp(Math.max(sz.x,sz.z)/2,0.6,2.4)};
  const kids=G.children.slice(), many=kids.length>28, list=many?[G]:kids, step=Math.min(0.07,0.9/Math.max(1,list.length));
  list.forEach((o,i)=>{ o.scale.setScalar(0.001); anims.push({obj:o,t:-i*step,dur:.7,drop:true,y0:o.position.y,land:i===list.length-1?spot:null}); });
}
function updateAnims(dt){
  for(let i=anims.length-1;i>=0;i--){ const a=anims[i]; a.t+=dt; if(a.t<0) continue;
    const k=Math.min(1,a.t/a.dur);
    if(a.drop){ a.obj.position.y=a.y0+3.2*(1-easeOutBounce(k)); a.obj.scale.setScalar(Math.max(0.001,easeOutBack(Math.min(1,k*1.8))));
      if(a.land&&k>=0.36&&!a.landed){ a.landed=true; buildThud(a.land); } }
    else a.obj.scale.setScalar(Math.max(0.001,easeOutBack(k)));
    if(k>=1){ a.obj.scale.setScalar(1); if(a.drop) a.obj.position.y=a.y0; anims.splice(i,1); } }
}
function applyTheme(){ const c=city(); M.facade.color.setHex(c.facade); M.trim.color.setHex(c.trim); M.accent.color.setHex(c.accent); }

// ---------- reusable props ----------
const treeMats=[0x3f7a3e,0x4f8d46,0x346b37].map(c=>mat(c,{flatShading:true,roughness:.9}));
function tree(parent,x,z,s=1,cols){
  const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(s);
  g.add(mesh(cyl(0.11,0.17,1.3,8),mat(0x6b4a30),0,0.65,0,true));
  [[0,1.75,0,.78],[.36,1.45,.2,.55],[-.32,1.5,-.15,.6],[0,2.25,0,.52],[.1,1.6,-.38,.5]].forEach(([a,b,c,r],k)=>g.add(mesh(new THREE.IcosahedronGeometry(r,1),cols?mat(cols[k%3],{flatShading:true}):treeMats[k%3],a,b,c,true)));
  g.add(blob(0.9)); parent.add(g); g.userData.ph=Math.random()*6; SWAY.push(g); return g;
}
const SWAY=[];
function palm(parent,x,z,s=1){
  const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(s);
  const trunk=mat(0x9b7a52,{roughness:.95});
  for(let i=0;i<6;i++){ const m=mesh(cyl(0.12-i*0.008,0.14-i*0.008,0.5,8),trunk,Math.sin(i*.35)*0.12*i*.3,0.25+i*0.48,0,true); m.rotation.z=-0.06*i; g.add(m); }
  const leaf=mat(0x3f8f3a,{side:THREE.DoubleSide,flatShading:true});
  for(let k=0;k<7;k++){ const lf=mesh(cone(0.28,1.7,4),leaf,0,0,0,true); const a=k/7*Math.PI*2; lf.position.set(0.5+Math.cos(a)*0.62,3.0,Math.sin(a)*0.62); lf.rotation.set(Math.sin(a)*1.25,0,-Math.cos(a)*1.25); lf.scale.set(1,1,0.25); g.add(lf); }
  g.add(mesh(sph(0.1,8,6),mat(0x6b4a2a),0.45,2.95,0.1)); g.add(blob(0.8)); parent.add(g); g.userData.ph=Math.random()*6; SWAY.push(g); return g;
}
function bigPlant(parent,x,z,s=1,y=0){
  const g=new THREE.Group(); g.position.set(x,y,z); g.scale.setScalar(s);
  g.add(mesh(cyl(0.22,0.17,0.45,14),mat(0xc9793f),0,0.225,0,true)); g.add(mesh(cyl(0.21,0.21,0.03,14),mat(0x3b2a1e),0,0.44,0));
  const l1=mat(0x3f7a4a), l2=mat(0x5a9a52);
  for(let k=0;k<7;k++){ const a=k/7*Math.PI*2; g.add(mesh(sph(0.19,10,8),k%2?l1:l2,Math.cos(a)*0.15,0.66+Math.random()*0.25,Math.sin(a)*0.15,true)); }
  g.add(mesh(sph(0.22,10,8),l1,0,0.95,0,true)); parent.add(g); return g;
}
function flowerBed(parent,x0,x1,z0,z1){
  const g=new THREE.Group();
  g.add(mesh(box(x1-x0,0.22,z1-z0),mat(0xb9a58a),(x0+x1)/2,0.11,(z0+z1)/2,true));
  g.add(mesh(box(x1-x0-0.12,0.05,z1-z0-0.12),mat(0x5a3d28),(x0+x1)/2,0.23,(z0+z1)/2));
  const cols=[0xe0574f,0xf2b632,0xf7f0f5,0xc36bd9,0xff8fb1];
  for(let x=x0+0.2;x<x1-0.1;x+=0.32) for(let z=z0+0.18;z<z1-0.1;z+=0.3){
    g.add(mesh(sph(0.07,6,5),mat(0x4f8d46),x,0.3,z)); g.add(mesh(sph(0.055,6,5),mat(rand(cols)),x+rnd(-.05,.05),0.38,z+rnd(-.05,.05))); }
  parent.add(g); return g;
}
function bench(parent,x,z,rot=0){
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot;
  const w=tmat('wood',1,1);
  for(let i=0;i<3;i++) g.add(mesh(rbox(1.5,0.05,0.13,.02),w,0,0.45,-0.15+i*0.15,true));
  for(let i=0;i<2;i++) g.add(mesh(rbox(1.5,0.12,0.05,.02),w,0,0.62+i*0.16,-0.25,true));
  [-0.62,0.62].forEach(a=>{ g.add(mesh(box(0.06,0.45,0.4),M.dark,a,0.22,-0.05)); g.add(mesh(box(0.06,0.5,0.05),M.dark,a,0.65,-0.26)); });
  parent.add(g); return g;
}
const streetGlows=[];
function lampPost(parent,x,z){
  parent.add(mesh(cyl(0.05,0.08,2.9,8),M.dark,x,1.45,z,true));
  parent.add(mesh(cyl(0.16,0.16,0.08,10),M.dark,x,2.95,z));
  parent.add(mesh(sph(0.15,12,8),M.lampOn,x,2.8,z));
  const g=glowDecal(1.7,x,z,0.085); parent.add(g); streetGlows.push(g);
}
function stanchion(parent,x,z){ parent.add(mesh(cyl(0.035,0.035,0.9,8),M.gold,x,0.45,z,true)); parent.add(mesh(sph(0.06,8,6),M.gold,x,0.93,z)); parent.add(mesh(cyl(0.14,0.16,0.04,12),M.gold,x,0.02,z)); }

// =====================================================================
// GROUND, YARD, STREET, CITY BACKDROP
// =====================================================================
let groundMesh, snowCover;
const cars=[], balloons=[], boats=[], birds=[];
function buildGround(){
  const c=city();
  groundMesh=mesh(plane(240,240),tmat(c.ground,80,80),0,-0.03,0); groundMesh.rotation.x=-Math.PI/2; outdoor.add(groundMesh);
  snowCover=mesh(plane(240,240),new THREE.MeshStandardMaterial({color:0xf4f7fa,transparent:true,opacity:.72,roughness:1}),0,-0.015,0);
  snowCover.rotation.x=-Math.PI/2; snowCover.visible=false; outdoor.add(snowCover);
  const pave=(x0,x1,z0,z1)=>outdoor.add(mesh(box(x1-x0,0.04,z1-z0),tmat('paving',(x1-x0)/2,(z1-z0)/2),(x0+x1)/2,0.0,(z0+z1)/2));
  pave(-13.4,13.4,8.3,9.5); pave(-12.8,-11.2,7.2,8.3); pave(11.2,12.8,7.2,8.3); pave(-1.3,1.3,7.6,8.3); pave(-1.3,1.3,9.5,11.6);
  // sidewalk, curb, road
  outdoor.add(mesh(box(140,0.08,1.3),tmat('concrete',70,0.65),0,0.02,12.25));
  outdoor.add(mesh(box(140,0.16,0.14),mat(0xb2aa9c),0,0.06,12.95));
  outdoor.add(mesh(box(140,0.04,4.4),tmat('asphalt',40,1.4),0,-0.005,15.2));
  for(let x=-68;x<70;x+=4) outdoor.add(mesh(box(1.8,0.01,0.14),mat(0xf2efe6),x,0.02,15.2));
  outdoor.add(mesh(box(140,0.08,1.4),tmat('concrete',70,0.7),0,0.02,18.1));
  // hedges with a gap at the main path
  const hedge=mat(0x3f7a3e,{roughness:.95});
  [[-17.5,-1.5],[1.5,17.5]].forEach(([a,b])=>outdoor.add(mesh(rbox(b-a,0.6,0.42,.14),hedge,(a+b)/2,0.3,11.35,true)));
  flowerBed(outdoor,-6.6,-1.7,7.7,8.2); flowerBed(outdoor,1.7,6.6,7.7,8.2);
  buildFountain(-4.3,10.25); scatterFlowers();
  [[4.3,10.2],[-8.7,10.4],[8.7,10.4],[-15.6,10.2],[15.6,10.2]].forEach(([x,z],k)=>{ if(city().palm) palm(outdoor,x,z,1.05); else tree(outdoor,x,z,0.95+(k%3)*0.08); });
  [[-2.1,10.9],[2.1,10.9],[-10.5,10.9],[10.5,10.9]].forEach(([x,z])=>lampPost(outdoor,x,z));
  bench(outdoor,-6.4,10.9,Math.PI); bench(outdoor,6.4,10.9,Math.PI);
  // side lawns trees (behind amenities)
  [[-17.2,-6],[-17.3,2],[17.3,-7],[17.3,1.5]].forEach(([x,z])=>{ if(city().palm) palm(outdoor,x,z); else tree(outdoor,x,z,1.1); });
  // cars
  const carCols=[0xc0392b,0xf1c40f,0x2c3e50,0xecf0f1,0x2e86c1,0x27ae60];
  for(let i=0;i<6;i++) makeCar(carCols[i],i%2?-1:1,i%2?15.95:14.6);
  buildBackdrop();
}
function makeCar(color,dir,z){
  const g=new THREE.Group(); g.position.set(-45+Math.random()*90,0,z);
  const body=mat(color,{metalness:.45,roughness:.3});
  g.add(mesh(rbox(1.95,0.44,0.95,.16),body,0,0.4,0,true));
  g.add(mesh(rbox(1.08,0.38,0.86,.15),mat(0x22303c,{metalness:.6,roughness:.12}),-0.12,0.76,0,true));
  [-0.62,0.62].forEach(x=>[-0.44,0.44].forEach(zz=>{ const w=mesh(cyl(0.18,0.18,0.14,14),M.dark,x,0.18,zz); w.rotation.x=Math.PI/2; g.add(w); }));
  [-0.3,0.3].forEach(zz=>g.add(mesh(sph(0.06,8,6),M.lampOn,0.98,0.44,zz)));
  const sh=blob(1.15); sh.scale.set(1,0.55,1); g.add(sh);
  g.rotation.y=dir>0?0:Math.PI; outdoor.add(g); cars.push({g,dir,speed:3+Math.random()*2.5});
}
let fountain=null;
function buildFountain(x,z){
  const g=new THREE.Group(); g.position.set(x,0,z); outdoor.add(g); const S=new THREE.Group();
  const stone=mat(0xe9e1d2,{roughness:.8}), stone2=mat(0xd2c6b0,{roughness:.85});
  S.add(mesh(cyl(1.0,1.05,0.36,28),stone,0,0.18,0,true)); S.add(mesh(cyl(0.9,0.9,0.02,28),mat(0x3d6f8f),0,0.3,0));
  S.add(mesh(new THREE.TorusGeometry(0.97,0.06,6,28),stone2,0,0.37,0)); S.children[S.children.length-1].rotation.x=Math.PI/2;
  S.add(mesh(cyl(0.12,0.16,0.8,12),stone,0,0.6,0,true)); S.add(mesh(cyl(0.42,0.2,0.14,20),stone,0,1.02,0,true));
  S.add(mesh(cyl(0.07,0.09,0.32,10),stone,0,1.24,0)); S.add(mesh(sph(0.1,10,8),M.gold,0,1.42,0));
  g.add(bake(S));
  const wm=new THREE.MeshStandardMaterial({map:tex('water',1,1),transparent:true,opacity:.8,roughness:.05,metalness:.1,emissive:0x0b5a8a,emissiveIntensity:.3,depthWrite:false});
  const water=mesh(cyl(0.9,0.9,0.02,28),wm,0,0.33,0); g.add(water);
  const top=mesh(cyl(0.38,0.38,0.02,20),wm,0,1.08,0); g.add(top);
  const dm=new THREE.MeshBasicMaterial({color:0xcfeaff,transparent:true,opacity:.8});
  const drops=[]; for(let k=0;k<16;k++){ const d=mesh(sph(0.03,5,4),dm,0,1.3,0); d.userData={a:k/16*Math.PI*2,ph:(k*0.37)%1}; g.add(d); drops.push(d); }
  fountain={g,water,drops,tex:wm.map};
  addCols('fountain',[[0,x-1.0,x+1.0,z-1.0,z+1.0]]);
}
function updateFountain(t){
  if(!fountain) return; fountain.tex.offset.x=t*0.05; fountain.tex.offset.y=t*0.03;
  fountain.drops.forEach(d=>{ const u=d.userData, k=(t*0.8+u.ph)%1, r=0.1+k*0.6; d.position.set(Math.cos(u.a)*r,1.42+Math.sin(k*Math.PI)*0.35-k*1.05,Math.sin(u.a)*r); });
}
function scatterFlowers(){
  const S=new THREE.Group(), cols=[0xe0574f,0xf2b632,0xf7f0f5,0xc36bd9,0xff8fb1,0x6fa8ff], leaf=mat(0x4f8d46);
  const zones=[[-12.5,-6.2,9.7,11.0],[-2.8,-1.7,9.7,11.0],[1.7,3.4,9.7,11.0],[5.4,12.5,9.7,11.0],[-17,-16.3,-9,6],[16.3,17,-9,6]];
  for(let i=0;i<70;i++){ const zn=zones[i%zones.length], x=rnd(zn[0],zn[1]), z=rnd(zn[2],zn[3]);
    if(Math.abs(x+4.3)<1.3&&Math.abs(z-10.25)<1.3) continue;
    const c=mat(rand(cols)); for(let k=0;k<3;k++){ const a=rnd(0,6.28), r=rnd(0.03,0.12);
      S.add(mesh(cyl(0.008,0.008,0.14,4),leaf,x+Math.cos(a)*r,0.07,z+Math.sin(a)*r)); S.add(mesh(sph(0.04,6,4),c,x+Math.cos(a)*r,0.15,z+Math.sin(a)*r)); } }
  for(let i=0;i<60;i++){ const zn=zones[i%zones.length]; const t=mesh(cone(0.05,0.14,4),mat(0x5f9a4a,{flatShading:true}),rnd(zn[0],zn[1]),0.06,rnd(zn[2],zn[3])); S.add(t); }
  outdoor.add(bake(S));
}
function buildBackdrop(){
  const bd=city().bd||'bos', name=bd==='bos'?'İstanbul':'Antalya', B=new THREE.Group(); outdoor.add(B);
  if(bd==='paris'||bd==='dubai'){ buildSkyline(B,bd); for(let i=0;i<5;i++) makeBird(); return; }
  if(bd==='bos'||bd==='beach'||bd==='aegean'){
    const sea=mesh(plane(260,80),new THREE.MeshStandardMaterial({map:tex('sea',26,8),roughness:.2,metalness:.1}),0,-0.12,-54); sea.rotation.x=-Math.PI/2; B.add(sea); seaTex=sea.material.map;
    if(name==='İstanbul'){
      B.add(mesh(box(260,0.7,1.2),mat(0x9a917f),0,0.2,-15.4,true));      // stone quay
      B.add(mesh(box(260,0.4,4),tmat('paving',80,2),0,0.1,-13.4));
      for(let x=-30;x<32;x+=3) B.add(mesh(cyl(0.06,0.06,0.9,6),M.dark,x,0.6,-14.9));
      // far shore with a mosque, a tower and houses
      const shore=mat(0x6f8a6a,{flatShading:true}), stoneM=mat(0xd9d2c4), roofM=mat(0x7d8b95,{metalness:.2});
      B.add(mesh(box(260,2,20),shore,0,0.2,-90));
      const mosque=new THREE.Group(); mosque.position.set(-10,0,-74); B.add(mosque);
      mosque.add(mesh(box(10,3,8),stoneM,0,1.5,0)); mosque.add(mesh(new THREE.SphereGeometry(3.6,20,12,0,Math.PI*2,0,Math.PI/2),roofM,0,3,0));
      [[-3.8,0],[3.8,0]].forEach(([x])=>mosque.add(mesh(new THREE.SphereGeometry(1.6,14,8,0,Math.PI*2,0,Math.PI/2),roofM,x,3,2.2)));
      [[-6,-4],[6,-4],[-6,4],[6,4]].forEach(([x,z])=>{ mosque.add(mesh(cyl(0.35,0.4,11,10),stoneM,x,5.5,z)); mosque.add(mesh(cone(0.45,2.2,10),roofM,x,12.1,z)); });
      const tower=new THREE.Group(); tower.position.set(15,0,-68); B.add(tower);
      tower.add(mesh(cyl(1.6,1.8,11,14),mat(0xcbb89a),0,5.5,0)); tower.add(mesh(cyl(2,2,0.6,14),mat(0x8f5a3c),0,11.2,0)); tower.add(mesh(cone(1.9,3.4,14),roofM,0,13.2,0));
      for(let i=0;i<22;i++){ const h=rnd(1.5,4.5); B.add(mesh(box(rnd(1.5,3),h,rnd(1.5,3)),mat(rand([0xe8d8c0,0xd9a07a,0xf2e3c7,0xc98e6b])),rnd(-60,60),h/2,rnd(-86,-80))); }
      for(let i=0;i<3;i++) makeBoat(B,i);
    } else {
      B.add(mesh(box(260,0.06,8.5),tmat('sand',60,3),0,0.0,-17.5));
      for(let i=0;i<9;i++) palm(B,-24+i*6+rnd(-1,1),-15.6+rnd(-0.8,0.8),rnd(.9,1.2));
      for(let i=0;i<7;i++){ const x=-18+i*6; const u=new THREE.Group(); u.position.set(x,0,-18.5); u.add(mesh(cyl(0.04,0.04,2.1,6),M.white,0,1.05,0)); u.add(mesh(cone(1.1,0.45,10),mat(rand([0xe0574f,0x2e86c1,0xf2b632])),0,2.1,0,true)); u.add(mesh(rbox(0.6,0.1,1.5,.04),M.white,0.7,0.2,0.4)); B.add(u); }
      const hills=mat(0x7d8f6a,{flatShading:true});
      for(let i=0;i<9;i++) B.add(mesh(cone(rnd(10,18),rnd(7,14),6),hills,-80+i*20,3,-100));
      for(let i=0;i<4;i++) makeBoat(B,i);
      if(bd==='aegean'){ const wm=mat(0xffffff,{roughness:.9}), dm=mat(0x2a5fa8);   // beyaz kübik Bodrum evleri + yel değirmenleri
        for(let i=0;i<34;i++){ const x=rnd(-70,70), z=rnd(-96,-84), h=rnd(1.4,2.6), w=rnd(1.6,2.6); B.add(mesh(box(w,h,w),wm,x,h/2+2+Math.max(0,8-Math.abs(x)/6),z)); if(i%3===0) B.add(mesh(box(0.5,0.8,0.1),dm,x,1.9+Math.max(0,8-Math.abs(x)/6),z+w/2+0.05)); }
        [-24,-18,30].forEach(x=>{ const g=new THREE.Group(); g.position.set(x,6,-80); g.add(mesh(cyl(1,1.3,4,10),wm,0,2,0)); g.add(mesh(cone(1.2,1.2,10),mat(0x8a5a3c),0,4.6,0)); for(let k=0;k<4;k++){ const b=mesh(box(0.25,3.2,0.05),mat(0xe8e0d0),0,4,1.35); b.rotation.z=k*Math.PI/2+0.4; g.add(b); } B.add(g); }); }
    }
  } else {
    const rock=mat(0xe2c49a,{flatShading:true,roughness:1}), cap=mat(0x8a6a4a,{flatShading:true});
    const chim=(x,z,s)=>{ const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(s);
      g.add(mesh(cone(1.2,4.2,7),rock,0,2.1,0,true)); g.add(mesh(cone(0.75,0.8,7),cap,0,4.4,0,true));
      if(Math.random()<.5){ g.add(mesh(cone(0.9,3.2,7),rock,1.1,1.6,0.5,true)); g.add(mesh(cone(0.6,0.6,7),cap,1.1,3.4,0.5,true)); } B.add(g); };
    for(let i=0;i<26;i++) chim(rnd(-45,45),rnd(-44,-15),rnd(.7,1.5));
    for(let i=0;i<8;i++) B.add(mesh(box(rnd(10,20),rnd(4,8),rnd(6,10)),rock,rnd(-70,70),2,rnd(-90,-60)));
    const cols=[[0xe0574f,0xf2b632],[0x2e86c1,0xf7f0f5],[0x8e44ad,0xf2b632],[0x27ae60,0xf1c40f],[0xe67e22,0xc0392b],[0xf06292,0x5c6bc0],[0x16a085,0xf5f5f5]];
    for(let i=0;i<9;i++) makeBalloon(rnd(-30,30),rnd(8,19),rnd(-34,-6),cols[i%cols.length]);
  }
  for(let i=0;i<5;i++) makeBird();
}
let seaTex=null;
function buildSkyline(B,bd){
  if(bd==='paris'){
    const st=mat(0xd9d0bf), rf=mat(0x5d6873,{metalness:.2}), iron=mat(0x6b5a45,{metalness:.4,roughness:.5});
    for(let i=0;i<46;i++){ const x=rnd(-80,80), z=rnd(-70,-28), h=rnd(4,7), w=rnd(3,6), d=rnd(3,5); B.add(mesh(box(w,h,d),st,x,h/2,z,true)); const r=mesh(cone(Math.max(w,d)*0.62,1.6,4),rf,x,h+0.8,z); r.rotation.y=Math.PI/4; r.scale.set(w/Math.max(w,d),1,d/Math.max(w,d)); B.add(r); }
    const E=new THREE.Group(); E.position.set(-14,0,-58); B.add(E);   // Eyfel
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a,b])=>{ const l=mesh(box(0.7,9,0.7),iron,a*2.6,4.2,b*2.6); l.rotation.z=-a*0.28; l.rotation.x=b*0.28; E.add(l); });
    E.add(mesh(box(5.4,0.6,5.4),iron,0,8.4,0)); E.add(mesh(cyl(0.9,1.8,10,4),iron,0,13.6,0)); E.add(mesh(box(2.8,0.4,2.8),iron,0,18.6,0)); E.add(mesh(cyl(0.25,0.9,9,4),iron,0,23.2,0)); E.add(mesh(cyl(0.05,0.1,2.4,6),iron,0,28.8,0));
  } else {
    const glass=[0x8fb8cf,0x6f9bb5,0xa9c6d6,0x5f8aa6].map(c=>mat(c,{metalness:.6,roughness:.15}));
    B.add(mesh(box(260,0.05,80),tmat('sand',60,20),0,-0.02,-60));
    for(let i=0;i<30;i++){ const x=rnd(-90,90), z=rnd(-95,-40), h=rnd(10,36), w=rnd(3,6); B.add(mesh(box(w,h,w),rand(glass),x,h/2,z,true)); }
    const K=new THREE.Group(); K.position.set(12,0,-70); B.add(K);   // Burj
    [[5,26],[4,22],[3,18],[2.1,14],[1.3,10]].reduce((y,[r,h])=>{ K.add(mesh(cyl(r*0.8,r,h,6),glass[2],0,y+h/2,0,true)); return y+h; },0);
    K.add(mesh(cyl(0.1,0.6,12,6),glass[2],0,96,0));
    for(let i=0;i<14;i++) palm(B,rnd(-40,40),rnd(-24,-16),rnd(.9,1.2));
    for(let i=0;i<9;i++) B.add(mesh(new THREE.SphereGeometry(rnd(6,12),10,6,0,Math.PI*2,0,Math.PI/2),mat(0xe0c48e,{flatShading:true}),rnd(-110,110),-1,rnd(-120,-100)));
  }
}
function makeBoat(parent,i){
  const g=new THREE.Group(); const z=-20-i*6-rnd(0,3); g.position.set(rnd(-40,40),0,z);
  g.add(mesh(rbox(3.2,0.6,1.1,.3),M.white,0,0.15,0,true)); g.add(mesh(rbox(1.8,0.55,0.9,.1),mat(0xe8e2d5),0.1,0.7,0,true));
  g.add(mesh(box(1.9,0.12,0.95),mat(0xc0392b),0.1,1.03,0)); g.add(mesh(cyl(0.12,0.12,0.5,8),M.dark,0.5,1.3,0));
  parent.add(g); boats.push({g,speed:rnd(0.6,1.4)*(Math.random()<.5?1:-1)}); if(boats[boats.length-1].speed<0) g.rotation.y=Math.PI;
}
function makeBalloon(x,y,z,cols){
  const g=new THREE.Group(); g.position.set(x,y,z);
  for(let k=0;k<8;k++){ const seg=new THREE.Mesh(new THREE.SphereGeometry(1.5,3,14,k*Math.PI/4,Math.PI/4),mat(cols[k%2],{roughness:.6})); seg.scale.y=1.2; g.add(seg); }
  const neck=mesh(cone(0.95,1.1,12),mat(cols[0]),0,-1.7,0); neck.rotation.x=Math.PI; g.add(neck);
  g.add(mesh(rbox(0.6,0.45,0.6,.06),mat(0x8a5a30),0,-2.75,0));
  [[-0.25,-0.25],[0.25,-0.25],[-0.25,0.25],[0.25,0.25]].forEach(([a,b])=>g.add(mesh(cyl(0.012,0.012,0.7,4),M.dark,a,-2.3,b)));
  g.add(mesh(sph(0.12,8,6),new THREE.MeshBasicMaterial({color:0xffb040}),0,-2.2,0));
  outdoor.add(g); balloons.push({g,x0:x,y0:y,sp:rnd(.25,.6),ph:rnd(0,6)});
}
function makeBird(){
  const g=new THREE.Group(); const wingM=mat(0xffffff,{side:THREE.DoubleSide});
  const w1=mesh(plane(0.45,0.16),wingM,-0.22,0,0), w2=mesh(plane(0.45,0.16),wingM,0.22,0,0); w1.rotation.x=w2.rotation.x=-Math.PI/2;
  const p1=new THREE.Group(), p2=new THREE.Group(); p1.add(w1); p2.add(w2); g.add(p1,p2); g.add(mesh(sph(0.07,6,5),M.white,0,0,0));
  outdoor.add(g); birds.push({g,p1,p2,r:rnd(6,14),cx:rnd(-12,12),cz:rnd(-22,-8),h:rnd(7,12),sp:rnd(.25,.5)*(Math.random()<.5?1:-1),ph:rnd(0,6)});
}

// =====================================================================
// HOTEL SHELL (ground floor) + LOBBY
// =====================================================================
let doorL, doorR, deskGroup, deskMonitor, logoSign, canopySign, sunPatchM=null, lobbySofaM=null, lobbyCushM=null, canopyM=null;
function hotelName(){ return (state.custom&&state.custom.name)||'Otel Ustası'; }
function buildShell(){
  const G=floorRoot(0), S=new THREE.Group();
  S.add(mesh(box(13.8,0.2,4.9),tmat('marble',7,2.5),0,-0.1,5.05));
  S.add(mesh(box(13.8,0.2,2.6-BACK-0.08),tmat('corridor',7,6.9),0,-0.1,(2.6+BACK+0.08)/2));
  addRunners(S);
  // walls
  const tallH=2.7;
  const SL=7.6-BACK+0.08, SC=(7.6+BACK-0.08)/2;
  S.add(mesh(box(14.12,tallH,0.16),M.facade,0,tallH/2,BACK,true));
  S.add(mesh(box(0.16,tallH,SL),M.facade,-6.98,tallH/2,SC,true));
  S.add(mesh(box(14.2,0.18,0.24),M.trim,0,tallH+0.09,BACK,true));
  S.add(mesh(box(0.24,0.18,SL),M.trim,-6.98,tallH+0.09,SC,true));
  S.add(mesh(box(0.16,0.9,SL),M.facade,6.98,0.45,SC,true));
  S.add(mesh(box(0.24,0.08,SL),M.gold,6.98,0.93,SC));
  // front facade: low walls + glass + mullions + door frame
  [[-7.06,-1.1],[1.1,7.06]].forEach(([a,b])=>{ const w=b-a, cx=(a+b)/2;
    S.add(mesh(box(w,0.7,0.14),M.facade,cx,0.35,7.53,true)); S.add(mesh(box(w+0.02,0.06,0.2),M.trim,cx,0.72,7.53));
    const gl=mesh(box(w,1.9,0.05),M.glass,cx,1.7,7.53); gl.castShadow=false; S.add(gl);
    S.add(mesh(box(w+0.02,0.1,0.18),M.trim,cx,2.68,7.53));
    for(let x=a+1.3;x<b-0.4;x+=1.5) S.add(mesh(box(0.07,1.9,0.12),M.trim,x,1.7,7.53)); });
  [-1.12,1.12].forEach(x=>S.add(mesh(box(0.16,2.7,0.22),M.trim,x,1.35,7.53,true)));
  S.add(mesh(box(2.4,0.3,0.22),M.trim,0,2.6,7.53,true));
  // corner pilasters
  [[-7.0,7.53],[7.0,7.53],[-7.0,BACK],[7.0,BACK]].forEach(([x,z])=>S.add(mesh(box(0.34,z<0||x<0?2.9:1.0,0.34),M.trim,x,z<0||x<0?1.45:0.5,z,true)));
  // lobby rug & back logo wall
  S.add(mesh(box(4.2,0.015,2.4),tmat('rugRed'),0,0.01,5.0));
  S.add(mesh(rbox(0.1,1.3,2.4,.03),tmat('woodDark',1,2),-6.86,1.65,3.75,true));
  logoSign=signPlane(hotelName().toLocaleUpperCase('tr-TR'),2.1,0.52,{fg:'#e8b64a',font:'800 70px "Baloo 2", serif',fit:true}); logoSign.position.set(-6.8,1.8,3.75); logoSign.rotation.y=Math.PI/2; G.add(logoSign);
  const cityS=signPlane(city().name.toLocaleUpperCase('tr-TR'),1.6,0.3,{fg:'#f7ecd2',font:'700 56px "Baloo 2", serif'}); cityS.position.set(-6.8,1.35,3.75); cityS.rotation.y=Math.PI/2; S.add(cityS);
  // serve mat behind the desk
  S.add(mesh(rbox(1.5,0.02,1.0,.12),mat(0x2d5d8a),L.serve.cx,0.012,L.serve.cz));
  S.add(mesh(rbox(1.3,0.022,0.8,.1),mat(0x3f7fb8),L.serve.cx,0.014,L.serve.cz));
  // queue stanchions
  for(let k=0;k<5;k++){ const x=L.qHead.x+k*L.qStep.x, z=L.qHead.z+k*L.qStep.z; stanchion(S,x-0.2,z+0.42); }
  // lounge
  const lg=new THREE.Group(); lg.position.set(2.7,0,5.5); S.add(lg);
  const sofaM=new THREE.MeshStandardMaterial({color:0x3f5a7a,roughness:.95}), cush=new THREE.MeshStandardMaterial({color:0xe8dcc0,roughness:.95}); lobbySofaM=sofaM; lobbyCushM=cush;
  lg.add(mesh(rbox(2.0,0.34,0.8,.12),sofaM,0,0.24,0.35,true)); lg.add(mesh(rbox(2.0,0.6,0.22,.1),sofaM,0,0.45,0.72,true));
  [-1.02,1.02].forEach(x=>lg.add(mesh(rbox(0.22,0.46,0.8,.1),sofaM,x,0.33,0.35,true)));
  [-0.5,0,0.5].forEach(x=>lg.add(mesh(rbox(0.5,0.28,0.2,.1),cush,x*1.3,0.55,0.55)));
  lg.add(mesh(cyl(0.5,0.5,0.05,24),tmat('marble'),0,0.44,-0.55,true)); lg.add(mesh(cyl(0.06,0.12,0.42,10),M.gold,0,0.21,-0.55));
  lg.add(mesh(cyl(0.08,0.06,0.2,10),M.white,0,0.56,-0.55)); lg.add(mesh(sph(0.12,10,8),mat(0xe0574f),0,0.72,-0.55));
  lg.add(mesh(box(2.7,0.015,2.0),tmat('rugGreen'),0,0.024,0.05));
  bigPlant(S,-6.45,3.0,1.1); bigPlant(S,1.55,7.05,1); bigPlant(S,3.9,7.05,1); bigPlant(S,6.5,4.65,1.05);
  // wall clock
  const clk=new THREE.Group(); clk.position.set(-6.86,2.35,5.9); clk.rotation.y=Math.PI/2; S.add(clk);
  clk.add(mesh(cyl(0.3,0.3,0.05,24),M.gold,0,0,0)); clk.children[0].rotation.x=Math.PI/2;
  const face=mesh(cyl(0.26,0.26,0.02,24),M.white,0,0,0.03); face.rotation.x=Math.PI/2; clk.add(face);
  G.add(bake(S));
  // dynamic: sliding doors
  const dm=new THREE.Group();
  doorL=mesh(box(1.0,2.2,0.05),M.glass,-0.5,1.15,7.53); doorR=mesh(box(1.0,2.2,0.05),M.glass,0.5,1.15,7.53);
  [doorL,doorR].forEach(d=>{ d.add(mesh(box(1.02,0.06,0.07),M.gold,0,1.08,0)); d.add(mesh(box(0.05,2.2,0.07),M.gold,0,0,0)); dm.add(d); });
  G.add(dm);
  // canopy + sign
  const cn=new THREE.Group(); G.add(cn);
  const cnM=canopyM=new THREE.MeshStandardMaterial({color:0x2d5d8a,transparent:true,opacity:.45,roughness:.3,metalness:.2,depthWrite:false});
  const cnTop=mesh(rbox(3.4,0.08,1.4,.06),cnM,0,2.95,8.25); cnTop.castShadow=false; cn.add(cnTop); cn.add(mesh(box(3.44,0.06,0.06),M.gold,0,2.95,8.95));
  [-1.6,1.6].forEach(x=>cn.add(mesh(cyl(0.06,0.06,2.95,10),M.gold,x,1.47,8.9,true)));
  canopySign=signPlane(hotelName(),2.8,0.66,{fg:'#ffd76a',stroke:'#4a2a00',strokeW:10,font:'800 96px "Baloo 2", serif',fit:true}); canopySign.position.set(0,3.35,8.95); cn.add(canopySign);
  // soft sunlight patches under the front windows
  sunPatchM=new THREE.MeshBasicMaterial({map:tex('glow'),color:0xfff1c4,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  [[-5.0,6.55],[-2.7,6.55],[2.7,6.55],[5.0,6.55]].forEach(([x,z])=>{ const p=mesh(plane(1.9,2.3),sunPatchM,x,0.022,z); p.rotation.x=-Math.PI/2; p.rotation.z=0.35; p.receiveShadow=false; G.add(p); });
  addCeiling(0,BACK+0.08,7.46);
  // desk
  buildDesk(G);
  addCols('shell',[
    [0,-7.06,7.06,BACK-0.08,BACK+0.08],[0,-7.06,-6.9,BACK-0.08,7.6],[0,6.9,7.06,BACK-0.08,7.6],
    ...[[-6.55,CORR[1]],[6.55,CORR[1]],[-6.55,CORR[2]],[6.55,CORR[2]]].map(([x,z])=>[0,x-0.3,x+0.3,z-0.3,z+0.3]),
    [0,-7.06,-1.02,7.46,7.6],[0,1.02,7.06,7.46,7.6],
    [0,1.6,3.8,4.4,6.3],[0,-6.8,-6.1,2.7,3.3],[0,1.3,1.8,6.8,7.3],[0,3.65,4.15,6.8,7.3],[0,6.2,6.8,4.4,4.9]]);
}
function addRunners(S,upper){
  const rm=(w,d)=>tmat('runner',Math.max(1,Math.round(w/1.1)),1);
  CORR.forEach(z=>S.add(mesh(box(13.4,0.012,1.4),tmat('runner',12,1),0,0.006,z)));
  CORR.forEach(z=>{ S.add(mesh(box(0.06,0.3,0.18),M.gold,-6.86,1.75,z)); S.add(mesh(sph(0.1,10,8),M.lampOn,-6.76,1.95,z)); S.add(mesh(cyl(0.05,0.03,0.12,8),M.gold,-6.8,1.83,z)); });
  const al=CORR[0]-CORR[2]; S.add(mesh(box(1.4,0.013,al),tmat('runner',1,Math.round(al)),0,0.016,(CORR[0]+CORR[2])/2));
  // door mats + corridor planters (visual polish)
  const matC=[0x8a2f3a,0x2d5d8a,0x2e7d4f];
  COLX.forEach(x=>ROWZ.forEach((z,r)=>S.add(mesh(rbox(1.1,0.018,0.5,.08),mat(matC[r]),x,0.02,z+RD/2+0.32))));
  [[-6.55,CORR[1]],[6.55,CORR[1]],[-6.55,CORR[2]],[6.55,CORR[2]]].forEach(([x,z])=>bigPlant(S,x,z,0.75));
}
function buildDesk(G){
  const S=new THREE.Group();
  S.add(mesh(rbox(2.4,1.0,0.6,.06),tmat('woodDark',2,1),0,0.5,0,true));
  S.add(mesh(box(2.42,0.08,0.02),M.gold,0,0.82,0.305));
  S.add(mesh(box(2.2,0.55,0.02),M.accent,0,0.42,0.305));
  S.add(mesh(rbox(2.56,0.08,0.76,.04),tmat('marble',2,1),0,1.04,0,true));
  S.add(mesh(box(0.5,0.32,0.04),M.dark,0.5,1.32,-0.12,true)); S.add(mesh(box(0.06,0.14,0.06),M.dark,0.5,1.12,-0.12));
  S.add(mesh(new THREE.SphereGeometry(0.09,12,8,0,Math.PI*2,0,Math.PI/2),M.gold,-0.85,1.08,0.2)); S.add(mesh(cyl(0.11,0.11,0.02,12),M.gold,-0.85,1.085,0.2));
  bigPlant(S,0.95,0.1,0.35,1.08);
  S.add(mesh(box(0.28,0.02,0.2),M.white,0.0,1.09,0.12));
  const baked=bake(S); baked.position.set(L.desk.x,0,L.desk.z); G.add(baked);
  deskMonitor=mesh(box(0.44,0.26,0.01),new THREE.MeshBasicMaterial({color:0x7fc4ff}),L.desk.x+0.5,1.32,L.desk.z-0.145); deskMonitor.rotation.y=Math.PI; G.add(deskMonitor);
  addCols('desk',[[0,L.desk.x-1.22,L.desk.x+1.22,L.desk.z-0.32,L.desk.z+0.32]]);
}

// =====================================================================
// FEATURES (unlocked with pads)
// =====================================================================
const featureGroups={};
let cabin=null, elevShaft=null, xmasTree=null;
function buildFeature(id,pop){
  if(featureGroups[id]){ featureGroups[id].parent.remove(featureGroups[id]); }
  let g=null;
  switch(id){
    case 'depo': g=buildDepo(); break;
    case 'staff': g=buildStaffRoom(); break;
    case 'rest': g=buildRestaurant(); break;
    case 'pool': g=buildPool(); break;
    case 'gym': g=buildGym(); break;
    case 'cafe': g=buildCafe(); break;
    case 'spa': g=buildSpa(); break;
    case 'laundry': g=buildLaundry(); break;
    case 'f2': buildUpperFloor(1); g=buildElevator(); break;
    case 'f3': buildUpperFloor(2); g=buildElevator(); break;
    case 'roof': buildRoof(); g=buildElevator(); break;
  }
  if(g){ featureGroups[id]=g; if(pop) dropIn(g); }
}
function buildDepo(){
  const G=floorRoot(0), S=new THREE.Group();
  const shelf=(z0,z1,kind)=>{
    const cz=(z0+z1)/2, w=z1-z0;
    S.add(mesh(box(0.5,2.0,w),tmat('wood',1,2),-6.62,1.0,cz,true));
    for(let i=0;i<4;i++) S.add(mesh(box(0.54,0.05,w+0.02),M.white,-6.6,0.28+i*0.5,cz));
    for(let i=0;i<4;i++) for(let j=0;j<Math.floor(w/0.28);j++){
      const zz=z0+0.16+j*0.28, yy=0.31+i*0.5;
      if(kind==='paper'){ S.add(mesh(cyl(0.09,0.09,0.17,12),M.white,-6.55,yy+0.09,zz)); S.add(mesh(cyl(0.035,0.035,0.172,8),mat(0xb99b6b),-6.55,yy+0.09,zz)); }
      else S.add(mesh(rbox(0.3,0.1,0.22,.04),mat(j%2?0x5d9fd6:0xffffff),-6.56,yy+0.06,zz));
      if(kind==='towel') S.add(mesh(rbox(0.3,0.1,0.22,.04),mat(j%2?0xffffff:0x5d9fd6),-6.56,yy+0.17,zz));
    }
  };
  shelf(4.85,6.05,'paper'); shelf(6.15,7.35,'towel');
  S.add(mesh(rbox(1.0,0.02,0.9,.1),mat(0xdfe8f0),L.shelf.paper.x,0.012,L.shelf.paper.z));
  S.add(mesh(rbox(1.0,0.02,0.9,.1),mat(0xcfe3f5),L.shelf.towel.x,0.012,L.shelf.towel.z));
  const sg=signPlane('DEPO',1.2,0.3,{bg:'#2d5d8a',fg:'#fff',font:'800 70px "Baloo 2"'}); sg.position.set(-6.36,2.25,6.1); sg.rotation.y=Math.PI/2; S.add(sg);
  const g=bake(S); G.add(g);
  addCols('depo',[[0,-6.9,-6.32,4.8,7.4]]);
  return g;
}
function buildStaffRoom(){
  const G=floorRoot(0), S=new THREE.Group();
  const lockCols=[0x3f7fb8,0x5aa0d8,0x3f7fb8,0x5aa0d8,0x3f7fb8];
  for(let i=0;i<5;i++){ const z=5.4+i*0.42; S.add(mesh(rbox(0.5,1.9,0.4,.03),mat(lockCols[i],{metalness:.3,roughness:.5}),6.6,0.95,z,true)); S.add(mesh(box(0.02,0.18,0.03),M.gold,6.34,1.05,z+0.1)); for(let k=0;k<3;k++) S.add(mesh(box(0.02,0.02,0.2),M.dark,6.34,1.6+k*0.06,z)); }
  const w=tmat('wood',1,1);
  S.add(mesh(rbox(1.3,0.08,0.34,.03),w,5.45,0.45,7.1,true)); [-0.55,0.55].forEach(a=>S.add(mesh(box(0.06,0.44,0.28),M.dark,5.45+a,0.22,7.1)));
  S.add(mesh(cyl(0.16,0.16,0.9,12),M.white,4.75,0.45,5.2,true)); S.add(mesh(cyl(0.14,0.14,0.36,12),mat(0x7fc4ff,{transparent:true,opacity:.7}),4.75,1.08,5.2));
  S.add(mesh(rbox(1.9,0.02,1.9,.12),mat(0x4a6a86),5.45,0.011,6.2));
  const sg=signPlane('PERSONEL',1.3,0.3,{bg:'#8a2f3a',fg:'#fff',font:'800 64px "Baloo 2"'}); sg.position.set(6.34,2.2,6.2); sg.rotation.y=-Math.PI/2; S.add(sg);
  const g=bake(S); G.add(g);
  addCols('staff',[[0,6.3,6.9,5.15,7.45],[0,4.75,6.15,6.92,7.3],[0,4.55,4.95,5.0,5.4]]);
  return g;
}
let cafeBarista=null, cafeSteam=[], cafeCups=null;
function buildCafe(){
  const G=new THREE.Group(), S=new THREE.Group(), cx=L.cafe.x, cz=L.cafe.z; floorRoot(0).add(G);
  S.add(mesh(rbox(2.4,0.02,1.35,.12),mat(0x6b4a33),cx,0.013,cz+0.15));
  S.add(mesh(rbox(1.8,0.95,0.55,.05),tmat('woodDark',2,1),cx,0.475,cz,true));
  S.add(mesh(box(1.72,0.5,0.02),mat(0xc98e5a),cx,0.45,cz+0.28));
  for(let k=0;k<6;k++) S.add(mesh(box(0.05,0.5,0.03),mat(0x8a5a36),cx-0.75+k*0.3,0.45,cz+0.29));
  S.add(mesh(box(1.82,0.06,0.02),M.gold,cx,0.74,cz+0.285));
  S.add(mesh(rbox(1.92,0.06,0.64,.03),tmat('marble',2,1),cx,0.98,cz,true));
  // espresso machine
  const steel=mat(0xc9d1d8,{metalness:.75,roughness:.28});
  S.add(mesh(rbox(0.55,0.42,0.36,.04),steel,cx-0.5,1.22,cz-0.08,true));
  S.add(mesh(box(0.5,0.05,0.3),mat(0x2b2b2b),cx-0.5,1.45,cz-0.08));
  S.add(mesh(box(0.42,0.1,0.02),mat(0x8a2f3a),cx-0.5,1.33,cz+0.105));
  [-0.13,0.13].forEach(a=>{ S.add(mesh(cyl(0.03,0.03,0.08,8),M.dark,cx-0.5+a,1.07,cz+0.12)); S.add(mesh(cyl(0.045,0.035,0.07,10),M.white,cx-0.5+a,1.045,cz+0.14)); });
  S.add(mesh(sph(0.03,8,6),new THREE.MeshBasicMaterial({color:0x5fd98a}),cx-0.28,1.37,cz+0.11));
  // grinder
  S.add(mesh(cyl(0.08,0.1,0.24,10),M.dark,cx-0.05,1.13,cz-0.12,true)); S.add(mesh(cone(0.1,0.16,10),mat(0xe8e0d0,{transparent:true,opacity:.6}),cx-0.05,1.33,cz-0.12));
  // cake dome
  S.add(mesh(cyl(0.18,0.18,0.02,16),M.white,cx+0.55,1.02,cz-0.02));
  S.add(mesh(cyl(0.13,0.13,0.1,16),mat(0xf2c7a5),cx+0.55,1.08,cz-0.02)); S.add(mesh(cyl(0.135,0.135,0.02,16),mat(0x6b3a22),cx+0.55,1.135,cz-0.02));
  S.add(mesh(new THREE.SphereGeometry(0.17,14,8,0,Math.PI*2,0,Math.PI/2),mat(0xdcecf5,{transparent:true,opacity:.35,roughness:.05}),cx+0.55,1.03,cz-0.02));
  // menu board
  [-0.55,0.55].forEach(a=>S.add(mesh(cyl(0.03,0.03,2.2,8),M.dark,cx+a,1.1,cz-0.5,true)));
  const mb=signPlane('KAHVE ☕',1.2,0.4,{bg:'#2b2320',fg:'#ffd76a',font:'800 64px "Baloo 2"'}); mb.position.set(cx,2.0,cz-0.48); S.add(mb);
  const menu=signPlane('Espresso · Latte · Çay',1.2,0.18,{bg:'#2b2320',fg:'#f7ecd2',font:'600 30px "Baloo 2"'}); menu.position.set(cx,1.72,cz-0.48); S.add(menu);
  bigPlant(S,cx-1.2,cz-0.15,0.7);
  G.add(bake(S));
  cafeCups=new THREE.Group(); G.add(cafeCups);
  for(let k=0;k<3;k++){ const c=new THREE.Group(); c.position.set(cx+0.05+k*0.16,1.01,cz+0.14);
    c.add(mesh(cyl(0.045,0.035,0.08,10),M.white,0,0.04,0)); c.add(mesh(cyl(0.04,0.04,0.005,10),mat(0x5a3218),0,0.078,0)); cafeCups.add(c); }
  cafeSteam=[]; const stM=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,depthWrite:false});
  for(let k=0;k<4;k++){ const p=mesh(sph(0.045,6,4),stM.clone(),cx-0.5+(k%2?0.13:-0.13),1.1,cz+0.14); p.userData.ph=k/4; G.add(p); cafeSteam.push(p); }
  cafeBarista=makeChar(LOOKS.barista()); cafeBarista.root.position.set(cx-0.2,0,cz-0.52); G.add(cafeBarista.root);
  addCols('cafe',[[0,cx-0.96,cx+0.96,cz-0.3,cz+0.3],[0,cx-0.6,cx+0.6,cz-0.62,cz-0.3],[0,cx-1.45,cx-0.95,cz-0.4,cz+0.1]]);
  return G;
}
function buildBusModel(){
  const g=new THREE.Group();
  const body=mat(0xf2b632,{metalness:.35,roughness:.35}), dark=mat(0x22303c,{metalness:.6,roughness:.12});
  g.add(mesh(rbox(5.6,1.5,1.15,.2),body,0,1.0,0,true));
  g.add(mesh(rbox(5.62,0.1,1.17,.04),mat(0x2e86c1),0,0.55,0));
  g.add(mesh(box(4.4,0.5,1.18),dark,-0.35,1.38,0));
  g.add(mesh(box(0.05,0.8,0.9),dark,2.8,1.2,0));
  g.add(mesh(box(0.55,1.05,0.02),dark,1.9,0.95,0.585));
  g.add(mesh(rbox(5.3,0.12,1.05,.05),mat(0xffffff),0,1.8,0));
  [-1.9,1.6].forEach(x=>[-0.5,0.5].forEach(zz=>{ const w=mesh(cyl(0.3,0.3,0.18,14),M.dark,x,0.3,zz); w.rotation.x=Math.PI/2; g.add(w); }));
  [-0.35,0.35].forEach(zz=>g.add(mesh(sph(0.08,8,6),M.lampOn,2.82,0.7,zz)));
  const sg=signPlane('TUR',0.9,0.28,{bg:'#2e86c1',fg:'#fff',font:'800 64px "Baloo 2"'}); sg.position.set(-0.6,0.8,0.586); g.add(sg);
  const sh=blob(2.9); sh.scale.set(1,0.3,1); g.add(sh);
  return g;
}
let restChef=null, restLamps=[];
function buildRestaurant(){
  const G=new THREE.Group(); outdoor.add(G); const S=new THREE.Group();
  const x0=-16.2,x1=-8.0,z0=-3.2,z1=7.2, cx=(x0+x1)/2, cz=(z0+z1)/2;
  S.add(mesh(box(x1-x0,0.2,z1-z0),tmat('wood',5,6),cx,-0.1,cz));
  const wm=tmat('wallpaperStripe',4,1.3);
  S.add(mesh(box(x1-x0,2.7,0.16),wm,cx,1.35,z0-0.08,true)); S.add(mesh(box(0.16,2.7,z1-z0),wm,x0-0.08,1.35,cz,true));
  S.add(mesh(box(x1-x0+0.3,0.18,0.26),M.trim,cx,2.79,z0-0.08,true)); S.add(mesh(box(0.26,0.18,z1-z0),M.trim,x0-0.08,2.79,cz,true));
  S.add(mesh(box(0.16,0.9,z1-z0),M.facade,x1+0.08,0.45,cz,true)); S.add(mesh(box(0.22,0.07,z1-z0),M.gold,x1+0.08,0.93,cz));
  [[x0,-12.8],[-11.2,x1]].forEach(([a,b])=>{ S.add(mesh(box(b-a,0.8,0.16),M.facade,(a+b)/2,0.4,z1+0.08,true)); S.add(mesh(box(b-a,0.07,0.22),M.gold,(a+b)/2,0.83,z1+0.08)); });
  const aw=mesh(box(2.4,0.08,1.4),tmat('awning',1,1),-12,2.4,z1+0.55,true); aw.rotation.x=0.25; S.add(aw);
  [-13.1,-10.9].forEach(x=>S.add(mesh(cyl(0.05,0.05,2.4,8),M.dark,x,1.2,z1+1.15,true)));
  // kitchen
  S.add(mesh(rbox(7.2,0.95,0.6,.05),tmat('woodDark',4,1),-12.2,0.48,-2.1,true)); S.add(mesh(box(7.3,0.06,0.7),mat(0xb8c0c8,{metalness:.7,roughness:.3}),-12.2,0.98,-2.1));
  S.add(mesh(box(2.2,0.6,0.5),mat(0x9aa4ad,{metalness:.7,roughness:.35}),-14,2.1,-2.95,true));
  for(let i=0;i<3;i++){ S.add(mesh(cyl(0.16,0.14,0.2,12),mat(0x9aa4ad,{metalness:.8,roughness:.3}),-15.2+i*0.5,1.11,-2.2)); }
  for(let i=0;i<5;i++) S.add(mesh(cyl(0.05,0.05,0.28,8),mat(rand([0x2e7d32,0x6d4c41,0xc62828])),-11+i*0.3,1.8,-3.0));
  S.add(mesh(box(2.4,0.04,0.25),tmat('wood'),-10.4,1.66,-3.0));
  for(let i=0;i<3;i++) S.add(mesh(cyl(0.18,0.18,0.03,16),M.white,-12.25+i*0.2,1.03+i*0.035,-1.95));
  // tables
  REST_TABLES.forEach(([tx,tz])=>{
    S.add(mesh(cyl(0.46,0.46,0.05,24),M.white,tx,0.76,tz,true)); S.add(mesh(cyl(0.47,0.52,0.28,24,1,true),M.white,tx,0.62,tz));
    S.add(mesh(cyl(0.05,0.09,0.72,10),M.dark,tx,0.36,tz)); S.add(mesh(cyl(0.03,0.03,0.12,8),mat(0xfff3d0),tx,0.85,tz));
    [-1,1].forEach(sd=>{ const ch=new THREE.Group(); ch.position.set(tx+sd*0.74,0,tz); ch.rotation.y=sd>0?-Math.PI/2:Math.PI/2; S.add(ch);
      ch.add(mesh(rbox(0.38,0.07,0.38,.03),mat(0x8a2f3a),0,0.44,0)); ch.add(mesh(rbox(0.38,0.5,0.06,.03),tmat('wood'),0,0.7,-0.18,true));
      [[-0.15,-0.15],[0.15,-0.15],[-0.15,0.15],[0.15,0.15]].forEach(([a,b])=>ch.add(mesh(cyl(0.02,0.02,0.42,6),M.dark,a,0.21,b))); });
  });
  // register
  S.add(mesh(rbox(1.4,1.0,0.5,.05),tmat('woodDark',1,1),-9.6,0.5,5.55,true)); S.add(mesh(box(0.4,0.25,0.3),M.dark,-9.3,1.12,5.5));
  bigPlant(S,-15.6,6.6,1); bigPlant(S,-8.6,-2.6,0.9);
  const sg=signPlane('RESTORAN',2.2,0.5,{bg:'#8a2f3a',fg:'#ffd76a',font:'800 80px "Baloo 2"'}); sg.position.set(-12,3.05,z1+0.2); S.add(sg);
  G.add(bake(S));
  restLamps=[];
  REST_TABLES.forEach(([tx,tz])=>{ const gl=glowDecal(0.9,tx,tz,0.02); G.add(gl); restLamps.push(gl); });
  restChef=makeChar(LOOKS.chef()); restChef.root.position.set(-12.8,0,-2.75); G.add(restChef.root);
  addCols('rest',[
    [0,x0-0.16,x1,z0-0.16,z0],[0,x0-0.16,x0,z0,z1+0.16],[0,x1,x1+0.16,z0,z1+0.16],
    [0,x0,-12.8,z1,z1+0.16],[0,-11.2,x1,z1,z1+0.16],
    [0,-15.85,-8.55,-2.42,-1.78],
    ...REST_TABLES.map(([tx,tz])=>[0,tx-0.46,tx+0.46,tz-0.46,tz+0.46]),
    [0,-10.32,-8.88,5.28,5.82]]);
  return G;
}
let poolWater=null;
function buildPool(){
  const G=new THREE.Group(); outdoor.add(G); const S=new THREE.Group();
  const x0=8.0,x1=16.2,z0=-3.5,z1=7.2;
  const deck=tmat(city().stone?'stone':'paving',4,5);
  S.add(mesh(box(x1-x0,0.12,1.5),deck,(x0+x1)/2,-0.06,z1-0.75));
  S.add(mesh(box(x1-x0,0.12,z1-1.5-3.6),deck,(x0+x1)/2,-0.06,(3.6+z1-1.5)/2));
  S.add(mesh(box(x1-x0,0.12,-0.2-z0),deck,(x0+x1)/2,-0.06,(z0-0.2)/2));
  S.add(mesh(box(1.0,0.12,3.8),deck,8.5,-0.06,1.7)); S.add(mesh(box(1.2,0.12,3.8),deck,15.6,-0.06,1.7));
  // basin
  S.add(mesh(box(6.0,0.02,3.8),tmat('poolTile',6,4),12,0.005,1.7));
  // coping
  const cop=mat(0xf4efe6);
  S.add(mesh(box(6.3,0.16,0.22),cop,12,0.08,-0.25)); S.add(mesh(box(6.3,0.16,0.22),cop,12,0.08,3.65));
  S.add(mesh(box(0.22,0.16,4.1),cop,8.95,0.08,1.7)); S.add(mesh(box(0.22,0.16,4.1),cop,15.05,0.08,1.7));
  [-0.25,0.25].forEach(a=>{ const r=mesh(cyl(0.03,0.03,1.1,8),M.gold,12+a,0.25,3.55); S.add(r); });
  // loungers + umbrellas
  POOL_LOUNGERS.forEach((lx,i)=>{
    S.add(mesh(rbox(0.58,0.1,1.2,.04),M.white,lx,0.32,5.1,true)); const bk=mesh(rbox(0.58,0.08,0.45,.04),M.white,lx,0.5,4.45,true); bk.rotation.x=-0.7; S.add(bk);
    S.add(mesh(rbox(0.5,0.03,1.0,.03),mat([0x2e86c1,0xe0574f,0xf2b632,0x27ae60][i]),lx,0.39,5.15));
    [[-0.24,4.6],[0.24,4.6],[-0.24,5.6],[0.24,5.6]].forEach(([a,b])=>S.add(mesh(cyl(0.02,0.02,0.28,6),M.dark,lx+a,0.14,b)));
    if(i%2===0){ const ux=lx+0.6; S.add(mesh(cyl(0.035,0.035,2.2,8),M.white,ux,1.1,5.9)); S.add(mesh(cone(1.1,0.45,12),mat(i?0x2e86c1:0xe0574f),ux,2.25,5.9,true)); }
  });
  // bar hut
  S.add(mesh(rbox(1.4,1.0,0.6,.05),tmat('wood',1,1),15.2,0.5,-2.3,true));
  [14.6,15.8].forEach(x=>S.add(mesh(cyl(0.06,0.06,2.3,8),mat(0x8a6a4a),x,1.15,-2.75)));
  S.add(mesh(cone(1.35,0.8,10),mat(0xd8b56a,{flatShading:true}),15.2,2.55,-2.6,true));
  [14.7,15.2,15.7].forEach(x=>{ S.add(mesh(cyl(0.16,0.16,0.05,10),mat(0xe0574f),x,0.65,-1.75)); S.add(mesh(cyl(0.03,0.03,0.64,6),M.dark,x,0.32,-1.75)); });
  // fence
  const fm=M.white;
  const fence=(ax,az,bx,bz)=>{ const len=Math.hypot(bx-ax,bz-az), n=Math.max(1,Math.round(len/0.6)), horiz=Math.abs(bz-az)<0.01;
    for(let i=0;i<=n;i++){ const t=i/n; S.add(mesh(box(0.06,0.9,0.06),fm,lerp(ax,bx,t),0.45,lerp(az,bz,t),true)); }
    S.add(mesh(box(horiz?len:0.05,0.06,horiz?0.05:len),fm,(ax+bx)/2,0.82,(az+bz)/2)); S.add(mesh(box(horiz?len:0.05,0.06,horiz?0.05:len),fm,(ax+bx)/2,0.45,(az+bz)/2)); };
  fence(x0,z0,11.2,z0); fence(12.6,z0,x1,z0); fence(x0,z0,x0,z1); fence(x1,z0,x1,z1); fence(x0,z1,11.2,z1); fence(12.8,z1,x1,z1);
  const ring=mesh(new THREE.TorusGeometry(0.25,0.07,8,16),mat(0xe0574f),8.0,0.75,5.0); ring.rotation.y=Math.PI/2; S.add(ring);
  const sg=signPlane('HAVUZ',1.6,0.4,{bg:'#2e86c1',fg:'#fff',font:'800 80px "Baloo 2"'}); sg.position.set(12,1.35,z1+0.05); S.add(sg);
  S.add(mesh(box(0.08,0.5,0.08),M.white,11.3,1.05,z1)); S.add(mesh(box(0.08,0.5,0.08),M.white,12.7,1.05,z1));
  G.add(bake(S));
  poolWater=mesh(box(5.9,0.02,3.7),new THREE.MeshStandardMaterial({map:tex('water',2,1.3),transparent:true,opacity:.72,roughness:.05,metalness:.1,emissive:0x0b5a8a,emissiveIntensity:.25,depthWrite:false}),12,0.1,1.7);
  G.add(poolWater);
  addCols('pool',[
    [0,x0,11.2,z0-0.06,z0+0.06],[0,12.6,x1,z0-0.06,z0+0.06],[0,x0-0.06,x0+0.06,z0,z1],[0,x1-0.06,x1+0.06,z0,z1],
    [0,x0,11.2,z1-0.06,z1+0.06],[0,12.8,x1,z1-0.06,z1+0.06],
    [0,8.95,15.05,-0.3,3.7],
    ...POOL_LOUNGERS.map(lx=>[0,lx-0.3,lx+0.3,4.4,5.72]),
    [0,14.5,15.9,-2.65,-1.95]]);
  return G;
}
function buildGym(){
  const G=new THREE.Group(); outdoor.add(G); const S=new THREE.Group();
  const x0=8.0,x1=16.2,z0=BACK-0.08,z1=-3.6, cx=(x0+x1)/2, cz=(z0+z1)/2;
  S.add(mesh(box(x1-x0,0.2,z1-z0),tmat('rubber',4,3),cx,-0.1,cz));
  S.add(mesh(box(x1-x0,2.7,0.16),mat(0xdfe6ec),cx,1.35,z0-0.08,true)); S.add(mesh(box(0.16,2.7,z1-z0),mat(0xdfe6ec),x0-0.08,1.35,cz,true));
  S.add(mesh(box(6.5,1.5,0.03),new THREE.MeshStandardMaterial({color:0xcfe2ec,metalness:.1,roughness:.12,emissive:0x7f98a8,emissiveIntensity:.25}),cx,1.35,z0+0.01));
  for(let k=0;k<5;k++) S.add(mesh(box(0.06,1.5,0.04),mat(0xb8c6d0),cx-3.25+k*1.625,1.35,z0+0.02));
  S.add(mesh(box(x1-x0+0.3,0.18,0.26),M.trim,cx,2.79,z0-0.08,true));
  S.add(mesh(box(0.16,0.9,z1-z0),M.facade,x1+0.08,0.45,cz,true));
  [[x0,11.2],[12.6,x1]].forEach(([a,b])=>{ S.add(mesh(box(b-a,0.8,0.16),M.facade,(a+b)/2,0.4,z1+0.08,true)); S.add(mesh(box(b-a,0.07,0.22),M.gold,(a+b)/2,0.83,z1+0.08)); });
  GYM_TREAD.forEach(tx=>{
    S.add(mesh(rbox(0.72,0.18,1.5,.05),M.dark,tx,0.09,-8.7,true)); S.add(mesh(box(0.54,0.02,1.25),mat(0x2b2e33),tx,0.19,-8.65));
    [-0.3,0.3].forEach(dx=>S.add(mesh(cyl(0.025,0.025,1.1,8),mat(0x9aa4ad,{metalness:.8}),tx+dx,0.65,-9.35)));
    S.add(mesh(rbox(0.66,0.22,0.12,.03),M.dark,tx,1.2,-9.35)); S.add(mesh(box(0.4,0.13,0.02),mat(0x3aa0d8,{emissive:0x3aa0d8,emissiveIntensity:.9}),tx,1.22,-9.28));
  });
  S.add(mesh(rbox(1.8,0.08,0.4,.03),mat(0x555a60),12.1,0.62,-5.2)); [-0.8,0.8].forEach(a=>S.add(mesh(box(0.06,0.6,0.35),M.dark,12.1+a,0.3,-5.2)));
  [11.5,12.1,12.7].forEach(x=>{ const b=mesh(cyl(0.025,0.025,0.5,8),mat(0x9aa4ad,{metalness:.8}),x,0.72,-5.2); b.rotation.z=Math.PI/2; S.add(b); [-0.2,0.2].forEach(d=>{ const w=mesh(cyl(0.09,0.09,0.07,12),M.dark,x+d,0.72,-5.2); w.rotation.z=Math.PI/2; S.add(w); }); });
  [9.2,10.2].forEach(x=>S.add(mesh(rbox(0.7,0.02,1.6,.08),mat(x<10?0x8e44ad:0x27ae60),x,0.012,-5.6)));
  S.add(mesh(rbox(1.0,0.95,0.45,.05),tmat('woodLight'),14.6,0.47,-4.25,true));
  const sg=signPlane('SPOR SALONU',2.4,0.45,{bg:'#27ae60',fg:'#fff',font:'800 64px "Baloo 2"'}); sg.position.set(cx,2.2,z0+0.06); S.add(sg);
  G.add(bake(S));
  addCols('gym',[
    [0,x0-0.16,x1,z0-0.16,z0],[0,x0-0.16,x0,z0,z1+0.16],[0,x1,x1+0.16,z0,z1+0.16],
    [0,x0,11.2,z1,z1+0.16],[0,12.6,x1,z1,z1+0.16],
    ...GYM_TREAD.map(tx=>[0,tx-0.37,tx+0.37,-9.45,-7.95]),
    [0,11.2,13.0,-5.42,-4.98],[0,14.1,15.1,-4.48,-4.02]]);
  return G;
}
function buildUpperFloor(f){
  if(floorRoots[f]&&floorRoots[f].userData.shell) return;
  const G=floorRoot(f), S=new THREE.Group(); G.userData.shell=true;
  S.add(mesh(box(13.8,0.4,2.62-BACK-0.08),tmat('corridor',7,6.9),0,-0.2,(2.62+BACK+0.08)/2));
  S.add(mesh(box(1.4,0.4,1.6),tmat('corridor',1,1),5.6,-0.2,3.4));
  addRunners(S,true);
  const tallH=2.7;
  const UL=2.7-BACK+0.08, UC=(2.7+BACK-0.08)/2;
  S.add(mesh(box(14.12,tallH,0.16),M.facade,0,tallH/2,BACK,true)); S.add(mesh(box(0.16,tallH,UL),M.facade,-6.98,tallH/2,UC,true));
  S.add(mesh(box(14.2,0.18,0.24),M.trim,0,tallH+0.09,BACK,true)); S.add(mesh(box(0.24,0.18,UL),M.trim,-6.98,tallH+0.09,UC,true));
  S.add(mesh(box(0.16,0.9,UL),M.facade,6.98,0.45,UC,true)); S.add(mesh(box(0.24,0.08,UL),M.gold,6.98,0.93,UC));
  // slab edge band (visible from the lobby)
  S.add(mesh(box(13.9,0.4,0.2),M.facade,0,-0.215,2.72,true));
  [[-6.9,4.9],[6.3,6.9]].forEach(([a,b])=>{ const w=b-a; const gl=mesh(box(w,0.8,0.04),M.glass,(a+b)/2,0.45,2.66); S.add(gl); S.add(mesh(box(w,0.06,0.09),M.gold,(a+b)/2,0.88,2.66)); });
  const lbl=signPlane(`${f+1}. KAT`,1.4,0.36,{bg:'#14263a',fg:'#ffd76a',font:'800 70px "Baloo 2"'}); lbl.position.set(-5.3,0.5,2.71); S.add(lbl);
  bigPlant(S,-6.45,2.1,0.85);
  G.add(bake(S)); addCeiling(f,BACK+0.08,2.6);
  addCols('floor'+f,[
    [f,-7.06,7.06,BACK-0.08,BACK+0.08],[f,-7.06,-6.9,BACK-0.08,2.7],[f,6.9,7.06,BACK-0.08,2.7],
    ...[[-6.55,CORR[1]],[6.55,CORR[1]],[-6.55,CORR[2]],[6.55,CORR[2]]].map(([x,z])=>[f,x-0.3,x+0.3,z-0.3,z+0.3]),
    [f,-6.9,4.9,2.6,2.72],[f,6.3,6.9,2.6,2.72],[f,-6.75,-6.15,1.85,2.4]]);
}
function buildElevator(){
  if(elevShaft){ elevShaft.parent.remove(elevShaft); }
  const n=floorsBuilt(), G=new THREE.Group(); world.add(G); elevShaft=G;
  const top=(n-1)*FH+2.8;
  [[4.95,2.9],[6.25,2.9],[4.95,4.15],[6.25,4.15]].forEach(([x,z])=>G.add(mesh(cyl(0.05,0.05,top,8),M.gold,x,top/2,z,true)));
  const gl=(w,d,x,z)=>{ const m=mesh(box(w,top,d),M.glass,x,top/2,z); m.castShadow=false; G.add(m); };
  gl(0.04,1.25,4.95,3.52); gl(0.04,1.25,6.25,3.52); gl(1.3,0.04,5.6,4.15);
  for(let f=0;f<n;f++) G.add(mesh(box(1.4,0.06,0.2),M.gold,5.6,f*FH+2.45,2.9));
  G.add(mesh(rbox(1.5,0.22,1.45,.05),M.trim,5.6,top+0.1,3.52,true));
  if(!cabin){ cabin=new THREE.Group();
    cabin.add(mesh(box(1.2,0.06,1.15),mat(0x3a3f4a),0,0.03,0)); cabin.add(mesh(box(1.2,0.06,1.15),M.gold,0,2.3,0));
    cabin.add(mesh(box(1.18,2.25,0.04),mat(0xd9c9a8),0,1.16,0.56)); cabin.add(mesh(box(0.04,1.0,1.1),M.gold,-0.58,1.0,0)); cabin.add(mesh(box(0.04,1.0,1.1),M.gold,0.58,1.0,0));
    cabin.position.set(5.6,0,3.52); }
  world.add(cabin);
  const cols=[]; for(let f=0;f<n;f++) cols.push([f,4.88,5.02,2.85,4.2],[f,6.18,6.32,2.85,4.2],[f,4.9,6.3,4.1,4.24]);
  addCols('elev',cols);
  return G;
}
function buildXmas(){
  const g=new THREE.Group(); g.position.set(4.3,0,4.35); floorRoot(0).add(g);
  g.add(mesh(cyl(0.3,0.36,0.3,12),mat(0x8a2f3a),0,0.15,0));
  [[0.7,0.8,0.65],[0.55,0.7,1.1],[0.38,0.55,1.5]].forEach(([r,h,y])=>g.add(mesh(cone(r,h,14),mat(0x2f6b3a),0,y,0,true)));
  for(let k=0;k<16;k++){ const a=k*2.4, y=0.45+k/16*1.15, r=0.62-k/16*0.42, col=[0xd94a3d,0xf2c14e,0x4aa3df,0xffffff][k%4];
    g.add(mesh(sph(0.05,8,6),mat(col,{emissive:col,emissiveIntensity:.7}),Math.cos(a)*r,y,Math.sin(a)*r)); }
  const st=mesh(new THREE.OctahedronGeometry(0.12),mat(0xffd36a,{emissive:0xd4a24c,emissiveIntensity:1}),0,1.86,0); st.userData.spin=true; g.add(st);
  [[0.5,0.3],[-0.4,0.5],[0.2,-0.55]].forEach(([a,b],k)=>{ g.add(mesh(rbox(0.28,0.22,0.28,.03),mat([0xe0574f,0x2e86c1,0x27ae60][k]),a,0.11,b,true)); g.add(mesh(box(0.3,0.04,0.06),M.gold,a,0.2,b)); });
  g.visible=false; xmasTree=g;
}

// =====================================================================
// ROOMS
// =====================================================================
const ROOM_PAL={
  eco:  {floor:'carpetBeige',wall:'wallpaper',      duvet:0x86b2d6,accent:0x5b82a6,frame:'woodLight',bedW:1.0,rug:'rugBlue'},
  dlx:  {floor:'woodLight',  wall:'wallpaperStripe',duvet:0xe9a45e,accent:0x9a5d2e,frame:'wood',     bedW:1.1,rug:'rugGreen'},
  suite:{floor:'woodDark',   wall:'wallpaperTeal',  duvet:0x9b3656,accent:0xe0a93a,frame:'woodDark', bedW:1.25,rug:'rugRed'}};
const roomRT={};
function RT(id){ return roomRT[id]||(roomRT[id]={id,group:null,parts:null,guest:null,req:null,task:null,cleanP:0,fixP:0}); }
function bedGeom(t){ const bw=ROOM_PAL[t].bedW; return {bw,bx:-1.38+bw/2,right:-1.38+bw}; }
function roomLocal(id,lx,lz){ const ri=roomInfo(id); return {x:ri.x+lx,z:ri.z+lz,f:ri.f}; }
function roomSpots(id){ const ri=roomInfo(id), t=state.rooms[id].type, b=bedGeom(t);
  return {door:{x:ri.x,z:ri.z+1.95,f:ri.f}, enter:{x:ri.x,z:ri.z+0.95,f:ri.f}, stand:{x:ri.x+0.22,z:ri.z+0.3,f:ri.f},
    bed:{x:ri.x+b.bx,z:ri.z+0.45,f:ri.f}, ns:{x:ri.x+b.right+0.23,z:ri.z-1.19,f:ri.f}}; }
const TIP_X=1.05, TIP_Z=RD/2+0.34;   // tips wait on a tray just outside the door
function buildRoomVisual(id,pop){
  const s=state.rooms[id], ri=roomInfo(id), P=ROOM_PAL[s.type], R=RT(id), t=s.type, b=bedGeom(t);
  if(R.group&&R.group.parent) R.group.parent.remove(R.group);
  const S=new THREE.Group(), hd=RD/2;
  S.add(mesh(box(RW,0.04,RD),tmat(P.floor,2,2),0,0.02,0));
  S.add(mesh(box(0.72,0.05,0.93),tmat('tile',1,1),1.1,0.026,-0.93));
  const wm=s.theme&&RTHEMES[s.theme]?themedWall(P.wall,s.theme):tmat(P.wall,2,1.2), duv=s.theme&&RTHEMES[s.theme]?RTHEMES[s.theme].duvet:P.duvet;
  S.add(mesh(box(RW,2.4,0.12),wm,0,1.2,-hd-0.06,true));
  S.add(mesh(box(RW,0.08,0.16),M.white,0,2.44,-hd-0.06));
  S.add(mesh(box(RW-0.1,0.12,0.03),mat(0xefe6d6),0,0.06,-hd+0.015));
  [-1,1].forEach(sd=>{ S.add(mesh(box(0.12,1.1,RD),wm,sd*1.44,0.55,0,true)); S.add(mesh(box(0.16,0.06,RD+0.02),M.white,sd*1.44,1.13,0)); });
  [-1,1].forEach(sd=>{ S.add(mesh(box(0.8,0.36,0.12),wm,sd*1.1,0.18,hd-0.06,true)); S.add(mesh(box(0.82,0.05,0.16),M.white,sd*1.1,0.385,hd-0.06)); });
  [-0.7,0.7].forEach(x=>{ S.add(mesh(box(0.1,0.52,0.18),M.trim,x,0.26,hd-0.06,true)); S.add(mesh(sph(0.05,8,6),M.gold,x,0.54,hd-0.06)); });
  // window + curtains
  S.add(mesh(box(1.0,0.85,0.04),M.window,0.25,1.5,-hd+0.02));
  S.add(mesh(box(1.1,0.06,0.07),M.white,0.25,1.95,-hd+0.04)); S.add(mesh(box(1.1,0.06,0.07),M.white,0.25,1.05,-hd+0.04));
  S.add(mesh(box(0.05,0.85,0.06),M.white,0.25,1.5,-hd+0.04));
  [-0.38,0.88].forEach(x=>S.add(mesh(rbox(0.24,1.25,0.06,.02),mat(P.accent,{roughness:.95}),x,1.4,-hd+0.07)));
  const rod=mesh(cyl(0.02,0.02,1.5,6),M.gold,0.25,2.05,-hd+0.08); rod.rotation.z=Math.PI/2; S.add(rod);
  // bathroom
  S.add(mesh(box(0.1,1.1,0.95),wm,0.72,0.55,-0.93,true)); S.add(mesh(box(0.38,1.1,0.1),wm,0.9,0.55,-0.45,true));
  S.add(mesh(cyl(0.16,0.13,0.36,14),M.white,1.22,0.18,-1.02,true)); S.add(mesh(cyl(0.17,0.17,0.04,14),M.white,1.22,0.38,-1.02));
  S.add(mesh(rbox(0.36,0.42,0.16,.04),M.white,1.22,0.5,-1.3,true));
  S.add(mesh(rbox(0.28,0.08,0.22,.03),M.white,0.95,0.78,-1.26)); S.add(mesh(cyl(0.05,0.07,0.74,8),M.white,0.95,0.37,-1.28));
  S.add(mesh(box(0.28,0.36,0.02),mat(0xcfe3ee,{metalness:.9,roughness:.1}),0.95,1.25,-1.39));
  const tp=mesh(cyl(0.05,0.05,0.1,10),M.white,1.36,0.62,-0.72); tp.rotation.z=Math.PI/2; S.add(tp);
  // bed
  const fr=tmat(P.frame,1,1);
  S.add(mesh(rbox(b.bw+0.06,0.28,2.05,.05),fr,b.bx,0.14,-0.33,true));
  S.add(mesh(rbox(b.bw+0.16,0.95,0.1,.04),fr,b.bx,0.62,-1.34,true));
  if(t==='suite') S.add(mesh(rbox(b.bw,0.6,0.04,.03),mat(0x6e2440,{roughness:.9}),b.bx,0.68,-1.28));
  if(t!=='eco') S.add(mesh(box(b.bw+0.16,0.05,0.12),M.gold,b.bx,1.11,-1.34));
  S.add(mesh(rbox(b.bw-0.02,0.17,1.95,.06),M.white,b.bx,0.36,-0.33,true));
  // nightstand + lamp base
  const nsx=b.right+0.23;
  S.add(mesh(rbox(0.4,0.42,0.38,.03),fr,nsx,0.21,-1.19,true)); S.add(mesh(box(0.3,0.02,0.02),M.gold,nsx,0.3,-0.99));
  S.add(mesh(cyl(0.035,0.06,0.2,10),M.gold,nsx-0.05,0.52,-1.24));
  // type extras
  S.add(mesh(rbox(1.15,0.016,1.0,.08),tmat(P.rug),0.12,0.045,0.55));
  const cols=[];
  if(t==='eco'){
    S.add(mesh(rbox(0.42,0.06,0.42,.04),fr,0.96,0.44,0.86)); S.add(mesh(rbox(0.42,0.46,0.06,.03),fr,0.96,0.7,1.05,true));
    [[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]].forEach(([a,c])=>S.add(mesh(cyl(0.02,0.02,0.42,6),M.dark,0.96+a,0.21,0.86+c)));
    cols.push([0.72,1.2,0.62,1.12]);
  }
  if(t==='dlx'){
    S.add(mesh(rbox(0.34,0.5,0.62,.03),fr,1.26,0.25,0,true)); S.add(mesh(box(0.05,0.42,0.7),M.dark,1.38,0.82,0,true)); S.add(mesh(box(0.02,0.36,0.62),mat(0x223344,{emissive:0x10202e,emissiveIntensity:1}),1.35,0.82,0));
    const ch=new THREE.Group(); ch.position.set(1.0,0,0.85); ch.rotation.y=-0.7; S.add(ch);
    ch.add(mesh(rbox(0.56,0.26,0.56,.1),mat(0x6a8f7a,{roughness:.95}),0,0.22,0,true)); ch.add(mesh(rbox(0.56,0.5,0.14,.06),mat(0x6a8f7a,{roughness:.95}),0,0.48,-0.22,true));
    cols.push([1.08,1.44,-0.32,0.32],[0.72,1.28,0.57,1.13]);
  }
  if(t==='suite'){
    const sm=mat(0x2f4a78,{roughness:.95});
    S.add(mesh(rbox(0.44,0.32,1.5,.1),sm,1.2,0.2,0.4,true)); S.add(mesh(rbox(0.14,0.5,1.5,.06),sm,1.38,0.45,0.4,true));
    [-0.3,1.1].forEach(z=>S.add(mesh(rbox(0.44,0.42,0.14,.06),sm,1.2,0.3,z)));
    S.add(mesh(cyl(0.22,0.22,0.04,20),tmat('marble'),0.72,0.36,0.4)); S.add(mesh(cyl(0.03,0.03,0.34,8),M.gold,0.72,0.17,0.4));
    S.add(mesh(cyl(0.06,0.05,0.14,10),M.gold,0.72,0.45,0.4)); S.add(mesh(cyl(0.02,0.02,0.2,6),mat(0x1f5e3a),0.72,0.58,0.4));
    [-0.9,0.9].forEach(x=>{ S.add(mesh(box(0.08,0.2,0.05),M.gold,x,1.9,-1.37)); });
    cols.push([1.0,1.44,-0.4,1.2]);
  }
  // decor
  if(s.decor.art){ S.add(mesh(box(0.8,0.52,0.04),M.gold,b.bx,1.6,-1.38)); const a=mesh(plane(0.72,0.44),new THREE.MeshStandardMaterial({map:tex('art'+(id%4)),roughness:.6}),b.bx,1.6,-1.355); S.add(a); }
  if(s.decor.plant){ bigPlant(S,-1.25,1.05,0.66); cols.push([-1.44,-1.06,0.85,1.28]); }
  if(s.decor.bar){ S.add(mesh(rbox(0.3,0.46,0.32,.03),mat(0x2b2f36,{metalness:.3,roughness:.4}),-0.88,0.23,1.02,true)); S.add(mesh(box(0.02,0.2,0.02),M.gold,-0.75,0.3,1.19)); S.add(mesh(box(0.18,0.05,0.01),mat(0x7fffd4,{emissive:0x33ccaa,emissiveIntensity:.8}),-0.88,0.4,1.185)); cols.push([-1.04,-0.72,0.86,1.2]); }
  if(s.decor.aroma) [0,1,2].forEach(k=>{ S.add(mesh(cyl(0.025,0.025,0.07+k*0.02,8),mat(0xfff3d0),nsx+0.08-k*0.06,0.46+k*0.01,-1.08)); S.add(mesh(sph(0.012,6,4),M.lampOn,nsx+0.08-k*0.06,0.51+k*0.02,-1.08)); });
  if(s.decor.welcome){ S.add(mesh(cyl(0.035,0.04,0.26,8),mat(0x2e5e3e,{roughness:.2,metalness:.2}),b.bx+0.25,0.66,0.55)); S.add(mesh(rbox(0.3,0.05,0.22,.02),mat(0xe8c77a),b.bx-0.1,0.55,0.55)); }
  if(s.theme&&RTHEMES[s.theme]){ const em=signPlane(RTHEMES[s.theme].e,0.34,0.34,{w:128,h:128,font:'90px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'}); em.position.set(1.15,1.95,-hd+0.03); S.add(em); }
  // number plate
  const pl=mesh(plane(0.36,0.18),new THREE.MeshBasicMaterial({map:textTex(String(id),{w:128,h:64,bg:'#e0a93a',fg:'#2a1c00',r:10,font:'800 44px "Baloo 2"'})}),-1.0,0.22,hd+0.005); S.add(pl);
  const G=new THREE.Group(); G.userData.roomId=id; G.add(bake(S)); const win=roomWindowMesh(G);
  // ---- dynamic parts ----
  const made=new THREE.Group(), messy=new THREE.Group(), flies=new THREE.Group(), broken=new THREE.Group(), tip=new THREE.Group();
  made.add(mesh(rbox(b.bw+0.03,0.08,1.35,.05),mat(duv,{roughness:.95}),b.bx,0.47,0.03,true));
  made.add(mesh(rbox(b.bw+0.05,0.085,0.24,.04),mat(P.accent,{roughness:.9}),b.bx,0.48,0.42));
  (b.bw>1.05?[-0.27,0.27]:[0]).forEach(dx=>made.add(mesh(rbox(b.bw>1.05?0.44:0.62,0.12,0.3,.06),M.white,b.bx+dx,0.5,-1.07,true)));
  made.add(mesh(rbox(0.3,0.06,0.22,.03),M.white,b.bx+0.2,0.53,0.3)); made.add(mesh(rbox(0.28,0.05,0.2,.03),mat(0xf2b632),b.bx+0.2,0.58,0.3));
  const md=mesh(rbox(b.bw+0.05,0.1,1.25,.05),mat(duv,{roughness:.95}),b.bx+0.12,0.47,0.2,true); md.rotation.y=0.4; md.rotation.z=0.08; messy.add(md);
  messy.add(mesh(rbox(0.5,0.12,0.3,.06),M.white,b.bx-0.1,0.5,-1.0,true));
  const pw=mesh(rbox(0.45,0.12,0.3,.06),M.white,0.3,0.12,0.2); pw.rotation.set(0.2,0.7,0.1); messy.add(pw);
  [[0.1,0.9,0xe0574f],[-0.3,1.0,0x2e86c1],[0.35,-0.2,0x27ae60]].forEach(([x,z,c])=>{ const cl=mesh(rbox(0.36,0.03,0.26,.02),mat(c,{roughness:1}),x,0.06,z); cl.rotation.y=rnd(0,3); messy.add(cl); });
  for(let k=0;k<5;k++) messy.add(mesh(new THREE.IcosahedronGeometry(0.05+Math.random()*0.03,0),mat(k%2?0xe8e4da:0xb9c7a3,{flatShading:true}),rnd(-0.1,0.6),0.07,rnd(-0.3,1.1)));
  const bot=mesh(cyl(0.04,0.05,0.22,8),mat(0x2e7d32,{transparent:true,opacity:.8}),0.45,0.06,0.75); bot.rotation.z=Math.PI/2; messy.add(bot);
  messy.add(decal('stain',0.8,0.6,0.1,0.05,0.2,0.8));
  for(let k=0;k<3;k++){ const fl=mesh(sph(0.025,6,4),M.dark,0,0,0); fl.userData.fly={ph:rnd(0,6),r:rnd(.15,.3),h:rnd(.7,1.1),sp:rnd(3,5)}; flies.add(fl); }
  flies.position.set(0.15,0,0.3);
  broken.add(decal('puddle',0.9,0.7,0.35,0.05,-0.2,0.9));
  for(let k=0;k<4;k++){ const sp=mesh(sph(0.03,6,4),new THREE.MeshBasicMaterial({color:0xfff27a}),nsx+rnd(-0.1,0.1),0.72+rnd(0,0.15),-1.22+rnd(-0.1,0.1)); sp.userData.spark=rnd(0,6); broken.add(sp); }
  tip.add(mesh(cyl(0.2,0.22,0.04,16),M.gold,TIP_X,0.02,TIP_Z)); for(let k=0;k<5;k++){ const bl=mesh(rbox(0.22,0.028,0.12,.01),k%2?M.bill:mat(0x7fc07e),TIP_X+rnd(-0.03,0.03),0.055+k*0.03,TIP_Z+rnd(-0.02,0.02)); bl.rotation.y=rnd(-0.5,0.5); tip.add(bl); }
  const shade=mesh(cyl(0.09,0.13,0.15,16),M.lampOff,nsx-0.05,0.68,-1.24); const glow=glowDecal(0.95,nsx-0.1,-0.9,0.05), glow2=glowDecal(1.5,0.1,0.1,0.055);
  G.add(made,messy,flies,broken,tip,shade,glow,glow2);
  G.position.set(ri.x,0,ri.z); floorRoot(ri.f).add(G);
  R.group=G; R.parts={made,messy,flies,broken,tip,shade,glow,glow2,win};
  // colliders (local -> world)
  const lc=[[-1.5,1.5,-1.52,-1.38],[-1.5,-1.38,-1.4,1.4],[1.38,1.5,-1.4,1.4],[-1.5,-0.7,1.28,1.42],[0.7,1.5,1.28,1.42],
    [0.67,1.5,-1.4,-0.4],[-1.4,b.right,-1.4,0.72],[b.right+0.02,b.right+0.44,-1.4,-0.98],...cols];
  addCols('room'+id,lc.map(([a,c,e,g])=>[ri.f,ri.x+a,ri.x+c,ri.z+e,ri.z+g]));
  if(pop) dropIn(G);
  applyRoomState(id);
}
function applyRoomState(id){
  const s=state.rooms[id], R=RT(id); if(!R.parts) return;
  const P=R.parts; P.made.visible=!s.dirty; P.messy.visible=s.dirty; P.flies.visible=s.dirty; P.broken.visible=s.broken; P.tip.visible=s.tip>0;
  const lit=!!R.guest&&R.guest.inRoom&&!s.broken&&!powerOut();
  P.shade.material=lit?M.lampOn:M.lampOff; P.glow.visible=lit; if(P.glow2) P.glow2.visible=lit; if(P.win) P.win.material=R.guest?M.windowLit:M.window;
}
