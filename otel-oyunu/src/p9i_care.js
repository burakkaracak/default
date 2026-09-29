// =====================================================================
// MG11-D3..6: Ses 2.0 (şehre özel ambiyans tek sesleri + hafif perküsyon),
// erişilebilirlik (büyük yazı / yüksek kontrast / hareketi azalt: state.a11y, body sınıfları),
// kayıt güvenliği (yedek rotasyonu _bak/_bak2, sürüm damgası sv, göç MIGR, kurtarma ekranı),
// rehber girişleri p85 GUIDE'da.
// =====================================================================
// ---------- Ses 2.0 ----------
const CITY_SND={'İstanbul':{amb:['gull','horn','gull'],perc:[1,0,0,1,0,1,0,0]},'Antalya':{amb:['wave','gull','wave'],perc:[1,0,1,0,1,0,1,0]},'Kapadokya':{amb:['wind','burner','wind'],perc:[1,0,0,0,1,0,0,0]},
  'Bodrum':{amb:['wave','bell','wave'],perc:[1,0,1,1,0,1,0,1]},'Paris':{amb:['accordion','bell'],perc:[1,0,0,1,0,0,1,0]},'Dubai':{amb:['wind','hum'],perc:[1,0,1,0,0,1,0,1]}};
function pinkBurst(dur,vol,lo,hi,delay=0,dest){ const c=Sound.ctx; if(!c||!Sound.pink) return; const t=c.currentTime+delay, s=c.createBufferSource(); s.buffer=Sound.pink; s.loop=true; s.playbackRate.value=rnd(0.9,1.1);
  const f=c.createBiquadFilter(); f.type=hi?'bandpass':'lowpass'; f.frequency.setValueAtTime(lo,t); if(hi) f.frequency.exponentialRampToValueAtTime(hi,t+dur); f.Q.value=0.8;
  const g=c.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+Math.min(0.4,dur*0.4)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(dest||Sound.sfx); s.start(t,rnd(0,4)); s.stop(t+dur+0.05); }
function ambOne(k){ const c=Sound.ctx; if(!c) return; const v=0.05;
  if(k==='gull'){ for(let i=0;i<3;i++) tone(rnd(1100,1400),0.28,'sine',v*0.5,i*0.32,null,rnd(700,900)); }
  else if(k==='horn'){ tone(98,1.6,'triangle',v*0.9,0,null,92); tone(196,1.4,'sine',v*0.3,0.05); }
  else if(k==='wave'){ pinkBurst(3.2,v*1.3,900,0,0); pinkBurst(2.4,v*0.8,600,0,1.6); }
  else if(k==='wind'){ pinkBurst(4.5,v*1.1,300,1400,0); }
  else if(k==='burner'){ pinkBurst(0.7,v*1.6,1800,3000,0); pinkBurst(0.5,v*1.2,1800,2600,0.9); }
  else if(k==='bell'){ tone(880,1.4,'sine',v*0.7); tone(1318,1.1,'sine',v*0.35,0.02); tone(659,1.8,'sine',v*0.3,0.3); }
  else if(k==='accordion'){ [220,277.2,329.6].forEach((f,i)=>[-6,6].forEach(d=>{ const o=c.createOscillator(), g=c.createGain(), t=c.currentTime; o.type='sawtooth'; o.frequency.value=f; o.detune.value=d; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v*0.18,t+0.5); g.gain.linearRampToValueAtTime(0.0001,t+2.2); o.connect(g); g.connect(Sound.sfx); o.start(t); o.stop(t+2.3); })); }
  else if(k==='hum'){ tone(55,4,'sine',v*0.9); tone(110,3,'triangle',v*0.2,0.5); } }
let ambT=25, percT=0, percI=0;
function updateCare(dt){
  if(!Sound.ctx||Sound.ctx.state!=='running'||document.hidden) return;
  const S=CITY_SND[city().name]; if(!S) return;
  if(state.sound!==false){ ambT-=dt; if(ambT<=0){ ambT=rnd(18,42); if(!(typeof isNight==='function'&&isNight()&&S.amb[0]==='gull')) ambOne(rand(S.amb)); } }
  if(state.music&&stars()>=2&&Sound.music){ percT-=dt; if(percT<=0){ percT=0.475; const hit=S.perc[percI++%S.perc.length]; if(hit) pinkBurst(0.07,0.028,hit===1&&percI%2?180:420,0,0,Sound.music); } }
}
// ---------- erişilebilirlik ----------
function a11y(){ if(!state.a11y) state.a11y={big:false,hc:false,motion:false}; return state.a11y; }
function applyA11y(){ const A=a11y(); document.body.classList.toggle('a11y-big',!!A.big); document.body.classList.toggle('a11y-hc',!!A.hc); document.body.classList.toggle('a11y-motion',!!A.motion); }
function reduceMotion(){ return !!(state.a11y&&state.a11y.motion); }
function a11yHtml(){ const A=a11y(); const b=(k,l)=>`<button class="btn ${A[k]?'':'ghost'}" style="padding:4px 8px;min-height:34px" data-a11y="${k}">${l}</button>`;
  return `<div class="row" style="flex-wrap:wrap"><div class="ic">♿</div><div class="tx">Erişilebilirlik<small>Büyük yazı arayüzü %18 büyütür · yüksek kontrast kenarlıkları belirginleştirir · hareketi azalt sarsıntı, sinematik ve animasyonları kapatır</small></div><div style="display:flex;gap:4px;flex-wrap:wrap;width:100%;justify-content:flex-end">${b('big','Büyük yazı')}${b('hc','Yüksek kontrast')}${b('motion','Hareketi azalt')}</div></div>`; }
function bindA11y(root){ root.querySelectorAll('[data-a11y]').forEach(x=>x.onclick=()=>{ const A=a11y(); A[x.dataset.a11y]=!A[x.dataset.a11y]; applyA11y(); save(); sfx('click'); openSettings(); }); }
// ---------- kayıt güvenliği ----------
const MIGR=[ // [sürüm, fn]: state.sv < sürüm ise çalışır; yeni alan varsayılanları freshState'ten zaten gelir, burada dönüşüm gerektirenler
  [56,s=>{ if(!s.a11y) s.a11y={big:false,hc:false,motion:false}; }]];
function runMigrations(){ const v0=state.sv||0; MIGR.forEach(([v,fn])=>{ if(v0<v){ try{ fn(state); }catch(e){ console.warn('migr',v,e); } } }); state.sv=typeof GAME_VER==='number'?GAME_VER:v0; }
function rotateBackup(){ try{ const b=localStorage.getItem(SAVE_KEY+'_bak'); if(b) localStorage.setItem(SAVE_KEY+'_bak2',b); }catch(e){} }   // p7 gün sonu _bak yazmadan önce
function slotInfo(key){ try{ const s=JSON.parse(localStorage.getItem(key)); if(!s||s.v!==2) return null; return {key,day:s.day,money:Math.round(s.money||0),city:CITIES[(s.city||0)%CITIES.length].name,rooms:Object.keys(s.rooms||{}).length,at:s.savedAt||0,stars:s.rep!=null?Math.min(5,1+Math.floor(s.rep/20)):0}; }catch(e){ return null; } }
function openRecovery(){ const slots=[[SAVE_KEY,'Şu anki kayıt'],[SAVE_KEY+'_bak','Dün sonu yedeği'],[SAVE_KEY+'_bak2','Önceki gün yedeği']].map(([k,n])=>[n,k,slotInfo(k)]);
  openModal(`<h3>🛟 Kayıt kurtarma <button class="xbtn" id="rcX" aria-label="Kapat">✖</button></h3><p class="sub">Her gün sonunda yedek alınır (2 gün geriye). Geri yüklemek mevcut ilerlemeyi o yedekle değiştirir.</p>
    ${slots.map(([n,k,i])=>`<div class="row"><div class="ic">${i?'💾':'—'}</div><div class="tx">${n}<small>${i?`${i.city} · ${i.day}. gün · ${'★'.repeat(i.stars)} · ${i.rooms} oda · ${fmt(i.money)} ₺${i.at?' · '+new Date(i.at).toLocaleString('tr-TR'):''}`:'yok'}</small></div>${i&&k!==SAVE_KEY?`<button class="btn gold" data-rc="${k}">Geri yükle</button>`:''}</div>`).join('')}
    <p class="note">Ayrıca Ayarlar › Kaydı indir ile dosya yedeği alabilirsin.</p>`,m=>{ m.querySelector('#rcX').onclick=openSettings;
    m.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>{ const k=b.dataset.rc; if(!confirm('Bu yedek geri yüklensin mi? Şu anki ilerleme yedeğin üzerine yazılır.')) return; try{ const cur=localStorage.getItem(SAVE_KEY); if(cur) localStorage.setItem(SAVE_KEY+'_undo',cur); localStorage.setItem(SAVE_KEY,localStorage.getItem(k)); }catch(e){ toast('Geri yükleme başarısız','bad'); return; } saveDirty=false; toast('🛟 Yedek geri yüklendi, oyun yeniden başlıyor…'); setTimeout(()=>location.reload(),700); }); }); }
function careSettingsHtml(){ return `${a11yHtml()}<button class="btn ghost wide" id="sRecover">🛟 Kayıt kurtarma (günlük yedekler)</button>`; }
function bindCare(m){ bindA11y(m); const r=m.querySelector('#sRecover'); if(r) r.onclick=openRecovery; }
function bootCare(){ runMigrations(); if(!state.a11yInit){ state.a11yInit=1; try{ if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) a11y().motion=true; }catch(e){} } applyA11y(); }
