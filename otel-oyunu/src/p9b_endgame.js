
// =====================================================================
// MG8 · OYUN SONU: 5★ sonrası prestij projeleri (caddenin karşısında şehir
// parkı, otel müzesi, otel anıtı) + sınırsız hayır vakfı; dış görünüm kamerası
// =====================================================================
const PRJ={
  park:{e:'🌳',n:'Şehir parkı',d:'Şehre park yaptır: misafir talebi +%4',per:'her seviyede',cost:[20000,50000,120000]},
  muze:{e:'🏛️',n:'Otel müzesi',d:'Otelinin tarihini sergile: her misafire +1 memnuniyet, günlük ziyaretçi geliri',per:'her seviyede',cost:[30000,70000,160000]},
  anit:{e:'🗽',n:'Otel anıtı',d:'Meydana anıt: ün hedefin kalıcı +2 (günlük ün hesabı bunu silmez)',per:'her seviyede',cost:[40000,90000,200000]}};
// kalıcı prestij ünü: repTarget'e eklenir (repDrift bunu geri çekmez) · anıt +2/seviye, bağış +0,5/bağış (en fazla +8)
function prjRepBonus(){ return 2*prjLv('anit')+Math.min(8,0.5*charityN()); }
function prjLv(k){ return (state.prj||{})[k]||0; }
function prjCost(k){ const c=PRJ[k].cost[prjLv(k)]; return c==null?null:r10(c*cm()); }
function prjOpen(){ return stars()>=5; }
function prjDemand(){ return 1+0.04*prjLv('park'); }
function prjSat(){ return prjLv('muze'); }
function muzeIncome(){ return r10([0,250,600,1200][prjLv('muze')]*cm()); }
function buyPrj(k,ok){ const c=prjCost(k); if(!prjOpen()||c==null||state.money<c) return;
  if(!ok&&typeof wageShort==='function'&&wageShort(c)){ openModal(`<h3>⚠️ Maaşlar tehlikede</h3><p class="sub">${PRJ[k].e} ${PRJ[k].n} için ${fmt(c)} ₺ ödersen kasada ${fmt(state.money-c)} ₺ kalır; sabah maaşları ${fmt(wagesToday())} ₺.</p><button class="btn gold wide" id="pjY">Yine de yap</button><button class="btn ghost wide" id="pjN">Vazgeç</button>`,m=>{ m.querySelector('#pjY').onclick=()=>{ closeModal(); buyPrj(k,true); }; m.querySelector('#pjN').onclick=closeModal; }); return; }
  if(!spend(c)) return; state.prj=state.prj||{}; state.prj[k]=prjLv(k)+1; sfx('build'); buildPrj();
  const P=prjSpot(k); if(!state.lowFx){ confettiAt(P.x,2.5,P.z,70); fireworksAt&&fireworksAt(P.x,6,P.z); } camFocus={x:P.x,z:P.z-2,t:4};
  banner(`${PRJ[k].e} ${PRJ[k].n} ${state.prj[k]}. seviye`,PRJ[k].d); qEv('upg'); save(); renderSheet(); }
// ---------- hayır vakfı: sınırsız bağış (para batağı) ----------
function charityN(){ return state.charity||0; }
function charityCost(){ return r10(10000*cm()*(1+0.5*charityN())); }
const CHARITY_T=[[0,'Bağışçı'],[3,'Hayırsever'],[8,'Vakıf kurucusu'],[15,'Şehrin iyilik meleği'],[30,'Efsane hayırsever']];
function charityTitle(){ let t=null; CHARITY_T.forEach(([n,s])=>{ if(charityN()>=n&&charityN()>0) t=s; }); return t; }
function donate(){ const c=charityCost(); if(!prjOpen()||!spend(c)) return; const t0=charityTitle(); state.charity=charityN()+1; changeRep(3); sfx('star');
  if(!state.lowFx) confettiAt(player.x,player.y+2,player.z,50); const t1=charityTitle();
  if(t1!==t0) banner('💝 '+t1,`${charityN()}. bağışın · şehir seni seviyor`); else toast(`💝 Bağış yapıldı: +3 ün · toplam ${charityN()}`); save(); renderSheet(); }
function prjDayEnd(t){ if(state.sandbox) return; const s=muzeIncome(); if(s>0){ state.money+=s; t.amen+=s; } }
function prjHtml(){
  let h=`<div class="ugh">🏆 Prestij projeleri${prjOpen()?'':' · 🔒 5★'}</div>`;
  for(const k in PRJ){ const X=PRJ[k], lv=prjLv(k), c=prjCost(k);
    h+=`<div class="row" style="${prjOpen()?'':'opacity:.55'}"><div class="ic">${X.e}</div><div class="tx">${X.n} <span style="color:var(--gold2)">${lv}/3</span><small>${X.d} (${X.per})${k==='muze'&&lv?` · şu an günlük +${fmt(muzeIncome())} ₺`:''}</small>${pips(lv,3)}</div>${c==null?'<button class="btn" disabled>Tamam</button>':`<button class="btn gold" data-prj="${k}" ${!prjOpen()||state.money<c?'disabled':''}>${fmt(c)} ₺</button>`}</div>`; }
  const T=charityTitle();
  h+=`<div class="row" style="${prjOpen()?'':'opacity:.55'}"><div class="ic">💝</div><div class="tx">Hayır vakfı${T?` · <span style="color:var(--gold2)">${T}</span>`:''}<small>Her bağış hemen +3 ün ve kalıcı +0,5 ün hedefi (en fazla +8; şu an +${Math.min(8,0.5*charityN())}) · ${charityN()} bağış · sınırsız, her seferinde biraz daha pahalı</small></div><button class="btn gold" data-donate ${!prjOpen()||state.money<charityCost()?'disabled':''}>${fmt(charityCost())} ₺</button></div>`;
  return h; }
function bindEndgame(root){ root.querySelectorAll('[data-prj]').forEach(b=>b.onclick=()=>buyPrj(b.dataset.prj)); const d=root.querySelector('[data-donate]'); if(d) d.onclick=donate; }

// ---------- görseller: caddenin karşısı (z 20-26) ----------
function prjSpot(k){ return {park:{x:-12.5,z:22.8},muze:{x:12.5,z:22.8},anit:{x:0,z:23.2}}[k]; }
let prjG=null;
function buildPrj(){
  if(prjG){ outdoor.remove(prjG); prjG.traverse(o=>{ if(o.isMesh&&o.userData.own) o.geometry.dispose(); }); prjG=null; }
  if(!state.prj||!Object.keys(state.prj).length) return; const sway0=SWAY.length, g=new THREE.Group(), gold=M.gold, stone=mat(0xe9e1d2,{roughness:.8}), white=mat(0xf6f1e6,{roughness:.5});
  const pv=(x0,x1,z0,z1,m)=>g.add(mesh(box(x1-x0,0.05,z1-z0),m,(x0+x1)/2,0.01,(z0+z1)/2));
  const pk=prjLv('park'); if(pk){ const P=prjSpot('park');
    pv(P.x-4,P.x+4,P.z-2.6,P.z+2.6,mat(0x5f9a4a,{roughness:1})); pv(P.x-0.6,P.x+0.6,P.z-2.6,P.z+2.6,tmat('paving',1,3));
    [[-2.8,-1.4],[2.8,-1.4],[-2.6,1.6],[2.7,1.5]].slice(0,pk+1).forEach(([dx,dz])=>{ if(city().palm) palm(g,P.x+dx,P.z+dz,0.9); else tree(g,P.x+dx,P.z+dz,0.9); });
    bench(g,P.x-1.3,P.z,Math.PI/2); bench(g,P.x+1.3,P.z,-Math.PI/2);
    if(pk>=2){ flowerBed(g,P.x-3.6,P.x-1.2,P.z+1.9,P.z+2.4); flowerBed(g,P.x+1.2,P.x+3.6,P.z+1.9,P.z+2.4); }
    if(pk>=3){ const bs=new THREE.Group(); bs.add(mesh(cyl(1.1,1.2,0.12,20),stone,0,0.06,0)); bs.add(mesh(cyl(0.08,0.08,1.7,8),white,0,0.9,0)); bs.add(mesh(cone(1.25,0.6,16),mat(0x2e7d5b),0,2.0,0,true)); bs.position.set(P.x,0,P.z-1.4); g.add(bs); } }
  const mz=prjLv('muze'); if(mz){ const P=prjSpot('muze'), W=mz>=2?6:4.6, D=3.4;
    pv(P.x-W/2-0.5,P.x+W/2+0.5,P.z-D/2-0.8,P.z+D/2+0.5,stone);
    g.add(mesh(box(W,0.35,D),stone,P.x,0.2,P.z,true)); g.add(mesh(box(W-0.4,2.4,D-0.6),white,P.x,1.55,P.z+0.1,true));
    const nC=mz>=2?6:4; for(let i=0;i<nC;i++){ const x=P.x-W/2+0.45+i*(W-0.9)/(nC-1); g.add(mesh(cyl(0.14,0.16,2.5,12),white,x,1.6,P.z+D/2-0.3,true)); }
    const pg=new THREE.CylinderGeometry((W+0.3)/Math.sqrt(3),(W+0.3)/Math.sqrt(3),D,3); pg.rotateX(-Math.PI/2); const R3=(W+0.3)/Math.sqrt(3), ped=mesh(pg,stone,P.x,2.95+0.5*R3*0.2,P.z,true); ped.scale.y=0.2; g.add(ped);   // üçgen alınlık g.add(mesh(box(W+0.2,0.2,D),stone,P.x,2.85,P.z));
    g.add(mesh(box(1.0,1.5,0.05),mat(0x5a3a22,{roughness:.6}),P.x,1.1,P.z+D/2-0.19));
    const sg=signPlane('🏛️ OTEL MÜZESİ',2.4,0.36,{bg:'#1c1d22',fg:'#f2c14e',font:'800 48px "Baloo 2"',fit:true}); sg.position.set(P.x,2.55,P.z+D/2-0.1); g.add(sg);
    if(mz>=3){ g.add(mesh(new THREE.SphereGeometry(0.9,16,8,0,Math.PI*2,0,Math.PI/2),gold,P.x,3.45,P.z-0.5)); } }
  const an=prjLv('anit'); if(an){ const P=prjSpot('anit');
    g.add(mesh(cyl(1.6,1.7,0.25,24),stone,P.x,0.12,P.z,true)); g.add(mesh(box(1.1,1.4+an*0.4,1.1),stone,P.x,0.25+(1.4+an*0.4)/2,P.z,true));
    const top=0.25+1.4+an*0.4; const st=new THREE.Group(); st.position.set(P.x,top,P.z); g.add(st);
    st.add(mesh(cyl(0.22,0.28,1.0,12),gold,0,0.5,0,true)); st.add(mesh(sph(0.22,12,10),gold,0,1.2,0,true)); const arm=mesh(cyl(0.06,0.06,0.9,8),gold,0.22,1.45,0,true); arm.rotation.z=-0.5; st.add(arm);
    st.add(mesh(new THREE.OctahedronGeometry(0.2,0),mat(0xfff2b0,{emissive:0xffc860,emissiveIntensity:1.2}),0.48,1.95,0));
    if(an>=2) [-1,1].forEach(s=>{ g.add(mesh(cyl(0.05,0.07,2.4,8),M.dark,P.x+s*1.9,1.2,P.z+0.3,true)); g.add(mesh(box(0.7,0.42,0.03),mat(city().trim),P.x+s*1.9+0.37,2.15,P.z+0.3)); });
    if(an>=3){ const ring=mesh(new THREE.TorusGeometry(1.35,0.05,8,32),gold,P.x,0.3,P.z); ring.rotation.x=Math.PI/2; g.add(ring); } }
  bakeStatic(g); outdoor.add(g); prjG=g;
  SWAY.splice(sway0);   // park ağaçları birleştirildi: sallanma listesine girmesin
}

// ---------- dış görünüm kamerası ----------
let extView=null;
function toggleExtView(){
  if(extView){ cam.dist=extView.d; cam.pitch=extView.p; cam.yaw=extView.y; peekFloor=null; extView=null; sfx('click'); return; }
  if(fpMode) return; const top=Math.min(floorsBuilt()-1,4); extView={d:cam.dist,p:cam.pitch,y:cam.yaw,pf:top}; peekFloor=top; cam.dist=44; cam.pitch=0.4; cam.yaw=0.55; sfx('click');
  toast('🏙️ Dış görünüm · tekrar dokun ya da hareket et');
}
function updateExtView(){ if(!extView) return; if(peekFloor!==extView.pf||fpMode||player.moving||player.path){ const e=extView; extView=null; cam.dist=e.d; cam.pitch=e.p; cam.yaw=e.y; if(peekFloor===e.pf) peekFloor=null; } }

// gece iç mekân: yansıma kısması p26 updateEnv'de (tek sahip; burada ikinci kez yazmak titreme yapıyordu)

function bootEndgame(){ try{ buildPrj(); }catch(e){ console.warn('endgame',e); } }
function updateEndgame(dt){ updateExtView(); }
