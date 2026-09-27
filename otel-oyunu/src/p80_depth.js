
// =====================================================================
// DEPTH 1: price policy, rival hotel, supplies & delivery truck,
// loyal guests, bank loan
// =====================================================================

// ---------- price policy ----------
const PRICES=[0.8,0.9,1,1.2,1.5];
function priceMult(){ return state.price||1; }
function priceDemand(){ const p=priceMult(); return p<=1?1+(1-p)*1.5:Math.max(0.35,1-(p-1)*1.3*(1-0.5*skillLv('m4'))); }
function priceSat(){ const p=priceMult(); return p<1?(1-p)*30:-(p-1)*25; }
function priceTypeW(k){ const p=priceMult();
  if(p>1.1) return ({vip:1.7,business:1.6,couple:1.5,million:1.5,student:0.5,tourist:0.6})[k]||1;
  if(p<0.95) return ({student:1.6,tourist:1.4,family:1.3,vip:0.6,business:0.8})[k]||1;
  return 1; }
function setPrice(p){ state.price=p; sfx('click'); toast(`💲 Oda fiyatları artık %${Math.round(p*100)}`); markSave(); renderSheet(); }

// ---------- rival hotel across the street ----------
const RIVAL_NAMES=['Gri Kule Otel','Ekonomik Palas','Neon Suites','Beton Rezidans','Konfor Inn'];
let rivalVis=null;
function rivalOn(){ return !!state.rival&&!state.rival.bought; }
function rivalPull(){ const r=state.rival; if(!rivalOn()) return 0;
  return clamp(0.1+(r.q-state.rep)/250+(priceMult()-r.price)*0.35+(r.promo===state.day?0.12:0),0,0.42)*(1-0.3*skillLv('m3')); }
function rivalBuyCost(){ const r=state.rival; return r?Math.round(22000*cm()*(r.q/60)):0; }
function buildRival(){
  if(rivalVis){ rivalVis.parent.remove(rivalVis); rivalVis=null; } const r=state.rival; if(!r) return;
  const g=new THREE.Group(); g.position.set(-26.5,0,6); g.rotation.y=-3*Math.PI/4; outdoor.add(g); rivalVis=g;   /* otelin solunda, otele bakar */ const S=new THREE.Group();
  const body=mat(r.bought?0xf2e6d2:0x5d6776), trim=r.bought?M.trim:mat(0x4b5563), glass=mat(0x9fb8cc,{metalness:.4,roughness:.15,emissive:0x223344,emissiveIntensity:.3});
  S.add(mesh(box(12,7.5,6),body,0,3.75,0,true)); S.add(mesh(box(12.3,0.3,6.3),trim,0,7.6,0,true));
  for(let f=0;f<3;f++){ for(let i=0;i<6;i++){ if(!(f===0&&(i===2||i===3))) S.add(mesh(box(1.2,1.1,0.05),glass,-4.5+i*1.8,1.6+f*2.2,-3.02)); S.add(mesh(box(1.2,1.1,0.05),glass,-4.5+i*1.8,1.6+f*2.2,3.02)); }
    for(let i=0;i<3;i++){ S.add(mesh(box(0.05,1.1,1.2),glass,-6.02,1.6+f*2.2,-1.8+i*1.8)); S.add(mesh(box(0.05,1.1,1.2),glass,6.02,1.6+f*2.2,-1.8+i*1.8)); } }
  S.add(mesh(box(2.2,2.2,0.08),mat(0x2b2f36),0,1.1,-3.02)); S.add(mesh(box(3.2,0.12,1.2),trim,0,2.45,-3.5));
  g.add(bake(S));
  const sign=signPlane(r.bought?`${hotelName()} Annex`:r.name,5,0.8,{fg:r.bought?'#ffd76a':'#e8eef5',stroke:'#1f2733',strokeW:8,font:'800 90px "Baloo 2"',fit:true});
  sign.position.set(0,6.6,-3.08); sign.rotation.y=Math.PI; g.add(sign);
}
function rivalDayEnd(){
  if(!state.rival&&state.tut>=TUT.length&&!state.sandbox&&state.day>=(state.prestige?3:6)&&nRoomsNow()>=6){
    state.rival={name:rand(RIVAL_NAMES),q:Math.round(38+stars()*7+rnd(-4,6)),price:1,promo:0,bought:false}; buildRival();
    setTimeout(()=>{ banner(`🏢 Rakip otel açıldı: ${state.rival.name}`,'Hemen yanı başında! Misafirlerini kapmaya çalışacak · Yönetim › Otel'); sfx('alarm'); },3600); return; }
  const r=state.rival; if(!rivalOn()) return;
  r.q=Math.round(clamp(r.q+(state.rep*0.8+22-r.q)*0.15+rnd(-3,4),25,95)); r.price=rand([0.85,0.9,1,1,1.1]);
  if(Math.random()<0.2){ r.promo=state.day; setTimeout(()=>toast(`📉 ${r.name} bugün büyük indirimde! Misafir kaybın artabilir`,'bad'),4000); }
}
function buyRival(){ const r=state.rival; if(!rivalOn()||stars()<4||!spend(rivalBuyCost())) return;
  r.bought=true; buildRival(); banner('🤝 Rakip otel artık senin!',`${hotelName()} Annex · tüm gelirler +%10`); sfx('star'); confettiAt(player.x,player.y+2,player.z,90); onGameEvent('rival',1); save(); renderSheet(); }
function spawnPasser(){
  const from=Math.random()<.5?L.spawnL:L.spawnR, e=new Ent(LOOKS.guest(rand(['tourist','business','student','family']))); e.place(from.x,from.z,0); e.speed=2.3;
  e.path=[{x:-19,z:12.2+rnd(-0.2,0.2),f:0},{x:-22.3,z:9.8,f:0},{x:-24.1+rnd(-0.3,0.3),z:8.3,f:0}]; e.pi=0; e.onArrive=()=>e.remove();
  if(Math.random()<0.5) fxEmoji(from.x,2.2,from.z,0,'🏢');
}

// ---------- supplies & delivery truck ----------
function stockCap(){ return 40+20*skillLv('o3'); }
function stockHas(it){ return it==='food'||!state.stock||(state.stock[it]||0)>0; }
function useStock(it){ if(it==='food'||!state.stock) return; state.stock[it]=Math.max(0,(state.stock[it]||0)-1);
  if(state.stock[it]===0){ toast(`📦 Depoda ${ITEMS[it].name.toLowerCase()} bitti! Yönetim › Otel'den sipariş ver`,'bad'); } }
function orderCost(){ return Math.round(70*cm()); }
let truck=null;
function orderSupply(auto){
  if(state.order||(!auto&&!spend(orderCost()))) return false;
  if(auto){ if(state.money<orderCost()) return false; state.money-=orderCost(); }
  state.order={t:22}; if(!auto){ sfx('click'); toast('🚚 Sipariş verildi, tedarik kamyonu yolda'); } markSave(); if(sheetMode) renderSheet(); return true;
}
function buildTruck(){
  const g=new THREE.Group(), body=mat(0xf4efe6,{roughness:.5}), cab=mat(0x2e86c1,{metalness:.3,roughness:.4});
  g.add(mesh(rbox(3.0,1.6,1.3,.08),body,-0.4,1.1,0,true)); g.add(mesh(rbox(1.1,1.2,1.25,.12),cab,1.6,0.9,0,true)); g.add(mesh(box(0.05,0.55,1.0),mat(0x22303c,{metalness:.6,roughness:.1}),2.16,1.15,0));
  [-1.3,0.4,1.6].forEach(x=>[-0.62,0.62].forEach(z=>{ const w=mesh(cyl(0.28,0.28,0.18,14),M.dark,x,0.28,z); w.rotation.x=Math.PI/2; g.add(w); }));
  const sg=signPlane('TEDARİK 📦',2.2,0.5,{fg:'#2d5d8a',font:'800 70px "Baloo 2"'}); sg.position.set(-0.4,1.2,0.66); g.add(sg);
  const sh=blob(1.9); sh.scale.set(1,0.4,1); g.add(sh); return g;
}
function updateSupply(dt){
  if(!built('depo')) return;
  if(!state.stock) state.stock={paper:25,towel:25};
  if(state.autoOrder&&!state.order&&(state.stock.paper<8||state.stock.towel<8)) orderSupply(true);
  const o=state.order; if(!o) return;
  o.t-=dt;
  if(o.t<=8&&!truck){ truck={g:buildTruck(),phase:'in',t:0}; truck.g.position.set(-50,0,14.6); outdoor.add(truck.g); }
  if(truck){ const g=truck.g;
    if(truck.phase==='in'){ const d=-6-g.position.x; g.position.x+=Math.min(d,clamp(d*0.9,1,9)*dt); if(d<0.05){ truck.phase='stop'; truck.t=0; } }
    else if(truck.phase==='stop'){ truck.t+=dt; if(truck.t>1.2&&state.order){ const c=stockCap(); state.stock.paper=c; state.stock.towel=c; state.order=null; sfx('build'); toast('📦 Tedarik geldi: depo doldu'); sparkleAt(-6,1,6.1); markSave(); } if(truck.t>2.6) truck.phase='out'; }
    else { g.position.x+=8*dt; if(g.position.x>60){ outdoor.remove(g); truck=null; } } }
  if(o&&o.t<=-30){ state.order=null; }   // safety
}

// ---------- loyal guests ----------
function noteLoyal(g){
  if(g.type==='insp'||g.type==='million'||g.sat<80||Math.random()>0.4) return; state.loyal=state.loyal||[];
  if(state.loyal.some(x=>x.n===g.name)) return; state.loyal.push({n:g.name,t:g.type}); if(state.loyal.length>15) state.loyal.shift();
  fxEmoji(g.x,g.y+2.5,g.z,g.f,'💌');
}
function tryLoyalSpawn(){
  const Lq=state.loyal; if(!Lq||!Lq.length||Math.random()>0.12) return false;
  const x=Lq.splice(Math.floor(Math.random()*Lq.length),1)[0];
  const g=spawnGuest(x.t); g.name=x.n; g.loyal=true; g.patMax=g.pat=g.patMax*1.3;
  setTimeout(()=>{ if(queue.length<9){ const f=spawnGuest(x.t); f.loyal=true; } },900);
  toast(`💌 Sadık misafirin ${x.n} bir arkadaşıyla geri geldi!`); sfx('sparkle'); onGameEvent('loyal',1); markSave(); return true;
}

// ---------- bank loan ----------
function loanOffer(){ return r10(900*cm()*Math.max(1,stars())); }
function takeLoan(){ if(state.loan) return; const a=loanOffer(); state.loan={left:a}; state.money+=a; coinsFly(player.x,1,player.z,player.f,a); sfx('coin'); toast(`🏦 ${fmt(a)} ₺ kredi çekildi · günlük %3 faiz`); save(); renderSheet(); }
function repayLoan(){ const L0=state.loan; if(!L0) return; const p=Math.min(L0.left,Math.max(0,Math.floor(state.money))); if(p<=0) return; state.money-=p; L0.left-=p; if(L0.left<=0.5){ state.loan=null; toast('🏦 Kredi tamamen ödendi!'); sfx('star'); } save(); renderSheet(); }

// ---------- day end (called before the report is made) ----------
function depthDayEnd(){
  const t=state.today;
  if(state.loan){ const i=Math.round(state.loan.left*0.03); state.money-=i; t.interest=i; }
  if(state.money<0){ state.negDays=(state.negDays||0)+1; if(state.negDays>=3){ changeRep(-5); setTimeout(()=>toast('🏦 Borçlar birikti, itibarın zedelendi · −5 ün','bad'),2500); state.negDays=0; } } else state.negDays=0;
  t.chainInc=chainIncome(); if(t.chainInc) state.money+=t.chainInc;
  rivalDayEnd(); careerDayEnd();
}

// ---------- hotel tab UI ----------
function depthHtml(){
  let h=`<div class="ugh">💲 Fiyat politikası</div><div class="row" style="flex-wrap:wrap"><div class="ic">💲</div><div class="tx">Oda fiyatı %${Math.round(priceMult()*100)}<small>Yüksek fiyat: daha az ama zengin misafir, memnuniyet düşer · düşük fiyat: kalabalık ve öğrenci/turist</small></div>
    <div class="agrid" style="width:100%;justify-content:flex-end">${PRICES.map(p=>`<button class="btn ${priceMult()===p?'':'ghost'} abtn" data-price="${p}">%${Math.round(p*100)}</button>`).join('')}</div></div>`;
  const r=state.rival;
  if(r){ h+=`<div class="ugh">🏢 Rakip otel</div>`;
    if(r.bought) h+=`<div class="row"><div class="ic">🤝</div><div class="tx">${escH(hotelName())} Annex<small>Rakibi satın aldın · tüm gelirler +%10</small></div></div>`;
    else h+=`<div class="row"><div class="ic">🏢</div><div class="tx">${escH(r.name)} · kalite ${r.q}<small>Fiyatı %${Math.round(r.price*100)}${r.promo===state.day?' · bugün indirimde!':''} · senden kaçan misafir ~%${Math.round(rivalPull()*100)} · ünün yükseldikçe ve fiyatın düştükçe azalır</small></div>
      <button class="btn gold" data-rivalbuy ${stars()<4||state.money<rivalBuyCost()?'disabled':''}>${stars()<4?'4★ gerekli':'Satın al<br>'+fmt(rivalBuyCost())+' ₺'}</button></div>`; }
  if(built('depo')){ const s=state.stock||{paper:25,towel:25}, c=stockCap();
    h+=`<div class="ugh">📦 Tedarik</div><div class="row"><div class="ic">📦</div><div class="tx">Depo: 🧻 ${s.paper}/${c} · 🧺 ${s.towel}/${c}<small>${state.order?'🚚 Kamyon yolda…':'Stok bitince misafir isteklerini karşılayamazsın'}</small></div>
      <div style="display:flex;flex-direction:column;gap:4px"><button class="btn" data-order ${state.order||state.money<orderCost()?'disabled':''}>Sipariş<br>${fmt(orderCost())} ₺</button>
      ${state.autoOrder?'<button class="btn" disabled>Oto ✓</button>':`<button class="btn gold" data-autoorder ${state.money<Math.round(600*cm())?'disabled':''}>Oto sipariş<br>${fmt(Math.round(600*cm()))} ₺</button>`}</div></div>`; }
  h+=`<div class="ugh">🏦 Banka</div>`+(state.loan?`<div class="row"><div class="ic">🏦</div><div class="tx">Kalan borç ${fmt(state.loan.left)} ₺<small>Her sabah %3 faiz (${fmt(Math.round(state.loan.left*0.03))} ₺) · 3 gün eksi bakiyede kalırsan ün kaybedersin</small></div><button class="btn gold" data-repay ${state.money<1?'disabled':''}>Öde</button></div>`
    :`<div class="row"><div class="ic">🏦</div><div class="tx">Kredi çek: ${fmt(loanOffer())} ₺<small>Hızlı büyümek için · günlük %3 faiz</small></div><button class="btn" data-loan>Çek</button></div>`);
  return h;
}
function bindDepth(sh){
  sh.querySelectorAll('[data-price]').forEach(b=>b.onclick=()=>setPrice(+b.dataset.price));
  const q=s=>sh.querySelector(s);
  if(q('[data-rivalbuy]')) q('[data-rivalbuy]').onclick=buyRival;
  if(q('[data-order]')) q('[data-order]').onclick=()=>orderSupply(false);
  if(q('[data-autoorder]')) q('[data-autoorder]').onclick=()=>{ if(!spend(Math.round(600*cm()))) return; state.autoOrder=true; sfx('build'); toast('📦 Otomatik sipariş açıldı'); save(); renderSheet(); };
  if(q('[data-loan]')) q('[data-loan]').onclick=takeLoan;
  if(q('[data-repay]')) q('[data-repay]').onclick=repayLoan;
}

// ---------- hooks ----------
function updateDepth(dt){ updateSupply(dt); }
function bootDepth(){
  if(state.rival) buildRival();
  if(built('depo')&&!state.stock) state.stock={paper:25,towel:25};
  if(state.order) state.order.t=Math.min(state.order.t,12);
  tagAdd({kind:'spot',get:()=>built('depo')&&state.stock?{x:L.shelf.paper.x+0.5,z:L.shelf.paper.z,f:0}:null,iconF:()=>`🧻${state.stock.paper}`,cls:'small',y:2.0});
  tagAdd({kind:'spot',get:()=>built('depo')&&state.stock?{x:L.shelf.towel.x+0.5,z:L.shelf.towel.z,f:0}:null,iconF:()=>`🧺${state.stock.towel}`,cls:'small',y:2.0});
}
