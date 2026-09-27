
// =====================================================================
// PHASE 5: room designer (grid furniture), talking staff, morning
// newspaper, cloud save (db + user capabilities)
// =====================================================================

// ---------- room designer ----------
const FURN={
  lamp:  {e:'🪔',name:'Ayaklı lamba',cost:60, sat:1},
  plant2:{e:'🌿',name:'Büyük saksı', cost:50, sat:1},
  chair: {e:'🪑',name:'Koltuk',      cost:120,sat:2},
  shelf: {e:'📚',name:'Kitaplık',    cost:150,sat:2},
  desk:  {e:'🖥️',name:'Çalışma masası',cost:180,sat:2},
  aqua:  {e:'🐠',name:'Akvaryum',    cost:260,sat:3}};
const FG={cols:6,rows:6,x0:-1.5,z0:-1.4,cw:0.5,ch:2.8/6};
function furnCost(k){ return Math.round(FURN[k].cost*cm()); }
function cellCenter(i,j){ return {x:FG.x0+(i+0.5)*FG.cw,z:FG.z0+(j+0.5)*FG.ch}; }
function roomBlockRects(id){
  const s=state.rooms[id], b=bedGeom(s.type), R=[[-1.5,b.right+0.46,-1.4,0.74],[0.62,1.5,-1.4,-0.38],[-0.4,0.7,-0.25,1.4]];
  if(s.type==='eco') R.push([0.7,1.22,0.6,1.14]); if(s.type==='dlx') R.push([1.06,1.46,-0.34,0.34],[0.7,1.3,0.55,1.15]); if(s.type==='suite') R.push([0.98,1.46,-0.42,1.22],[0.48,0.96,0.16,0.64]);
  if(s.decor.plant) R.push([-1.46,-1.04,0.83,1.3]); if(s.decor.bar) R.push([-1.06,-0.7,0.84,1.22]);
  return R;
}
function cellFree(id,i,j){ const c=cellCenter(i,j), hw=FG.cw*0.42, hh=FG.ch*0.42;
  return !roomBlockRects(id).some(r=>c.x+hw>r[0]&&c.x-hw<r[1]&&c.z+hh>r[2]&&c.z-hh<r[3]); }
function designSat(s){ const f=s.furn||[]; if(!f.length) return 0; const kinds=new Set(f.map(x=>x.k)).size; return Math.min(8,f.reduce((a,x)=>a+FURN[x.k].sat,0))+Math.min(2,kinds-1); }
function buildFurn(S,s,cols){
  (s.furn||[]).forEach(f=>{ const c=cellCenter(f.i,f.j), x=c.x, z=c.z;
    if(f.k==='lamp'){ S.add(mesh(cyl(0.12,0.14,0.03,12),M.dark,x,0.015,z)); S.add(mesh(cyl(0.015,0.015,1.1,6),M.gold,x,0.56,z)); S.add(mesh(cone(0.16,0.2,12),M.lampOn,x,1.15,z)); }
    else if(f.k==='plant2') bigPlant(S,x,z,0.55);
    else if(f.k==='chair'){ const m=mat(0xb0736a,{roughness:.95}); S.add(mesh(rbox(0.42,0.24,0.4,.08),m,x,0.2,z,true)); S.add(mesh(rbox(0.42,0.4,0.1,.05),m,x,0.42,z-0.16,true)); }
    else if(f.k==='shelf'){ S.add(mesh(rbox(0.44,1.3,0.26,.02),tmat('woodDark',1,2),x,0.65,z,true)); for(let r=0;r<3;r++) for(let b=0;b<5;b++) S.add(mesh(box(0.06,0.24,0.18),mat(rand([0xc0392b,0x2e86c1,0x27ae60,0xf2b632,0x8e44ad])),x-0.16+b*0.08,0.3+r*0.38,z+0.02)); }
    else if(f.k==='desk'){ S.add(mesh(rbox(0.46,0.05,0.32,.02),tmat('wood',1,1),x,0.62,z,true)); [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,c2])=>S.add(mesh(cyl(0.015,0.015,0.6,6),M.dark,x+a*0.19,0.3,z+c2*0.12))); S.add(mesh(box(0.26,0.17,0.02),M.dark,x,0.76,z-0.08)); }
    else if(f.k==='aqua'){ S.add(mesh(rbox(0.46,0.5,0.3,.02),tmat('woodDark',1,1),x,0.25,z,true)); S.add(mesh(box(0.44,0.34,0.28),new THREE.MeshStandardMaterial({color:0x5fc4e8,transparent:true,opacity:.55,roughness:.05,emissive:0x0b5a8a,emissiveIntensity:.35}),x,0.68,z)); S.add(mesh(sph(0.03,6,4),mat(0xff8a3a),x+0.06,0.68,z)); S.add(mesh(sph(0.025,6,4),mat(0xf2d24a),x-0.08,0.62,z)); }
    cols.push([x-FG.cw*0.44,x+FG.cw*0.44,z-FG.ch*0.44,z+FG.ch*0.44]); });
}
let designSel='lamp';
function openDesigner(id){
  const s=state.rooms[id]; if(!s) return; s.furn=s.furn||[]; const busy=!!RT(id).guest, full=s.furn.length>=4;
  let grid=''; for(let j=0;j<FG.rows;j++) for(let i=0;i<FG.cols;i++){ const f=s.furn.find(x=>x.i===i&&x.j===j), free=cellFree(id,i,j);
    grid+=`<button class="dcell${f?' has':free?'':' off'}" data-c="${i},${j}" ${!f&&(!free||busy||full)?'disabled':''}>${f?FURN[f.k].e:free?'':'·'}</button>`; }
  openModal(`<h3>🛋️ Oda ${id} tasarımı <button class="xbtn" id="dsX" aria-label="Kapat">✖</button></h3>
    <p class="sub">Tasarım puanı: +${designSat(s)} memnuniyet · en fazla 4 eşya · çeşit bonus verir${busy?' · <b>misafir varken değiştirilemez</b>':''}</p>
    <div class="dgrid">${grid}</div><p class="note">⬆ Oda kuşbakışı: üstte yatak ve banyo, altta kapı. Seçili eşyayı boş kareye koy; eşyaya dokunursan kaldırılır (yarı fiyat iade).</p>
    <div class="agrid">${Object.keys(FURN).map(k=>`<button class="btn ${designSel===k?'':'ghost'} abtn" data-fk="${k}">${FURN[k].e} ${FURN[k].name} · ${fmt(furnCost(k))} ₺</button>`).join('')}</div>`,m=>{
    m.querySelector('#dsX').onclick=closeModal;
    m.querySelectorAll('[data-fk]').forEach(b=>b.onclick=()=>{ designSel=b.dataset.fk; sfx('click'); openDesigner(id); });
    m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ const [i,j]=b.dataset.c.split(',').map(Number), k=s.furn.findIndex(x=>x.i===i&&x.j===j);
      if(RT(id).guest) return;
      if(k>=0){ const f=s.furn.splice(k,1)[0]; state.money+=Math.round(furnCost(f.k)/2); sfx('drop'); }
      else { if(s.furn.length>=4||!cellFree(id,i,j)||!spend(furnCost(designSel))) return; s.furn.push({k:designSel,i,j}); sfx('build'); qEv('upg'); }
      buildRoomVisual(id,false); ents.forEach(unstick); save(); openDesigner(id); }); });
}

// ---------- talking staff ----------
const STAFF_PERSONA={rec:'güler yüzlü, düzenli resepsiyonist',clean:'titiz, biraz esprili temizlik görevlisi',bell:'enerjik, her yere koşturan kat görevlisi',tech:'sakin, her şeyi tamir edebilen teknisyen',spaT:'huzurlu, yumuşak konuşan spa terapisti',laundry:'pratik, şakacı çamaşırcı'};
function pickStaffAt(){ const list=staffEnts.filter(e=>e.c.root.visible), roots=list.map(e=>e.c.root); const hits=ray.intersectObjects(roots,true); if(!hits.length) return null;
  let o=hits[0].object; while(o&&!roots.includes(o)) o=o.parent; return o?list[roots.indexOf(o)]:null; }
let staffTalkBusy=false;
function openStaffChat(e,reply){
  const S=STAFF[e.kind], en=Math.round(e.energy??100), opts=[['praise','👏 Harika iş çıkarıyorsun!'],['ask','🙂 Nasılsın, işler nasıl?'],['push','⏩ Biraz hızlanmamız lazım']];
  openModal(`<h3>${S.e} ${escH(e.name)} <small style="font-size:13px;color:var(--muted)">${RANKS[rankOf(e)]} ${S.name}</small><button class="xbtn" id="scX" aria-label="Kapat">✖</button></h3>
    <p class="sub">Enerji %${en}${en<30?' 😓':''} · deneyim ${e.rec?e.rec.xp:0} iş${e.star?' · 🏅 günün çalışanı':''}</p>
    ${reply?`<div class="cb them" style="max-width:100%;margin:6px 0 10px">${escH(reply)}</div>`:''}
    ${opts.map(([k,t])=>`<button class="btn ${k==='praise'?'gold':k==='ask'?'':'ghost'} wide" data-st="${k}" ${staffTalkBusy?'disabled':''}>${t}</button>`).join('')}
    <p class="note">Övgü günde bir kez enerji verir · acele ettirmek kısa süre hızlandırır ama yorar</p>`,m=>{
    m.querySelector('#scX').onclick=closeModal; m.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>staffTalk(e,b.dataset.st)); });
}
async function staffTalk(e,k){
  if(staffTalkBusy) return; staffTalkBusy=true; let note='';
  if(k==='praise'){ if(e.praised!==state.day){ e.praised=state.day; e.energy=Math.min(100,(e.energy??100)+30); e.tiredShown=false; note='(enerji +30)'; fxEmoji(e.x,e.y+2.2,e.z,e.f,'😊'); sfx('sparkle'); } else note='(bugün zaten övdün)'; }
  if(k==='push'){ e.energy=Math.max(0,(e.energy??100)-15); e.rushUntil=gtime+25; note='(25 sn hızlı, enerji −15)'; fxEmoji(e.x,e.y+2.2,e.z,e.f,'💨'); }
  const canned={praise:['Çok teşekkürler, bu beni motive etti!','Sağ olun müdürüm, elimden geleni yapıyorum!'],ask:[(e.energy??100)<30?'Açıkçası biraz yoruldum ama idare ediyorum.':'Her şey yolunda, bugün harika bir gün!','Misafirler memnun, ben de memnunum!'],push:['Tamam, hızlanıyorum!','Anlaşıldı, hemen!']}[k];
  let txt=rand(canned);
  const r=await aiJSON(`Bir otel işletme oyununda bir çalışanı canlandırıyorsun: ${e.name}, ${RANKS[rankOf(e)]} ${STAFF[e.kind].name} (${STAFF_PERSONA[e.kind]||'çalışkan biri'}). Enerjin %${Math.round(e.energy??100)}. Otel: "${hotelName()}", ${city().name}.
Müdür sana şunu dedi: "${{praise:'Harika iş çıkarıyorsun!',ask:'Nasılsın, işler nasıl?',push:'Biraz hızlanmamız lazım.'}[k]}". Türkçe, doğal, tek kısa cümleyle cevap ver, karakterden çıkma.
SADECE JSON: {"cevap":"..."}`);
  if(r&&clip(r.cevap,200)) txt=clip(r.cevap,200);
  staffTalkBusy=false; onGameEvent('chat',1); openStaffChat(e,`${txt} ${note}`);
}

// ---------- morning newspaper ----------
async function fillNews(box,day,t,dr){
  const good=t.happy>=t.unhappy*2&&(dr==null||dr>=0), name=hotelName();
  let head=good?`${name} yine dolup taştı!`:t.left>2?`${name}'da uzun kuyruk krizi`:`${name}: sakin ama istikrarlı bir gün`;
  let sub=`${t.guests} misafir, ${t.happy} mutlu yüz${state.rival&&!state.rival.bought?` · rakip ${state.rival.name} kulis yapıyor`:''}`;
  const draw=()=>{ box.innerHTML=`<div class="news"><b>📰 ${escH(city().name)} Sabah Gazetesi</b><div class="nh">${escH(head)}</div><div class="ns">${escH(sub)}</div></div>`; }; draw();
  const r=await aiJSON(`Bir otel işletme oyununda yerel gazetenin sabah manşetini yazıyorsun. Türkçe, esprili, gazete dilinde.
Otel: "${name}", ${city().name}, ${stars()} yıldız. Dün (gün ${day}): ${t.guests} misafir, ${t.happy} mutlu, ${t.unhappy} mutsuz, ${t.left} bekleyip gitti, ün değişimi ${dr==null?'?':dr}.${festivalOn()?' Şehirde festival var.':''}${state.rival&&!state.rival.bought?` Rakip otel: ${state.rival.name}.`:''}
SADECE JSON: {"manset":"en fazla 8 kelime","spot":"en fazla 16 kelime"}`);
  if(r&&clip(r.manset,90)){ head=clip(r.manset,90); sub=clip(r.spot,140)||sub; draw(); }
}

// ---------- cloud save ----------
let cloudDb=null, cloudUid=null, cloudT=90, cloudMsg='';
(async()=>{ try{ if(window.claude&&typeof window.claude.use==='function'){ const [db,u]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
  if(db&&u){ const id=await u.id(); if(id){ cloudDb=db; cloudUid=id; setTimeout(cloudCheck,2500); } } } }catch(e){} })();
function cloudRef(){ return cloudDb.doc('data/users/'+cloudUid+'/save'); }
async function cloudSave(manual){
  if(!cloudDb||state.sandbox) return false;
  try{ const s=JSON.parse(JSON.stringify(state)); if(s.log&&s.log.length>20) s.log.length=20; const body={s:JSON.stringify(s),at:Date.now(),day:state.day,city:state.city};
    if(body.s.length>240000) return false; await cloudRef().set(body); cloudMsg=`son bulut kaydı: ${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}`; if(manual){ toast('☁️ Buluta kaydedildi'); sfx('coin'); } return true; }
  catch(e){ if(e&&e.code==='invalid_argument') cloudDb=null; if(manual) toast('☁️ Buluta kaydedilemedi','bad'); return false; }
}
async function cloudCheck(manual){
  if(!cloudDb||state.sandbox) return;
  try{ const snap=await cloudRef().get(); if(!snap.exists){ if(manual) toast('☁️ Bulutta kayıt yok'); return; } const d=snap.data();
    if(manual||d.at>(state.lastSeen||0)+30000){ const C=CITIES[(d.city||0)%CITIES.length];
      openModal(`<h3>☁️ Bulut kaydı</h3><p class="sub">${manual?'Buluttaki kayıt':'Bulutta daha yeni bir kayıt var'}: <b>${C.e} ${C.name} · ${d.day}. gün</b> (${new Date(d.at).toLocaleString('tr-TR')})</p>
        <button class="btn gold wide" id="clLoad">☁️ Buluttakini yükle</button><button class="btn ghost wide" id="clKeep">Buradakiyle devam et</button>`,m=>{
        m.querySelector('#clKeep').onclick=()=>{ closeModal(); if(!manual) cloudSave(false); };
        m.querySelector('#clLoad').onclick=()=>{ try{ JSON.parse(d.s); localStorage.setItem(SAVE_KEY,d.s); save=()=>{}; location.reload(); }catch(e){ toast('Kayıt okunamadı','bad'); } }; }); } }
  catch(e){ if(manual) toast('☁️ Buluta ulaşılamadı','bad'); }
}
function updateCloud(dt){ if(!cloudDb||state.sandbox) return; cloudT-=dt; if(cloudT<=0){ cloudT=120; cloudSave(false); } }
function cloudHtml(){ return cloudDb?`<div class="row" style="flex-wrap:wrap"><div class="ic">☁️</div><div class="tx">Bulut kayıt<small>Otomatik (2 dk'da bir) · başka cihazdan devam edebilirsin${cloudMsg?' · '+cloudMsg:''}</small></div><div style="display:flex;gap:4px"><button class="btn" id="clSave">Kaydet</button><button class="btn ghost" id="clGet">Yükle</button></div></div>`:''; }
function bindCloud(m){ const a=m.querySelector('#clSave'), b=m.querySelector('#clGet'); if(a) a.onclick=()=>cloudSave(true); if(b) b.onclick=()=>cloudCheck(true); }
