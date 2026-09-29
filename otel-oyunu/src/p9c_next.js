
// =====================================================================
// MG10 · BİR ÜST SEVİYE: personel kişilikleri (işe alımda aday seçimi),
// Efsane zorluk (anahtar bonusu), foto modu, yeni misafirler (Spor takımı
// grubu, Film ekibi çatı çekimi)
// =====================================================================

// ---------- 1) personel kişilikleri ----------
// her çalışanın kaydında (state.crew[kind][i].tr) bir kişilik: işe alırken iki aday arasından seçersin
const TRAITS={
  calisan:{e:'⚡',n:'Çalışkan',d:'%12 daha hızlı çalışır',spd:1.12},
  neseli: {e:'😄',n:'Neşeli',d:'Her sabah ekip moraline +1',morale:1},
  gece:   {e:'🦉',n:'Gece kuşu',d:'Gece vardiyası kapalıyken bile gece tam hız',night:true},
  dayanikli:{e:'🧱',n:'Dayanıklı',d:'İş başına yarı yorulur',energy:0.5},
  tutumlu:{e:'💰',n:'Tutumlu',d:'Maaşı %15 düşük, %4 daha yavaş',wage:0.85,spd:0.96},
  yetenekli:{e:'🌟',n:'Yetenekli',d:'İki kat hızlı terfi eder',xp:2},
  sakar:  {e:'🤕',n:'Sakar',d:'Maaşı %20 düşük ama %8 daha yavaş',wage:0.8,spd:0.92}};
function traitOf(e){ return e&&e.rec&&e.rec.tr?TRAITS[e.rec.tr]:null; }
function traitSpd(e){ const t=traitOf(e); let m=t&&t.spd||1; if(t&&t.night&&isNight()&&!state.nightShift) m*=2; return m; }   // ×2, staffSpeedMul'daki 0.5 gece cezasını siler
function traitEnergy(e){ const t=traitOf(e); return t&&t.energy||1; }
function traitXp(e){ const t=traitOf(e); return t&&t.xp||1; }
function traitMoraleDelta(){ let d=0; staffEnts.forEach(e=>{ const t=traitOf(e); if(t&&t.morale) d+=t.morale; }); return Math.min(3,d); }
function traitWageDelta(){ let d=0; staffEnts.forEach(e=>{ const t=traitOf(e); if(t&&t.wage) d+=staffWage(e.kind)*(t.wage-1); }); return d; }
// işe alım: iki aday, kişilikleri görünür; seçilen kayıt crew listesine yazılır, sonra normal hireStaff
function makeCandidate(){ const ks=Object.keys(TRAITS); return {n:rand(STAFF_NAMES),xp:0,tr:rand(ks)}; }
function hireCandidates(k){
  const c=staffHireCost(k); if(!built('staff')||c==null||state.money<c) return;
  let a=makeCandidate(), b=makeCandidate(); if(a.tr===b.tr) b.tr=rand(Object.keys(TRAITS).filter(x=>x!==a.tr));
  const card=(cd,i)=>{ const t=TRAITS[cd.tr]; return `<button class="btn ${i?'':'gold'} wide" data-cand="${i}" style="text-align:left;line-height:1.3">${t.e} <b>${escH(cd.n)}</b> · ${t.n}<br><small style="font-weight:600;opacity:.85">${t.d}</small></button>`; };
  openModal(`<h3>${STAFF[k].e} ${STAFF[k].name} adayları</h3><p class="sub">${fmt(c)} ₺ · birini seç, kişiliği kalıcıdır</p>${card(a,0)}${card(b,1)}<button class="btn ghost wide" id="cdN">Vazgeç</button>`,m=>{
    m.querySelectorAll('[data-cand]').forEach(x=>x.onclick=()=>{ const cd=x.dataset.cand==='0'?a:b; state.crew=state.crew||{}; const L0=state.crew[k]=state.crew[k]||[]; const i=staffEnts.filter(e=>e.kind===k).length; L0[i]=cd; closeModal(); hireStaff(k); });
    m.querySelector('#cdN').onclick=closeModal; });
}
function crewHtml(){
  if(!staffEnts.length) return '';
  return `<div class="ugh">🧬 Ekip</div>`+staffEnts.map(e=>{ const t=traitOf(e); return `<div class="row"><div class="ic">${STAFF[e.kind].e}</div><div class="tx">${escH(e.name||'')} <small style="display:inline">${RANKS[rankOf(e)]} ${STAFF[e.kind].name}</small><small>${t?`${t.e} ${t.n} · ${t.d}`:'Kişiliği yok (eski çalışan)'}${e.leaveNow?' · 🏖️ bugün izinli':''}</small></div></div>`; }).join('');
}

// ---------- 2) Efsane zorluk ----------
// DIFF.legend p88'de: misafir daha çok ve sabırsız; burada ek çarpanlar + gün sayacı + anahtar bonusu
function isLegend(){ return state.diff==='legend'; }
function diffWageMul(){ return isLegend()?1.25:state.diff==='hard'?1.1:1; }
function diffBreakMul(){ return isLegend()?1.5:1; }
function diffRivalQ(){ return isLegend()?10:0; }
function diffExpect(){ return isLegend()?3:0; }
function diffDayEnd(){ const D=state.diffDays=state.diffDays||{}; const k=state.diff||'auto'; D[k]=(D[k]||0)+1; }
// oyunun en az %80'i Efsane'de oynandıysa taşınma anahtarları ×1.5, Zorlu'da ×1.2
function diffKeyMul(){ const D=state.diffDays||{}, tot=Object.values(D).reduce((a,b)=>a+b,0)||1; if((D.legend||0)/tot>=0.8) return 1.5; if(((D.legend||0)+(D.hard||0))/tot>=0.8) return 1.2; return 1; }
function diffBadge(){ const m=diffKeyMul(); return m>=1.5?'🔥 Efsane':m>1?'💪 Zorlu':''; }
function diffHtml(){ return `<div class="row"><div class="ic">🔥</div><div class="tx">Efsane zorluk<small>Misafir daha çok ve sabırsız, maaşlar +%25, arızalar +%50, rakip güçlü, beklentiler yüksek · şehri en az %80 Efsane'de bitirirsen taşınma anahtarları ×1,5 (Zorlu ×1,2)${state.diffDays?` · şu an ${diffBadge()||'bonus yok'}`:''}</small></div></div>`; }

// ---------- 3) foto modu ----------
async function photoMode(){
  if(fpMode&&!player) return; const cv=renderer.domElement; let url=null;
  try{ renderFrame(); url=cv.toDataURL('image/png'); }catch(e){ toast('Bu görünümde fotoğraf çekilemiyor','bad'); return; }
  const img=new Image(); await new Promise(r=>{ img.onload=r; img.onerror=r; img.src=url; });
  const W=img.width||cv.width, H=img.height||cv.height, bar=Math.round(H*0.11), c=document.createElement('canvas'); c.width=W; c.height=H+bar; const x=c.getContext('2d');
  x.drawImage(img,0,0); x.fillStyle='#1b2a3a'; x.fillRect(0,H,W,bar); x.fillStyle='#f2c14e'; x.fillRect(0,H,W,Math.max(2,Math.round(bar*0.06)));
  const nm=(state.custom&&state.custom.name)||'Otel Ustası', fs=Math.round(bar*0.36);
  x.fillStyle='#fff'; x.font=`800 ${fs}px "Baloo 2", sans-serif`; x.textBaseline='middle'; x.fillText(`${nm} · ${'★'.repeat(stars())}`,Math.round(W*0.03),H+bar*0.42);
  x.fillStyle='#cfd8e3'; x.font=`600 ${Math.round(fs*0.7)}px "Baloo 2", sans-serif`; x.fillText(`${city().e||''} ${city().name} · ${state.day}. gün · ${fmt(state.served)} misafir`,Math.round(W*0.03),H+bar*0.78);
  x.fillStyle='#f2c14e'; x.textAlign='right'; x.font=`800 ${Math.round(fs*0.8)}px "Baloo 2", sans-serif`; x.fillText('🏨 Otel Ustası',Math.round(W*0.97),H+bar*0.5);
  const out=c.toDataURL('image/png'); sfx('sparkle'); { const fx=document.getElementById('flashFx'); if(fx&&!state.lowFx){ fx.style.opacity=.9; setTimeout(()=>fx.style.opacity=0,120); } }
  openModal(`<h3>📸 Fotoğraf</h3><img src="${out}" style="width:100%;border-radius:12px;display:block;margin:6px 0 10px" alt="Otel fotoğrafı"><button class="btn gold wide" id="phD">⬇️ İndir</button><button class="btn ghost wide" id="phX">Kapat</button>`,m=>{
    m.querySelector('#phX').onclick=closeModal; m.querySelector('#phD').onclick=async()=>{ const fn=`otel-${state.day}.gun.png`;
      if(typeof dlCap!=='undefined'&&dlCap){ try{ await dlCap.save({filename:fn,data:out,encoding:'dataURL'}); toast('📸 Fotoğraf indirildi'); return; }catch(e){ if(e&&e.code==='declined') return; } }
      try{ const a=document.createElement('a'); a.href=out; a.download=fn; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),500); toast('📸 Fotoğraf indirildi'); }catch(e){ toast('Bu görünümde dosya indirilemiyor','bad'); } }; });
  onGameEvent('photo',1);
}

// ---------- 4) yeni misafirler ----------
// Spor takımı: kaptan + 2 sporcu birlikte gelir; hepsi mutlu ayrılırsa "takım fotoğrafı" (+1 ün)
// Film ekibi: yönetmen; çatıya çıkınca çekim olur (çatıdaki misafirler +5, +1 ün, ertesi gün misafir +%20)
function teamArrive(g){ if(g.type!=='team'||g.teamed) return; g.teamed=true; const from=g.x<0?L.spawnL:L.spawnR;
  for(let i=0;i<2;i++){ const m=spawnGuest('athlete',from); m.teamOf=g; m.name=rand(NAMES_M)+' '+rand(SURN); } fxEmoji(g.x,2.5,g.z,0,'🏆'); toast(`🏆 Spor takımı geldi: ${escH(g.name)} ve 2 sporcu`); }
function teamCheckout(g){ const cap=g.teamOf||(g.type==='team'?g:null); if(!cap) return; cap.teamSat=(cap.teamSat||[]).concat([g.sat>=68]);
  if(cap.teamSat.length>=3){ if(cap.teamSat.every(x=>x)){ changeRep(1); if(!state.lowFx) confettiAt(L.desk.x,1.8,L.desk.z,40); banner('🏆 Takım fotoğrafı!','Bütün takım mutlu ayrıldı · +1 ün'); onGameEvent('team',1); } } }
function filmShoot(g){ if(g.type!=='film'||g.shot) return; g.shot=true; state.filmBoost=state.day+1; markSave();
  guests.forEach(o=>{ if(o!==g&&o.f===ROOF&&o.state==='amen'){ o.sat=clamp(o.sat+5,0,100); fxEmoji(o.x,o.y+2.1,o.z,o.f,'🤩'); } });
  changeRep(1); if(!state.lowFx&&typeof fireworksAt==='function') fireworksAt(g.x,ROOF*FH+5,g.z); sfx('star');
  banner('🎬 Çatıda çekim!',`${escH(g.name)} otelini filme çekiyor · yarın misafir +%20, +1 ün`); onGameEvent('film',1); }
function filmDemand(){ return state.filmBoost===state.day?1.2:1; }

function nextDayEnd(){ diffDayEnd(); }
function bootNext(){ try{ const b=document.querySelector('[data-photo]'); if(b) b.onclick=()=>{ sfx('click'); photoMode(); }; }catch(e){ console.warn('next',e); } }
