
// =====================================================================
// GRAPHICS QUALITY: image-based lighting, post-processing, cloud shadows, grass
// =====================================================================
// ---------- environment map (studio-like sky dome rendered to PMREM) ----------
let envRT=null;
function buildEnvMap(){
  if(envRT) return envRT;
  const s=new THREE.Scene();
  const g=new THREE.SphereGeometry(30,48,24), cols=[], pos=g.attributes.position, c=new THREE.Color();
  const top=new THREE.Color(0x9cc8ff), hor=new THREE.Color(0xfff4e6), bot=new THREE.Color(0x6e6252);
  for(let i=0;i<pos.count;i++){ const y=pos.getY(i)/30; if(y>0) c.copy(hor).lerp(top,Math.pow(y,0.6)); else c.copy(hor).lerp(bot,Math.min(1,-y*3)); cols.push(c.r*1.1,c.g*1.1,c.b*1.1); }
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const panel=(w,h,x,y,z,k)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(k,k*0.97,k*0.9),side:THREE.DoubleSide})); m.position.set(x,y,z); m.lookAt(0,0,0); s.add(m); };
  panel(9,9,-14,22,12,6);      // sun
  panel(14,5,18,8,-10,1.8); panel(14,5,-18,7,-12,1.6); panel(10,4,0,6,22,1.4); panel(20,20,0,28,0,1.5);
  const pm=new THREE.PMREMGenerator(renderer); envRT=pm.fromScene(s,0.035); pm.dispose();
  return envRT;
}
let ENV_K=0.3;
const envMats=new Set(); let envF=-1, envScanT=0;
function scanEnvMats(){
  scene.traverse(o=>{ const m=o.material; if(!m) return; (Array.isArray(m)?m:[m]).forEach(mm=>{ if(mm.isMeshStandardMaterial&&!envMats.has(mm)){ envMats.add(mm); mm.userData.envBase=mm.envMapIntensity; } }); });
}
function updateEnv(dt,dayF,wl){
  if(!scene.environment) return;
  envScanT-=dt; if(envScanT<=0){ envScanT=2; scanEnvMats(); envF=-1; }
  const f=(0.18+0.82*dayF)*(0.75+0.25*wl)*(powerOut()?0.85:1);
  if(Math.abs(f-envF)>0.02){ envF=f; envMats.forEach(m=>m.envMapIntensity=m.userData.envBase*f*ENV_K); }
}

// ---------- drifting cloud shadows on the ground (outside the hotel only) ----------
let cloudMat=null;
function buildCloudShadows(){
  const cv=document.createElement('canvas'); cv.width=cv.height=256; const x=cv.getContext('2d');
  x.fillStyle='#000'; x.fillRect(0,0,256,256);
  for(let k=0;k<26;k++){ const cx=Math.random()*256, cy=Math.random()*256, r=18+Math.random()*46;
    for(const [dx,dy] of [[0,0],[256,0],[-256,0],[0,256],[0,-256]]){ const gr=x.createRadialGradient(cx+dx,cy+dy,0,cx+dx,cy+dy,r); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.beginPath(); x.arc(cx+dx,cy+dy,r,0,7); x.fill(); } }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,
    uniforms:{map:{value:t},off:{value:new THREE.Vector2()},amt:{value:0},box:{value:new THREE.Vector4(-7.15,7.15,BACK-0.1,7.65)}},
    vertexShader:'varying vec2 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:'uniform sampler2D map; uniform vec2 off; uniform float amt; uniform vec4 box; varying vec2 vW; void main(){ if(vW.x>box.x&&vW.x<box.y&&vW.y>box.z&&vW.y<box.w) discard; float a=texture2D(map,vW*0.012+off).r; a=smoothstep(0.12,0.6,a); gl_FragColor=vec4(0.05,0.07,0.12,a*amt); }'});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(200,200),cloudMat); m.rotation.x=-Math.PI/2; m.position.y=0.06; m.renderOrder=3; outdoor.add(m);
}
function updateClouds(t,dayF){
  if(!cloudMat) return;
  const w=state.weather, k=w==='cloud'?0.42:w==='sun'?0.22:w==='rain'?0.12:0.15;
  cloudMat.uniforms.amt.value=k*dayF; cloudMat.uniforms.off.value.set(t*0.004,t*0.0022);
}

// ---------- instanced grass tufts on the lawns ----------
let grassMesh=null;
function buildGrass(){
  const n=gfxLevel()==='high'?2600:gfxLevel()==='mid'?1300:0; if(!n) return;
  const blade=new THREE.ConeGeometry(0.035,0.2,3); blade.translate(0,0.1,0);
  const parts=[]; for(let k=0;k<3;k++){ const b=blade.clone(); b.rotateZ((k-1)*0.35); b.rotateY(k*2.1); b.translate((k-1)*0.03,0,(k%2)*0.03); parts.push(b.toNonIndexed()); }
  const geo=mergeGeos(parts);
  const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true});
  grassMesh=new THREE.InstancedMesh(geo,m,n); grassMesh.receiveShadow=true;
  const zones=[[-17.2,-6.9,9.6,11.1],[6.9,17.2,9.6,11.1],[-3.1,-1.6,9.6,11.1],[1.6,3.1,9.6,11.1],[-16.9,-7.4,BACK+0.2,-3.5],[-17.3,-16.35,-3.4,7.4],[16.35,17.3,-3.4,7.4],[-7.9,-7.25,-3.2,7.3],[7.25,7.9,-3.2,7.2]];
  const area=zones.map(z=>(z[1]-z[0])*(z[3]-z[2])), tot=area.reduce((a,b)=>a+b,0);
  const dm=new THREE.Object3D(), col=new THREE.Color(); let i=0, guard=0;
  while(i<n&&guard++<n*4){
    let r=Math.random()*tot, zi=0; while(r>area[zi]){ r-=area[zi]; zi++; } const z=zones[zi];
    const x=rnd(z[0],z[1]), zz=rnd(z[2],z[3]);
    if(Math.hypot(x+4.3,zz-10.25)<1.2||Math.abs(x-L.gen.x)<0.8&&Math.abs(zz-L.gen.z)<0.6) continue;
    dm.position.set(x,0,zz); dm.rotation.set(0,rnd(0,6.28),0); const sc=rnd(0.6,1.35); dm.scale.set(sc,sc*rnd(0.8,1.3),sc); dm.updateMatrix();
    grassMesh.setMatrixAt(i,dm.matrix); col.setHSL(0.26+rnd(-0.03,0.04),0.45+rnd(-0.1,0.1),0.28+rnd(-0.06,0.08)); grassMesh.setColorAt(i,col); i++;
  }
  grassMesh.count=i; outdoor.add(grassMesh);
}
function updateGrassSeason(){
  if(!grassMesh) return; const si=seasonIx();
  grassMesh.material.color.setHex([0xffffff,0xf2ffe0,0xffd9a0,0xc9d6cc][si]);
  grassMesh.visible=!(isWinter()&&city().snow)&&!city().desert;
}

// ---------- post-processing (high quality only) ----------
const POST_BASE='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
const POST_FILES=['shaders/CopyShader.js','postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/ShaderPass.js',
  'shaders/LuminosityHighPassShader.js','postprocessing/UnrealBloomPass.js','shaders/SAOShader.js','shaders/DepthLimitedBlurShader.js','shaders/UnpackDepthRGBAShader.js','postprocessing/SAOPass.js'];
let postState='none', composer=null, saoPass=null, bloomPass=null, gradePass=null;
function loadPost(){
  if(postState!=='none') return; postState='loading'; let i=0;
  const next=()=>{ if(i>=POST_FILES.length){ postState='ready'; applyGfx(); return; }
    const s=document.createElement('script'); s.src=POST_BASE+POST_FILES[i++]; s.onload=next; s.onerror=()=>{ postState='failed'; }; document.head.appendChild(s); };
  next();
}
const GradeShader={
  uniforms:{tDiffuse:{value:null},vig:{value:0.35},sat:{value:1.1},con:{value:1.1},tilt:{value:1.0},res:{value:new THREE.Vector2(1,1)},warm:{value:0.0},tint:{value:new THREE.Vector3(1,1,1)}},
  vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader:`uniform sampler2D tDiffuse; uniform float vig,sat,con,tilt,warm; uniform vec2 res; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      float d=abs(vUv.y-0.46); float b=smoothstep(0.2,0.62,d)*tilt;
      if(b>0.01){ vec3 acc=c; float wsum=1.; vec2 px=1./res;
        for(int i=1;i<=5;i++){ float o=float(i)*b*2.2; float w=1.-float(i)/6.;
          acc+=(texture2D(tDiffuse,vUv+vec2(o,0.)*px).rgb+texture2D(tDiffuse,vUv-vec2(o,0.)*px).rgb+texture2D(tDiffuse,vUv+vec2(0.,o)*px).rgb+texture2D(tDiffuse,vUv-vec2(0.,o)*px).rgb)*w; wsum+=4.*w; }
        c=acc/wsum; }
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,sat);
      c=(c-0.18)*con+0.18; c=max(c,0.)*tint;
      vec2 q=vUv-0.5; q.x*=res.x/res.y*0.7; float v=smoothstep(0.95,0.25,length(q)); c*=mix(1.,v,vig);
      gl_FragColor=LinearTosRGB(vec4(c,1.));
    }`};
function buildComposer(){
  if(composer||postState!=='ready') return;
  const pr=renderer.getPixelRatio(), w=Math.floor(window.innerWidth*pr), h=Math.floor(window.innerHeight*pr);
  const pars={type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
  const ms=renderer.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget;
  const rt=ms?new THREE.WebGLMultisampleRenderTarget(w,h,pars):new THREE.WebGLRenderTarget(w,h,pars); if(ms) rt.samples=4;
  composer=new THREE.EffectComposer(renderer,rt);
  composer.addPass(new THREE.RenderPass(scene,camera));
  saoPass=new THREE.SAOPass(scene,camera,false,true,new THREE.Vector2(w/2,h/2));
  Object.assign(saoPass.params,{saoBias:0.9,saoIntensity:0.04,saoScale:9,saoKernelRadius:40,saoMinResolution:0,saoBlur:true,saoBlurRadius:6,saoBlurStdDev:3.5,saoBlurDepthCutoff:0.008});
  composer.addPass(saoPass);
  bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(w/2,h/2),0.25,0.55,0.86); composer.addPass(bloomPass);
  gradePass=new THREE.ShaderPass(GradeShader); gradePass.uniforms.res.value.set(w,h); composer.addPass(gradePass);
}
function resizeComposer(){
  if(!composer) return; const pr=renderer.getPixelRatio(), w=Math.floor(window.innerWidth*pr), h=Math.floor(window.innerHeight*pr);
  composer.setSize(w,h); gradePass.uniforms.res.value.set(w,h);
}
function renderFrame(){
  if(composer&&gfxLevel()==='high'){
    const nf=typeof nightF==='number'?nightF:0;
    bloomPass.strength=0.2+nf*0.25; bloomPass.threshold=0.97-nf*0.12;
    gradePass.uniforms.tilt.value=fpMode?0:1; gradePass.uniforms.tint.value.copy(seasonTint);
    composer.render();
  } else renderer.render(scene,camera);
}
// ---------- apply the chosen level ----------
function applyGfx(){
  const q=gfxLevel();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q==='low'?1:q==='mid'?1.75:1.6));
  renderer.setSize(window.innerWidth,window.innerHeight,false);
  const sm=q==='low'?1024:q==='mid'?2048:4096;
  if(sun.shadow.mapSize.x!==sm){ sun.shadow.mapSize.set(sm,sm); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } }
  if(q==='low'){ if(scene.environment){ scene.environment=null; envMats.forEach(m=>m.needsUpdate=true); } }
  else if(!scene.environment){ scene.environment=buildEnvMap().texture; scanEnvMats(); envMats.forEach(m=>m.needsUpdate=true); envF=-1; }
  if(q==='high'){ if(postState==='none') loadPost(); else if(postState==='ready'){ buildComposer(); resizeComposer(); } }
}
function bootGfx(){ buildCloudShadows(); buildGrass(); updateGrassSeason(); applyGfx(); }
