
// =====================================================================
// FAZ 1 · EKONOMİ & ZORLUK: dinamik ün (son 3 gün), yıldıza göre titiz
// misafir, kalıcı yatırımlar (para yutucu), taşınma bonusu, etkinlik
// kaporası ve canlı etkinlik arızaları
// =====================================================================

// ---------- dinamik ün ----------
// her misafir gününe not düşer; gün sonu ün, son 3 günün performans puanına doğru kayar
function perfNote(sat,left){ const t=state.today; if(left){ t.pLeft=(t.pLeft||0)+1; return; } t.pSat=(t.pSat||0)+sat; t.pN=(t.pN||0)+1; }
function dayPerf(t){
  const n=t.pN||0, lf=t.pLeft||0; if(n+lf<2) return null;
  const avg=n?t.pSat/n:40, lr=lf/(n+lf);
  return Math.round(clamp(25+(avg-40)*1.6-lr*90,5,100));
}
function repTarget(){ const H=state.repHist||[]; if(!H.length) return null; return H.reduce((a,b)=>a+b,0)/H.length; }
function repDrift(t){
  const p=dayPerf(t); t.perf=p; if(p==null||state.sandbox) return;
  state.repHist=(state.repHist||[]).concat([p]).slice(-3);
  const tg=repTarget(), before=state.rep; state.rep=clamp(state.rep+(tg-state.rep)*0.3,0,100); t.repDrift=Math.round(state.rep-before);
}
function repTrendHtml(){ const tg=repTarget(); if(tg==null) return ''; const d=tg-state.rep; return ` <small style="font-size:11px;color:${d>2?'#9dffc0':d<-2?'#ff9d8f':'var(--muted)'}">${d>2?'↑':d<-2?'↓':'→'} ${Math.round(tg)}</small>`; }

// ---------- titiz misafir ----------
function expectPen(){ return (stars()-1)*2; }                          // 5★: −8 memnuniyet (dekor/tema ile telafi)
function waitGrace(){ return Math.max(4,10-(stars()-1)*1.5); }           // bekleme toleransı
function reqTime(){ return Math.round(48*(1-0.07*(stars()-1))); }       // istek süresi (5★: ~35 sn)
function wantsView(g){ return stars()>=3&&(g.type==='vip'||g.type==='couple'||g.type==='influencer'||g.type==='business'&&stars()>=4); }
function viewSat(g,id){ if(!wantsView(g)) return 0; const f=roomInfo(id).f; if(f===0){ fxEmoji(g.x,2.7,g.z,0,'🏙️❌'); return -7; } return f>=2?4:2; }

// ---------- kalıcı yatırımlar ----------
const INV={
  chef:   {e:'👨‍🍳',name:'Ödüllü şef',          desc:'Restoran ve kahve geliri',             per:'+%25',cost:[20000,48000,110000]},
  well:   {e:'🧖',name:'Wellness merkezi',     desc:'Havuz, spor salonu ve spa geliri',      per:'+%25',cost:[24000,55000,125000]},
  suite:  {e:'🛁',name:'Süit yenileme',        desc:'Suit oda fiyatları',                   per:'+%10',cost:[30000,70000,160000]},
  ads:    {e:'🌍',name:'Uluslararası tanıtım', desc:'Misafir akışı',                        per:'+%8', cost:[26000,60000,140000]},
  acad:   {e:'🎓',name:'Personel akademisi',   desc:'Günlük maaşlar',                       per:'−%7', cost:[22000,52000,120000]}};
function invLv(k){ return (state.inv&&state.inv[k])||0; }
function invCost(k){ const c=INV[k].cost[invLv(k)]; return c==null?null:Math.round(c*cm()); }
function invAmen(a){ return a==='rest'||a==='cafe'?1+0.25*invLv('chef'):a==='pool'||a==='gym'||a==='spa'?1+0.25*invLv('well'):1; }
function invRate(id){ return state.rooms[id]&&state.rooms[id].type==='suite'?1+0.1*invLv('suite'):1; }
function invDemand(){ return 1+0.08*invLv('ads'); }
function invWage(){ return 1-0.07*invLv('acad'); }
function buyInv(k){ const c=invCost(k); if(stars()<4||!spend(c)) return; state.inv=state.inv||{}; state.inv[k]=invLv(k)+1; sfx('build'); if(!state.lowFx) confettiAt(player.x,player.y+2,player.z,60);
  banner(`${INV[k].e} ${INV[k].name} ${state.inv[k]}. seviye`,`${INV[k].desc} ${INV[k].per}`); onGameEvent('upg',1); save(); renderSheet(); }
function invHtml(){
  let h=`<div class="ugh">🏗️ Büyük yatırımlar${stars()<4?' · 🔒 4★':''}</div>`;
  for(const k in INV){ const X=INV[k], lv=invLv(k), c=invCost(k);
    h+=`<div class="row" style="${stars()<4?'opacity:.55':''}"><div class="ic">${X.e}</div><div class="tx">${X.name} <span style="color:var(--gold2)">${lv}/3</span><small>${X.desc} ${X.per} her seviyede</small>${pips(lv,3)}</div>${c==null?'<button class="btn" disabled>Maks</button>':`<button class="btn gold" data-inv="${k}" ${stars()<4||state.money<c?'disabled':''}>${fmt(c)} ₺</button>`}</div>`; }
  return h;
}
function bindInv(root){ root.querySelectorAll('[data-inv]').forEach(b=>b.onclick=()=>buyInv(b.dataset.inv)); }
// taşınırken paranın %10'u (şehir başına tavanlı) yeni şehre sermaye olur
function moveCarry(){ return Math.max(0,Math.round(Math.min(state.money*0.1,6000*cm()))); }

// ---------- etkinlik kaporası ----------
function eventDeposit(rew){ return r10(rew*0.15); }

// ---------- canlı etkinlik arızaları ----------
const INC={wedding:['🎤 Mikrofon cızırdıyor!','🎂 Pasta devrilmek üzere!','💡 Işıklar söndü!'],conf:['📽️ Projektör bozuldu!','🔌 Ses sistemi gitti!','☕ Kahve bitti!'],concert:['🔊 Hoparlör sustu!','⚡ Sahne elektriği kesildi!','🎸 Amfi yandı!']};
let incT=40;
function updateIncidents(dt){
  const L=state.live; if(!L||!live3){ incT=rnd(35,60); return; }
  const V=live3.V;
  if(!L.inc){ incT-=dt; if(incT<=0){ incT=rnd(55,95); L.inc={t:22,fix:0,txt:rand(INC[L.k])}; banner(L.inc.txt,'Etkinliğe koş ve düzelt · 22 sn'); sfx('alarm'); fxEmoji(V.x,2.6,V.z,0,'⚠️'); } return; }
  const I=L.inc, near=player.f===0&&Math.hypot(player.x-V.x,player.z-(V.z+1))<3.2;
  if(near){ I.fix+=dt; if((live3.fxI=(live3.fxI||0)-dt)<=0){ live3.fxI=0.35; sfx('fix'); } if(I.fix>=2){ L.inc=null; L.hype=clamp((L.hype||0)+0.15,0,1); toast('🔧 Arıza giderildi! Coşku arttı'); sfx('sparkle'); fxEmoji(V.x,2.4,V.z,0,'✅'); state.stats.incFix=(state.stats.incFix||0)+1; } }
  I.t-=dt;
  if(L.inc&&I.t<=0){ L.inc=null; L.hype=clamp((L.hype||0)-0.35,0,1); L.left*=0.8; changeRep(-1); toast('😞 Arıza giderilmedi: kazanç −%20, coşku düştü','bad'); sfx('fail'); }
}
function incHtml(){ const I=state.live&&state.live.inc; return I?`<span style="color:#ff9d8f">⚠️ ${Math.ceil(I.t)} sn</span>`:''; }
