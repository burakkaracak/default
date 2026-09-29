
// =====================================================================
// MG11-B · LODA: gerçek marka katmanı. Loda Mobilya (2000, İstanbul; TD Tech
// Design Mobilya A.Ş. iştiraki). Oda tasarımcısında Loda koleksiyon
// mobilyaları (ölçüler Drive "Ürün Detayları.xlsx"), gövde seçenekleri
// (lake / ahşap kaplama; fluting kuralı: lake gövdede standart, ahşapta yok),
// Loda Signature Suite (≥3 Loda parçalı suit), caddenin karşısında Loda
// Gallery (mutlu ayrılan misafir mobilya alır), ihracat bayisi ziyareti
// (Fargotex / AlmiDécor), Loda tasarım dili arayüz teması.
// =====================================================================
const LODA={brand:'Loda',founded:2000,city:'İstanbul',parent:'TD Tech Design Mobilya A.Ş.',gold:0x9C905C,goldTxt:0x766C42,black:0x111111,grey:0x2A2A2A,
  showrooms:['Modoko','Masko','Bostancı','Skyland HOM','İzmir','Gaziantep'],
  fins:{ivory:{n:'Ivory lake',c:0xf1ece1,wood:false},mink:{n:'Mink lake',c:0x9a8a7c,wood:false},antra:{n:'Antrasit lake',c:0x3a3d42,wood:false},oak:{n:'Meşe kaplama',c:0xc9a274,wood:true},walnut:{n:'Ceviz kaplama',c:0x6e4a32,wood:true},ash:{n:'Dişbudak kaplama',c:0xd8c6a6,wood:true}}};
// oda tasarımcısına eklenen Loda parçaları (FURN'a birleştirilir; gerçek ölçüler cm → oyun birimi ≈ ölçek 0.8 hücrede)
const LODA_FURN={
  l_savana:{e:'▫️',name:'LODA Savana orta sehpa',cost:320,sat:3,loda:true,dim:'120×30×120'},
  l_domo:  {e:'⚪',name:'LODA Domo sehpa',      cost:340,sat:3,loda:true,dim:'Ø90×35'},
  l_nova:  {e:'▬',name:'LODA Nova konsol',      cost:520,sat:4,loda:true,dim:'230×50×80'},
  l_dali:  {e:'▤',name:'LODA Dali TV ünitesi',  cost:700,sat:5,loda:true,dim:'200×45×60 · fluting'},
  l_sophia:{e:'🛋',name:'LODA Sophia berjer',   cost:380,sat:3,loda:true,dim:'83×90×105'}};
Object.assign(FURN,LODA_FURN);
let designFin='ivory';
function lodaFin(f){ return LODA.fins[f&&f.fin]||LODA.fins.ivory; }
function lodaMat(fin){ const F=LODA.fins[fin]||LODA.fins.ivory; return F.wood?mat(F.c,{roughness:.55}):mat(F.c,{roughness:.25,metalness:.05}); }
function lodaFinHtml(){ if(!LODA_FURN[designSel]) return '';
  return `<div class="ugh" style="margin-top:8px">Gövde · ${LODA_FURN[designSel].dim} cm</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${Object.keys(LODA.fins).map(k=>`<button class="btn ${designFin===k?'gold':'ghost'}" data-fin="${k}" style="padding:4px 10px;min-height:32px;font-size:12px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#${LODA.fins[k].c.toString(16).padStart(6,'0')};vertical-align:-1px;margin-right:4px"></span>${LODA.fins[k].n}</button>`).join('')}</div>
    <p class="note">${LODA.fins[designFin].wood?'Ahşap kaplama gövdede fluting (derz) yoktur.':'Lake gövdede fluting standarttır.'} · Loda Mobilya, İstanbul ${LODA.founded}</p>`; }
// 3D: hücre grubu (0.8 ölçek) içinde, x/z=0 merkez
function buildLodaFurn(S,f){
  const m=lodaMat(f.fin), F=lodaFin(f), fl=!F.wood, brass=mat(0xb08d57,{metalness:.8,roughness:.3});
  if(f.k==='l_savana'){ S.add(mesh(rbox(0.5,0.05,0.5,.01),m,0,0.14,0,true)); S.add(mesh(rbox(0.36,0.11,0.36,.01),m,0,0.06,0,true)); if(fl) for(let i=0;i<6;i++) S.add(mesh(box(0.012,0.1,0.37),mat(F.c*0.85&0xffffff),-0.15+i*0.06,0.06,0)); }
  else if(f.k==='l_domo'){ S.add(mesh(cyl(0.22,0.22,0.04,24),m,0,0.19,0,true)); S.add(mesh(cyl(0.11,0.14,0.15,fl?18:24),m,0,0.085,0,true)); if(fl) for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; S.add(mesh(box(0.012,0.14,0.02),mat(F.c*0.85&0xffffff),Math.cos(a)*0.125,0.085,Math.sin(a)*0.125)); } S.add(mesh(cyl(0.16,0.16,0.02,24),brass,0,0.01,0)); }
  else if(f.k==='l_nova'){ S.add(mesh(rbox(0.52,0.05,0.14,.01),m,0,0.38,0,true)); S.add(mesh(rbox(0.5,0.28,0.12,.01),m,0,0.22,0,true)); [-0.2,0.2].forEach(x=>S.add(mesh(box(0.02,0.08,0.1),brass,x,0.04,0))); S.add(mesh(box(0.14,0.008,0.05),brass,0,0.36,0.065)); }
  else if(f.k==='l_dali'){ S.add(mesh(rbox(0.52,0.2,0.14,.01),m,0,0.16,0,true)); if(fl) for(let i=0;i<14;i++) S.add(mesh(box(0.014,0.19,0.01),mat(F.c*0.85&0xffffff),-0.23+i*0.035,0.16,0.072)); S.add(mesh(box(0.5,0.02,0.12),brass,0,0.05,0)); S.add(mesh(box(0.36,0.2,0.02),M.dark,0,0.38,0)); S.add(mesh(box(0.34,0.18,0.005),new THREE.MeshStandardMaterial({color:0x101820,emissive:0x1e3a5a,emissiveIntensity:.5,roughness:.2}),0,0.38,0.012)); }
  else if(f.k==='l_sophia'){ const fab=mat(0xd9cbb8,{roughness:.98}); S.add(mesh(rbox(0.42,0.2,0.42,.09),fab,0,0.2,0,true)); S.add(mesh(rbox(0.42,0.42,0.12,.08),fab,0,0.42,-0.16,true)); [-1,1].forEach(s=>S.add(mesh(rbox(0.08,0.3,0.4,.04),fab,s*0.19,0.28,0,true))); [-0.15,0.15].forEach(x=>[-0.15,0.15].forEach(z=>S.add(mesh(cyl(0.012,0.012,0.1,6),brass,x,0.05,z)))); }
}
function lodaCount(s){ return (s.furn||[]).filter(f=>LODA_FURN[f.k]).length; }
function lodaSetBonus(s){ return lodaCount(s)>=2?2:0; }
// Loda Signature Suite: suit + en az 3 Loda parçası → gecelik ×1.25, +4 memnuniyet
function lodaSuite(id){ const s=state.rooms[id]; return !!(s&&s.type==='suite'&&lodaCount(s)>=3); }
function lodaRoomMul(id){ return lodaSuite(id)?1.25:1; }
function lodaRoomSat(id){ return lodaSuite(id)?4:0; }
function lodaRoomLabel(id){ return lodaSuite(id)?' · <span style="color:#9C905C">LODA Signature</span>':''; }

// ---------- Loda Gallery (caddenin karşısı, parkın solu) ----------
const GAL={x:-26,z:22.6};
function galOn(){ return !!(state.loda&&state.loda.gal); }
function galCost(){ return r10(12000*cm()); }
const VITRIN={domo:{e:'⚪',n:'Domo vitrini',cost:6000,p:0.08},dali:{e:'▤',n:'Dali vitrini',cost:9000,p:0.10},nova:{e:'▬',n:'Nova vitrini',cost:7500,p:0.08}};
function vitOn(k){ return !!(state.loda&&state.loda.vit&&state.loda.vit[k]); }
function galChance(){ let p=0.22; for(const k in VITRIN) if(vitOn(k)) p+=VITRIN[k].p; return p; }
function buyGallery(){ if(stars()<3||galOn()||!spend(galCost())) return; state.loda=state.loda||{}; state.loda.gal=true; state.loda.sales=0; state.loda.rev=0; buildGallery(); sfx('build');
  if(!state.lowFx) confettiAt(GAL.x,2,GAL.z,60); camFocus={x:GAL.x,z:GAL.z-2,t:4}; banner('LODA Gallery açıldı','Mutlu ayrılan misafirler Loda mobilyası alır · satış payı sana'); onGameEvent('upg',1); save(); renderSheet(); }
function buyVitrin(k){ if(!galOn()||vitOn(k)||!spend(r10(VITRIN[k].cost*cm()))) return; state.loda.vit=state.loda.vit||{}; state.loda.vit[k]=true; buildGallery(); sfx('build'); toast(`${VITRIN[k].e} ${VITRIN[k].n} kuruldu · satış şansı +%${Math.round(VITRIN[k].p*100)}`); save(); renderSheet(); }
// mutlu ayrılan misafir mobilya alır (checkout kancası)
function lodaCheckout(g){ if(!galOn()||state.sandbox||g.sat<68||Math.random()>galChance()) return; const amt=r10(roomRate(g.room)*incomeMult()*rnd(0.6,1.4)); state.money+=amt; state.today.amen+=amt; state.loda.sales=(state.loda.sales||0)+1; state.loda.rev=(state.loda.rev||0)+amt;
  fxEmoji(g.x,g.y+2.3,g.z,g.f,'🛋️'); if(state.loda.sales%5===0) toast(`LODA Gallery: ${state.loda.sales}. satış · toplam ${fmt(state.loda.rev)} ₺`); onGameEvent('loda',1); }
let galG=null;
const GAL_D=4.2, GAL_W=7.2; function galDoor(){ return {x:GAL.x,z:GAL.z-GAL_D/2-0.9,f:0}; }
function buildGallery(){
  if(galG){ outdoor.remove(galG); galG=null; removeCols('gal'); } if(!galOn()) return; const g=new THREE.Group(), X=GAL.x, Z=GAL.z, W=GAL_W, D=GAL_D, F=Z-D/2, wall=mat(0xf4f4f4,{roughness:.7}), blk=mat(LODA.black,{roughness:.5}), gold=mat(LODA.gold,{metalness:.6,roughness:.35});
  g.add(mesh(box(W+1.2,0.06,D+2.6),tmat('paving',4,3),X,0.02,Z-0.6));                                   // ön avlu (caddeye doğru)
  // içi boş gövde: zemin + arka duvar (+z) + yan duvarlar + tavan; CAM CEPHE CADDEYE (−z) BAKAR
  g.add(mesh(box(W,0.1,D),mat(0x2a2a2a,{roughness:.4,metalness:.1}),X,0.05,Z)); g.add(mesh(box(W,3.0,0.15),wall,X,1.5,Z+D/2-0.075,true));
  [-1,1].forEach(s=>g.add(mesh(box(0.15,3.0,D),wall,X+s*(W/2-0.075),1.5,Z,true))); g.add(mesh(box(W,0.15,D),wall,X,2.93,Z));
  g.add(mesh(box(W+0.2,0.25,D+0.2),blk,X,3.1,Z,true));    // siyah çatı bandı
  g.add(mesh(box(W-0.6,0.9,0.06),wall,X,2.55,F-0.02)); // vitrin üstü alın
  [-1,1].forEach(s=>g.add(mesh(box((W-0.6)/2-0.6,2.2,0.06),M.glass,X+s*((W-0.6)/4+0.3),1.2,F-0.02)));  // cam vitrinler (kapının iki yanı)
  g.add(mesh(box(1.2,2.2,0.05),M.glass,X,1.1,F-0.02)); g.add(mesh(box(1.3,0.06,0.1),gold,X,2.22,F-0.03)); [-0.62,0.62].forEach(dx=>g.add(mesh(box(0.06,2.2,0.1),gold,X+dx,1.1,F-0.03))); g.add(mesh(cyl(0.02,0.02,0.5,8),gold,X+0.22,1.05,F-0.09));   // altın çerçeveli cam kapı + kol
  g.add(mesh(box(W,0.5,0.1),blk,X,2.55,F-0.05)); const sg=signPlane('LODA',2.4,0.44,{bg:'#111111',fg:'#9C905C',font:'700 92px Montserrat, "Baloo 2", sans-serif',fit:true}); sg.position.set(X,2.55,F-0.12); sg.rotation.y=Math.PI; g.add(sg);
  g.add(mesh(box(W,0.04,0.12),gold,X,2.28,F-0.06));                                                 // ince altın çizgi
  // vitrin içi: koleksiyon parçaları caddeye dönük (oda tasarımcısındakiyle aynı çizim, 1.6 ölçek)
  const show=(k,fin,x,rot=0)=>{ const G0=new THREE.Group(); G0.position.set(X+x,0.08,F+0.9); G0.scale.setScalar(1.6); G0.rotation.y=rot+Math.PI; g.add(G0); buildLodaFurn(G0,{k,fin}); };
  show('l_savana','walnut',-2.4); show('l_sophia','ivory',-1.2,Math.PI*0.1); if(vitOn('domo')) show('l_domo','mink',1.2); if(vitOn('nova')) show('l_nova','oak',2.4); if(vitOn('dali')) show('l_dali','antra',-2.4+0.001,0);
  for(let i=0;i<3;i++) g.add(mesh(cyl(0.08,0.08,0.06,12),M.lampOn,X-2.4+i*2.4,2.9,F+0.6));           // vitrin spotları
  bakeStatic(g); outdoor.add(g); galG=g;
  addCols('gal',[[0,X-W/2,X+W/2,Z-D/2,Z+D/2]]);   // duvarlar yürünmez; kapı önü ön avluda
}
// yaya geçidi: otel kapısından karşı kaldırıma (x ±1.3) — prestij projeleri ve galeri için yol
let zebraG=null;
function buildCrosswalk(){ if(zebraG) return; zebraG=new THREE.Group(); const w=mat(0xf2efe6,{roughness:.9}); for(let i=0;i<8;i++) zebraG.add(mesh(box(2.6,0.012,0.3),w,0,0.03,13.25+i*0.56)); outdoor.add(zebraG); }   // çizgiler yolun enine, geçiş yönü z
// ziyaret: kapı önünde durunca galeri paneli açılır
let galVisit=false, galTag=null;
function visitGallery(){ lastUserT=performance.now(); openModal(`<h3>🛋️ LODA Gallery <button class="xbtn" id="gvX" aria-label="Kapat">✖</button></h3><p class="sub">Loda Mobilya showroomu · İstanbul ${LODA.founded} · 250 çalışan, 15.000 m² üretim</p>${galleryHtml()}<p class="note">Mutlu ayrılan misafirler buradan mobilya alır; vitrin ekledikçe satış şansı artar. 4★'dan sonra ihracat bayileri otelde konaklar.</p>`,m=>{ m.querySelector('#gvX').onclick=closeModal; bindLoda(m); }); }
function updateGalVisit(){ if(!galOn()||player.f!==0){ galVisit=false; return; } const D=galDoor(), d=Math.hypot(player.x-D.x,player.z-D.z);
  if(d<1.1&&!galVisit){ galVisit=true; if(!modalWrap.classList.contains('show')) visitGallery(); sfx('click'); } else if(d>2.4) galVisit=false; }
function goGallery(){ const D=galDoor(); closeSheet&&closeSheet(); closeModal(); if(player.goTo(0,D.x,D.z)) toast('🛋️ Galeriye yürünüyor · yaya geçidinden karşıya'); else toast('Şu an yol bulunamadı','bad'); }
function galleryHtml(){ const L0=state.loda||{};
  let h=`<div class="ugh"><span style="color:#9C905C">LODA</span> Gallery${galOn()?'':' · 🔒 3★'}</div>`;
  if(!galOn()) return h+`<div class="row"><div class="ic">🛋️</div><div class="tx">Loda Gallery aç<small>Caddenin karşısında Loda Mobilya showroomu (İstanbul ${LODA.founded}): mutlu ayrılan misafirlerin %22'si mobilya alır, satış payı sana · ihracat bayileri otele gelmeye başlar</small></div><button class="btn gold" data-gal ${stars()<3||state.money<galCost()?'disabled':''}>${fmt(galCost())} ₺</button></div>`;
  h+=`<div class="row"><div class="ic">🚶</div><div class="tx">Showroomu ziyaret et<small>Caddenin karşısında, sol tarafta · yaya geçidinden geç</small></div><button class="btn gold" data-galgo>Yürü</button></div>`;
  h+=`<div class="row"><div class="ic">🛋️</div><div class="tx">Satış şansı %${Math.round(galChance()*100)}<small>${L0.sales||0} satış · ${fmt(L0.rev||0)} ₺ · bayi siparişi ${L0.orders||0}</small></div></div>`;
  for(const k in VITRIN){ const V=VITRIN[k]; h+=`<div class="row"><div class="ic">${V.e}</div><div class="tx">${V.n}<small>Satış şansı +%${Math.round(V.p*100)}</small></div>${vitOn(k)?'<button class="btn" disabled>Var ✓</button>':`<button class="btn gold" data-vit="${k}" ${state.money<r10(V.cost*cm())?'disabled':''}>${fmt(r10(V.cost*cm()))} ₺</button>`}</div>`; }
  return h; }
function bindLoda(root){ const b=root.querySelector('[data-gal]'); if(b) b.onclick=buyGallery; const gg=root.querySelector('[data-galgo]'); if(gg) gg.onclick=goGallery; root.querySelectorAll('[data-vit]').forEach(x=>x.onclick=()=>buyVitrin(x.dataset.vit)); const t=root.querySelector('[data-lodaui]'); if(t) t.onclick=()=>{ state.lodaUI=!state.lodaUI; applyLodaUI(); save(); openSettings(); }; }

// ---------- ihracat bayisi ziyareti (Fargotex, AlmiDécor) ----------
const DEALERS=[{n:'Fargotex alıcısı',c:'Fargotex',e:'🇵🇱'},{n:'AlmiDécor alıcısı',c:'AlmiDécor',e:'🇵🇱'}];
function dealerDue(){ return galOn()&&!state.sandbox&&stars()>=4&&state.day-(state.loda.lastDealer||0)>=4&&Math.random()<0.6; }
function spawnDealer(){ const D=rand(DEALERS), g=spawnGuest('dealer'); g.name=D.n; g.dealer=D; g.patMax=g.pat=g.patMax*1.2; state.loda.lastDealer=state.day; markSave();
  setTimeout(()=>banner(`${D.e} ${D.c} bayisi geldi`,'Suit ve iyi hizmet ister · memnun ayrılırsa ihracat siparişi verir'),1500); return g; }
function dealerCheckout(g){ if(!g.dealer) return; const D=g.dealer; if(g.sat>=68){ const dep=r10(2500*cm()), rest=r10(7500*cm()); state.money+=dep; state.today.amen+=dep; state.loda.orders=(state.loda.orders||0)+1; state.loda.pend=(state.loda.pend||[]).concat([{c:D.c,day:state.day+3,amt:rest}]); changeRep(1.5);
    banner(`${D.e} ${D.c} sipariş verdi!`,`Kapora +${fmt(dep)} ₺ · kalan ${fmt(rest)} ₺ 3 gün sonra teslimatta`); sfx('star'); if(!state.lowFx) confettiAt(L.desk.x,1.8,L.desk.z,50); onGameEvent('order',1); }
  else toast(`${D.e} ${D.c} bayisi memnun kalmadı · sipariş çıkmadı`,'bad'); }
function lodaDayEnd(t){ const L0=state.loda; if(!L0) return; (L0.pend||[]).slice().forEach(o=>{ if(state.day>=o.day){ state.money+=o.amt; t.amen+=o.amt; L0.pend.splice(L0.pend.indexOf(o),1); setTimeout(()=>toast(`📦 ${o.c} teslimatı tamamlandı: +${fmt(o.amt)} ₺`),3000); } }); }
let dealerT=30;
function updateLoda(dt){ updateGalVisit(); dealerT-=dt; if(dealerT<=0){ dealerT=45; const h=hourNow(); if(h>=10&&h<=16&&dealerDue()&&!guests.some(g=>g.dealer)) spawnDealer(); } }

// ---------- Loda tasarım dili (arayüz teması) ----------
function applyLodaUI(){ document.body.classList.toggle('loda',!!state.lodaUI); }
function lodaUiHtml(){ return `<button class="btn ghost wide" data-lodaui>◆ Loda tasarım dili: ${state.lodaUI?'Açık':'Kapalı'}</button>`; }
function bootLoda(){ buildCrosswalk(); galTag=tagAdd({kind:'spot',get:()=>galOn()?{x:GAL.x,z:GAL.z-GAL_D/2,f:0}:null,iconF:()=>'🛋️',cls:'',y:3.4}); try{ buildGallery(); applyLodaUI(); }catch(e){ console.warn('loda',e); } }
