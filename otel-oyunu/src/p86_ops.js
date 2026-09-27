
// =====================================================================
// OPS: resepsiyon onayları (uzun konaklama), otel kuralları (köpek /
// alkol), bekleyen oda yükseltmesi, bakım modu, ücretli oda yükseltme
// =====================================================================

// ---------- otel kuralları: köpek ve alkol ----------
const POLICY={dog:{e:'🐶',no:'🚫🐶',name:'Köpek yasak',say:'Üzgünüz, otelimize evcil hayvan kabul etmiyoruz.'},
  booze:{e:'🍾',no:'🚫🍾',name:'Alkol yasak',say:'Otelimiz alkolsüz bir otel, içki ile giriş yapılamıyor.'}};
function ruleOn(k){ return !state.rules||state.rules[k]!==false; }
const POL_REV={
  dog:{2:['Köpeğimle kalamayacağımı ancak resepsiyonda öğrendim, boşuna geldim.','Evcil hayvan dostu değil, bizim için uygun değilmiş.'],
       3:['Kuralı kibarca söylediler ama köpeğimle kalamadık, başka otele geçtik.','Personel nazikti; keşke evcil hayvan kabul etselerdi.'],
       4:['Kuralları net ve kibar. Köpeğim olmadan geldiğimde mutlaka kalacağım.','Evcil hayvan yok dediler ama çok nazik davrandılar, takdir ettim.']},
  booze:{2:['Bir şişe şarap için geri çevrildim, biraz katı buldum.','Alkol yasağını bilmiyordum, hayal kırıklığı.'],
       3:['Alkolsüz otel olduklarını kibarca anlattılar, tercih meselesi.','Kural kural, saygı duyuyorum ama bana göre değil.'],
       4:['Aile ortamı için alkolsüz olması güzel, kibarca uyardılar.','Kuralları net, personel saygılı. Bir dahakine şişesiz gelirim.']}};
function policyReview(g,kind){
  const st=rand(kind==='dog'?[2,3,3,4]:[2,3,4,4]), R={n:g.name,e:g.T.e,s:st,t:rand(POL_REV[kind][st]),d:state.day};
  state.reviews=(state.reviews||[]).concat([R]).slice(-15);
  changeRep(st<=2?-0.4:st>=4?0.2:0); state.today.refused=(state.today.refused||0)+1;
  const show=()=>toast(`${'★'.repeat(R.s)}${'☆'.repeat(5-R.s)} ${g.name}: “${R.t}”`,st<=2?'bad':null);
  aiJSON(`Bir otel işletme oyununda misafir resepsiyonda "${POLICY[kind].say}" denilerek geri çevrildi (${kind==='dog'?'köpeğiyle gelmişti':'yanında içki vardı'}). Otel: "${hotelName()}", ${city().name}.
Misafir: ${g.name}, ${g.T.name}. Bu misafirin internete yazdığı ${st}/5 yıldızlı kısa bir yorum yaz: Türkçe, doğal, en fazla 2 kısa cümle, uygunsuz içerik yok.
SADECE JSON: {"yorum":"..."}`).then(r=>{ const t=r&&clip(r.yorum,220); if(t) R.t=t; show(); markSave(); });
  markSave();
}
function turnAway(g,kind){
  const k=queue.indexOf(g); if(k>=0){ queue.splice(k,1); reflowQueue(); }
  if(g.tag){ tagRemove(g.tag); g.tag=null; } g.asking=false;
  fxEmoji(g.x,2.5,g.z,0,POLICY[kind].no); fxText(g.x,2.1,g.z,0,kind==='dog'?'Evcil hayvan yok':'Alkol yok'); sfx('req');
  logEvent(`${POLICY[kind].no} ${g.name} kural gereği geri döndü`); guestLeave(g); policyReview(g,kind);
}
// alkol: bazı misafirler şişeyi emanete bırakır ve kalır
function policyHit(g){
  if(g.polDone) return false; g.polDone=true;
  if(g.type==='dog'&&ruleOn('dog')){ turnAway(g,'dog'); return true; }
  if(g.booze&&ruleOn('booze')){
    if(Math.random()<0.5){ g.booze=false; g.sat=clamp(g.sat-4,5,100); fxEmoji(g.x,2.4,g.z,0,'🍾➡️🗄️'); toast(`🍾 ${g.name} şişesini emanete bıraktı, giriş yapıyor`); return false; }
    turnAway(g,'booze'); return true; }
  return false;
}

// ---------- uzun konaklama onayı ----------
let askG=null, askT=0, askEl=null;
function stayPay(g,n){ const id=pickRoom(g); return id==null?0:Math.round(roomRate(id)*n*g.T.pay*incomeMult()*priceMult()); }
function askUi(){
  if(askEl) return askEl;
  const st=document.createElement('style'); st.textContent=`#deskAsk{position:fixed;left:50%;bottom:calc(118px + env(safe-area-inset-bottom));transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:40;width:min(420px,calc(100vw - 24px));background:rgba(22,26,40,.94);border:1px solid rgba(255,215,120,.45);border-radius:16px;padding:10px 12px;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.4);transition:.25s;font-size:14px}
#deskAsk.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}#deskAsk .q{margin-bottom:8px;line-height:1.35}#deskAsk .q small{display:block;color:#b9c0d6;font-size:12px}
#deskAsk .bt{display:flex;gap:6px}#deskAsk .bt button{flex:1;padding:8px 4px;font-size:13px;line-height:1.2}#deskAsk .tm{height:3px;background:rgba(255,255,255,.12);border-radius:2px;margin-top:8px;overflow:hidden}#deskAsk .tm i{display:block;height:100%;background:var(--gold2,#ffd24a)}
#deskAsk .al{display:block;margin-top:6px;font-size:12px;color:#b9c0d6;text-align:center;cursor:pointer;text-decoration:underline}`;
  document.head.appendChild(st); askEl=document.createElement('div'); askEl.id='deskAsk'; document.body.appendChild(askEl);
  askEl.addEventListener('pointerdown',e=>e.stopPropagation()); return askEl;
}
function showAsk(g,server){
  askG=g; askT=14; g.asking=true; const el=askUi(), n=g.nights, p1=stayPay(g,1), pn=stayPay(g,n);
  el.innerHTML=`<div class="q">🛎️ ${server==='rec'?'Resepsiyonist soruyor: ':''}<b>${g.T.e} ${escH(g.name)}</b> <b>${n} gece</b> kalmak istiyor.<small>${n} gece = ${fmt(pn)} ₺ ama oda ${n} gün dolu kalır · 1 gece = ${fmt(p1)} ₺</small></div>
    <div class="bt"><button class="btn gold" data-a="yes">✅ ${n} gece kabul</button><button class="btn" data-a="one">1️⃣ Sadece 1 gece</button><button class="btn ghost" data-a="no">❌ Yer yok</button></div>
    <div class="tm"><i></i></div><span class="al" data-a="always">Hep kabul et, bir daha sorma</span>`;
  el.querySelectorAll('[data-a]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); answerAsk(b.dataset.a); });
  el.classList.add('show'); sfx('bell');
}
function hideAsk(){ if(askEl) askEl.classList.remove('show'); if(askG) askG.asking=false; askG=null; }
function answerAsk(a){
  const g=askG; if(!g) return; hideAsk(); sfx('click');
  if(a==='always'){ state.stayPol='yes'; toast('✅ Uzun konaklamalar artık otomatik kabul (Yönetim › Otel\'den değiştir)'); a='yes'; }
  if(a==='yes'){ g.gateOk=true; }
  else if(a==='one'){ g.nights=1; g.gateOk=true; g.sat=clamp(g.sat-3,5,100); fxEmoji(g.x,2.3,g.z,0,'🙂'); }
  else { const k=queue.indexOf(g); if(k>=0){ queue.splice(k,1); reflowQueue(); } if(g.tag){ tagRemove(g.tag); g.tag=null; }
    fxEmoji(g.x,2.3,g.z,0,'🙁'); logEvent(`❌ ${g.name}'a ${g.nights} gece için yer verilmedi`); guestLeave(g); }
  markSave();
}
// true: check-in bekletilsin (soruluyor ya da misafir gitti)
function deskGate(g,server){
  if(policyHit(g)) return true;
  if(g.gateOk||g.nights<=1||g.tour||g.type==='insp'||state.tut<TUT.length) return false;
  const pol=state.stayPol||'ask';
  if(pol==='yes'){ g.gateOk=true; return false; }
  if(pol==='one'){ g.nights=1; g.gateOk=true; return false; }
  if(askG!==g) showAsk(g,server);
  return true;
}
function updateAsk(dt){
  if(!askG) return;
  if(queue[0]!==askG||!guests.includes(askG)){ hideAsk(); return; }
  askT-=dt; const bar=askEl&&askEl.querySelector('.tm i'); if(bar) bar.style.width=(Math.max(0,askT)/14*100).toFixed(0)+'%';
  if(askT<=0){ toast(`🛎️ Cevap gelmedi, resepsiyon ${askG.name}'ı kabul etti`); answerAsk('yes'); }
}

// ---------- bekleyen yükseltme & bakım modu ----------
function nextRoomType(id){ const i=ROOM_ORDER.indexOf(state.rooms[id].type); return i<2?ROOM_ORDER[i+1]:null; }
function doRoomUpgrade(id){
  const s=state.rooms[id], ri=roomInfo(id); s.type=nextRoomType(id); qEv('upg'); buildRoomVisual(id,true);
  confettiAt(ri.x,ri.f*FH+1,ri.z,40); sfx('build');
}
function orderRoomUpgrade(id){
  const s=state.rooms[id], R=RT(id); if(s.upPend||!nextRoomType(id)) return false; const c=roomUpCost(id); if(!spend(c)) return false;
  if(R.guest){ s.upPend=true; toast(`⏳ Oda ${id}: misafir çıkınca otomatik yükseltilecek`); }
  else doRoomUpgrade(id);
  save(); return true;
}
function pendingUpgrade(id){
  const s=state.rooms[id]; if(!s||!s.upPend) return; s.upPend=false;
  if(nextRoomType(id)){ doRoomUpgrade(id); toast(`⬆️ Oda ${id} yükseltildi: ${ROOM_T[s.type].name}`); }
}
function upgradeRoomMax(id){ let n=0; while(!RT(id).guest&&nextRoomType(id)&&orderRoomUpgrade(id)) n++; if(!n) orderRoomUpgrade(id); }
function toggleHold(id){ const s=state.rooms[id]; s.hold=!s.hold; sfx('click'); toast(s.hold?`🚧 Oda ${id} yeni misafire kapatıldı`:`✅ Oda ${id} yeniden misafir alıyor`); markSave(); }

// ---------- ücretli oda yükseltme (misafir isteği) ----------
function betterRoomFor(g){
  const lv=ROOM_T[state.rooms[g.room].type].lvl, f=roomInfo(g.room).f;
  let best=null, bs=1e9; readyRooms().forEach(id=>{ const L=ROOM_T[state.rooms[id].type].lvl, rf=roomInfo(id).f; if(L<lv||(L===lv&&rf<=f)) return; const sc=(L-lv)*10+rf; if(sc<bs){ bs=sc; best=id; } });
  return best;
}
function upsellFee(g,nid){ const n=Math.max(1,Math.ceil(g.stay/NIGHT_SEC)); return Math.max(r10(roomRate(g.room)*0.5*incomeMult()),Math.round((roomRate(nid)-roomRate(g.room))*n*incomeMult()*1.1)); }
function moveGuest(g,nid){
  standUp(g); const oid=g.room, OR=RT(oid); OR.guest=null; OR.req=null; state.rooms[oid].dirty=true; applyRoomState(oid);
  const NR=RT(nid); NR.guest=g; g.room=nid; g.inRoom=false; g.unpose(); g.asleep=false; g.lastRoomT=ROOM_T[state.rooms[nid].type].name; applyRoomState(nid);
  g.state='toRoom'; const sp=roomSpots(nid); if(!g.goTo(sp.stand.f,sp.stand.x,sp.stand.z,()=>enterRoom(g))){ g.place(sp.stand.x,sp.stand.z,sp.stand.f); enterRoom(g); }
}
function upsellDilemma(g){
  const nid=betterRoomFor(g); if(nid==null) return false; const fee=upsellFee(g,nid), NT=ROOM_T[state.rooms[nid].type];
  if(modalWrap.classList.contains('show')) return false;
  openModal(`<h3>🛎️ Oda ${g.room} <small style="font-size:13px;color:var(--muted)">${g.T.e} ${escH(g.name)}</small></h3>
    <div class="cb them" style="max-width:100%;margin:6px 0 10px">${rand(['Odamın manzarası beklediğim gibi değil, daha iyi bir odaya geçebilir miyim?','Biraz daha geniş bir oda olsa çok iyi olurdu, bir şey yapabilir misiniz?','Üst katlarda boş oda var mı? Manzaralı bir oda istiyorum.'])}</div>
    <button class="btn gold wide" data-u="0">💳 Farkı ödesin, Oda ${nid} (${NT.name}) · +${fmt(fee)} ₺</button>
    <button class="btn wide" data-u="1">🍎 Meyve tabağı gönderelim · ${fmt(r10(roomRate(g.room)*0.1*incomeMult()))} ₺</button>
    <button class="btn ghost wide" data-u="2">🙅 Rezervasyonunuz bu oda için</button>
    <p class="note">Ücretsiz yükseltme yok: misafir isterse farkı öder.</p>`,m=>m.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{ closeModal(); resolveUpsell(g,+b.dataset.u,nid,fee); }));
  fxEmoji(g.x,g.y+2.3,g.z,g.f,'❗'); sfx('req'); return true;
}
function resolveUpsell(g,i,nid,fee){
  if(!guests.includes(g)||g.room==null) return;
  if(i===0){ if(RT(nid).guest||state.rooms[nid].dirty||state.rooms[nid].broken){ toast('Oda artık müsait değil','bad'); return; }
    if(Math.random()<0.75){ state.money+=fee; state.today.rooms+=fee; g.sat=clamp(g.sat+10,0,100); fxText(g.x,g.y+2,g.z,g.f,'+'+fmt(fee)); sfx('coin'); toast(`💳 ${g.name} farkı ödedi (+${fmt(fee)} ₺), Oda ${nid}'e geçiyor`); moveGuest(g,nid); }
    else { g.sat=clamp(g.sat-2,0,100); toast(`💸 ${g.name}: “O kadar ödeyemem, burada kalayım.”`); } }
  else if(i===1){ const c=r10(roomRate(g.room)*0.1*incomeMult()); if(state.money>=c){ state.money-=c; g.sat=clamp(g.sat+6,0,100); fxEmoji(g.x,g.y+2.2,g.z,g.f,'🍎'); } }
  else { g.sat=clamp(g.sat-5,0,100); fxEmoji(g.x,g.y+2.2,g.z,g.f,'😒'); }
  onGameEvent('chat',1); markSave();
}

// ---------- yönetim satırları ----------
function opsHtml(){
  const pol=state.stayPol||'ask', b=(k,l)=>`<button class="btn ${pol===k?'gold':'ghost'}" data-stay="${k}" style="flex:1">${l}</button>`;
  return `<div class="ugh">📜 Otel kuralları</div>
    ${['dog','booze'].map(k=>`<div class="row"><div class="ic">${POLICY[k].no}</div><div class="tx">${POLICY[k].name}<small>${k==='dog'?'Köpekli misafir resepsiyonda geri döner ve yorum yazar':'İçkili misafir şişeyi emanete bırakır ya da geri döner'}</small></div><button class="btn ${ruleOn(k)?'gold':''}" data-rule="${k}">${ruleOn(k)?'Açık':'Kapalı'}</button></div>`).join('')}
    <div class="row"><div class="ic">🗓️</div><div class="tx">1 geceden uzun konaklama<small>Resepsiyon her seferinde sana sorsun mu?</small></div></div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px">${b('ask','Sor')}${b('yes','Hep kabul')}${b('one','Hep 1 gece')}</div>`;
}
function bindOps(root){
  root.querySelectorAll('[data-rule]').forEach(x=>x.onclick=()=>{ state.rules=state.rules||{}; state.rules[x.dataset.rule]=!ruleOn(x.dataset.rule); sfx('click'); markSave(); renderSheet(); });
  root.querySelectorAll('[data-stay]').forEach(x=>x.onclick=()=>{ state.stayPol=x.dataset.stay; sfx('click'); markSave(); renderSheet(); });
}

// ---------- hooks ----------
let boozeT=0;
function updateOps(dt){
  updateAsk(dt);
  boozeT-=dt; if(boozeT<=0){ boozeT=3.5; queue.forEach(g=>{ if(g.booze&&!g.path) fxEmoji(g.x,2.2,g.z,0,'🍾'); }); }
}
