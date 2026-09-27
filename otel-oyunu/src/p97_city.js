
// =====================================================================
// MG6-1 · ŞEHRE ÖZEL OTEL: her şehrin kendi oda planı (üst katlarda farklı
// oda yerleşimi), boş kalan yerlerde şehre özgü köşeler ve giriş cephesinde
// şehrin mimari kimliği. Zemin kat her şehirde 12 oda (erken oyun sabit).
// =====================================================================
function cityPlan(){ return ({
  'İstanbul':{n:'Tarihi konak',     up:[[0,1,2,3,4,5,6,7,9,10],[0,1,2,3,4,5,6,7]],       nook:{e:'🫖',n:'Çay ocağı',c:0x9b3f30}},
  'Antalya': {n:'Sahil resortu',    up:[[0,1,2,3,4,5,6,7,8,9,10,11],[0,1,2,3,4,5,6,7]], nook:{e:'🏖️',n:'Plaj duşları',c:0x2a8a96}},
  'Kapadokya':{n:'Mağara otel',     up:[[0,1,2,3,4,5,6,7,9,10],[1,2,5,6,4,7,9,10]],  nook:{e:'🍷',n:'Şarap mahzeni',c:0x8f5130}},
  'Bodrum':  {n:'Teraslı yamaç',    up:[[0,1,2,3,4,5,6,7,9,10],[0,1,2,3,4,5,6,7,9,10]], nook:{e:'⛵',n:'Yelken kulübü',c:0x2a5fa8}},
  'Paris':   {n:'Köşe bina',        up:[[0,1,2,3,4,5,6,7,8,9,10,11],[0,1,2,3,4,5,6,7,9,10]], nook:{e:'📚',n:'Kütüphane',c:0x3d4a5c}},
  'Dubai':   {n:'Gökdelen',         up:[[0,1,2,3,4,5,6,7,8,9,10,11],[0,1,2,3,4,5,6,7,8,9,10,11]], nook:{e:'✨',n:'Altın lounge',c:0xb8913a}}})[city().name]||null; }
// oda yeri bu şehirde var mı? (zaten yapılmış oda hep korunur: eski kayıtlar bozulmaz)
function cityHasSlot(f,l){ if(f===0) return true; const P=cityPlan(); if(!P) return true; const id=roomId(f,l);
  if(typeof state!=='undefined'&&state&&state.rooms&&state.rooms[id]) return true; return (P.up[f-1]||[]).includes(l); }
function cityCapacity(){ let n=12; for(let f=1;f<3;f++) for(let l=0;l<12;l++) if(cityHasSlot(f,l)) n++; return n; }

// ---------- boş yerlerde şehre özgü köşe ----------
const nookG={};
function buildNooks(f){
  if(nookG[f]){ nookG[f].parent&&nookG[f].parent.remove(nookG[f]); removeCols('nook'+f); delete nookG[f]; }
  const P=cityPlan(); if(!P||floorsBuilt()<=f) return; const g=new THREE.Group(), cols=[], N=P.nook, acc=mat(N.c,{roughness:.85}), wood=tmat('woodDark',1,1);
  for(let l=0;l<12;l++){ if(cityHasSlot(f,l)) continue; const ri=roomInfo(roomId(f,l)), x=ri.x, z=ri.z, hd=RD/2;
    g.add(mesh(box(RW-0.1,0.03,RD-0.1),tmat('marble',2,2),x,0.02,z));
    [-1,1].forEach(sd=>g.add(mesh(box(0.12,1.1,RD),acc,x+sd*1.44,0.55,z,true))); g.add(mesh(box(RW,1.6,0.12),acc,x,0.8,z-hd+0.06,true));
    g.add(mesh(rbox(1.6,0.34,0.6,.1),acc,x,0.2,z-0.7,true)); g.add(mesh(rbox(1.6,0.45,0.14,.06),acc,x,0.45,z-0.98,true));
    g.add(mesh(cyl(0.32,0.32,0.05,16),wood,x,0.45,z+0.15)); g.add(mesh(cyl(0.04,0.04,0.42,8),M.gold,x,0.22,z+0.15));
    bigPlant(g,x+1.1,z+0.9,0.55); bigPlant(g,x-1.1,z+0.9,0.55);
    const sg=signPlane(`${N.e} ${N.n.toUpperCase()}`,1.5,0.3,{bg:'#'+N.c.toString(16).padStart(6,'0'),fg:'#fff',font:'800 52px "Baloo 2"',fit:true}); sg.position.set(x,1.35,z-hd+0.14); g.add(sg);
    cols.push([f,x-1.5,x+1.5,z-hd-0.05,z-hd+0.15],[f,x-1.5,x-1.38,z-hd,z+hd],[f,x+1.38,x+1.5,z-hd,z+hd],[f,x-0.85,x+0.85,z-1.05,z-0.38],[f,x-0.35,x+0.35,z-0.2,z+0.5]); }
  if(!cols.length) return; bakeStatic(g); floorRoot(f).add(g); nookG[f]=g; addCols('nook'+f,cols);
}
function nookSat(f){ const P=cityPlan(); if(!P||f===0) return 0; for(let l=0;l<12;l++) if(!cityHasSlot(f,l)) return 2; return 0; }

// ---------- giriş cephesi: şehrin mimari kimliği ----------
let facadeG=null;
function buildCityFacade(){
  if(facadeG){ facadeG.parent&&facadeG.parent.remove(facadeG); facadeG=null; } const nm=city().name, g=new THREE.Group(), gold=M.gold, white=mat(0xf6f1e6,{roughness:.5});
  const Z=7.64;   // cam cephenin hemen önü
  if(nm==='İstanbul'){ // ahşap cumbalar + çini şerit + fenerler
    [-4.1,4.1].forEach(x=>{ g.add(mesh(rbox(2.2,0.9,0.5,.04),tmat('woodDark',2,1),x,3.3,Z+0.2,true)); g.add(mesh(box(2.0,0.5,0.03),M.glass,x,3.35,Z+0.46)); g.add(mesh(box(2.3,0.08,0.6),mat(0x9b3f30),x,3.8,Z+0.2)); });
    [-2.2,2.2].forEach(x=>{ g.add(mesh(cyl(0.02,0.02,0.4,6),gold,x,2.55,Z+0.3)); g.add(mesh(cyl(0.11,0.13,0.28,8),mat(0xffd27a,{emissive:0xffb040,emissiveIntensity:.6}),x,2.2,Z+0.3)); }); }
  else if(nm==='Antalya'){ // beyaz kemerler + hasır tente
    [-5.5,-3.3,3.3,5.5].forEach(x=>{ const a=mesh(new THREE.TorusGeometry(0.9,0.12,8,20,Math.PI),white,x,2.0,Z+0.15); g.add(a); [-0.9,0.9].forEach(d=>g.add(mesh(box(0.24,2.0,0.24),white,x+d,1.0,Z+0.15,true))); });
    const t=mesh(cone(2.4,0.7,6),mat(0xc9a15a,{roughness:1,flatShading:true}),0,3.55,Z+0.6); g.add(t); }
  else if(nm==='Kapadokya'){ // taş kemerli giriş + kaya kütleleri
    const st=mat(0xd9b48a,{roughness:1,flatShading:true});
    const ar=mesh(new THREE.TorusGeometry(1.5,0.25,8,20,Math.PI),st,0,2.6,Z+0.2); g.add(ar); [-1.5,1.5].forEach(d=>g.add(mesh(box(0.5,2.6,0.5),st,d,1.3,Z+0.2,true)));
    [-6.2,6.2].forEach(x=>{ g.add(mesh(cone(0.7,2.6,7),st,x,1.3,Z+0.5,true)); g.add(mesh(sph(0.35,7,5),mat(0x8f5130,{flatShading:true}),x,2.7,Z+0.5)); }); }
  else if(nm==='Bodrum'){ // mavi kapı pervazları + begonviller
    [-1.25,1.25].forEach(d=>g.add(mesh(box(0.2,2.8,0.2),mat(0x2a5fa8),d,1.4,Z+0.1,true))); g.add(mesh(box(2.7,0.22,0.22),mat(0x2a5fa8),0,2.85,Z+0.1));
    for(let i=0;i<16;i++) g.add(mesh(sph(rnd(0.14,0.24),7,5),mat(i%3?0xd63384:0x2e8b57,{flatShading:true,roughness:1}),rnd(-6.8,-2)+(i%2?8.8:0),rnd(2.4,3.5),Z+0.25)); }
  else if(nm==='Paris'){ // çizgili tente + ferforje balkon + bistro tabelası
    const aw=mesh(box(4.2,0.08,1.2),tmat('awning',2,1),0,2.9,Z+0.55); aw.rotation.x=0.3; g.add(aw);
    [-4.4,4.4].forEach(x=>{ g.add(mesh(box(2.4,0.06,0.5),M.dark,x,3.2,Z+0.25)); for(let k=0;k<9;k++) g.add(mesh(box(0.025,0.5,0.025),M.dark,x-1.15+k*0.29,3.45,Z+0.48)); g.add(mesh(box(2.4,0.04,0.04),M.dark,x,3.7,Z+0.48)); }); }
  else if(nm==='Dubai'){ // altın cam kanatlar + LED şerit
    [-6.6,-5.6,-4.6,-3.6,3.6,4.6,5.6,6.6].forEach(x=>{ g.add(mesh(box(0.08,3.4,0.5),mat(0xd8b45a,{metalness:.8,roughness:.25}),x,1.7,Z+0.25,true)); });
    g.add(mesh(box(14.2,0.05,0.05),new THREE.MeshBasicMaterial({color:0x7fe3ff}),0,3.05,Z+0.3)); }
  if(!g.children.length) return; bakeStatic(g); floorRoot(0).add(g); facadeG=g;
}
function cityPlanHtml(){ const P=cityPlan(); if(!P) return ''; return `<div class="row"><div class="ic">🏛️</div><div class="tx">${city().name} · ${P.n}<small>Bu şehirde ${cityCapacity()} oda yeri var · boş kalan yerler ${P.nook.e} ${P.nook.n} (+2 memnuniyet o katta)</small></div></div>`; }
function bootCity(){ try{ buildCityFacade(); for(let f=1;f<3;f++) buildNooks(f); }catch(e){ console.warn('city',e); } }
