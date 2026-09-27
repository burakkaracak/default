
// =====================================================================
// FAZ 2 · ARAYÜZ: Otel alt sekmeleri, tek Görevler ekranı (Bugün / Bu
// hafta / Kalıcı), yükseltme sırası (süper mıknatıs), bildirim yerleşimi
// =====================================================================

// ---------- Yönetim › Otel alt sekmeleri ----------
const HSUB=[['gen','📊 Genel'],['eco','💰 Ekonomi'],['evt','📅 Etkinlik'],['rule','📜 Kural'],['city','🗺️ Şehir']];
function hsubDot(k){ return k==='evt'?!!state.offer:k==='city'?!!state.done:k==='eco'?(stars()>=4&&Object.keys(INV).some(i=>{ const c=invCost(i); return c!=null&&state.money>=c; })):false; }
function subTabsHtml(){ return `<div class="stabs">${HSUB.map(([k,l])=>`<button data-hsub="${k}" class="${hotelSub===k?'on':''}">${l}${hsubDot(k)?'<i class="sdot"></i>':''}</button>`).join('')}</div>`; }

// ---------- Sen sekmesi: süper mıknatıs mıknatısın hemen ardından, mıknatıs bitince açılır ----------
function upgOrder(){ const ks=Object.keys(UPG).filter(k=>k!=='auto'), i=ks.indexOf('magnet');
  if(state.up.auto>0||state.up.magnet>=UPG.magnet.costs.length) ks.splice(i+1,0,'auto'); return ks; }

// ---------- tek Görevler ekranı ----------
const QTABS=[['quests','📅 Bugün'],['pass','🎖️ Hafta'],['ach','🏆 Kalıcı'],['album','📖 Albüm']];
function qTabDot(k){ if(k==='quests') return !!(state.quests&&state.quests.list.some(q=>q.done&&!q.claimed))||!!(state.streak&&!state.streak.got);
  if(k==='pass') return passClaimable(); if(k==='album') return albClaimables().length>0; return false; }
function qTabsHtml(cur){ return `<div class="tabs">${QTABS.map(([k,l])=>`<button data-qt="${k}" class="${k===cur?'on':''}">${l}${qTabDot(k)?'<i class="sdot"></i>':''}</button>`).join('')}</div>`; }
function bindQTabs(root){ root.querySelectorAll('[data-qt]').forEach(b=>b.onclick=()=>{ if(sheetMode===b.dataset.qt) return; sfx('click'); openSheet(b.dataset.qt); }); }
function streakRowHtml(){ const S=state.streak; if(!S||!S.n) return '';
  const r=streakRew(S.n-1); return `<div class="row"><div class="ic">🔥</div><div class="tx">Giriş serisi: ${S.n}. gün<small>${S.got?'Bugünün ödülü alındı · yarın: '+rewTxt(streakRew(S.n)):'Bugünün ödülü: '+rewTxt(r)}</small></div>${S.got?'<button class="btn" disabled>Alındı ✓</button>':'<button class="btn gold qclaim" data-streak>Al 🎁</button>'}</div>`; }
