
// =====================================================================
// GRAFİK 3: prosedürel normal haritaları (mermer, ahşap, taş, halı…),
// dalgalı-parlayan su + kostik ışık deseni, gökyüzü kubbesi (güneş, bulut,
// saat rengine göre), karakterlere kenar ışığı, lobide ışık huzmesinde toz
// =====================================================================
function gfxOn(){ return gfxLevel()!=='low'; }
// yüzey → normal haritası şiddeti (textures p2 tmat0 içinde bağlanır)
function normalSpec(n){ return ({marble:.35,wood:.9,woodDark:.9,woodLight:.8,paving:1.3,stone:1.4,concrete:.8,asphalt:1.0,tile:.7,poolTile:.6,corridor:.6,runner:.8,runnerKilim:.8,sandTile:.9,rubber:.7,wallpaperStripe:.35,sand:1.1})[n]; }
const nrmCanvas={};
function normalCanvasOf(name){
  if(nrmCanvas[name]) return nrmCanvas[name]; const src=texCanvas[name]||(texCanvas[name]=drawTex(name)); if(!src) return null;
  const w=Math.min(src.width,512), h=Math.min(src.height,512), c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.drawImage(src,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data, out=x.createImageData(w,h), o=out.data, L=new Float32Array(w*h), s=normalSpec(name)||0.8;
  for(let i=0;i<w*h;i++) L[i]=(d[i*4]*0.299+d[i*4+1]*0.587+d[i*4+2]*0.114)/255;
  const at=(X,Y)=>L[((Y+h)%h)*w+((X+w)%w)];
  for(let y=0;y<h;y++) for(let X=0;X<w;X++){
    const dx=(at(X+1,y-1)+2*at(X+1,y)+at(X+1,y+1))-(at(X-1,y-1)+2*at(X-1,y)+at(X-1,y+1)), dy=(at(X-1,y+1)+2*at(X,y+1)+at(X+1,y+1))-(at(X-1,y-1)+2*at(X,y-1)+at(X+1,y-1));
    let nx=-dx*s*2.2, ny=-dy*s*2.2, nz=1; const l=Math.hypot(nx,ny,nz); nx/=l; ny/=l; nz/=l; const k=(y*w+X)*4; o[k]=(nx*0.5+0.5)*255; o[k+1]=(ny*0.5+0.5)*255; o[k+2]=(nz*0.5+0.5)*255; o[k+3]=255; }
  x.putImageData(out,0,0); return nrmCanvas[name]=c;
}
const nrmCache={};
function normalTex(name,rx,ry){ const key=name+'|'+rx+'|'+ry; if(nrmCache[key]) return nrmCache[key]; const cv=normalCanvasOf(name); if(!cv) return null;
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry); t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()); return nrmCache[key]=t; }
function withNormal(name,rx,ry,o){ try{ if(!normalSpec(name)||!gfxOn()||o.normalMap) return o; const n=normalTex(name,rx,ry); if(!n) return o; return Object.assign({normalMap:n,normalScale:new THREE.Vector2(0.9,0.9)},o); }catch(e){ return o; } }

// ---------- su: dalga normali + kostik ----------
let waveTex=null, causticTex=null, causticMats=[], waterMats=new Set();
function makeWaveNormal(){ const S=256, c=document.createElement('canvas'); c.width=c.height=S; const x=c.getContext('2d'), im=x.createImageData(S,S), o=im.data;
  const H=(u,v)=>Math.sin(u*6.283*3+Math.sin(v*6.283*2)*1.2)*0.5+Math.sin(v*6.283*4+u*6.283*1.5)*0.35+Math.sin((u+v)*6.283*5)*0.15;
  for(let y=0;y<S;y++) for(let X=0;X<S;X++){ const u=X/S, v=y/S, e=1/S, dx=(H(u+e,v)-H(u-e,v))*6, dy=(H(u,v+e)-H(u,v-e))*6; let nx=-dx, ny=-dy, nz=1; const l=Math.hypot(nx,ny,nz); const k=(y*S+X)*4; o[k]=(nx/l*0.5+0.5)*255; o[k+1]=(ny/l*0.5+0.5)*255; o[k+2]=(nz/l*0.5+0.5)*255; o[k+3]=255; }
  x.putImageData(im,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; }
function makeCaustic(){ const S=256, c=document.createElement('canvas'); c.width=c.height=S; const x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,S,S);
  x.strokeStyle='rgba(190,240,255,.55)'; x.lineWidth=2.2; x.lineCap='round';
  for(let k=0;k<70;k++){ const cx=Math.random()*S, cy=Math.random()*S, r=8+Math.random()*22; for(const [ox,oy] of [[0,0],[S,0],[-S,0],[0,S],[0,-S]]){ x.beginPath(); for(let a=0;a<=6.3;a+=0.35){ const rr=r*(0.75+0.35*Math.sin(a*3+k)); const px=cx+ox+Math.cos(a)*rr, py=cy+oy+Math.sin(a)*rr; a?x.lineTo(px,py):x.moveTo(px,py); } x.stroke(); } }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; }
function upgradeWater(){
  if(!gfxOn()) return; if(!waveTex) waveTex=makeWaveNormal(); if(!causticTex) causticTex=makeCaustic();
  scene.traverse(o=>{ const m=o.material; if(!o.isMesh||!m||!m.map||!m.map.userData||m.map.userData.tex!=='water'||waterMats.has(m)) return;
    m.normalMap=waveTex; m.normalScale=new THREE.Vector2(0.55,0.55); m.roughness=0.04; m.metalness=0.15; m.envMapIntensity=(m.envMapIntensity||1)*1.6; m.needsUpdate=true; waterMats.add(m);
    // kostik: suyun hemen altında, eklemeli ışık deseni
    const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const bb=g.boundingBox, w=(bb.max.x-bb.min.x)*o.scale.x, d=(bb.max.z-bb.min.z)*o.scale.z; if(w<2||d<2) return;
    const cm=new THREE.MeshBasicMaterial({map:causticTex.clone(),transparent:true,opacity:0.32,blending:THREE.AdditiveBlending,depthWrite:false}); cm.map.needsUpdate=true; cm.map.repeat.set(w/2.2,d/2.2);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w*0.98,d*0.98),cm); p.rotation.x=-Math.PI/2; p.position.set(o.position.x,o.position.y-0.08,o.position.z); o.parent.add(p); causticMats.push(cm); });
}

// ---------- gökyüzü kubbesi ----------
let skyMesh=null; const SKY_TOP=new THREE.Color(0x2f78d6), SKY_HOR=new THREE.Color(0xd8ecfa), SKY_DUSK=new THREE.Color(0xffa36b);
function buildSky(){
  if(skyMesh||!gfxOn()) return;
  const mt=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(0x5b9ee8)},hor:{value:new THREE.Color(0xcfe6f5)},sunDir:{value:new THREE.Vector3(0,1,0)},sunC:{value:new THREE.Color(0xfff2d0)},t:{value:0},cloud:{value:0.35},night:{value:0}},
    vertexShader:'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }',
    fragmentShader:`uniform vec3 top,hor,sunDir,sunC; uniform float t,cloud,night; varying vec3 vD;
      float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float a=0.,w=.5; for(int i=0;i<5;i++){ a+=w*n2(p); p*=2.03; w*=.5; } return a; }
      void main(){ vec3 d=normalize(vD); float y=max(d.y,0.); vec3 c=mix(hor,top,pow(y,0.55));
        float s=max(dot(d,normalize(sunDir)),0.); c+=sunC*(pow(s,900.)*6.+pow(s,24.)*0.35)*(1.-night);
        if(d.y>0.02){ vec2 uv=d.xz/(d.y+0.12)*1.6+vec2(t*0.012,t*0.004); float cl=smoothstep(0.52-cloud*0.3,0.85,fbm(uv)); vec3 cc=mix(vec3(1.),hor*0.9,0.25)*(1.-night*0.8)+sunC*pow(s,6.)*0.4; c=mix(c,cc,cl*smoothstep(0.02,0.25,d.y)*0.85); }
        if(night>0.3){ float st=step(0.9985,h2(floor(d.xz/(d.y+0.3)*420.))); c+=vec3(st)*smoothstep(0.3,1.,night)*y; }
        gl_FragColor=vec4(c,1.); }`});
  skyMesh=new THREE.Mesh(new THREE.SphereGeometry(230,32,16),mt); skyMesh.frustumCulled=false; skyMesh.renderOrder=-10; scene.add(skyMesh);
}
function updateSkyDome(t){
  if(!skyMesh) return; const U=skyMesh.material.uniforms, bg=scene.background&&scene.background.isColor?scene.background:null;
  skyMesh.position.copy(camera.position);
  if(bg){ const day=1-nightF, dusk=clamp(1-Math.abs(hourNow()-19)/1.6,0,1)+clamp(1-Math.abs(hourNow()-6.8)/1.3,0,1);
    U.hor.value.copy(bg).lerp(SKY_HOR,0.55*day).lerp(SKY_DUSK,0.55*dusk*day);
    U.top.value.copy(bg).lerp(SKY_TOP,0.75*day).multiplyScalar(0.55+0.45*day); }
  U.sunDir.value.copy(sun.position).sub(sun.target.position).normalize(); U.sunC.value.copy(sun.color); U.t.value=t; U.night.value=nightF;
  U.cloud.value=state.weather==='cloud'?0.8:state.weather==='rain'||state.weather==='snow'?1.0:0.35;
}

// ---------- karakterlere kenar ışığı ----------
let rimU=null;
function upgradeCharMat(){
  if(!CHAR_MAT||CHAR_MAT.userData.rim||!gfxOn()) return; CHAR_MAT.userData.rim=true; rimU={value:new THREE.Color(0xfff1d6)};
  CHAR_MAT.onBeforeCompile=sh=>{ sh.uniforms.rimC=rimU; sh.fragmentShader='uniform vec3 rimC;\n'+sh.fragmentShader.replace('#include <output_fragment>',
    'float rimF=1.0-abs(dot(normalize(normal),normalize(vViewPosition))); outgoingLight+=rimC*pow(rimF,2.6)*0.32;\n#include <output_fragment>'); };
  CHAR_MAT.needsUpdate=true;
}

// ---------- lobide ışık huzmesinde toz ----------
let dustPts=null;
function buildDust(){
  if(dustPts||gfxLevel()!=='high') return; const n=160, pos=new Float32Array(n*3); for(let i=0;i<n;i++){ pos[i*3]=rnd(-6.5,6.5); pos[i*3+1]=rnd(0.3,2.6); pos[i*3+2]=rnd(3,7.3); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  dustPts=new THREE.Points(g,new THREE.PointsMaterial({color:0xfff1c4,size:0.035,transparent:true,opacity:0.5,depthWrite:false,blending:THREE.AdditiveBlending})); floorRoot(0).add(dustPts);
}
function updateDust(dt,t){ if(!dustPts) return; const p=dustPts.geometry.attributes.position; for(let i=0;i<p.count;i++){ let y=p.getY(i)+dt*0.04*(0.5+(i%5)*0.2); if(y>2.7) y=0.3; p.setY(i,y); p.setX(i,p.getX(i)+Math.sin(t*0.3+i)*dt*0.02); } p.needsUpdate=true;
  dustPts.material.opacity=0.45*(1-nightF)*(state.weather==='sun'?1:0.4); dustPts.visible=viewFloor===0&&dustPts.material.opacity>0.03; }

// ---------- hooks ----------
let gfx3Scan=0;
function bootGfx3(){ try{ buildSky(); upgradeWater(); upgradeCharMat(); buildDust(); }catch(e){ console.warn('gfx3',e); } }
function updateGfx3(dt,t){
  updateSkyDome(t); updateDust(dt,t);
  if(waveTex){ waveTex.offset.set(t*0.02,t*0.013); } causticMats.forEach((m,i)=>{ m.map.offset.set(Math.sin(t*0.25+i)*0.3+t*0.015,Math.cos(t*0.2+i)*0.3); m.opacity=0.32*(0.35+0.65*(1-nightF)); });
  if(rimU){ rimU.value.setRGB(1,0.95,0.84).lerp(new THREE.Color(0.55,0.7,1),nightF); }
  gfx3Scan-=dt; if(gfx3Scan<=0){ gfx3Scan=3; upgradeWater(); upgradeCharMat(); }
}
