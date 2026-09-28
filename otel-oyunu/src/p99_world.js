
// =====================================================================
// MG6-3 · YAŞAYAN DÜNYA: takvim (yaz akını, kış kayak turu, bayram tatili,
// ramazan: iftar/sahur), şehir haberleri (maç/konser/fuar), büyüyen rakip +
// fiyat savaşı, esnaf ortaklıkları (karşı kaldırımda simitçi, taksi…)
// =====================================================================
// ---------- takvim ----------
// 24 günlük döngü: 7 gün ramazan (gün 15-21), hemen ardından 3 gün bayram (gün 22-24)
function calPhase(day=state.day){ const d=((day-1)%24)+1; return d>=22?'bayram':d>=15&&d<=21?'ramazan':null; }
function seasonTourism(){ const si=seasonIx(), c=city(); if(si===1&&c.palm) return {e:'🏖️',n:'Yaz akını',dem:1.3,w:{tourist:1.6,family:1.5}};
  if(si===3&&c.snow) return {e:'⛷️',n:'Kayak sezonu',dem:1.15,w:{athlete:1.8,couple:1.3}}; return null; }
// ---------- şehir haberleri ----------
const NEWS=[{k:'mac',e:'⚽',n:'Derbi maçı var',d:'Taraftarlar ve sporcular şehirde: gürültü artar',dem:1.25,w:{student:1.8,athlete:1.8}},
  {k:'konser',e:'🎤',n:'Büyük konser',d:'Fenomenler ve gençler akın ediyor',dem:1.3,w:{influencer:2.2,student:1.5}},
  {k:'fuar',e:'💼',n:'Uluslararası fuar',d:'İş insanları geliyor, fiyata daha az bakarlar',dem:1.2,w:{business:2.5,vip:1.3},price:1.1},
  {k:'kongre',e:'🩺',n:'Tıp kongresi',d:'Sakin ve bol bahşişli misafirler',dem:1.1,w:{business:1.6,elderly:1.4}}];
// haberler 2 gün önceden planlanır (takvim şeridi önceden gösterebilsin)
function rollNews(){ if(state.tut<TUT.length||state.sandbox) return; const P=state.newsPlan=state.newsPlan||{};
  for(let d=state.day;d<=state.day+2;d++) if(P[d]===undefined) P[d]=Math.random()<0.4?rand(NEWS).k:null;
  for(const k in P) if(+k<state.day) delete P[k];
  state.news=P[state.day]?{k:P[state.day],day:state.day}:null; const N=newsToday(); if(N) setTimeout(()=>banner(`${N.e} Şehirde bugün: ${N.n}`,N.d),5200); }
function newsFor(d){ const k=(state.newsPlan||{})[d]; return k?NEWS.find(x=>x.k===k):null; }
function newsToday(){ const N=state.news; return N&&N.day===state.day?NEWS.find(x=>x.k===N.k):null; }
// ---------- toplam etkiler ----------
function worldDemand(){ let f=prjDemand(); const ph=calPhase(), st=seasonTourism(), N=newsToday(); if(ph==='bayram') f*=1.4; if(st) f*=st.dem; if(N) f*=N.dem; return f; }
function worldTypeW(k){ let w=1; const ph=calPhase(), st=seasonTourism(), N=newsToday(); if(ph==='bayram') w*=({family:1.8,elderly:1.4})[k]||1; if(st) w*=st.w[k]||1; if(N) w*=N.w[k]||1; return w; }
function worldPriceTol(){ const N=newsToday(); return N&&N.price||1; }
function iftarOn(){ const h=hourNow(); return calPhase()==='ramazan'&&h>=19&&h<21; }
function sahurOn(){ const h=hourNow(); return calPhase()==='ramazan'&&h>=3.5&&h<5; }
function roofBarOn(){ const h=hourNow(); return h>=19.5&&roofOpen(); }   // akşam: çatı gece barı
function worldAmenBonus(a){ return a==='rest'&&(iftarOn()||sahurOn())?1.6:a==='roof'&&roofBarOn()?1.5:1; }
function worldLabel(){ const ph=calPhase(), st=seasonTourism(), N=newsToday(), L2=[]; if(ph==='bayram') L2.push('🎊 Bayram tatili'); if(ph==='ramazan') L2.push(iftarOn()?'🌙 İftar vakti':sahurOn()?'🌙 Sahur':'🌙 Ramazan'); if(st) L2.push(st.e+' '+st.n); if(N) L2.push(N.e+' '+N.n); return L2; }
let iftarShown=-1, sahurShown=-1, barShown=-1;
function updateCalendar(){
  if(roofBarOn()&&barShown!==state.day&&state.tut>=TUT.length){ barShown=state.day; toast('🍸 Çatı gece barı açıldı: misafirler çatıya çıkıyor, çatı geliri +%50'); }
  if(iftarOn()&&iftarShown!==state.day){ iftarShown=state.day; banner('🌙 İftar vakti','Misafirler restorana akın ediyor · restoran geliri +%60'); guests.forEach(g=>{ if(g.state==='room'&&!g.asleep&&Math.random()<0.5){ g.amenT=0; g.T.likes; } }); }
  if(sahurOn()&&sahurShown!==state.day){ sahurShown=state.day; toast('🌙 Sahur vakti: oda servisi siparişleri artıyor'); guests.forEach(g=>{ if(g.state==='room'&&Math.random()<0.3){ g.reqT=0; } }); }
}
function worldHtml(){ const L2=worldLabel(); const d=((state.day-1)%24)+1;
  return `<div class="ugh">🗓️ Şehir takvimi</div><div class="row"><div class="ic">📰</div><div class="tx">${L2.length?L2.join(' · '):'Sakin bir gün'}<small>${calPhase()==='ramazan'?`Bayram: ${22-d} gün sonra`:calPhase()?'':`Ramazan: ${15-d} gün sonra, ardından bayram`} · bayramda aileler, ramazanda iftar/sahur, yazın sahil, kışın kayak</small></div></div>`; }

// ---------- rakip: büyür + fiyat savaşı ----------
function rivalFloors(){ const r=state.rival; return r?clamp(2+Math.floor(r.q/25),2,5):0; }
function priceWarOn(){ return state.priceWar===state.day; }
function priceWarAsk(){ const r=state.rival; if(!rivalOn()||r.promo!==state.day||state.priceWarAsked===state.day) return; state.priceWarAsked=state.day;
  setTimeout(()=>openModal(`<h3>📉 Fiyat savaşı!</h3><p class="sub">${escH(r.name)} bugün büyük indirim yaptı. Misafirlerini kapmaya çalışıyor.</p>
    <button class="btn gold wide" id="pwY">⚔️ Karşılık ver: bugün fiyatlar −%10, müşteri kaybı yok</button><button class="btn ghost wide" id="pwN">😌 Boş ver (bugün daha çok misafir kaybedersin)</button>`,m=>{
    m.querySelector('#pwY').onclick=()=>{ state.priceWar=state.day; closeModal(); toast('⚔️ Fiyat savaşına girdin: bugün −%10'); markSave(); }; m.querySelector('#pwN').onclick=closeModal; }),6000); }
function priceWarMul(){ return priceWarOn()?0.9:1; }
function priceWarPull(){ return priceWarOn()?0.3:1; }

// ---------- esnaf ortaklıkları ----------
const SHOPS={simit:{e:'🥯',n:'Simitçi',d:'Sabahları misafirler +2 memnuniyet · günlük pay',cost:900,inc:40,x:-6.5},
  taksi:{e:'🚕',n:'Taksi durağı',d:'Sıradaki misafirler %10 daha sabırlı · günlük pay',cost:1400,inc:55,x:-1.5},
  hediye:{e:'🧿',n:'Hediyelik eşya',d:'Mutlu ayrılan misafir hediyelik alır · satış payı',cost:1800,inc:0,x:3.5},
  dondurma:{e:'🍦',n:'Dondurmacı',d:'Yazın ve sıcakta kuyruk sabrı +%10 · günlük pay',cost:1100,inc:45,x:8.5}};
function shopOn(k){ return !!(state.shops&&state.shops[k]); }
function shopCost(k){ return r10(SHOPS[k].cost*cm()); }
function buyShop(k){ const c=shopCost(k); if(shopOn(k)||!spend(c)) return; state.shops=state.shops||{}; state.shops[k]=true; buildShops(); sfx('build'); toast(`${SHOPS[k].e} ${SHOPS[k].n} ile anlaşma yapıldı`); save(); renderSheet(); }
function shopPatMul(){ let m=1; if(shopOn('taksi')) m*=0.9; if(shopOn('dondurma')&&(seasonIx()===1||wxEv('heat'))) m*=0.9; return m; }
function shopCheckout(g,mood){ if(mood==='happy'&&shopOn('hediye')&&Math.random()<0.5){ const a=r10(15*incomeMult()); state.money+=a; state.today.amen+=a; fxEmoji(g.x,g.y+2.6,g.z,g.f,'🧿'); } }
function shopMorning(g){ if(shopOn('simit')&&hourNow()<11) return 2; return 0; }
function shopsDayEnd(t){ let s=0; for(const k in SHOPS) if(shopOn(k)) s+=r10(SHOPS[k].inc*cm()); if(s){ state.money+=s; t.amen+=s; } }
let shopG=null;
function buildShops(){
  if(shopG){ outdoor.remove(shopG); shopG=null; } if(!state.shops) return; const g=new THREE.Group(); outdoor.add(g); shopG=g;
  for(const k in SHOPS){ if(!shopOn(k)) continue; const S=SHOPS[k], x=S.x, z=18.4, c=({simit:0xc0392b,taksi:0xf2c14e,hediye:0x2e86c1,dondurma:0xff7aa8})[k];
    if(k==='taksi'){ const car=new THREE.Group(); car.add(mesh(rbox(1.95,0.44,0.95,.16),mat(0xf2c14e,{metalness:.4,roughness:.3}),0,0.4,0,true)); car.add(mesh(rbox(1.08,0.38,0.86,.15),mat(0x22303c,{metalness:.6,roughness:.12}),-0.12,0.76,0,true));
      car.add(mesh(box(0.4,0.14,0.2),mat(0x222222),-0.1,1.02,0)); [-0.62,0.62].forEach(a=>[-0.44,0.44].forEach(b=>{ const w=mesh(cyl(0.18,0.18,0.14,12),M.dark,a,0.18,b); w.rotation.x=Math.PI/2; car.add(w); })); car.position.set(x,0,z-1.1); g.add(car);
      g.add(mesh(cyl(0.04,0.04,2.2,6),M.dark,x+1.3,1.1,z)); const sg=signPlane('🚕 TAKSİ',0.9,0.35,{bg:'#f2c14e',fg:'#222',font:'800 56px "Baloo 2"'}); sg.position.set(x+1.3,2.2,z+0.03); sg.rotation.y=Math.PI; g.add(sg); continue; }
    g.add(mesh(rbox(1.2,0.9,0.7,.05),mat(0xf6f1e6),x,0.6,z,true)); [-0.45,0.45].forEach(d=>{ const w=mesh(cyl(0.2,0.2,0.08,12),M.dark,x+d,0.2,z-0.36); w.rotation.x=Math.PI/2; g.add(w); });
    g.add(mesh(cyl(0.03,0.03,1.3,6),M.white,x,1.5,z)); g.add(mesh(cone(0.8,0.35,10),mat(c),x,2.2,z,true));
    const sg=signPlane(`${S.e} ${S.n}`,1.2,0.3,{bg:'#'+c.toString(16).padStart(6,'0'),fg:'#fff',font:'800 50px "Baloo 2"',fit:true}); sg.position.set(x,1.2,z-0.37); sg.rotation.y=Math.PI; g.add(sg); }
}
function shopsHtml(){ let h=`<div class="ugh">🤝 Esnaf ortaklıkları</div>`; for(const k in SHOPS){ const S=SHOPS[k], on=shopOn(k), c=shopCost(k);
  h+=`<div class="row"><div class="ic">${S.e}</div><div class="tx">${S.n}<small>${S.d}${S.inc?` (${fmt(r10(S.inc*cm()))} ₺/gün)`:''}</small></div>${on?'<button class="btn" disabled>Ortak ✓</button>':`<button class="btn gold" data-shop="${k}" ${state.money<c?'disabled':''}>${fmt(c)} ₺</button>`}</div>`; } return h; }
function bindWorld(root){ root.querySelectorAll('[data-shop]').forEach(b=>b.onclick=()=>buyShop(b.dataset.shop)); }

// ---------- hooks ----------
function worldDayEnd(t){ rollNews(); shopsDayEnd(t); nooksDayEnd(t); prjDayEnd(t); const r=state.rival; if(r&&rivalVis&&rivalVis.userData.nf!==rivalFloors()) buildRival(); priceWarAsk(); if(calPhase()==='bayram'&&((state.day-1)%24)+1===22) setTimeout(()=>banner('🎊 Bayram tatili başladı!','3 gün boyunca aileler akın ediyor'),6500); if(calPhase()==='ramazan'&&((state.day-1)%24)+1===15) setTimeout(()=>banner('🌙 Ramazan geldi','İftar ve sahurda restoran ve oda servisi yoğun'),6500); }
// ---------- takvim şeridi (HUD): bugün + 2 gün ----------
let calEl=null, calT=0;
function calDayChips(d){ const c=[], ph=calPhase(d), N=d===state.day?newsToday():newsFor(d); if(ph==='bayram') c.push('🎊'); if(ph==='ramazan') c.push('🌙'); if(N) c.push(N.e); if(d===state.day){ const st=seasonTourism(); if(st) c.push(st.e); } return c; }
function calStripHtml(){ const days=[0,1,2].map(i=>state.day+i), lab=['Bugün','Yarın','+2 gün']; if(!days.some(d=>calDayChips(d).length)) return '';
  return days.map((d,i)=>{ const c=calDayChips(d); return `<span class="cd${i?'':' now'}"><b>${lab[i]}</b>${c.length?c.join(''):'·'}</span>`; }).join(''); }
function updateCalStrip(dt){ calT-=dt; if(calT>0) return; calT=1;
  if(!calEl){ calEl=document.createElement('div'); calEl.id='calStrip'; calEl.setAttribute('role','button'); calEl.setAttribute('aria-label','Şehir takvimi'); document.getElementById('hud').appendChild(calEl);
    calEl.onclick=()=>{ sfx('click'); mgmtTab='hotel'; hotelSub='city'; openSheet('mgmt'); }; }
  const h=(state.tut<TUT.length||fpMode||sheetMode)?'':calStripHtml(); if(calEl._h!==h){ calEl._h=h; calEl.innerHTML=h; calEl.style.display=h?'flex':'none'; } }
function updateWorld(dt){ updateCalendar(); updateCalStrip(dt); }
function bootWorld(){ buildShops(); if(!state.newsPlan&&state.tut>=TUT.length&&!state.sandbox){ state.newsPlan={}; if(state.news&&state.news.day===state.day) state.newsPlan[state.day]=state.news.k; rollNews(); } }
