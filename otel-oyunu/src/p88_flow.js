
// =====================================================================
// FLOW: akış dengeleyici (otomatik zorluk), günlük giriş serisi
// =====================================================================

// ---------- akış dengeleyici ----------
// flow −1 (zorlanıyor → misafir biraz daha sabırlı, daha seyrek) … +1 (rahat → daha çok misafir, daha çok kazanç ve iş)
const DIFF={easy:{n:'Rahat',v:-0.6},auto:{n:'Otomatik',v:null},hard:{n:'Zorlu',v:0.75},legend:{n:'🔥 Efsane',v:1.2}};
function flowV(){ const d=DIFF[state.diff||'auto']; return d.v!=null?d.v:(state.flow||0); }
function flowSpawnMul(){ return 1-0.2*flowV(); }            // spawnT çarpanı
function flowPatMul(){ return 1+0.16*flowV(); }             // sabır tükenme hızı çarpanı
let flowT=0, flowIdle=0, flowWin={left:0,served:0,idle:0,t:0};
function updateFlow(dt){
  if(state.tut<TUT.length||state.sandbox) return;
  const rc=readyCount(); if(!queue.length&&rc>=2) flowWin.idle+=dt;
  flowWin.t+=dt; flowT+=dt; if(flowT<DAY_SEC/8) return; flowT=0;
  // pencere: yaklaşık 3 oyun saati
  const t=state.today, left=Math.max(0,(t.left||0)-flowWin.left), served=Math.max(0,(t.guests||0)-flowWin.served), idleF=flowWin.idle/Math.max(1,flowWin.t);
  flowWin={left:t.left||0,served:t.guests||0,idle:0,t:0};
  let s=0;
  if(left>=2||left>0&&left>=served*0.35) s-=0.35;          // misafir kaçıyor
  if(state.money<0) s-=0.3;
  if(state.rep<25&&state.day>3) s-=0.15;
  if(idleF>0.45) s+=0.25;                                   // boş oda + boş sıra: sıkılıyor
  if(left===0&&served>=3) s+=0.12;
  const nxt=nextBigCost(); if(nxt&&state.money>nxt*3) s+=0.15;
  state.flow=clamp((state.flow||0)*0.8+s,-1,1);
}
function nextBigCost(){ let c=null; (PADS||[]).forEach(d=>{ if(!built(d.id)){ const r=d.cost-(state.paid[d.id]||0); if(c==null||r<c) c=r; } }); return c; }
function flowLabel(){ const v=flowV(); return v<=-0.4?'😌 sakin':v>=0.4?'🔥 yoğun':'⚖️ dengeli'; }
function flowHtml(){
  const k=state.diff||'auto';
  return `<div class="row"><div class="ic">🎚️</div><div class="tx">Oyun temposu · şu an ${flowLabel()}<small>Otomatik: zorlanırsan misafirler sabırlı olur, rahatlarsan daha çok misafir ve kazanç gelir</small></div></div>
    <div style="display:flex;gap:6px;margin:-4px 0 10px">${Object.keys(DIFF).map(d=>`<button class="btn ${k===d?'gold':'ghost'}" data-diff="${d}" style="flex:1">${DIFF[d].n}</button>`).join('')}</div>`+diffHtml();
}
function bindFlow(root){ root.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{ state.diff=b.dataset.diff; sfx('click'); markSave(); renderSheet(); }); }

// ---------- günlük giriş serisi ----------
const STREAK=[{e:'💰',m:150},{e:'💰',m:300},{e:'⭐',xp:250},{e:'💰',m:600},{e:'🗝️',key:1},{e:'💰',m:1000},{e:'🎁',m:2000,key:1,xp:400,big:true}];
function dayKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function streakCheck(){
  if(state.sandbox||state.tut<TUT.length) return;
  const now=new Date(), today=dayKey(now), y=new Date(now.getTime()-864e5), S=state.streak||(state.streak={last:null,n:0,got:true});
  if(S.last===today) { if(!S.got) setTimeout(openStreak,2600); return; }
  S.n=S.last===dayKey(y)?S.n+1:1; S.last=today; S.got=false; markSave(); setTimeout(openStreak,2600);
}
function streakRew(i){ const R=STREAK[i%7], cyc=Math.floor(i/7); return {e:R.e,big:R.big,m:R.m?r10(R.m*cm()*(1+0.25*cyc)):0,key:R.key||0,xp:R.xp?R.xp*(1+cyc):0}; }
function rewTxt(r){ return [r.m?fmt(r.m)+' ₺':'',r.key?r.key+' 🗝️':'',r.xp?r.xp+' XP':''].filter(Boolean).join(' + '); }
function openStreak(){
  const S=state.streak; if(!S||S.got) return; if(modalWrap.classList.contains('show')){ setTimeout(openStreak,3000); return; }
  const i=S.n-1, w=Math.floor(i/7)*7;
  let h=`<h3>🔥 Giriş serisi: ${S.n}. gün</h3><p class="sub">Her gün gel, ödüller büyüsün. Bir gün kaçırırsan seri baştan başlar.</p><div class="dgrid" style="grid-template-columns:repeat(7,1fr);gap:4px">`;
  for(let k=0;k<7;k++){ const r=streakRew(w+k), cur=w+k===i, done=w+k<i;
    h+=`<div class="stat" style="text-align:center;padding:6px 2px;${cur?'border:2px solid var(--gold2);':''}${done?'opacity:.5;':''}${r.big?'background:rgba(255,210,74,.18);':''}"><small>${w+k+1}. gün</small><b style="font-size:20px">${done?'✅':r.e}</b></div>`; }
  const r=streakRew(i);
  h+=`</div><div class="row" style="margin-top:10px"><div class="ic">${r.e}</div><div class="tx">Bugünün ödülü<small>${rewTxt(r)}</small></div></div><button class="btn gold wide" id="stkGet">🎁 Ödülü al</button>`;
  openModal(h,m=>{ m.querySelector('#stkGet').onclick=()=>{ claimStreak(); closeModal(); }; });
}
function claimStreak(){
  const S=state.streak; if(!S||S.got) return; S.got=true; const r=streakRew(S.n-1);
  if(r.m){ state.money+=r.m; } if(r.key) state.keys=(state.keys||0)+r.key; if(r.xp) gainXP(r.xp);
  sfx(r.big?'star':'coin'); if(!state.lowFx) confettiAt(player.x,player.y+2,player.z,r.big?90:40); toast(`🔥 Seri ödülü: ${rewTxt(r)}`); save();
}
