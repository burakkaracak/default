
// =====================================================================
// CHARACTERS (chibi style)
// =====================================================================
const SKINS=[0xf3cfb0,0xe7b48f,0xc98e62,0x9a6440,0x6e452a];
const HAIRC=[0x2b1d14,0x4a3020,0x8a5a2e,0xd8b26a,0x1a1a1a,0xb04a2a,0x9a9a9a];
const TOPS=[0xe0574f,0x2e86c1,0x27ae60,0xf2b632,0x8e44ad,0x16a085,0xe67e22,0xf06292,0x5c6bc0,0xecf0f1];
const BOTTOMS=[0x2b3a55,0x3d3d3d,0x6b5a45,0x1f2a3a,0x4a4f5a,0x7a8aa0];
const LOOKS={
  guest:(tp)=>{
    const o={skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['short','long','bun','short','bald','long','curly','pony','curly']),top:rand(TOPS),bottom:rand(BOTTOMS),bag:rand([0x1f2a3a,0xa64c4c,0x3b6ea5,0x6b4226,0xf2b632]),scale:rnd(0.93,1.07)};
    if(Math.random()<.22) o.glasses=true; if((o.hs==='short'||o.hs==='bald')&&Math.random()<.25) o.beard=true;
    if(tp==='student'){ o.pack=true; o.hatC=rand([0x27ae60,0xe67e22,0x5c6bc0]); o.top=rand([0x7f8c8d,0x2d3e50,0x8e44ad,0x16a085]); o.hat=Math.random()<.5?'cap':null; o.scale=rnd(0.9,0.98); o.bag=null; }
    if(tp==='elderly'){ o.hair=rand([0xd8d8d8,0xeeeeee,0xbdbdbd]); o.hs=rand(['short','bun','bald']); o.cane=true; o.hunch=true; o.glasses=Math.random()<.6; o.top=rand([0x8a6a4a,0x6b7d5c,0x9a7ab0,0xb0736a]); o.bag=null; }
    if(tp==='influencer'){ o.phone=true; o.shades=Math.random()<.6; o.top=rand([0xff5fa2,0x00d1c1,0xffd23f,0x9b5de5]); o.bottom=rand([0xf7f7f7,0x1a1a1a]); o.hs=rand(['pony','long','curly']); o.bag=rand([0xffffff,0xff5fa2]); }
    if(tp==='couple'){ o.partner=true; o.top=rand([0xffffff,0xf4e1d2,0xe8d5f2]); o.bag=0xf2d48a; }
    if(tp==='business'){ o.top=rand([0x2c3e50,0x34495e,0x3b3b3b]); o.bottom=o.top; o.tie=rand([0xc0392b,0x2980b9,0x8e44ad]); o.bag=0x2b2b2b; o.brief=true; }
    if(tp==='vip'){ o.top=rand([0xf06292,0xffffff,0xf2b632,0x1a1a1a]); o.shades=true; o.gold=true; o.bag=0xf2d48a; }
    if(tp==='tourist'){ o.hat=Math.random()<.5?'sun':'cap'; o.hatC=rand([0xf2b632,0xe0574f,0x2e86c1,0xffffff]); o.pack=true; }
    if(tp==='family'){ o.child=true; }
    if(tp==='million'){ o.hat=Math.random()<.5?'sun':'cap'; o.hatC=rand([0xf2b632,0xe0574f,0x2e86c1,0xffffff]); o.pack=true; }
    if(tp==='athlete'){ const c=rand([0xe0574f,0x2e86c1,0x27ae60,0xff8c1a]); o.top=c; o.bottom=0x2b2f3a; o.hat='cap'; o.hatC=0xffffff; o.bag=null; o.hs=rand(['short','pony']); o.scale=rnd(1.0,1.08); }
    if(tp==='grumpy'){ o.top=rand([0x6d6d6d,0x5a5048,0x4a5560]); o.bottom=0x3a3a3a; o.glasses=Math.random()<.4; o.hs=rand(['bald','short']); o.hunch=true; o.bag=0x3a3a3a; }
    if(tp==='dog'){ o.dog=rand([0xc8894a,0x3b2a1e,0xf1e3c8,0x8a8a8a]); o.bag=null; }
    if(tp==='insp'){ o.top=0xb89a6a; o.bottom=0x4a3b2c; o.hat='fedora'; o.hatC=0x3b3024; o.bag=null; o.brief=true; o.hs='short'; }
    return o; },
  player:()=>{ const c=state.custom||{}; return {skin:c.skin??0xf0c49c,hair:c.hair??0x3a2618,hs:c.hs||'quiff',top:c.top??0x1f3450,bottom:c.top??0x1f3450,tie:c.tie??0xe0a93a,hat:c.hat&&c.hat!=='none'?c.hat:null,hatC:c.top??0x1f3450,badge:true,scale:1.08}; },
  rec:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['bun','short']),top:0x8a2f3a,bottom:0x1c1d22,tie:0xe0a93a,badge:true}),
  clean:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['bun','short','long']),top:0x5fb3a8,bottom:0x3d5a55,apron:true,hat:'cap',hatC:0x5fb3a8}),
  bell:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:'short',top:0xc0392b,bottom:0x1c1d22,hat:'pillbox',hatC:0xc0392b,trim:true}),
  tech:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:'short',top:0xe67e22,bottom:0x34495e,hat:'hard',hatC:0xf2c14e}),
  barista:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['bun','short']),top:0x2b2b2b,bottom:0x3b2a1e,apron:true,hat:'cap',hatC:0x6b4226}),
  chef:()=>({skin:rand(SKINS),hair:rand(HAIRC),hs:'short',top:0xffffff,bottom:0x333333,hat:'chef'}),
};
const hairCap=new THREE.SphereGeometry(0.285,18,10,0,Math.PI*2,0,Math.PI*0.52);
function makeChar(o){
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body); body.position.y=0.36;
  const skin=mat(o.skin,{roughness:.7}), top=mat(o.top,{roughness:.8}), bot=mat(o.bottom,{roughness:.85}), shoe=mat(0x2a2020), hair=mat(o.hair,{roughness:.9});
  const legs=[], arms=[];
  [-1,1].forEach(sd=>{ const p=new THREE.Group(); p.position.set(0.09*sd,0.36,0); root.add(p);
    p.add(mesh(capsule(0.078,0.17,10),bot,0,-0.17,0,true)); p.add(mesh(rbox(0.15,0.07,0.21,.03),shoe,0,-0.325,0.035,true)); legs.push(p); });
  const torso=mesh(capsule(0.2,0.2,14),top,0,0.3,0,true); torso.scale.z=0.84; body.add(torso);
  if(o.tie){ body.add(mesh(box(0.06,0.24,0.02),mat(o.tie),0,0.4,0.175)); body.add(mesh(box(0.1,0.05,0.02),mat(o.tie),0,0.52,0.172)); }
  if(o.badge) body.add(mesh(box(0.08,0.05,0.02),M.gold,0.1,0.45,0.172));
  if(o.apron) body.add(mesh(rbox(0.3,0.36,0.03,.02),M.white,0,0.22,0.165));
  if(o.trim){ body.add(mesh(box(0.03,0.4,0.02),M.gold,-0.06,0.33,0.172)); body.add(mesh(box(0.03,0.4,0.02),M.gold,0.06,0.33,0.172)); }
  if(o.gold) body.add(mesh(new THREE.TorusGeometry(0.09,0.015,6,16),M.gold,0,0.55,0.13));
  if(o.pack) body.add(mesh(rbox(0.3,0.34,0.14,.06),mat(o.hatC||0x2e86c1),0,0.33,-0.2,true));
  const head=new THREE.Group(); head.position.y=0.84; body.add(head);
  head.add(mesh(sph(0.26,20,14),skin,0,0,0,true));
  const eyeM=mat(0x1a1a22,{roughness:.3}), hl=new THREE.MeshBasicMaterial({color:0xffffff});
  const eyes=[]; [-1,1].forEach(sd=>{ const e=mesh(sph(0.042,10,8),eyeM,0.09*sd,0.02,0.23); e.scale.set(0.85,1.15,0.6); head.add(e); eyes.push(e); head.add(mesh(sph(0.013,6,4),hl,0.09*sd+0.012,0.04,0.255));
    const bl=mesh(sph(0.04,8,6),mat(0xff9c9c,{roughness:1}),0.155*sd,-0.06,0.2); bl.scale.set(1,0.6,0.4); head.add(bl); });
  if(o.shades){ head.add(mesh(box(0.28,0.07,0.03),M.dark,0,0.03,0.245)); }
  if(o.hs!=='bald'){ const cap=mesh(hairCap,hair,0,0.01,-0.02); cap.rotation.x=-0.35; head.add(cap);
    if(o.hs==='long') head.add(mesh(rbox(0.46,0.36,0.12,.05),hair,0,-0.16,-0.19));
    if(o.hs==='bun') head.add(mesh(sph(0.1,10,8),hair,0,0.22,-0.18));
    if(o.hs==='curly') for(let k=0;k<9;k++){ const a=k/9*Math.PI*2; head.add(mesh(sph(0.09,8,6),hair,Math.cos(a)*0.2,0.14+Math.sin(k*1.7)*0.04,Math.sin(a)*0.18-0.04)); }
    if(o.hs==='pony'){ head.add(mesh(sph(0.06,8,6),hair,0,0.12,-0.25)); const pt=mesh(capsule(0.05,0.2,6),hair,0,-0.02,-0.3); pt.rotation.x=0.4; head.add(pt); }
    if(o.hs==='quiff'){ const q=mesh(sph(0.13,10,8),hair,0.03,0.2,0.12); q.scale.set(1.3,0.6,1); head.add(q); } }
  if(o.hat==='cap'){ head.add(mesh(new THREE.SphereGeometry(0.275,16,8,0,Math.PI*2,0,Math.PI*0.45),mat(o.hatC),0,0.04,0)); head.add(mesh(box(0.26,0.03,0.18),mat(o.hatC),0,0.1,0.26)); }
  if(o.hat==='sun'){ head.add(mesh(cyl(0.42,0.42,0.03,20),mat(o.hatC),0,0.14,0)); head.add(mesh(cyl(0.22,0.26,0.16,16),mat(o.hatC),0,0.22,0)); }
  if(o.hat==='pillbox'){ head.add(mesh(cyl(0.17,0.17,0.13,16),mat(o.hatC),0,0.27,0.02)); head.add(mesh(cyl(0.175,0.175,0.03,16),M.gold,0,0.22,0.02)); }
  if(o.hat==='hard'){ head.add(mesh(new THREE.SphereGeometry(0.29,16,8,0,Math.PI*2,0,Math.PI*0.5),mat(o.hatC,{roughness:.4}),0,0.03,0)); head.add(mesh(cyl(0.34,0.34,0.025,20),mat(o.hatC,{roughness:.4}),0,0.04,0.03)); }
  if(o.hat==='fedora'){ head.add(mesh(cyl(0.4,0.4,0.025,20),mat(o.hatC),0,0.16,0)); head.add(mesh(cyl(0.2,0.25,0.22,16),mat(o.hatC),0,0.27,0)); head.add(mesh(cyl(0.255,0.255,0.05,16),M.dark,0,0.2,0)); }
  if(o.hat==='chef'){ head.add(mesh(cyl(0.2,0.2,0.2,16),M.white,0,0.27,0)); head.add(mesh(sph(0.24,12,8),M.white,0,0.42,0)); }
  [-1,1].forEach(sd=>{ const p=new THREE.Group(); p.position.set(0.235*sd,0.5,0); body.add(p);
    p.add(mesh(capsule(0.062,0.18,8),top,0,-0.15,0,true)); p.add(mesh(sph(0.066,8,6),skin,0,-0.3,0)); arms.push(p); });
  const hold=new THREE.Group(); hold.position.set(0,0.28,0.32); body.add(hold);
  let bag=null;
  if(o.bag&&!o.brief){ bag=new THREE.Group(); bag.position.set(0.36,0,-0.05);
    bag.add(mesh(rbox(0.3,0.42,0.18,.05),mat(o.bag,{roughness:.5}),0,0.27,0,true)); bag.add(mesh(cyl(0.012,0.012,0.3,6),M.dark,0,0.62,0));
    bag.add(mesh(box(0.14,0.03,0.03),M.dark,0,0.77,0)); [-0.1,0.1].forEach(x=>bag.add(mesh(cyl(0.03,0.03,0.03,8),M.dark,x,0.03,0)));
    root.add(bag); }
  if(o.brief){ bag=new THREE.Group(); bag.position.set(0,-0.3,0.02); bag.add(mesh(rbox(0.3,0.22,0.08,.03),mat(0x3b2a1e,{roughness:.5}),0,-0.1,0,true)); arms[1].add(bag); }
  let child=null;
  if(o.child){ child=makeChar({skin:o.skin,hair:o.hair,hs:rand(['short','bun']),top:rand(TOPS),bottom:rand(BOTTOMS),scale:0.62}); child.root.position.set(-0.55,0,-0.1); root.add(child.root); }
  let dog=null;
  if(o.dog){ dog=new THREE.Group(); dog.position.set(-0.55,0,0.15); dog.scale.setScalar(1.25); const dm=mat(o.dog,{roughness:.8}), dk=mat(0x2a1c12);
    dog.add(mesh(rbox(0.16,0.15,0.34,.06),dm,0,0.22,0,true)); const hd=mesh(rbox(0.15,0.14,0.16,.05),dm,0,0.32,0.21,true); dog.add(hd);
    hd.add(mesh(box(0.06,0.05,0.06),dk,0,-0.02,0.1)); [-1,1].forEach(s=>{ hd.add(mesh(box(0.04,0.09,0.05),dk,0.07*s,0.06,-0.02)); hd.add(mesh(sph(0.018,6,4),M.dark,0.04*s,0.03,0.08)); });
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>dog.add(mesh(box(0.05,0.16,0.05),dm,0.05*a,0.08,0.11*b)));
    const tail=mesh(box(0.03,0.03,0.14),dm,0,0.3,-0.2); tail.rotation.x=-0.7; dog.add(tail); dog.userData.tail=tail; dog.add(blob(0.2)); root.add(dog); }
  root.add(blob(0.34));
  if(o.glasses){ const gm=M.dark; [-1,1].forEach(sd=>{ const r=mesh(new THREE.TorusGeometry(0.045,0.009,6,14),gm,0.09*sd,0.02,0.245); head.add(r); }); head.add(mesh(box(0.06,0.01,0.01),gm,0,0.03,0.25)); }
  if(o.beard){ const bd=mesh(sph(0.2,12,8,0,Math.PI*2,Math.PI*0.55,Math.PI*0.45),hair,0,-0.02,0.03); head.add(bd); }
  if(o.cane){ const cn=mesh(cyl(0.015,0.015,0.62,6),mat(0x5a3d22),0,-0.55,0.04); arms[1].add(cn); }
  if(o.phone){ arms[0].add(mesh(box(0.08,0.14,0.015),M.dark,0,-0.33,0.07)); }
  if(o.partner&&!child){ child=makeChar({skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['long','bun','short','curly','pony']),top:o.top,bottom:rand(BOTTOMS),scale:0.97}); child.root.position.set(-0.52,0,-0.05); root.add(child.root); }
  const s=o.scale||1; root.scale.setScalar(s);
  return {root,body,head,legs,arms,hold,bag,child,dog,eyes,hunch:o.hunch?0.16:0,t:Math.random()*10,ph:Math.random()*10,blink:1+Math.random()*4,sm:null,mode:'idle',spd:1,items:[]};
}
function setHold(c,items){
  while(c.hold.children.length) c.hold.remove(c.hold.children[0]);
  c.items=items.slice();
  items.forEach((it,k)=>{ const y=k*0.13;
    if(it==='paper'){ const r=mesh(cyl(0.09,0.09,0.16,12),M.white,0,y,0); r.rotation.z=Math.PI/2; c.hold.add(r); }
    else if(it==='towel'){ c.hold.add(mesh(rbox(0.3,0.1,0.22,.04),mat(k%2?0xffffff:0x5d9fd6),0,y,0)); }
    else if(it==='coffee'){ c.hold.add(mesh(cyl(0.07,0.055,0.14,12),M.white,0,y+0.02,0)); c.hold.add(mesh(cyl(0.072,0.072,0.03,12),mat(0x6b4226),0,y+0.08,0)); }
    else { c.hold.add(mesh(cyl(0.2,0.2,0.03,16),mat(0xc9d1d8,{metalness:.7,roughness:.3}),0,y,0)); c.hold.add(mesh(new THREE.SphereGeometry(0.14,12,8,0,Math.PI*2,0,Math.PI/2),mat(0xdfe6ec,{metalness:.8,roughness:.25}),0,y+0.015,0)); }
  });
}
function animChar(c,dt){
  const m=c.mode, carrying=c.items.length>0;
  const fast=(m==='walk'||m==='run');
  c.t+=dt*(fast?9.5*c.spd:m==='swim'?5:m==='work'?12:2);
  const t=c.t, L=c.legs, A=c.arms, B=c.body;
  B.rotation.set(0,0,0); B.position.y=0.36; B.scale.set(1,1,1);
  L[0].rotation.set(0,0,0); L[1].rotation.set(0,0,0); A[0].rotation.set(0,0,0); A[1].rotation.set(0,0,0);
  if(fast){
    const s=Math.sin(t)*0.7; L[0].rotation.x=s; L[1].rotation.x=-s;
    B.position.y=0.36+Math.abs(Math.sin(t))*0.055; B.rotation.z=Math.sin(t)*0.045; B.scale.y=1-Math.abs(Math.cos(t))*0.03;
    A[0].rotation.x=-s*0.85; A[1].rotation.x=c.bag&&!c.child?0.05:s*0.85;
  } else if(m==='work'){
    A[1].rotation.x=-1.3+Math.sin(t)*0.5; A[0].rotation.x=-0.8+Math.cos(t*0.9)*0.35; B.rotation.x=0.18; B.position.y=0.36+Math.sin(t*2)*0.01;
  } else if(m==='sit'){
    L[0].rotation.x=L[1].rotation.x=-1.45; B.position.y=0.28; A[0].rotation.x=A[1].rotation.x=-0.5;
  } else if(m==='swim'){
    L[0].rotation.x=Math.sin(t*1.6)*0.5; L[1].rotation.x=-Math.sin(t*1.6)*0.5; A[0].rotation.x=-Math.PI+Math.sin(t)*1.2; A[1].rotation.x=-Math.PI-Math.sin(t)*1.2;
  } else if(m==='sleep'){
    A[0].rotation.z=0.15; A[1].rotation.z=-0.15; B.scale.y=1+Math.sin(t*0.8)*0.02;
  } else if(m==='cheer'){
    A[0].rotation.z=-2.5+Math.sin(t*6)*0.3; A[1].rotation.z=2.5-Math.sin(t*6)*0.3; B.position.y=0.36+Math.abs(Math.sin(t*3))*0.12;
  } else {
    B.scale.y=1+Math.sin(t*2)*0.015; A[0].rotation.z=0.08; A[1].rotation.z=-0.08;
  }
  if(carrying&&m!=='sleep'&&m!=='swim'){ A[0].rotation.set(-1.25,0,0.25); A[1].rotation.set(-1.25,0,-0.25); }
  // --- life: head look-around, walking lean, blinking, smooth pose transitions ---
  const H=c.head, idle=!fast&&m!=='work'&&m!=='sleep'&&m!=='swim';
  c.ph+=dt; const look=idle?Math.sin(c.ph*0.45)*0.5*Math.max(0,Math.sin(c.ph*0.17+1)):0;
  H.rotation.y+=(look-H.rotation.y)*Math.min(1,dt*4); H.rotation.x+=((m==='sleep'?0:idle?Math.sin(c.ph*0.6)*0.06:fast?0.08:m==='work'?0.25:0)-H.rotation.x)*Math.min(1,dt*5);
  if(fast) B.rotation.x+=0.07;
  if(c.eyes){ c.blink-=dt; const sh=c.blink<0.12&&m!=='sleep'?0.12:m==='sleep'?0.1:1.15; c.eyes.forEach(e=>e.scale.y=sh); if(c.blink<0) c.blink=2.5+Math.random()*3.5; }
  const tgt=[L[0].rotation.x,L[1].rotation.x,A[0].rotation.x,A[1].rotation.x,A[0].rotation.z,A[1].rotation.z,B.position.y,B.rotation.x];
  if(c.sm){ const k=Math.min(1,dt*16); for(let i=0;i<8;i++) c.sm[i]+=(tgt[i]-c.sm[i])*k; } else c.sm=tgt.slice();
  const S=c.sm; L[0].rotation.x=S[0]; L[1].rotation.x=S[1]; A[0].rotation.x=S[2]; A[1].rotation.x=S[3]; A[0].rotation.z=S[4]; A[1].rotation.z=S[5]; B.position.y=S[6]; B.rotation.x=S[7]+(c.hunch||0);
  if(c.child){ c.child.mode=m==='walk'?'walk':'idle'; c.child.spd=c.spd; animChar(c.child,dt); c.child.root.visible=!(m==='sleep'||m==='swim'||m==='sit'||m==='run'); }
  if(c.dog){ const hide=m==='sleep'||m==='swim'||m==='sit'||m==='run'; c.dog.visible=!hide; c.dog.position.y=fast?Math.abs(Math.sin(c.t*1.4))*0.05:0;
    c.dog.userData.tail.rotation.y=Math.sin(c.ph*(fast?14:6))*0.6; }
  if(c.bag&&!c.child&&c.bag.parent===c.root) c.bag.visible=!(m==='sleep'||m==='swim'||m==='sit'||m==='run');
}
