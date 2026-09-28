
// =====================================================================
// MG6-4 · GRAFİK 4: gece sokak lambası ışık konileri, havuz altı ışığı,
// yağmurda yerde sıçrama halkaları, karda ayak izleri, şehir açılış
// sinematiği, yoldan geçen araba sesi
// =====================================================================
let lampCones=[], coneMat=null, splashG=null, splashes=[], prints=[], printT=0, engineLoop=null;
function buildLampCones(){
  if(coneMat||gfxLevel()==='low') return;
  coneMat=new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const pts=[[-2.1,10.9],[2.1,10.9],[-10.5,10.9],[10.5,10.9]];
  pts.forEach(([x,z])=>{ const c=mesh(new THREE.ConeGeometry(1.25,2.7,20,1,true),coneMat,x,1.4,z); c.castShadow=false; c.receiveShadow=false; outdoor.add(c); lampCones.push(c); });
}
function buildSplashes(){ if(splashG||gfxLevel()==='low') return; splashG=new THREE.Group(); outdoor.add(splashG);
  const m=new THREE.MeshBasicMaterial({color:0xcfe6ff,transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<40;i++){ const r=mesh(new THREE.RingGeometry(0.05,0.08,14),m.clone(),0,0.06,0); r.rotation.x=-Math.PI/2; splashG.add(r); splashes.push(r); placeSplash(r); r.userData.t=Math.random(); } }   // başlangıçta da dış mekâna yerleştir (yoksa lobide belirir)
function placeSplash(r){ const zones=[[-17,17,8.5,11.2],[-17,17,11.6,12.9],[-17,17,13.2,17.2],[8.3,16,4.2,7]]; const z=rand(zones); r.position.set(rnd(z[0],z[1]),z===zones[2]?0.03:0.06,rnd(z[2],z[3])); r.userData.t=0; }
function updateSplashes(dt){ if(!splashG) return; const on=state.weather==='rain'&&(viewFloor===0||fpMode); splashG.visible=on; if(!on) return;
  splashes.forEach(r=>{ r.userData.t+=dt*1.8; if(r.userData.t>=1){ placeSplash(r); } const t=r.userData.t; r.scale.setScalar(0.4+t*2.2); r.material.opacity=0.55*(1-t); }); }
// karda ayak izleri
let printMat=null;
function updatePrints(dt){
  if(gfxLevel()==='low') return; const snowOn=!!(snowCover&&snowCover.visible&&snowCover.material.opacity>0.3);
  if(snowOn&&player.f===0&&(player.moving||player.path)&&!player.riding){ printT-=dt; if(printT<=0){ printT=0.28;
      if(!printMat) printMat=new THREE.MeshBasicMaterial({color:0x9aa7b5,transparent:true,opacity:0.5,depthWrite:false});
      const side=(prints.length%2?1:-1)*0.1, a=player.rot, x=player.x+Math.cos(a)*side, z=player.z-Math.sin(a)*side;
      const pm=mesh(plane(0.12,0.2),printMat.clone(),x,0.075,z); pm.rotation.x=-Math.PI/2; pm.rotation.z=a; outdoor.add(pm); prints.push({m:pm,t:14}); if(prints.length>60){ const o=prints.shift(); outdoor.remove(o.m); } } }
  for(let i=prints.length-1;i>=0;i--){ const p=prints[i]; p.t-=dt; p.m.material.opacity=Math.max(0,Math.min(0.5,p.t/14*0.5)); if(p.t<=0){ outdoor.remove(p.m); prints.splice(i,1); } }
}
// havuz altı ışığı gece
function updatePoolLight(){ if(typeof poolWater==='undefined'||!poolWater||!poolWater.material) return; const m=poolWater.material; if(m.userData.baseEI==null){ m.userData.baseEI=m.emissiveIntensity; }
  m.emissiveIntensity=m.userData.baseEI+nightF*0.9; }
// araba sesi: yakından geçen arabalar
function updateCarSound(dt){ if(!Sound.ctx||state.sound===false||!SMP.engine) return; if(!engineLoop){ const c=Sound.ctx, s=c.createBufferSource(), g=c.createGain(); s.buffer=SMP.engine; s.loop=true; g.gain.value=0; s.connect(g); g.connect(Sound.sfx); s.start(); engineLoop={s,g}; }
  let best=1e9; if(player.f===0||fpMode) cars.forEach(c=>{ const d=Math.hypot(c.g.position.x-cam.tx,c.g.position.z-cam.tz); if(d<best) best=d; });
  const v=best<24?clamp(1-best/24,0,1)*0.12:0; engineLoop.g.gain.value+=(v-engineLoop.g.gain.value)*Math.min(1,dt*3); }
// şehir açılış sinematiği (yeni şehirde ilk gün)
function cityIntro(){ if(state.introDone===state.city||state.tut<TUT.length||state.sandbox) return; state.introDone=state.city; markSave(); const P=typeof cityPlan==='function'?cityPlan():null;
  setTimeout(()=>{ cinematic(5); banner(`${city().e||''} ${city().name}`,P?`${P.n} · ${cityCapacity()} oda yeri`:'Yeni otelin seni bekliyor'); },1500); }
// çatı gece barı: parapet boyunca sarkan renkli ampuller (akşam yanar)
let roofLightG=null, roofLightMat=null;
function buildRoofLights(){ if(roofLightG||!built('roof')) return; roofLightMat=new THREE.MeshStandardMaterial({color:0xfff0c0,emissive:0xffc860,emissiveIntensity:0});
  const g=new THREE.Group(), geo=sph(0.06,8,6), wire=M.dark, spans=[[-6.9,2.62,6.9,2.62],[-6.9,BACK+0.1,6.9,BACK+0.1],[-6.9,BACK+0.1,-6.9,2.62],[6.9,BACK+0.1,6.9,2.62]];
  const pts=[]; spans.forEach(([x0,z0,x1,z1])=>{ const L0=Math.hypot(x1-x0,z1-z0), n=Math.round(L0/0.45); for(let i=0;i<=n;i++){ const t=i/n, k=(t*L0/2.3)%1; pts.push([x0+(x1-x0)*t,1.55-0.22*Math.sin(Math.PI*k),z0+(z1-z0)*t]); } });
  // ampuller tek InstancedMesh (malzemesi paylaşılır → akşam yanıp söner); birleştirme (bake) malzemeyi değiştireceği için kullanılmaz
  if(THREE.InstancedMesh){ const im=new THREE.InstancedMesh(geo,roofLightMat,pts.length), o=new THREE.Object3D(); pts.forEach((q,i)=>{ o.position.set(q[0],q[1],q[2]); o.updateMatrix(); im.setMatrixAt(i,o.matrix); }); g.add(im); }
  else pts.forEach(q=>g.add(mesh(geo,roofLightMat,q[0],q[1],q[2])));
  [[-6.9,2.62],[6.9,2.62],[-6.9,BACK+0.1],[6.9,BACK+0.1]].forEach(([x,z])=>g.add(mesh(cyl(0.025,0.025,1.6,6),wire,x,0.8,z)));
  floorRoot(ROOF).add(g); roofLightG=g; }
function updateRoofLights(){ if(!roofLightG){ if(built('roof')) buildRoofLights(); return; } const on=(typeof roofBarOn==='function'&&roofBarOn())||nightF>0.4; roofLightMat.emissiveIntensity=on?1.4+0.2*Math.sin(performance.now()/400):0; }
function bootGfx4(){ try{ buildLampCones(); buildSplashes(); cityIntro(); }catch(e){ console.warn('gfx4',e); } }
function updateGfx4(dt){
  if(coneMat){ const on=nightF>0.35&&!powerOut(); coneMat.opacity=on?0.1*nightF*(state.weather==='rain'?1.4:1):0; lampCones.forEach(c=>c.visible=on&&(viewFloor===0||fpMode)); }
  updateSplashes(dt); updatePrints(dt); updatePoolLight(); updateCarSound(dt); updateRoofLights();
}
