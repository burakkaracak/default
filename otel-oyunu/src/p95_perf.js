
// =====================================================================
// PERFORMANS (Faz 4): kat başına oda birleştirme (static batching),
// oda iç parçalarını birleştirme, dış mekân sabit süslerini birleştirme
// (karakterler p5 skinChar ile tek ağa iner)
// =====================================================================
// bir grubu yerinde birleştir (dönüşümü olmayan grup için)
function bakeInPlace(g){ if(!g||!g.children.length) return; const par=g.parent, vis=g.visible; if(par) par.remove(g);
  const pos=g.position.clone(), rot=g.rotation.clone(), sc=g.scale.clone(); g.position.set(0,0,0); g.rotation.set(0,0,0); g.scale.set(1,1,1); g.updateMatrixWorld(true);
  const b=bake(g); if(b!==g){ while(g.children.length) g.remove(g.children[0]); b.children.slice().forEach(m=>g.add(m)); }
  g.position.copy(pos); g.rotation.copy(rot); g.scale.copy(sc); g.visible=vis; if(par) par.add(g); }

// MG11-D2: dokusuz, saydam olmayan, ışımasız MeshStandard parçaları renkleri köşe rengine (vertex color) yazarak TEK ağa indir
// (malzeme sayısı kadar çizim yerine 1 çizim; pürüzlülük farkı kaybolur). Diğer parçalar (doku, saydam, ışıma) olduğu gibi kalır.
let flatMat=null;
function flatOk(o){ const m=o.material; return o.isMesh&&m&&m.isMeshStandardMaterial&&!m.map&&!m.normalMap&&!m.emissiveMap&&!m.transparent&&(m.metalness||0)<0.5&&(!m.emissive||m.emissive.getHex()===0)&&!m.vertexColors&&o.geometry&&o.geometry.attributes&&o.geometry.attributes.normal; }
function bakeFlat(g){ try{ if(!g||!g.children.length) return; const list=[]; g.updateMatrixWorld(true); g.traverse(o=>{ if(o!==g&&flatOk(o)) list.push(o); }); if(list.length<2) return;
  const inv=new THREE.Matrix4().copy(g.matrixWorld).invert(); let n=0; const geos=list.map(o=>{ const ge=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(); ge.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)); n+=ge.attributes.position.count; return ge; });
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2), col=new Float32Array(n*3); let off=0, cast=false;
  geos.forEach((ge,i)=>{ const c=ge.attributes.position.count, m=list[i].material; pos.set(ge.attributes.position.array,off*3); nor.set(ge.attributes.normal.array,off*3); if(ge.attributes.uv) uv.set(ge.attributes.uv.array,off*2);
    for(let k=0;k<c;k++){ col[(off+k)*3]=m.color.r; col[(off+k)*3+1]=m.color.g; col[(off+k)*3+2]=m.color.b; } off+=c; cast=cast||list[i].castShadow; ge.dispose(); });
  const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(pos,3)); bg.setAttribute('normal',new THREE.BufferAttribute(nor,3)); bg.setAttribute('uv',new THREE.BufferAttribute(uv,2)); bg.setAttribute('color',new THREE.BufferAttribute(col,3)); bg.computeBoundingSphere();
  flatMat=flatMat||new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0}); const m=new THREE.Mesh(bg,flatMat); m.castShadow=cast; m.receiveShadow=true; m.userData.flat=true;
  list.forEach(o=>{ if(o.parent) o.parent.remove(o); }); g.add(m); }catch(e){ console.warn('bakeFlat',e); } }

// bir grubun (dönüşümsüz kabul edilir) hareketsiz çocuklarını tek partide birleştir
function bakeStatic(G,exclude){ try{ if(!G) return; const keep=exclude||new Set(), list=G.children.filter(o=>!keep.has(o)&&!(o.isMesh&&o.material&&o.material.transparent)); if(list.length<3) return;
  const cont=new THREE.Group(); list.forEach(o=>{ G.remove(o); cont.add(o); }); cont.updateMatrixWorld(true); const b=bake(cont);
  if(b===cont){ list.forEach(o=>G.add(o)); return; } b.children.slice().forEach(m=>G.add(m)); }catch(e){ console.warn('bakeStatic',e); } }

// ---------- odalar: kat başına tek sabit parti ----------
const floorBatch={}, batchIds={}, batchDue={};
function perfRoomPrep(G,win){ const st=G.children[0]; if(!st) return; if(win&&win.parent===st) G.add(win); G.userData.static=st; }
function perfRoomPost(id){
  const R=RT(id), P=R.parts, f=roomInfo(id).f; if(!P) return;
  ['made','messy','tip'].forEach(k=>{ bakeFlat(P[k]); bakeInPlace(P[k]); });   // önce düz renkliler tek ağa, kalanlar malzemeye göre
  if(floorBatch[f]&&batchIds[f]&&batchIds[f].has(id)) rebatchFloor(f,id);   // eski kopyayı hemen partiden çıkar
  batchDue[f]=1.4;
}
function rebatchFloor(f,skip){
  const cont=new THREE.Group(), ids=new Set();
  for(const k in state.rooms){ const id=+k, R=RT(id); if(roomInfo(id).f!==f||id===skip||!R.group||!R.group.userData.static) continue;
    const st=R.group.userData.static, cl=new THREE.Group(); st.children.forEach(m=>cl.add(new THREE.Mesh(m.geometry,m.material))); cl.children.forEach((m,i)=>{ m.castShadow=st.children[i].castShadow; });
    cl.position.copy(R.group.position); cont.add(cl); ids.add(id); }
  if(floorBatch[f]){ floorBatch[f].parent&&floorBatch[f].parent.remove(floorBatch[f]); floorBatch[f].traverse(o=>{ if(o.isMesh) o.geometry.dispose(); }); floorBatch[f]=null; }
  for(const k in state.rooms){ const R=RT(+k); if(R.group&&R.group.userData.static&&roomInfo(+k).f===f) R.group.userData.static.visible=!ids.has(+k); }
  if(!ids.size) return; cont.updateMatrixWorld(true); const b=bake(cont); if(b===cont) { for(const k of ids) RT(k).group.userData.static.visible=true; return; }
  b.userData.batch=true; floorRoot(f).add(b); floorBatch[f]=b; batchIds[f]=ids;
}
// üstteki bir kata bakarken alttaki katların oda içleri tavanın altında kalır: dinamik parçalarını gizle (sabit parti görünür kalır)
let occT=0;
function updateOcclusion(){ const vf=viewFloor; for(const k in state.rooms){ const R=RT(+k); if(!R.group) continue; const f=roomInfo(+k).f, want=f>=vf||!floorBatch[f]||!batchIds[f]||!batchIds[f].has(+k); if(R.group.visible!==want) R.group.visible=want; } }
function updatePerf(dt){ for(const f in batchDue){ batchDue[f]-=dt; if(batchDue[f]<=0){ delete batchDue[f]; rebatchFloor(+f); } } occT-=dt; if(occT<=0){ occT=0.25; updateOcclusion(); } }

// ---------- dış mekân: sabit tekil parçaları birleştir ----------
let outdoorMerged=null;
function mergeOutdoorStatic(){
  const skip=new Set([groundMesh,snowCover].concat(typeof puddles!=='undefined'?puddles:[]).concat(typeof streetGlows!=='undefined'?streetGlows:[]));
  const list=outdoor.children.filter(o=>o.isMesh&&!skip.has(o)&&o.material&&!o.material.transparent&&!Array.isArray(o.material)&&o.visible);
  if(list.length<4) return; const cont=new THREE.Group(); list.forEach(o=>{ outdoor.remove(o); cont.add(o); }); cont.updateMatrixWorld(true);
  const b=bake(cont); if(b===cont){ list.forEach(o=>outdoor.add(o)); return; } outdoor.add(b); outdoorMerged=b;
}
function perfStats(){ let n=0; scene.traverse(o=>{ if((o.isMesh||o.isLine||o.isPoints)&&o.visible){ let p=o, v=true; while(p){ if(!p.visible){ v=false; break; } p=p.parent; } if(v) n++; } }); return n; }
