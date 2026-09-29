
// =====================================================================
// GRAFİK 5 (Yüksek kalite): lobide gerçek zemin yansıması ve havuzda su
// yansıması (THREE.Reflector, sahne bir kez daha aynadan çizilir), gece
// gerçek nokta ışıkları (sokak lambaları, restoran, çatı barı), güneşte
// lens parlaması (THREE.Lensflare). Reflector/Lensflare post-process
// dosyalarıyla birlikte CDN'den tembel yüklenir (POST_FILES).
// =====================================================================
let reflLobby=null, reflPool=null, lensG=null, nightLights=[], gfx5Ready=false;
function reflShader(op){ const S=THREE.Reflector.ReflectorShader; return {uniforms:Object.assign(THREE.UniformsUtils.clone(S.uniforms),{opacity:{value:op}}),vertexShader:S.vertexShader,
  fragmentShader:S.fragmentShader.replace('uniform vec3 color;','uniform vec3 color; uniform float opacity;').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4( blendOverlay( base.rgb, color ), opacity );')}; }
function makeRefl(w,d,x,y,z,op,col){
  const r=new THREE.Reflector(new THREE.PlaneGeometry(w,d),{clipBias:0.003,textureWidth:1024,textureHeight:512,color:col,shader:reflShader(op)});
  r.rotation.x=-Math.PI/2; r.position.set(x,y,z); r.material.transparent=true; r.material.depthWrite=false; r.renderOrder=1;
  // iki ayna birbirini çizmesin (iç içe render) ve karakter etiketleri/efektler çizilmesin
  // yansıma dokusu her karede değil, karede bir yenilenir (bir kare gecikme fark edilmez, maliyet yarıya iner)
  const ob=r.onBeforeRender; let fr=0; r.onBeforeRender=function(rd,sc,cm){ if((fr++&1)&&r.userData.warm) return; r.userData.warm=true; const o=r===reflLobby?reflPool:reflLobby; const ov=o&&o.visible; if(o) o.visible=false; ob.call(r,rd,sc,cm); if(o) o.visible=ov; };
  return r;
}
function buildReflectors(){
  if(reflLobby||typeof THREE.Reflector!=='function') return;
  reflLobby=makeRefl(13.6,4.7,0,0.012,5.05,0.26,0x8a8a8a); floorRoot(0).add(reflLobby);                 // lobi mermeri (ön hol)
  reflPool=makeRefl(5.7,3.5,12,0.085,1.7,0.5,0x9ab8c8); outdoor.add(reflPool);                          // havuz suyunun altında: gök ve palmiye yansır
}
// ---------- güneş parlaması ----------
function flareTex(sz,inner,outer,ring){ const c=document.createElement('canvas'); c.width=c.height=sz; const x=c.getContext('2d'), g=x.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
  g.addColorStop(0,inner); g.addColorStop(ring?0.55:0.35,ring?'rgba(255,255,255,0)':outer); if(ring){ g.addColorStop(0.7,outer); g.addColorStop(0.8,'rgba(255,255,255,0)'); } g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,sz,sz); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
function buildLensflare(){
  if(lensG||typeof THREE.Lensflare!=='function') return;
  const main=flareTex(256,'rgba(255,246,220,1)','rgba(255,200,120,0.35)'), ring=flareTex(128,'rgba(255,255,255,0)','rgba(255,220,160,0.5)',true), dot=flareTex(64,'rgba(255,255,255,0.8)','rgba(180,220,255,0.2)');
  lensG=new THREE.Lensflare(); lensG.addElement(new THREE.LensflareElement(main,190,0,new THREE.Color(0xffe6b8)));
  [[ring,60,0.55],[dot,28,0.7],[ring,90,0.9],[dot,40,1.1],[ring,36,1.3]].forEach(([t,s,d])=>lensG.addElement(new THREE.LensflareElement(t,s,d,new THREE.Color(0xfff0d0))));
  scene.add(lensG);
}
// ---------- gece nokta ışıkları ----------
function buildNightLights(){
  if(nightLights.length) return;
  const mk=(x,y,z,col,dist,k)=>{ const l=new THREE.PointLight(col,0,dist,2); l.position.set(x,y,z); scene.add(l); nightLights.push({l,k}); };
  [[-2.1,10.9],[2.1,10.9],[-10.5,10.9],[10.5,10.9]].forEach(([x,z])=>mk(x,2.7,z,0xffc878,6,0.75));      // sokak lambaları
  mk(-12,2.5,2.4,0xffd9a0,9,1.1);                                                                       // restoran
  mk(2.7,ROOF*FH+2.3,-4.3,0xffcf8a,8,1.3);                                                              // çatı barı
}
function bootGfx5(){ try{ if(!gfxHigh()) return; buildNightLights(); if(typeof THREE.Reflector==='function'){ buildReflectors(); buildLensflare(); gfx5Ready=true; } }catch(e){ console.warn('gfx5',e); gfx5Ready=true; } }   // Reflector/Lensflare post dosyalarıyla gelir: gelene kadar her karede yeniden dene
function updateGfx5(){
  const hi=gfxHigh(); if(hi&&!gfx5Ready&&typeof THREE.Reflector==='function') bootGfx5();
  const ground=viewFloor===0||(fpMode&&player&&player.f===0), nf=typeof nightF==='number'?nightF:0, po=powerOut()?0:1;
  const near=(x,z,r)=>Math.hypot(cam.tx-x,cam.tz-z)<r;   // uzaktan bakarken yansıma kapalı (maliyet)
  if(reflLobby){ reflLobby.visible=hi&&ground&&!state.lowFx&&near(0,5,26); }
  if(reflPool){ reflPool.visible=hi&&ground&&!state.lowFx&&built('pool')&&near(12,1.7,22); }
  if(lensG){ lensG.position.copy(sun.position); lensG.visible=hi&&nf<0.6&&state.weather==='sun'; }
  nightLights.forEach(({l,k})=>{ l.intensity=hi?k*nf*po*(l.position.y>ROOF*FH?(roofOpen()?1:0):1):0; });
}
