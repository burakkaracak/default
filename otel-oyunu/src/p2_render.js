
// =====================================================================
// RENDERER / SCENE / LIGHTS
// =====================================================================
const gameEl=$('game');
const LOWQ=Math.min(window.innerWidth,window.innerHeight)<560;
const GFX_DEFAULT=(IS_TOUCH||LOWQ)?'mid':'high';
function gfxLevel(){ return state.gfx||GFX_DEFAULT; }
const GFX0=gfxLevel();
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,GFX0==='low'?1:LOWQ?1.75:2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
gameEl.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8fc7e8);
scene.fog=new THREE.Fog(0x8fc7e8,48,110);
const camera=new THREE.PerspectiveCamera(33,1,0.5,260);
const hemi=new THREE.HemisphereLight(0xeaf4ff,0x6b5a45,0.62); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,1.2);
const SHM=GFX0==='low'?1024:GFX0==='mid'?2048:4096;
sun.castShadow=true; sun.shadow.mapSize.set(SHM,SHM);
sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.025;
Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:120});
scene.add(sun); scene.add(sun.target);
const fillLight=new THREE.DirectionalLight(0xbfd8ff,0.22); fillLight.position.set(-20,14,-8); scene.add(fillLight);
const lobbyLight=new THREE.PointLight(0xffc98a,0,14,1.6); lobbyLight.position.set(0,3.2,4.8); scene.add(lobbyLight);

// =====================================================================
// PROCEDURAL TEXTURES
// =====================================================================
const texCanvas={}, texCache={};
function noise(x,s,n,alpha,light){ for(let k=0;k<n;k++){ x.fillStyle=(light&&Math.random()<.5)?`rgba(255,255,255,${alpha})`:`rgba(0,0,0,${alpha})`; const z=1+Math.random()*2; x.fillRect(Math.random()*s,Math.random()*s,z,z); } }
function drawTex(name){
  const s=256, TS=GFX0==='high'?2:1, c=document.createElement('canvas'); c.width=c.height=s*TS; const x=c.getContext('2d'); x.scale(TS,TS);
  const plank=(hue,sat,l1,l2,rows=6)=>{
    const h=s/rows;
    for(let r=0;r<rows;r++){
      x.fillStyle=`hsl(${hue},${sat}%,${l1+Math.random()*(l2-l1)}%)`; x.fillRect(0,r*h,s,h);
      for(let g=0;g<14;g++){ x.strokeStyle=`rgba(0,0,0,${0.04+Math.random()*0.06})`; x.lineWidth=1; const y=r*h+Math.random()*h; x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(s*.3,y+Math.random()*4-2,s*.6,y+Math.random()*4-2,s,y); x.stroke(); }
      x.fillStyle='rgba(0,0,0,.32)'; x.fillRect(0,r*h,s,1.5);
      const sx=(r*97)%s; x.fillRect(sx,r*h,1.5,h);
    }
  };
  const carpet=(base,pattern)=>{ x.fillStyle=base; x.fillRect(0,0,s,s); noise(x,s,5000,.06,true);
    if(pattern){ x.strokeStyle=pattern; x.lineWidth=2; for(let i=-s;i<s*2;i+=32){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+s,s); x.stroke(); x.beginPath(); x.moveTo(i,s); x.lineTo(i+s,0); x.stroke(); } } };
  const grass=(h1,h2,l1)=>{ x.fillStyle=`hsl(${h1},40%,${l1}%)`; x.fillRect(0,0,s,s); for(let k=0;k<3800;k++){ x.strokeStyle=`hsla(${h1+Math.random()*(h2-h1)},${35+Math.random()*25}%,${l1-8+Math.random()*22}%,.6)`; const px=Math.random()*s, py=Math.random()*s; x.beginPath(); x.moveTo(px,py); x.lineTo(px+Math.random()*2-1,py-3-Math.random()*4); x.stroke(); } };
  if(name.startsWith('art')){
    const pal=[['#1f3b57','#e3b04b','#c8553d','#f2e8cf'],['#2d6a4f','#95d5b2','#f4a261','#fefae0'],['#3d2c8d','#c77dff','#ffd166','#f8f7ff'],['#6b2737','#e07a5f','#f2cc8f','#fdf6ec']][(+name.slice(3))%4];
    x.fillStyle=pal[3]; x.fillRect(0,0,s,s);
    for(let j=0;j<7;j++){ x.fillStyle=pal[j%3]; x.globalAlpha=.85;
      if(j%2){ x.beginPath(); x.arc(Math.random()*s,Math.random()*s,20+Math.random()*60,0,Math.PI*2); x.fill(); }
      else x.fillRect(Math.random()*s*.7,Math.random()*s*.7,30+Math.random()*90,20+Math.random()*70); }
    x.globalAlpha=1; return c;
  }
  switch(name){
    case 'wood': plank(24,42,28,36); break;
    case 'marbleWarm': case 'marbleDark': {
      const dk=name==='marbleDark'; x.fillStyle=dk?'#3b3f46':'#efe0c4'; x.fillRect(0,0,s,s); noise(x,s,2500,.04,true);
      for(let v=0;v<16;v++){ x.strokeStyle=dk?`rgba(235,240,245,${.08+Math.random()*.14})`:`rgba(140,95,55,${.08+Math.random()*.12})`; x.lineWidth=.5+Math.random()*1.6; x.beginPath(); x.moveTo(Math.random()*s,0); x.bezierCurveTo(Math.random()*s,s*.3,Math.random()*s,s*.6,Math.random()*s,s); x.stroke(); }
      x.strokeStyle=dk?'#2a2d33':'#d9c29a'; x.lineWidth=2; [[0,0],[1,0],[0,1],[1,1]].forEach(([a,b])=>x.strokeRect(a*s/2+1,b*s/2+1,s/2-2,s/2-2)); break; }
    case 'sandTile': { x.fillStyle='#eddcb6'; x.fillRect(0,0,s,s); noise(x,s,5000,.05,true); x.strokeStyle='#cdb68a'; x.lineWidth=2.5; for(let i=0;i<=s;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); }
      x.fillStyle='rgba(22,135,127,.35)'; for(let i=32;i<s;i+=64) for(let j=32;j<s;j+=64){ x.save(); x.translate(i,j); x.rotate(Math.PI/4); x.fillRect(-7,-7,14,14); x.restore(); } break; }
    case 'slate': { x.fillStyle='#4a4d52'; x.fillRect(0,0,s,s); const rows=5, h=s/rows;
      for(let r=0;r<rows;r++){ let px=-(r%2)*30; while(px<s){ const w=40+Math.random()*50, g=90+Math.random()*40|0; x.fillStyle=`rgb(${g},${g-2},${g-6})`; x.fillRect(px+2,r*h+2,w-4,h-4); px+=w; } } noise(x,s,6000,.08,true); break; }
    case 'runnerKilim': case 'runnerSlate': case 'runnerLeaf': case 'runnerPlaid': {
      const C={runnerKilim:['#8a1f2b','#e8d3a4','#1f6f6f','#d9a441'],runnerSlate:['#353a42','#aab4be','#5a6470','#e0a93a'],runnerLeaf:['#16776f','#f6e7c8','#5fc0a8','#ff8a65'],runnerPlaid:['#7a2424','#2e4a2e','#e8c070','#1a1a1a']}[name];
      x.fillStyle=C[0]; x.fillRect(0,0,s,s); noise(x,s,4000,.06,true);
      if(name==='runnerPlaid'){ x.globalAlpha=.45; x.fillStyle=C[1]; for(let i=0;i<s;i+=64){ x.fillRect(i,0,26,s); x.fillRect(0,i,s,26); } x.globalAlpha=.8; x.fillStyle=C[2]; for(let i=40;i<s;i+=64){ x.fillRect(i,0,3,s); x.fillRect(0,i,s,3); } x.globalAlpha=1; break; }
      x.fillStyle=C[1]; x.fillRect(0,16,s,7); x.fillRect(0,s-23,s,7);
      const dia=(cx,cy,w,hh)=>{ x.beginPath(); x.moveTo(cx,cy-hh); x.lineTo(cx+w,cy); x.lineTo(cx,cy+hh); x.lineTo(cx-w,cy); x.closePath(); x.fill(); };
      if(name==='runnerLeaf'){ x.globalAlpha=.55; for(let i=0;i<6;i++){ x.save(); x.translate(20+i*44,s/2); x.rotate(i%2?0.6:-0.6); x.fillStyle=C[2]; x.beginPath(); x.ellipse(0,0,34,12,0,0,7); x.fill(); x.restore(); } x.globalAlpha=1; x.fillStyle=C[3]; for(let i=0;i<4;i++){ x.beginPath(); x.arc(42+i*64,s/2,5,0,7); x.fill(); } break; }
      for(let i=0;i<4;i++){ const cx=32+i*64; x.fillStyle=C[2]; dia(cx,s/2,26,70); x.fillStyle=C[1]; dia(cx,s/2,14,38); x.fillStyle=C[3]; dia(cx,s/2,6,14); } break; }
    case 'wallTile': { x.fillStyle='#f4ecdc'; x.fillRect(0,0,s,s); noise(x,s,1500,.02,false); x.strokeStyle='rgba(45,93,138,.25)'; x.lineWidth=1.5; for(let i=0;i<=s;i+=64){ x.strokeRect(i,0,64,s); }
      for(let i=32;i<s;i+=64) for(let j=32;j<s;j+=64){ x.fillStyle='rgba(45,93,138,.55)'; for(let k=0;k<8;k++){ x.save(); x.translate(i,j); x.rotate(k*Math.PI/4); x.beginPath(); x.ellipse(0,-12,4,10,0,0,7); x.fill(); x.restore(); } x.fillStyle='rgba(200,60,50,.7)'; x.beginPath(); x.arc(i,j,5,0,7); x.fill(); } break; }
    case 'wallConcrete': { x.fillStyle='#d6d9dc'; x.fillRect(0,0,s,s); noise(x,s,7000,.05,true); x.strokeStyle='rgba(0,0,0,.08)'; x.lineWidth=1; for(let i=0;i<=s;i+=85){ x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } x.fillStyle='rgba(0,0,0,.12)'; for(let i=42;i<s;i+=85) for(let j=42;j<s;j+=128){ x.beginPath(); x.arc(j,i,2.5,0,7); x.fill(); } break; }
    case 'wallBamboo': { x.fillStyle='#e6d6a6'; x.fillRect(0,0,s,s); for(let i=0;i<s;i+=16){ x.fillStyle=`hsl(${45+Math.random()*8},${45+Math.random()*10}%,${58+Math.random()*10}%)`; x.fillRect(i+1,0,14,s); x.fillStyle='rgba(90,70,30,.35)'; const n=40+Math.random()*40; for(let y=n;y<s;y+=70+Math.random()*20) x.fillRect(i+1,y,14,3); } break; }
    case 'wallLog': plank(26,50,30,40,5); break;
    case 'woodLight': plank(32,45,52,62); break;
    case 'woodDark': plank(18,38,18,25); break;
    case 'marble':
      x.fillStyle='#efe9df'; x.fillRect(0,0,s,s);
      for(let v=0;v<14;v++){ x.strokeStyle=`rgba(120,110,100,${.07+Math.random()*.1})`; x.lineWidth=.5+Math.random()*1.5; x.beginPath(); x.moveTo(Math.random()*s,0); x.bezierCurveTo(Math.random()*s,s*.3,Math.random()*s,s*.6,Math.random()*s,s); x.stroke(); }
      x.strokeStyle='#d6cdbd'; x.lineWidth=2; [[0,0],[1,0],[0,1],[1,1]].forEach(([a,b])=>x.strokeRect(a*s/2+1,b*s/2+1,s/2-2,s/2-2)); break;
    case 'carpetBeige': carpet('#c4b69c'); break;
    case 'carpetRed': carpet('#7a2838','rgba(242,182,50,.16)'); break;
    case 'carpetBlue': carpet('#2c4468','rgba(255,255,255,.06)'); break;
    case 'runner': x.fillStyle='#7c2b35'; x.fillRect(0,0,s,s); noise(x,s,4000,.06,true); x.strokeStyle='#e0b24c'; x.lineWidth=5; x.strokeRect(12,-10,s-24,s+20); x.fillStyle='rgba(224,178,76,.35)'; for(let y=16;y<s;y+=64){ x.beginPath(); x.moveTo(s/2,y); x.lineTo(s/2+18,y+18); x.lineTo(s/2,y+36); x.lineTo(s/2-18,y+18); x.fill(); } break;
    case 'corridor': x.fillStyle='#d8cdb8'; x.fillRect(0,0,s,s); noise(x,s,3000,.04,true); x.strokeStyle='rgba(120,100,80,.25)'; x.lineWidth=2; for(let i=0;i<=s;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } break;
    case 'rugRed': case 'rugBlue': case 'rugGreen': {
      const base={rugRed:'#8a2f3a',rugBlue:'#26406b',rugGreen:'#2f6b4f'}[name], inner={rugRed:'#6e2434',rugBlue:'#1c2f52',rugGreen:'#224f3a'}[name];
      x.fillStyle=base; x.fillRect(0,0,s,s); noise(x,s,3000,.06,true);
      x.strokeStyle='#e0b24c'; x.lineWidth=7; x.strokeRect(14,14,s-28,s-28); x.lineWidth=2; x.strokeRect(28,28,s-56,s-56);
      x.fillStyle='rgba(224,178,76,.55)'; x.beginPath(); x.moveTo(s/2,52); x.lineTo(s-52,s/2); x.lineTo(s/2,s-52); x.lineTo(52,s/2); x.closePath(); x.fill();
      x.fillStyle=inner; x.beginPath(); x.moveTo(s/2,82); x.lineTo(s-82,s/2); x.lineTo(s/2,s-82); x.lineTo(82,s/2); x.closePath(); x.fill(); break; }
    case 'grass': grass(88,122,34); break;
    case 'grassDry': grass(55,80,42); break;
    case 'sand': x.fillStyle='#e8d3a4'; x.fillRect(0,0,s,s); noise(x,s,9000,.06,true); break;
    case 'concrete': x.fillStyle='#c9c3b7'; x.fillRect(0,0,s,s); noise(x,s,6000,.05,true); x.strokeStyle='rgba(0,0,0,.16)'; x.lineWidth=2; for(let i=0;i<=s;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } break;
    case 'paving': x.fillStyle='#b9ab98'; x.fillRect(0,0,s,s); for(let r=0;r<8;r++) for(let q=0;q<4;q++){ x.fillStyle=`hsl(30,${12+Math.random()*10}%,${58+Math.random()*12}%)`; const off=(r%2)*32; x.fillRect(q*64+off+2,r*32+2,60,28); x.fillRect(q*64+off-64+2,r*32+2,60,28); } noise(x,s,2000,.05,true); break;
    case 'stone': x.fillStyle='#d9bf97'; x.fillRect(0,0,s,s); for(let k=0;k<60;k++){ x.fillStyle=`rgba(${120+Math.random()*60},${90+Math.random()*40},60,.12)`; x.beginPath(); x.ellipse(Math.random()*s,Math.random()*s,10+Math.random()*30,6+Math.random()*16,Math.random()*3,0,7); x.fill(); } noise(x,s,5000,.05,true); break;
    case 'asphalt': x.fillStyle='#3d4046'; x.fillRect(0,0,s,s); noise(x,s,9000,.08,true); break;
    case 'tile': x.fillStyle='#f4f6f6'; x.fillRect(0,0,s,s); x.strokeStyle='#bfd0d4'; x.lineWidth=2; for(let i=0;i<=s;i+=32){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } break;
    case 'poolTile': x.fillStyle='#5fc4e8'; x.fillRect(0,0,s,s); x.strokeStyle='rgba(255,255,255,.55)'; x.lineWidth=2; for(let i=0;i<=s;i+=32){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); } break;
    case 'water': case 'sea': { const g=x.createLinearGradient(0,0,s,s); g.addColorStop(0,name==='sea'?'#1f6fa8':'#2b9bd6'); g.addColorStop(1,name==='sea'?'#2d89bf':'#52c3ec'); x.fillStyle=g; x.fillRect(0,0,s,s);
      for(let k=0;k<46;k++){ x.strokeStyle=`rgba(255,255,255,${.1+Math.random()*.2})`; x.lineWidth=1+Math.random()*2; x.beginPath(); const px=Math.random()*s, py=Math.random()*s; x.moveTo(px,py); x.bezierCurveTo(px+20,py-10,px+30,py+12,px+50,py); x.stroke(); } break; }
    case 'rubber': x.fillStyle='#34373e'; x.fillRect(0,0,s,s); noise(x,s,6000,.12,true); break;
    case 'wallpaper': x.fillStyle='#f1e8d8'; x.fillRect(0,0,s,s); noise(x,s,2000,.02,false); x.fillStyle='rgba(180,150,110,.12)'; for(let i=16;i<s;i+=64) for(let j=16;j<s;j+=64){ x.beginPath(); x.arc(i,j,4,0,7); x.fill(); } break;
    case 'wallpaperStripe': x.fillStyle='#f0e0c4'; x.fillRect(0,0,s,s); x.fillStyle='rgba(170,110,55,.14)'; for(let i=0;i<s;i+=32) x.fillRect(i,0,12,s); break;
    case 'wallpaperTeal': x.fillStyle='#2f5d62'; x.fillRect(0,0,s,s); x.strokeStyle='rgba(224,178,76,.28)'; x.lineWidth=1.5; for(let i=0;i<s;i+=32) for(let j=0;j<s;j+=32){ x.beginPath(); x.moveTo(i+16,j+4); x.lineTo(i+28,j+16); x.lineTo(i+16,j+28); x.lineTo(i+4,j+16); x.closePath(); x.stroke(); } break;
    case 'plaster': x.fillStyle='#ffffff'; x.fillRect(0,0,s,s); noise(x,s,3000,.035,false); break;
    case 'awning': for(let i=0;i<8;i++){ x.fillStyle=i%2?'#ffffff':'#c8453a'; x.fillRect(i*32,0,32,s); } break;
    case 'glow': { const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); g.addColorStop(0,'rgba(255,210,140,1)'); g.addColorStop(.45,'rgba(255,190,110,.35)'); g.addColorStop(1,'rgba(255,180,100,0)'); x.fillStyle=g; x.fillRect(0,0,s,s); break; }
    case 'shadow': { const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(.6,'rgba(0,0,0,.22)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,s,s); break; }
    case 'padDash': { x.clearRect(0,0,s,s); x.fillStyle='rgba(80,220,130,.22)'; x.fillRect(8,8,s-16,s-16); x.strokeStyle='#7dffae'; x.lineWidth=12; x.setLineDash([26,18]); x.lineCap='round'; x.strokeRect(10,10,s-20,s-20); break; }
    case 'padLock': { x.clearRect(0,0,s,s); x.fillStyle='rgba(160,170,180,.16)'; x.fillRect(8,8,s-16,s-16); x.strokeStyle='#b8c4cf'; x.lineWidth=10; x.setLineDash([20,20]); x.strokeRect(10,10,s-20,s-20); break; }
    case 'stain': { x.clearRect(0,0,s,s); x.fillStyle='rgba(90,70,40,.5)'; for(let k=0;k<5;k++){ x.beginPath(); x.ellipse(s/2+rnd(-40,40),s/2+rnd(-40,40),rnd(20,60),rnd(15,40),rnd(0,3),0,7); x.fill(); } break; }
    case 'puddle': { x.clearRect(0,0,s,s); x.fillStyle='rgba(90,170,230,.65)'; x.beginPath(); x.ellipse(s/2,s/2,110,80,0.3,0,7); x.fill(); x.fillStyle='rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(s/2-30,s/2-20,30,12,0.3,0,7); x.fill(); break; }
  }
  return c;
}
function tex(name,rx=1,ry=1){
  const key=name+'|'+rx+'|'+ry; if(texCache[key]) return texCache[key];
  if(!texCanvas[name]) texCanvas[name]=drawTex(name);
  const t=new THREE.CanvasTexture(texCanvas[name]);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry); t.encoding=THREE.sRGBEncoding; t.userData=t.userData||{}; t.userData.tex=name;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return texCache[key]=t;
}

// =====================================================================
// MATERIALS & GEOMETRY
// =====================================================================
const geoCache={}, matCache={};
function mat(color,o={}){ const k=color+JSON.stringify(o,(key,v)=>v&&v.isTexture?v.uuid:v); return matCache[k]||(matCache[k]=new THREE.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},o))); }
const TEX_ROUGH={marble:.2,tile:.3,poolTile:.18,wood:.5,woodDark:.42,woodLight:.52,corridor:.62,paving:.85,asphalt:.92,concrete:.9,stone:.85,rubber:.95,sand:.95};
function tmat(name,rx,ry,o={}){ const m=tmat0(name,rx,ry,o); if(typeof themeTint==='function') themeTint(m); return m; }
function tmat0(name,rx,ry,o={}){ return mat(0xffffff,withNormal(name,rx,ry,Object.assign({map:tex(name,rx,ry)},TEX_ROUGH[name]!=null&&o.roughness==null?{roughness:TEX_ROUGH[name]}:{},o))); }
function box(w,h,d){ const k=`b${w}_${h}_${d}`; return geoCache[k]||(geoCache[k]=new THREE.BoxGeometry(w,h,d)); }
function cyl(rt,rb,h,s=16){ const k=`c${rt}_${rb}_${h}_${s}`; return geoCache[k]||(geoCache[k]=new THREE.CylinderGeometry(rt,rb,h,s)); }
function sph(r,ws=16,hs=12){ const k=`s${r}_${ws}_${hs}`; return geoCache[k]||(geoCache[k]=new THREE.SphereGeometry(r,ws,hs)); }
function cone(r,h,s=16){ const k=`k${r}_${h}_${s}`; return geoCache[k]||(geoCache[k]=new THREE.ConeGeometry(r,h,s)); }
function plane(w,h){ const k=`p${w}_${h}`; return geoCache[k]||(geoCache[k]=new THREE.PlaneGeometry(w,h)); }
function rbox(w,h,d,r=0.05){
  const k=`r${w}_${h}_${d}_${r}`; if(geoCache[k]) return geoCache[k];
  const b=Math.min(0.025,h/4,w/4,d/4), sw=w-2*b, sd=d-2*b; r=Math.min(r,Math.min(sw,sd)/2-0.001);
  if(r<=0.004) return geoCache[k]=new THREE.BoxGeometry(w,h,d);
  const sh=new THREE.Shape(), X=-sw/2, Y=-sd/2;
  sh.moveTo(X+r,Y); sh.lineTo(X+sw-r,Y); sh.quadraticCurveTo(X+sw,Y,X+sw,Y+r); sh.lineTo(X+sw,Y+sd-r); sh.quadraticCurveTo(X+sw,Y+sd,X+sw-r,Y+sd);
  sh.lineTo(X+r,Y+sd); sh.quadraticCurveTo(X,Y+sd,X,Y+sd-r); sh.lineTo(X,Y+r); sh.quadraticCurveTo(X,Y,X+r,Y);
  const g=new THREE.ExtrudeGeometry(sh,{depth:h-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:5});
  g.rotateX(-Math.PI/2); g.translate(0,-(h-2*b)/2,0); g.computeVertexNormals();
  return geoCache[k]=g;
}
function capsule(r,len,seg=12){
  const k=`cap${r}_${len}`; if(geoCache[k]) return geoCache[k];
  const pts=[]; const n=6;
  for(let i=0;i<=n;i++){ const a=-Math.PI/2+i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r-len/2)); }
  for(let i=0;i<=n;i++){ const a=i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r+len/2)); }
  pts[0].x=0.0001; pts[pts.length-1].x=0.0001;
  return geoCache[k]=new THREE.LatheGeometry(pts,seg);
}
function mesh(geo,m,x=0,y=0,z=0,cast=false,recv=true){ const me=new THREE.Mesh(geo,m); me.position.set(x,y,z); me.castShadow=cast; me.receiveShadow=recv; return me; }

// shared special materials
const M={
  facade:mat(0xf2e6d2), trim:mat(0x9b3f30), accent:mat(0x2d5d8a),
  gold:mat(0xe0a93a,{metalness:.85,roughness:.28}), white:mat(0xf7f5f0), dark:mat(0x1c1d22,{roughness:.4}),
  glass:new THREE.MeshStandardMaterial({color:0xcfe8f5,transparent:true,opacity:.22,roughness:.04,metalness:.25,depthWrite:false,envMapIntensity:1.6}),
  lampOn:new THREE.MeshStandardMaterial({color:0xfff1d6,emissive:0xffc070,emissiveIntensity:.4,roughness:.5}),
  lampOff:mat(0xd8d0c0),
  window:new THREE.MeshStandardMaterial({color:0xb5dcf2,emissive:0x5a8fb8,emissiveIntensity:.35,roughness:.1,metalness:.3}),
  windowLit:new THREE.MeshStandardMaterial({color:0xb5dcf2,emissive:0x5a8fb8,emissiveIntensity:.35,roughness:.1,metalness:.3}),
  glow:new THREE.MeshBasicMaterial({map:tex('glow'),transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending}),
  shadow:new THREE.MeshBasicMaterial({map:tex('shadow'),transparent:true,depthWrite:false}),
  bill:mat(0x5fa860,{roughness:.9}), billBand:mat(0xf3e9c9),
};
function glowDecal(r,x,z,y=0.03){ const m=mesh(plane(r*2,r*2),M.glow,x,y,z); m.rotation.x=-Math.PI/2; m.receiveShadow=false; return m; }
function blob(r,y=0.015){ const m=new THREE.Mesh(plane(r*2,r*2),M.shadow); m.rotation.x=-Math.PI/2; m.position.y=y; m.renderOrder=1; return m; }
function decal(texName,w,h,x,y,z,opacity=1){ const m=new THREE.Mesh(plane(w,h),new THREE.MeshBasicMaterial({map:tex(texName),transparent:true,depthWrite:false,opacity})); m.rotation.x=-Math.PI/2; m.position.set(x,y,z); return m; }

// ---------- canvas text textures ----------
const textTexCache={};
function textTex(text,o={}){
  const k=text+JSON.stringify(o); if(textTexCache[k]) return textTexCache[k];
  const W=o.w||512, H=o.h||128, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  if(o.bg){ x.fillStyle=o.bg; x.beginPath(); if(x.roundRect) x.roundRect(4,4,W-8,H-8,o.r||24); else x.rect(4,4,W-8,H-8); x.fill(); }
  x.font=o.font||'800 64px "Baloo 2", system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle';
  if(o.fit){ let sz=+(/(\d+)px/.exec(x.font)||[0,64])[1]; while(x.measureText(text).width>W-(o.stroke?40:24)&&sz>14){ sz-=4; x.font=x.font.replace(/\d+px/,sz+'px'); } }
  if(o.stroke){ x.lineWidth=o.strokeW||8; x.strokeStyle=o.stroke; x.strokeText(text,W/2,H/2+4); }
  x.fillStyle=o.fg||'#fff'; x.fillText(text,W/2,H/2+4);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return textTexCache[k]=t;
}
function signPlane(text,w,h,o){ const m=new THREE.Mesh(plane(w,h),new THREE.MeshBasicMaterial({map:textTex(text,o),transparent:true})); return m; }

// =====================================================================
// STATIC GEOMETRY BAKING (merges meshes per material -> far fewer draw calls)
// =====================================================================
function mergeGeos(geos){
  let n=0; geos.forEach(g=>n+=g.attributes.position.count);
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2), hasCol=geos.some(g=>g.attributes.color), col=hasCol?new Float32Array(n*3).fill(1):null; let o=0;
  geos.forEach(g=>{ const c=g.attributes.position.count; pos.set(g.attributes.position.array,o*3); nor.set(g.attributes.normal.array,o*3);
    if(g.attributes.uv) uv.set(g.attributes.uv.array,o*2); if(col&&g.attributes.color) col.set(g.attributes.color.array,o*3); o+=c; g.dispose(); });
  const bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.BufferAttribute(pos,3)); bg.setAttribute('normal',new THREE.BufferAttribute(nor,3)); bg.setAttribute('uv',new THREE.BufferAttribute(uv,2)); if(col) bg.setAttribute('color',new THREE.BufferAttribute(col,3));   // köşe rengi (bakeFlat) korunur
  bg.computeBoundingSphere(); return bg;
}
function bake(root){
  try{
    root.updateMatrixWorld(true);
    const buckets=new Map();
    root.traverse(o=>{
      if(!o.isMesh) return;
      let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const key=o.material.uuid+'|'+(o.castShadow?1:0);
      if(!buckets.has(key)) buckets.set(key,{mat:o.material,cast:o.castShadow,geos:[]});
      buckets.get(key).geos.push(g);
    });
    const out=new THREE.Group();
    buckets.forEach(b=>{ const m=new THREE.Mesh(mergeGeos(b.geos),b.mat); m.castShadow=b.cast; m.receiveShadow=true; out.add(m); });
    return out;
  }catch(e){ return root; }
}
