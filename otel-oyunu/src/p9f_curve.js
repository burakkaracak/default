// =====================================================================
// MG11-D1: 3★ sonrası zorluk eğrisi — kriz sıklığı/çifte kriz, rakip reklam
// kampanyası (sabah brifinginden karşı kampanya), düşük moralde istifa
// (sabah brifinginden geri kazanma). Hepsi 4★+ ve sandbox dışında.
// =====================================================================
function curveOn(){ return stars()>=4&&!state.sandbox&&state.tut>=TUT.length; }
// ---------- kriz eğrisi ----------
function crisisGapDays(){ return curveOn()?1:2; }                                   // krizler arası en az gün
function crisisChance(){ return curveOn()?(stars()>=5?0.65:0.55):0.4; }             // gün sonunda kriz planlama şansı
function planSecondCrisis(k){ if(!curveOn()||stars()<5||Math.random()>0.35) return; const opts=['power','flood'].filter(x=>x!==k); state.crisisDue2=rand(opts); }
function updateCurve(dt){ curveT-=dt; if(curveT>0) return; curveT=2;
  if(state.crisisDue2&&!state.crisis&&!state.crisisDue){ const h=hourNow(); if(h>=11&&h<17){ state.crisisDue=state.crisisDue2; state.crisisDue2=null; toast('⚠️ Aynı gün ikinci bir kriz kapıda!','bad'); } } }
let curveT=0;
// ---------- rakip reklam kampanyası ----------
function rivalAdOn(){ const A=state.rivalAd; return !!(A&&!A.countered&&state.day>=A.from&&state.day<=A.to&&rivalOn()); }
function rivalAdPull(){ return rivalAdOn()?0.1:0; }                                  // rivalPull'a eklenir
function adDemandMul(){ return rivalAdOn()?0.9:1; }                                  // worldDemand çarpanı
function adCounterCost(){ return r10(4000*cm()*(stars()>=5?1.3:1)); }
function counterAd(){ const A=state.rivalAd; if(!A||A.countered||!spend(adCounterCost())) return false; A.countered=true; changeRep(1); toast('📣 Karşı kampanya yayında · rakibin reklamı etkisiz'); onGameEvent('counterAd',1); return true; }
// ---------- istifa ----------
function resignCost(kind){ const c=STAFF[kind].cost[Math.max(0,state.staff[kind].n)]||STAFF[kind].cost[STAFF[kind].cost.length-1]; return r10(c*cm()*1.5); }
function rehireResigned(it){ if(!it||!spend(resignCost(it.kind))) return false; state.staff[it.kind].n++; const e=spawnStaff(it.kind,true); if(e&&it.name) e.name=it.name; state.morale=clamp(morale()+4,0,100); toast(`🤝 ${escH(it.name||STAFF[it.kind].name)} geri döndü`); return true; }
function curveDayEnd(rep){                                                            // state.day artmış hâlde çağrılır (yeni gün)
  if(!curveOn()) { state.lowMoraleDays=0; return; }
  // reklam kampanyası: 4★+ rakip varken %25, 3 gün sürer, üst üste gelmez
  if(rivalOn()&&!state.rivalAd||(state.rivalAd&&state.day>state.rivalAd.to+2)){ if(rivalOn()&&Math.random()<0.25){ state.rivalAd={from:state.day,to:state.day+2,countered:false}; morningAdd({k:'ad'}); } }
  // istifa: moral 2 gün üst üste <35 → %50 bir çalışan (resepsiyon hariç) ayrılır
  state.lowMoraleDays=morale()<35?(state.lowMoraleDays||0)+1:0;
  if(state.lowMoraleDays>=2&&staffEnts.length>=3&&Math.random()<0.5){ const cand=staffEnts.filter(e=>e.kind!=='rec'); if(cand.length){ const e=rand(cand), it={k:'resign',kind:e.kind,name:e.name||''}; fireStaff(e); state.lowMoraleDays=0; morningAdd(it); setTimeout(()=>toast(`😞 ${escH(it.name||STAFF[it.kind].name)} istifa etti · moral düşük`,'bad'),3000); } }
}
// ---------- sabah brifingi öğeleri ----------
function curveBriefHtml(it){
  if(it.k==='ad'){ if(!rivalAdOn()) return ''; const r=state.rival; return `<div class="row"><div class="ic">📣</div><div class="tx">Rakip reklam kampanyası<small>${escH(r.name)} ${state.rivalAd.to-state.day+1} gün boyunca reklamda · talep −%10, misafir kaybı artar · karşı kampanya etkisini siler, +1 ün</small></div><button class="btn gold" data-bf="adY" ${state.money<adCounterCost()?'disabled':''}>Karşı kampanya ${fmt(adCounterCost())} ₺</button><button class="btn ghost" data-bf="adN">Boş ver</button></div>`; }
  if(it.k==='resign'){ const c=resignCost(it.kind); return `<div class="row"><div class="ic">😞</div><div class="tx">İstifa<small>${escH(it.name||'Bir çalışan')} (${STAFF[it.kind].name}) düşük moral yüzünden ayrıldı · geri kazanmak için zam teklif edebilirsin (moral +4)</small></div><button class="btn gold" data-bf="resignY" ${state.money<c?'disabled':''}>Geri kazan ${fmt(c)} ₺</button><button class="btn ghost" data-bf="resignN">Kabul et</button></div>`; }
  return ''; }
function curveBriefAct(a,it){
  if(a==='adY'){ if(counterAd()) morningDone('ad'); return true; } if(a==='adN'){ morningDone('ad'); return true; }
  if(a==='resignY'){ if(rehireResigned(it)) morningDone('resign'); return true; } if(a==='resignN'){ morningDone('resign'); return true; }
  return false; }
function curveHtml(){ if(!curveOn()) return ''; let h=''; if(rivalAdOn()) h+=`<div class="row"><div class="ic">📣</div><div class="tx">${escH(state.rival.name)} reklamda<small>${state.rivalAd.to-state.day+1} gün · talep −%10</small></div><button class="btn gold" data-cad ${state.money<adCounterCost()?'disabled':''}>${fmt(adCounterCost())} ₺</button></div>`;
  if(state.crisisDue2) h+=`<div class="row"><div class="ic">⚠️</div><div class="tx">İkinci kriz bekleniyor<small>Bugün öğleden sonra</small></div></div>`; return h; }
function bindCurve(root){ const b=root.querySelector('[data-cad]'); if(b) b.onclick=()=>{ if(counterAd()){ morningDone('ad'); save(); renderSheet(); } }; }
