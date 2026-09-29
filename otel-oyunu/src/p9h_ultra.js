// =====================================================================
// MG11-A: ULTRA grafik seviyesi (state.gfx='ultra' = Yüksek + ekstralar)
// - Birinci şahısta bokeh alan derinliği (THREE.BokehPass; odak merkezdeki nesneye ray ile)
// - SMAA kenar yumuşatma (MSAA yoksa), film greni (GradeShader grain/time)
// - Lobi girişinde gün ışığı huzmeleri (additive düzlemler, nightF ile söner)
// - Piksel oranı 2.0 (applyGfx), FPS düşerse ultra → high (p77 fps kalkanı)
// Reflector/gece ışıkları/lens parlaması high ile aynı (gfxHigh()).
// =====================================================================
let bokehPass=null, smaaPass=null, shaftG=null, ultraT=0, focusD=6;
function ultraBokeh(){ try{ if(typeof THREE.BokehPass!=='function') return null; const p=new THREE.BokehPass(scene,camera,{focus:6,aperture:0.0035,maxblur:0.006,width:window.innerWidth,height:window.innerHeight}); p.enabled=false; return p; }catch(e){ return null; } }
function ultraSmaa(w,h,ms){ try{ if(ms||typeof THREE.SMAAPass!=='function') return null; const p=new THREE.SMAAPass(w,h); p.enabled=gfxUltra(); return p; }catch(e){ return null; } }
// her karede renderFrame'den: geçişleri seviyeye göre aç/kapat
function ultraFrame(){
  if(bokehPass){ bokehPass.enabled=gfxUltra()&&!!fpMode; const U=bokehPass.uniforms; if(bokehPass.enabled&&U&&U.focus) U.focus.value+=(focusD-U.focus.value)*0.12; }
  if(smaaPass) smaaPass.enabled=gfxUltra();
  if(gradePass&&gradePass.uniforms.grain){ gradePass.uniforms.grain.value=gfxUltra()?0.028:0; gradePass.uniforms.time.value=(performance.now()%100000)/41; }
}
// ---------- ışık huzmeleri ----------
function shaftTex(){ const c=document.createElement('canvas'); c.width=64; c.height=256; const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,256); g.addColorStop(0,'rgba(255,244,214,0.55)'); g.addColorStop(0.55,'rgba(255,240,200,0.18)'); g.addColorStop(1,'rgba(255,240,200,0)');
  x.fillStyle=g; x.fillRect(0,0,64,256); const h=x.createLinearGradient(0,0,64,0); h.addColorStop(0,'rgba(0,0,0,1)'); h.addColorStop(0.25,'rgba(0,0,0,0)'); h.addColorStop(0.75,'rgba(0,0,0,0)'); h.addColorStop(1,'rgba(0,0,0,1)'); x.globalCompositeOperation='destination-out'; x.fillStyle=h; x.fillRect(0,0,64,256);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
function buildShafts(){ if(shaftG) return; shaftG=new THREE.Group(); const m=new THREE.MeshBasicMaterial({map:shaftTex(),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  [-2.6,-0.9,0.9,2.6].forEach((x,i)=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(0.9+(i%2)*0.3,4.8),m); p.position.set(x,1.7,L.inside.z-0.6-(i%2)*0.5); p.rotation.x=-0.62; p.renderOrder=6; shaftG.add(p); });
  shaftG.userData.mat=m; shaftG.visible=false; floorRoot(0).add(shaftG); }
function updateShafts(){ if(!shaftG) return; const on=gfxUltra()&&!state.lowFx&&viewFloor===0; const nf=typeof nightF==='number'?nightF:0; const tgt=on?0.34*(1-nf)*(typeof rainF==='number'?1-rainF*0.8:1):0;
  const m=shaftG.userData.mat; m.opacity+=(tgt-m.opacity)*0.08; shaftG.visible=m.opacity>0.01; }
// ---------- odak mesafesi (FP) ----------
function updateUltra(dt){ ultraT-=dt; if(ultraT>0) return; ultraT=0.12; updateShafts();
  if(!gfxUltra()||!fpMode||!bokehPass) return;
  try{ ray.setFromCamera(ndc.set(0,0),camera); ray.far=30; const hits=ray.intersectObjects(scene.children,true); const h=hits.find(x=>x.object.visible&&!(x.object.material&&x.object.material.transparent&&x.object.material.opacity<0.5)); focusD=h?clamp(h.distance,0.6,25):14; ray.far=Infinity; }catch(e){} }
function bootUltra(){ try{ buildShafts(); }catch(e){ console.warn('shafts',e); } }
function ultraHtml(){ return gfxUltra()?`<p class="note">🌟 Ultra: birinci şahısta alan derinliği, kenar yumuşatma, film greni, lobide ışık huzmeleri, piksel oranı 2.0. Oyun yavaşlarsa otomatik Yüksek'e iner.</p>`:''; }
