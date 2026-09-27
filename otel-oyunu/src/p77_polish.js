
// =====================================================================
// POLISH: star goals, luxury investments, event log, camera controls,
// crowd separation, elevator queue, tips/help, audio sliders, night
// windows, first-person ceilings, auto quality, save export/import
// =====================================================================

// ---------- star requirements (hotel tab) ----------
function starReqHtml(){
  const s=stars(); if(s>=5) return `<div class="row" style="margin-top:10px"><div class="ic">⭐</div><div class="tx">5 yıldızlı otel<small>En üst seviyedesin!</small></div></div>`;
  const n=s+1, repOk=rawStars()>=n, items=[[`Ün ${(n-1)*20}`,repOk],...(STAR_REQ[n]||[]).map(r=>[r[0],r[1]()])];
  return `<div class="row" style="margin-top:10px"><div class="ic">⭐</div><div class="tx">${n} yıldız için<small>${items.map(([t,ok])=>`${ok?'✅':'⬜'} ${t}`).join(' · ')}</small></div></div>`;
}

// ---------- luxury investments (late-game money sinks) ----------
const LUX={
  piano:     {e:'🎹',name:'Kuyruklu piyano',  cost:18000,desc:'Lobide canlı müzik · sıradaki misafirler %20 daha sabırlı'},
  chandelier:{e:'💎',name:'Kristal avize',    cost:25000,desc:'Lobiye asılır · tüm misafirler +3 memnuniyet'},
  limo:      {e:'🚗',name:'Limuzin servisi',  cost:35000,desc:'Ünlüler iki kat sık gelir ve %20 fazla öder'},
  statue:    {e:'🗽',name:'Bahçe heykeli',    cost:45000,desc:'Otelin simgesi olur · tüm gelirler +%5'},
  brand:     {e:'👑',name:'Lüks otel markası',cost:90000,desc:'Tüm oda fiyatları +%10'},
  led:       {e:'🌈',name:'LED cephe',        cost:30000,desc:'Gece renk değiştiren cephe ışıkları · gece %25 daha çok misafir'}};
function luxCost(k){ return Math.round(LUX[k].cost*cm()); }
function luxHtml(){
  let h=`<div class="ugh">💎 Prestij yatırımları</div>`;
  for(const k in LUX){ const X=LUX[k], has=state.lux[k], c=luxCost(k);
    h+=`<div class="row"><div class="ic">${X.e}</div><div class="tx">${X.name}<small>${X.desc}</small></div>${has?'<button class="btn" disabled>Var ✓</button>':`<button class="btn gold" data-lux="${k}" ${state.money<c?'disabled':''}>${fmt(c)} ₺</button>`}</div>`; }
  return h;
}
function buyLux(k){
  if(state.lux[k]) return; const c=luxCost(k); if(!spend(c)) return;
  state.lux[k]=true; buildLux(k,true); banner(`${LUX[k].e} ${LUX[k].name}`,LUX[k].desc); sfx('build'); qEv('upg'); save(); renderSheet();
}
let piano=null, chandelier=null, pianoNoteT=0;
function buildLux(k,pop){
  const G=floorRoot(0); let g=new THREE.Group();
  if(k==='piano'){ g.position.set(-1.9,0,3.35); g.rotation.y=0.35; G.add(g);
    const lac=mat(0x0e0e10,{roughness:.12,metalness:.25});
    g.add(mesh(rbox(1.25,0.32,1.05,.12),lac,0,0.78,0,true));
    const lid=mesh(box(1.1,0.03,0.95),lac,0.05,1.22,-0.25); lid.rotation.x=-0.55; g.add(lid);
    g.add(mesh(cyl(0.02,0.02,0.5,6),M.gold,0.35,1.0,-0.05));
    g.add(mesh(box(1.1,0.06,0.28),M.white,0,0.95,0.55)); for(let i=0;i<12;i++) if(i%7!==2&&i%7!==6) g.add(mesh(box(0.045,0.03,0.16),M.dark,-0.48+i*0.085,0.99,0.5));
    [[-0.5,-0.35],[0.5,-0.35],[0,0.45]].forEach(([x,z])=>g.add(mesh(cyl(0.04,0.03,0.62,8),lac,x,0.31,z)));
    g.add(mesh(rbox(0.7,0.08,0.34,.04),lac,0,0.48,1.0,true)); [[-0.28,0.9],[0.28,0.9],[-0.28,1.1],[0.28,1.1]].forEach(([x,z])=>g.add(mesh(cyl(0.02,0.02,0.44,6),lac,x,0.22,z)));
    addCols('lux_piano',[[0,-2.6,-1.2,2.75,3.95]]); piano=g; }
  else if(k==='chandelier'){ g.position.set(0,2.95,5.0); G.add(g);
    g.add(mesh(cyl(0.015,0.015,1.2,6),M.gold,0,0.6,0));
    const r1=mesh(new THREE.TorusGeometry(0.55,0.03,8,32),M.gold,0,0,0); r1.rotation.x=Math.PI/2; g.add(r1);
    const r2=mesh(new THREE.TorusGeometry(0.3,0.025,8,24),M.gold,0,0.18,0); r2.rotation.x=Math.PI/2; g.add(r2);
    const cm2=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0,metalness:.1,transparent:true,opacity:.7,envMapIntensity:2.5});
    for(let i=0;i<16;i++){ const a=i/16*Math.PI*2; const c=mesh(new THREE.OctahedronGeometry(0.05),cm2,Math.cos(a)*0.55,-0.12,Math.sin(a)*0.55); c.scale.y=1.8; g.add(c); }
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; g.add(mesh(cyl(0.02,0.02,0.1,6),M.white,Math.cos(a)*0.55,0.06,Math.sin(a)*0.55)); g.add(mesh(sph(0.045,8,6),M.lampOn,Math.cos(a)*0.55,0.14,Math.sin(a)*0.55)); }
    g.add(mesh(new THREE.OctahedronGeometry(0.12),cm2,0,-0.3,0));
    const gl=glowDecal(1.8,0,5.0,0.03); G.add(gl); chandelier=g; }
  else if(k==='statue'){ g.position.set(5.7,0,9.95); outdoor.add(g);
    const stone=mat(0xe7e0d2,{roughness:.7}), gold=mat(0xd9a441,{metalness:.9,roughness:.25});
    g.add(mesh(box(1.0,0.2,1.0),stone,0,0.1,0,true)); g.add(mesh(box(0.75,0.8,0.75),stone,0,0.6,0,true)); g.add(mesh(box(0.85,0.08,0.85),stone,0,1.04,0));
    g.add(mesh(capsule(0.16,0.55,10),gold,0,1.5,0,true)); g.add(mesh(sph(0.14,12,10),gold,0,2.0,0,true));
    const arm=mesh(capsule(0.05,0.4,8),gold,0.15,2.05,0); arm.rotation.z=-0.3; g.add(arm); g.add(mesh(cone(0.07,0.18,8),gold,0.24,2.38,0)); g.add(mesh(sph(0.06,8,6),M.lampOn,0.24,2.5,0));
    const pl=signPlane(hotelName(),0.7,0.16,{bg:'#8a6a3a',fg:'#ffe9b0',font:'800 56px "Baloo 2"',fit:true}); pl.position.set(0,0.62,0.38); g.add(pl);
    addCols('lux_statue',[[0,5.15,6.25,9.4,10.5]]); }
  else if(k==='limo'){ g.position.set(5.6,0,13.5); outdoor.add(g);
    const body=mat(0x111114,{metalness:.6,roughness:.18});
    g.add(mesh(rbox(3.9,0.46,1.0,.16),body,0,0.42,0,true)); g.add(mesh(rbox(2.6,0.36,0.9,.14),mat(0x1c2733,{metalness:.7,roughness:.08}),-0.2,0.78,0,true));
    [-1.35,-0.6,1.3].forEach(x=>[-0.47,0.47].forEach(zz=>{ const w=mesh(cyl(0.2,0.2,0.14,14),M.dark,x,0.2,zz); w.rotation.x=Math.PI/2; g.add(w); }));
    [-0.3,0.3].forEach(zz=>g.add(mesh(sph(0.06,8,6),M.lampOn,1.96,0.45,zz))); g.add(mesh(box(0.05,0.3,0.02),M.gold,1.7,0.8,0.3)); const sh=blob(2.0); sh.scale.set(1,0.3,1); g.add(sh); }
  else if(k==='led'){ buildLed(); }
  else if(k==='brand'){ const c=new THREE.Group(); c.position.set(0,3.95,8.95); G.add(c); g=c;
    const gold=mat(0xe8b64a,{metalness:.9,roughness:.2}); c.add(mesh(cyl(0.34,0.3,0.14,16),gold,0,0,0));
    for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; c.add(mesh(cone(0.07,0.24,6),gold,Math.cos(a)*0.28,0.18,Math.sin(a)*0.28)); c.add(mesh(sph(0.04,6,4),mat(0xc0392b,{metalness:.3,roughness:.2}),Math.cos(a)*0.28,0.32,Math.sin(a)*0.28)); } }
  if(pop) popIn(g);
  ents.forEach(unstick);
}
function updateLux(dt,t){
  if(chandelier){ chandelier.rotation.y=Math.sin(t*0.3)*0.2; }
  if(piano&&viewFloor===0&&!isNight()){ pianoNoteT-=dt; if(pianoNoteT<=0){ pianoNoteT=rnd(1.6,3); fxEmoji(-1.9+rnd(-0.3,0.3),1.6,3.3,0,rand(['🎵','🎶'])); if(player&&player.f===0&&d2(player.x,player.z,-1.9,3.35)<25&&Sound.ctx&&state.music){ const sc=CHORDS[0]; [0,.18,.36].forEach((d,i)=>tone(sc[i%sc.length]*2,.6,'triangle',.02,d,Sound.music)); } } }
}

// ---------- event log ----------
let logUnread=0;
function logEvent(text){
  if(!state.log) state.log=[]; const L0=state.log[0];
  if(L0&&L0.t===text&&L0.d===state.day) return;
  state.log.unshift({d:state.day,h:$('clock')?$('clock').textContent:'',t:text}); if(state.log.length>50) state.log.length=50;
  logUnread++; const dot=$('logDot'); if(dot) dot.classList.add('on');
}
function renderLogSheet(){
  const h=`<h3>🔔 Olay geçmişi <button class="xbtn" data-close aria-label="Kapat">✖</button></h3><p class="sub">Son 50 olay · en yenisi üstte</p>`+
    ((state.log||[]).length?`<div class="loglist">${state.log.map(e=>`<div class="logrow"><span class="lt">G${e.d} ${escH(e.h)}</span><span>${escH(e.t)}</span></div>`).join('')}</div>`:'<p class="note">Henüz bir olay yok.</p>');
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h; sheet.querySelector('[data-close]').onclick=closeSheet;
}

// ---------- camera controls ----------
const CAM_YAW=[-0.3,1.05];
function camRotate(d){ cam.yaw=clamp(cam.yaw+d,CAM_YAW[0],CAM_YAW[1]); }
function camZoom(d){ cam.dist=clamp(cam.dist+d,10,34); }
function updateCamKeys(dt){ if(fpMode) return; if(keys.q) camRotate(-dt*1.2); if(keys.e) camRotate(dt*1.2); }

// ---------- crowd separation (no walking through each other) ----------
function separateEnts(){
  const L2=[]; for(const e of ents){ if(e.riding||e.anim||!e.c.root.visible&&e!==player) continue; L2.push(e); }
  const R=0.44;
  for(let i=0;i<L2.length;i++){ const a=L2[i];
    for(let j=i+1;j<L2.length;j++){ const b=L2[j]; if(a.f!==b.f) continue;
      let dx=b.x-a.x, dz=b.z-a.z; const d2v=dx*dx+dz*dz; if(d2v>=R*R) continue;
      let d=Math.sqrt(d2v); if(d<1e-4){ dx=Math.random()-.5; dz=Math.random()-.5; d=Math.hypot(dx,dz); }
      const push=(R-d)*0.25, nx=dx/d*push, nz=dz/d*push;
      const wa=a===player?0:(b===player?1:0.5), wb=b===player?0:(a===player?1:0.5);
      if(wa&&!blockedAt(a.f,a.x-nx*wa*2,a.z-nz*wa*2,0.15)){ a.x-=nx*wa*2; a.z-=nz*wa*2; }
      if(wb&&!blockedAt(b.f,b.x+nx*wb*2,b.z+nz*wb*2,0.15)){ b.x+=nx*wb*2; b.z+=nz*wb*2; }
    } }
}

// ---------- contextual tips & help ----------
let lastTipAt=-1e9;
function tipOnce(key,text,sec=5){ if(state.tips[key]) return false; if(performance.now()-lastTipAt<40000) return false; lastTipAt=performance.now(); state.tips[key]=true; hint(text,sec); logEvent('💡 '+text); markSave(); return true; }
let tipClock=0;
function updateTips(dt){
  if(state.tut<TUT.length||sheetMode||modalWrap.classList.contains('show')) return;
  tipClock+=dt;
  if(tipClock>25&&tipOnce('t_chat','💬 Misafirlere dokunarak onlarla sohbet edebilirsin',5.5)){ tipClock=0; return; }
  if(tipClock>60&&tipOnce('t_fp','🎥 Sağdaki Göz düğmesiyle (veya V) oteli içeriden gez',5.5)){ tipClock=0; return; }
  if(tipClock>60&&state.day>=2&&tipOnce('t_cam','🔄 Sağ alttaki düğmelerle (veya Q/E) kamerayı çevirip yakınlaştırabilirsin',5.5)){ tipClock=0; return; }
  if(tipClock>60&&state.day>=3&&tipOnce('t_theme','🎨 Ayarlar › Otelim ve karakterim: otel adı, tema ve karakterini değiştir',5.5)){ tipClock=0; return; }
  if(rawStars()>stars()&&tipOnce('t_starcap',`⭐ ${stars()+1} yıldız için: ${starMissing(stars()+1).join(', ')}`,6)){ tipClock=0; return; }
  if(state.crisis&&tipOnce('t_crisis','🚨 Krizde üstteki hedefe dokun, seni sorunun olduğu yere götürür',5.5)) return;
  if(built('roof')&&tipOnce('t_roof','🚁 Asansörle çatıya çık: bar ve havuzdan gelen parayı toplamayı unutma',5.5)) return;
  if(state.money>luxCost('piano')&&state.done&&tipOnce('t_lux','💎 Yönetim › Otel bölümünde prestij yatırımları seni bekliyor',5.5)) return;
}
function openHelp(){
  const sec=(t,items)=>`<div class="asec"><div class="at">${t}</div>${items.map(i=>`<div class="helpi">${i}</div>`).join('')}</div>`;
  openModal(`<h3>📖 Nasıl oynanır <button class="xbtn" id="hClose" aria-label="Kapat">✖</button></h3>
    ${sec('🏨 Temel',['Yeşil alanlara girip dur: paran yatırılır, yeni oda ve tesis açılır.','Resepsiyonun arkasındaki mavi alanda durursan misafiri kaydedersin.','Kirli odaya gir, temizlik kendiliğinden olur. Arızalı odada tamir olur.','Para destelerinin ve kapıdaki bahşiş tepsilerinin yanından geçmen yeterli.'])}
    ${sec('⭐ Yıldızlar',['Mutlu misafirler ün kazandırır. Her yıldız geliri artırır.','Yıldız atlamak için ün yetmez: oda sayısı, Deluxe/Suit oda ve tesis şartları da var (Yönetim › Otel).'])}
    ${sec('👥 Personel ve yetenekler',['Personel odasını açınca Yönetim menüsünden işe alırsın. Maaşlar her sabah ödenir ve otel büyüdükçe artar.','Yönetim › Sen bölümünde 11 farklı yetenek var.'])}
    ${sec('🎲 Olaylar',['🕵️ Müfettiş: memnun kalırsa büyük ün verir.','🚌 Tur otobüsü ve 🚁 helikopter kalabalık ve zengin misafir getirir.','🚨 Krizler: elektrik kesintisi (jeneratör), boru patlaması, grip. Üstteki hedef seni sorunun yerine götürür.','🐱 Kedi: sevince ün verir, bazen saksı devirir.'])}
    ${sec('🆕 Tesisler, etkinlikler, personel',['💆 Spa: misafirler masaja gelir; Spa terapisti geliri %60 artırır.','🧺 Çamaşırhane: kendin temizlediğin odadan çıkan 🧦 kirli çarşafı çamaşırhaneye götür. Çamaşırcı, personelin temizlediklerini de yıkar.','📅 Düğün, konferans, konser teklifleri Yönetim › Otel\'de: kabul et, o gün 12:00\'ye kadar yeterli hazır oda bulundur.','🎉 Her 8 günde bir festival: misafir akını ve +%15 gelir.','😓 Personel çalıştıkça yorulur; ☕ mola odası dinlenmelerini sağlar. 🏅 Günün çalışanı ertesi gün daha hızlıdır.','🎨 Oda teması seç: temayı isteyen misafir (baloncuğunda 🌊🌲🕺👑) eşleşirse çok mutlu olur.'])}
    ${sec('🎮 Kontroller',[IS_TOUCH?'Sürükle: yürü · dokun: oraya git · iki parmak: yakınlaştır ve çevir':'WASD: yürü · tıkla: git · tekerlek: yakınlaş · Q/E: çevir · V: göz kamerası · P: admin paneli','Misafire dokun: sohbet et · 🎯 Görevler: günlük ödüller · 🔔 Olay geçmişi'])}`,m=>{ m.querySelector('#hClose').onclick=closeModal; });
}

// ---------- night windows: only occupied rooms glow ----------
function roomWindowMesh(G){ let w=null; G.traverse(o=>{ if(!w&&o.isMesh&&o.material===M.window) w=o; }); return w; }

// ---------- first-person ceilings (single-sided: invisible from the top-down camera) ----------
function addCeiling(f,z0,z1){
  const G=floorRoot(f), h=2.62, m=mat(0xf4f1ea,{roughness:.9});
  const p=mesh(plane(14,z1-z0),m,0,h,(z0+z1)/2,false,true); p.rotation.x=Math.PI/2; G.add(p);
  const pm=M.lampOn; [CORR[0],CORR[1],CORR[2]].forEach(z=>[-4.5,-1.5,1.5,4.5].forEach(x=>{ const q=mesh(plane(0.5,0.5),pm,x,h-0.01,z); q.rotation.x=Math.PI/2; G.add(q); }));
  if(f===0) [[-3,5],[3,5],[0,6.6]].forEach(([x,z])=>{ const q=mesh(new THREE.CircleGeometry(0.35,20),pm,x,h-0.01,z); q.rotation.x=Math.PI/2; G.add(q); });
}

// ---------- automatic quality ----------
let fpsAcc=0, fpsN=0, fpsWarm=0;
function trackFps(rawDt){
  if(document.hidden||rawDt>0.5) return; fpsWarm+=rawDt; if(fpsWarm<8) return;
  fpsAcc+=rawDt; fpsN++;
  if(fpsAcc>=4){ const fps=fpsN/fpsAcc; fpsAcc=0; fpsN=0;
    if(state.gfxAuto!==false&&fps<27){ const q=gfxLevel(); const nq=q==='high'?'mid':q==='mid'?'low':null;
      if(nq){ state.gfx=nq; applyGfx(); fpsWarm=0; toast(`⚙️ Daha akıcı oyun için grafik ${nq==='mid'?'Orta':'Düşük'} kaliteye alındı`); save(); } } }
}

// ---------- save export / import ----------
let dlCap; (async()=>{ try{ if(window.claude&&typeof window.claude.use==='function') dlCap=await window.claude.use('downloads'); }catch(e){} })();
async function exportSave(){
  save(); const data=JSON.stringify(state), fn=`otel-kayit-gun${state.day}.json`;
  if(dlCap){ try{ await dlCap.save({filename:fn,data}); toast('💾 Kayıt dosyası indirildi'); return; }catch(e){ if(e&&e.code==='declined') return; } }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download=fn; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); toast('💾 Kayıt dosyası indirildi'); }
  catch(e){ toast('Bu görünümde dosya indirilemiyor','bad'); }
}
function importSave(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const s=JSON.parse(r.result); if(!s||s.v!==2||typeof s.rooms!=='object') throw 0;
      localStorage.setItem(SAVE_KEY,JSON.stringify(s)); toast('📂 Kayıt yüklendi, oyun yeniden başlıyor…'); setTimeout(()=>location.reload(),700); }
      catch(e){ toast('Bu dosya geçerli bir oyun kaydı değil','bad'); } };
    r.readAsText(f); };
  inp.click();
}

// ---------- hooks ----------
function updatePolish(dt,t){ updateLux(dt,t); updateTips(dt); }
function bootPolish(){
  for(const k in state.lux) if(state.lux[k]) buildLux(k,false);
  $('logBtn').onclick=()=>{ sfx('click'); logUnread=0; $('logDot').classList.remove('on'); openSheet('log'); };
  document.querySelectorAll('[data-cam]').forEach(b=>b.onclick=()=>{ const a=b.dataset.cam; sfx('click');
    if(a==='l') camRotate(-0.25); else if(a==='r') camRotate(0.25); else if(a==='i') camZoom(-3); else camZoom(3); });
}
