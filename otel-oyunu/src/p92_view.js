
// =====================================================================
// GÖRÜŞ: birinci şahısta yukarı/aşağı bakma, daha doğal göz yüksekliği ve
// görüş açısı, iç mekân dolgu ışığı · ödüllerde "Tümünü al"
// =====================================================================

// ---------- birinci şahıs bakış ----------
let fpPitch=-0.12, fpLookHold=0, fpLight=null, fpLookEl=null;
const FP_PMIN=-1.05, FP_PMAX=0.85;
function fpFov(){ return VW>VH?62:74; }
function fpLookInput(dt){
  let d=fpLookHold; if(keys.r||keys.pageup) d+=1; if(keys.c||keys.pagedown) d-=1;
  if(d) fpPitch=clamp(fpPitch+d*1.4*dt,FP_PMIN,FP_PMAX);
}
function fpLookUi(){
  if(!fpLookEl){
    const st=document.createElement('style'); st.textContent=`#fpLook{position:absolute;right:calc(12px + env(safe-area-inset-right));bottom:calc(20px + env(safe-area-inset-bottom));display:none;flex-direction:column;gap:8px;z-index:12}#fpLook.show{display:flex}#fpLook button{width:48px;height:48px;border-radius:50%;border:2px solid var(--gold,#e0a93a);background:var(--panel,rgba(22,26,40,.9));color:#fff;font-size:20px;font-weight:800;touch-action:none}`;
    document.head.appendChild(st); fpLookEl=document.createElement('div'); fpLookEl.id='fpLook';
    fpLookEl.innerHTML='<button data-l="1" aria-label="Yukarı bak">⤒</button><button data-l="0" aria-label="Düz bak">⊙</button><button data-l="-1" aria-label="Aşağı bak">⤓</button>';
    (document.getElementById('hud')||document.body).appendChild(fpLookEl);
    fpLookEl.querySelectorAll('button').forEach(b=>{ const v=+b.dataset.l;
      b.addEventListener('pointerdown',e=>{ e.stopPropagation(); e.preventDefault(); if(v===0){ fpPitch=-0.12; sfx('click'); } else fpLookHold=v; });
      ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>{ fpLookHold=0; })); });
  }
  fpLookEl.classList.toggle('show',fpMode);
}
function fpLightSync(){
  if(!fpLight){ fpLight=new THREE.PointLight(0xfff1dc,0,9,2); scene.add(fpLight); }
  fpLight.intensity=fpMode?0.9:0;
  if(fpMode) fpLight.position.copy(camera.position);
}

// ---------- ödüller: tümünü al ----------
function questClaimables(){ const Q=state.quests; return Q?Q.list.map((q,i)=>q.done&&!q.claimed?i:-1).filter(i=>i>=0):[]; }
function passClaimables(){ const P=state.pass, t=passTier(), out=[]; if(!P) return out; for(let i=0;i<Math.min(t,PASS.length);i++) if(!P.got.includes(i)) out.push(i); return out; }
function claimAllQuests(){ const L=questClaimables(); if(state.streak&&!state.streak.got) claimStreak(); L.forEach((i,k)=>setTimeout(()=>{ claimQuest(i); if(sheetMode==='quests') renderSheet(); },k*260)); }
function claimAllPass(){ passClaimables().forEach((i,k)=>setTimeout(()=>{ claimPass(i); if(sheetMode==='pass') renderSheet(); },k*260)); }
function claimAllBtn(n,attr){ return n>=2?`<button class="btn gold wide qclaim" ${attr} style="margin:0 0 10px">🎁 Tümünü al (${n})</button>`:''; }
