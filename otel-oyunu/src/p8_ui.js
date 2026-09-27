
// =====================================================================
// WORLD-PINNED TAGS (DOM)
// =====================================================================
const tagsEl=$('tags'), tags=[];
let VW=window.innerWidth, VH=window.innerHeight;
function tagAdd(o){ const el=document.createElement('div'); el.className='tag'; el.style.display='none'; tagsEl.appendChild(el); o.el=el; o.html=null; tags.push(o); return o; }
function tagRemove(t){ if(!t) return; const i=tags.indexOf(t); if(i>=0) tags.splice(i,1); t.el.remove(); }
const _v=new THREE.Vector3();
function project(x,y,z){ _v.set(x,y,z).project(camera); if(_v.z>1||_v.z<-1) return null; return {x:(_v.x+1)/2*VW,y:(1-_v.y)/2*VH}; }
function tagFloorOk(f,z){ return f===viewFloor||(f===0&&z>2.65); }
const roomTags={};
function renderTags(){
  for(const k in state.rooms) if(!roomTags[k]) roomTags[k]=tagAdd({kind:'room',id:+k});
  for(const t of tags){
    let x,y,z,f=0,html='',show=true;
    switch(t.kind){
      case 'patience':{ const g=t.ent; x=g.x; y=g.y+t.y; z=g.z; f=g.f; show=g.state==='queue'||(g.state==='arrive'&&!g.path);
        if(show){ const p=clamp(g.pat/g.patMax,0,1); if(!t.bar){ t.el.innerHTML=`<div><div class="bubble small" style="margin-bottom:3px">${(g.tour?'🚌':g.T.e)+(g.pref?RTHEMES[g.pref].e:'')+(g.story?STORIES[g.story.k].e:'')}</div><div class="patience"><i></i></div></div>`; t.bar=t.el.querySelector('i'); t.html='x'; }
          t.bar.style.width=(p*100)+'%'; t.bar.style.background=p>0.5?'#5fd98a':p>0.25?'#f2c14e':'#e0574f'; }
        html=null; break; }
      case 'pad':{ const d=t.def; x=d.x; y=d.f*FH+t.y; z=d.z; f=d.f; const lk=padLocked(d), rem=Math.ceil(d.cost-(state.paid[d.id]||0));
        html=`<div class="padtag${lk?' locked':''}">${d.label}<span class="p">${lk?'⭐'.repeat(d.stars)+' gerekli':fmt(rem)+' ₺'}</span></div>`; break; }
      case 'pile':{ const P=L.piles[t.key]; x=P.x; y=t.y; z=P.z; f=P.f; html=`<div class="bubble small">💵 ${fmt(state.piles[t.key])}</div>`; break; }
      case 'room':{ const s=state.rooms[t.id]; if(!s){ show=false; break; } const R=RT(t.id), ri=roomInfo(t.id); x=ri.x; y=ri.f*FH+2.0; z=ri.z+1.1; f=ri.f;
        if(R.req){ const low=R.req.left<R.req.max*0.35; html=`<div class="bubble req${low?' warn':''}">${ITEMS[R.req.item].e}</div>`; }
        else if(s.broken) html='<div class="bubble warn">🔧</div>';
        else if(s.dirty) html='<div class="bubble">🧹</div>';
        else if(R.guest&&R.guest.type==='insp') html='<div class="bubble small">🕵️</div>';
        else if(s.tip>0) html='<div class="bubble small">💵</div>';
        else show=false; break; }
      case 'desk':{ x=L.desk.x; y=2.0; z=L.desk.z; f=0;
        if(deskState.noPower) html='<div class="bubble warn small">⚡ Elektrik yok!</div>';
        else if(deskState.noRoom) html='<div class="bubble warn small">🛏️ Hazır oda yok!</div>';
        else if(deskState.p>0) html=`<div class="ring" style="--p:${deskState.p.toFixed(2)}"><span>🛎️</span></div>`;
        else if(queue[0]&&queue[0].state==='queue'&&!deskState.server) html='<div class="bubble req">🛎️</div>';
        else show=false; break; }
      case 'spot':{ const o=t.get(); if(!o){ show=false; break; } x=o.x; y=o.f*FH+t.y; z=o.z; f=o.f; html=`<div class="bubble ${t.cls||''}">${t.iconF?t.iconF():t.icon}</div>`; break; }
      case 'work':{ x=player.x; y=player.y+2.35; z=player.z; f=player.f;
        if(workRing) html=`<div class="ring" style="--p:${clamp(workRing.p,0,1).toFixed(2)}"><span>${workRing.icon}</span></div>`; else show=false; break; }
    }
    if(show) show=tagFloorOk(f,z);
    const pos=show?project(x,y,z):null;
    if(!pos){ if(t.el.style.display!=='none') t.el.style.display='none'; continue; }
    if(t.el.style.display==='none') t.el.style.display='';
    t.el.style.transform=`translate(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px)`;
    if(html!==null&&html!==t.html){ t.el.innerHTML=html; t.html=html; }
  }
}
function fxAt(x,y,z,f,html,cls){
  if(!tagFloorOk(f,z)) return; const p=project(x,y,z); if(!p) return;
  const el=document.createElement('div'); el.className='fx '+(cls||''); el.innerHTML=html; el.style.left=p.x+'px'; el.style.top=p.y+'px';
  tagsEl.appendChild(el); setTimeout(()=>el.remove(),1250);
}
function fxText(x,y,z,f,txt,neg){ fxAt(x,y,z,f,txt,neg?'neg':''); }
function fxEmoji(x,y,z,f,e){ fxAt(x,y,z,f,e,'emo'); }

// =====================================================================
// HUD
// =====================================================================
let dispMoney=state.money;
const moneyEl=$('money'), moneyPill=$('moneyPill');
function coinsFly(x,y,z,f,amt){
  const p=project(x,y+f*FH,z)||{x:VW/2,y:VH/2};
  const r=moneyPill.getBoundingClientRect(), tx=r.left+22, ty=r.top+r.height/2;
  const n=Math.min(10,3+Math.floor(amt/(20*city().mult)));
  for(let i=0;i<n;i++){
    const c=document.createElement('div'); c.className='flycoin'; $('coinsFx').appendChild(c);
    const sx=p.x+rnd(-24,24), sy=p.y+rnd(-24,24);
    c.style.transform=`translate(${sx}px,${sy}px) scale(.6)`;
    const delay=i*45;
    setTimeout(()=>{ c.style.transition='transform .55s cubic-bezier(.5,-0.3,.7,1)'; c.style.transform=`translate(${tx}px,${ty}px) scale(1)`; },20+delay);
    setTimeout(()=>{ c.remove(); moneyPill.classList.remove('bump'); void moneyPill.offsetWidth; moneyPill.classList.add('bump'); sfx('coin'); },600+delay);
  }
  fxText(x,y+1.3,z,f,'+'+fmt(amt));
  if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
}
function updateMoneyHUD(dt){
  dispMoney+=(state.money-dispMoney)*Math.min(1,dt*7); if(Math.abs(state.money-dispMoney)<0.5) dispMoney=state.money;
  moneyEl.textContent=fmt(Math.floor(dispMoney)); moneyPill.classList.toggle('neg',state.money<0);
}
let lastStarsHud=null;
function updateHUD(){
  const s=stars(), capped=rawStars()>s; $('stars').textContent='★'.repeat(s)+'☆'.repeat(5-s)+(capped?' 🔒':'');
  $('repBar').firstChild.style.width=(s===5||capped?100:(state.rep%20)/20*100)+'%';
  if(lastStarsHud!=null&&s>lastStarsHud){ cinematic(); fireworksShow(0,-4); banner(`${'★'.repeat(s)}`,`Otelin ${s} yıldız oldu! Gelir x${STAR_MULT[s-1]}`); sfx('star'); refreshPads(); } lastStarsHud=s;
  const h=hourNow(); $('clock').textContent=String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*4)*15).padStart(2,'0');
  $('wxIcon').textContent=WEATHER[state.weather].e; $('dayLbl').textContent=`${season().e} Gün ${state.day}${festivalOn()?' · '+festival().e:''}${state.wxEv&&state.wxEv.day===state.day?' '+WX_EV[state.wxEv.k].e:''}${gameSpeed>1?' · ⏩'+gameSpeed+'x':''}`;
  // goal
  const g=goal(); curGoal=g; const ge=$('goal');
  if(g){ ge.classList.add('show'); ge.classList.toggle('done',!!g.done); $('goalIcon').textContent=g.icon; $('goalText').innerHTML=g.text+(g.price?` · <span class="price">${fmt(g.price)} ₺</span>`:''); let gr=$('goalRew'); if(!gr){ gr=document.createElement('span'); gr.id='goalRew'; gr.className='rew'; $('goalText').after(gr); } gr.textContent=g.rew?'🎁 '+fmt(g.rew):''; gr.style.display=g.rew?'':'none';
    const gp=$('goalProg'); gp.style.display=g.prog!=null?'block':'none'; if(g.prog!=null) gp.firstChild.style.width=Math.round(clamp(g.prog,0,1)*100)+'%'; }
  else ge.classList.remove('show');
  // floors
  const n=floorsBuilt(), fl=$('floors');
  const key=n+'|'+viewFloor+'|'+player.f+'|'+[0,1,2,3].map(f=>floorBusy(f)?1:0).join('');
  if(fl.dataset.k!==key){ fl.dataset.k=key; fl.innerHTML='';
    if(n>1) for(let f=n-1;f>=0;f--){ const b=document.createElement('button'); b.textContent=f===4?'🕌':f===ROOF?'Ç':(f+1)+'.K'; b.title=floorName(f); b.setAttribute('aria-label',floorName(f)+' bak'); if(f===viewFloor) b.classList.add('on'); if(f===player.f) b.classList.add('me');
      if(floorBusy(f)&&f!==viewFloor){ const d=document.createElement('span'); d.className='dot'; b.appendChild(d); }
      b.onclick=()=>{ sfx('click'); peekFloor=f===player.f?null:f; }; fl.appendChild(b); } }
  // elevator
  const eu=$('elevUI'), ek=elevHere?'e'+player.f+n:'';
  if(eu.dataset.k!==ek){ eu.dataset.k=ek; eu.innerHTML=''; eu.classList.toggle('show',!!ek);
    if(ek) for(let f=0;f<n;f++){ if(f===player.f) continue; const b=document.createElement('button'); b.textContent=(f>player.f?'⬆ ':'⬇ ')+floorName(f);
      b.onclick=()=>{ sfx('click'); player.path=[{x:L.elev.x,z:L.elev.z,f,ride:true}]; player.pi=0; eu.dataset.k=''; eu.classList.remove('show'); }; eu.appendChild(b); } }
  $('mgmtDot').classList.toggle('on',mgmtHasDeal()); updateLevelHUD();
  const qb=$('questBtn'), qon=questsOn(); qb.classList.toggle('show',qon);
  if(qon){ const Q=state.quests, dn=Q.list.filter(q=>q.claimed).length; $('questDot').classList.toggle('on',questsReady()); $('questN').textContent=dn+'/'+Q.list.length; }
}
function floorBusy(f){ for(const k in state.rooms){ const ri=roomInfo(+k); if(ri.f!==f) continue; const s=state.rooms[k]; if(s.dirty||s.broken||RT(+k).req) return true; } return false; }
function updateCarryUI(){
  const el=$('carry'), it=player.c.items;
  if(!it.length){ el.classList.remove('show'); return; }
  el.classList.add('show'); el.innerHTML=`${it.map((i,k)=>`<span class="citem" data-k="${k}" role="button" aria-label="Bunu bırak">${ITEMS[i].e}</span>`).join('')} <small style="color:var(--muted)">${it.length}/${capacity()}</small> <button class="xbtn" style="width:28px;height:28px;font-size:13px;pointer-events:auto;margin-left:4px" aria-label="Eşyaları bırak">✖</button>`;
  el.querySelector('button').onclick=()=>{ setHold(player.c,[]); updateCarryUI(); sfx('drop'); };
  el.querySelectorAll('.citem').forEach(s=>s.onclick=()=>{ const items=player.c.items.slice(); items.splice(+s.dataset.k,1); setHold(player.c,items); updateCarryUI(); sfx('drop'); });
}
let toastN=0;
function toast(msg,kind,onTap){ logEvent(msg);
  const box=$('toasts'); while(box.children.length>=3) box.firstChild.remove();
  const el=document.createElement('div'); el.className='toast'+(kind==='bad'?' bad':'')+(onTap?' tap':''); el.textContent=msg; box.appendChild(el);
  if(onTap) el.onclick=e=>{ e.stopPropagation(); el.remove(); onTap(); };
  setTimeout(()=>el.remove(),onTap?6000:2700);
}
let hintT=null;
function hint(text,sec=4){ const h=$('hint'); h.textContent=text; h.classList.add('show'); clearTimeout(hintT); hintT=setTimeout(()=>h.classList.remove('show'),sec*1000); }

// =====================================================================
// SHEETS & MODALS
// =====================================================================
const sheetWrap=$('sheetWrap'), sheet=$('sheet'), modalWrap=$('modalWrap'), modal=$('modal');
let sheetMode=null, mgmtTab='staff', sheetRoom=null, hotelSub='gen';
function openSheet(mode){ sheetMode=mode; sheet._h=null; sheetWrap.classList.add('show'); renderSheet(); }
function closeSheet(){ sheetWrap.classList.remove('show'); sheetMode=null; sheetRoom=null; }
let sheetTouch=0;
sheetWrap.addEventListener('pointerdown',e=>{ sheetTouch=performance.now(); if(e.target===sheetWrap) closeSheet(); });
// tek pencere kuralı: oyuncu tıklamadan (zamanlayıcıyla) gelen pencere, açık bir pencere varken sıraya girer
let lastUserT=0; ['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>{ lastUserT=performance.now(); },true));
const modalQ=[];
function openModal(html,bind){
  if(modalWrap.classList.contains('show')&&performance.now()-lastUserT>700){ if(modalQ.length<6) modalQ.push([html,bind]); return; }
  modal.innerHTML=html; modalWrap.classList.add('show'); if(bind) bind(modal); }
function closeModal(){ modalWrap.classList.remove('show');
  if(modalQ.length) setTimeout(()=>{ if(modalWrap.classList.contains('show')||!modalQ.length) return; const [h,b]=modalQ.shift(); modal.innerHTML=h; modalWrap.classList.add('show'); if(b) b(modal); },600); }
modalWrap.addEventListener('pointerdown',e=>{ if(e.target===modalWrap) closeModal(); });
const cm=()=>city().mult;
function staffHireCost(k){ const s=state.staff[k], c=STAFF[k].cost[s.n]; return c==null?null:Math.round(c*cm()); }
function staffLvlCost(k){ const s=state.staff[k], c=STAFF_LVL_COST[s.lvl-1]; return c==null?null:Math.round(c*cm()); }
function upgCost(k){ const c=UPG[k].costs[state.up[k]]; return c==null?null:Math.round(c*cm()); }
function adsCost(){ return Math.round((90+stars()*40)*cm()*(1-0.3*skillLv('m2'))); }
function roomUpCost(id){ const s=state.rooms[id], i=ROOM_ORDER.indexOf(s.type); if(i>=2) return null; return Math.round(ROOM_T[ROOM_ORDER[i+1]].up*FLOOR_MULT[roomInfo(id).f]*cm()); }
function roomUpMaxCost(id){ const s=state.rooms[id]; let i=ROOM_ORDER.indexOf(s.type), c=0; while(i<2){ i++; c+=Math.round(ROOM_T[ROOM_ORDER[i]].up*FLOOR_MULT[roomInfo(id).f]*cm()); } return c; }
function decorCost(k){ return Math.round(DECOR[k].cost*cm()); }
function mgmtHasDeal(){
  if(built('staff')) for(const k in STAFF){ const c=staffHireCost(k); if(c!=null&&state.money>=c&&(!STAFF[k].needs||built(STAFF[k].needs))) return true; }
  for(const k in UPG){ const c=upgCost(k); if(c!=null&&state.money>=c) return true; }
  return false;
}
function pips(n,max){ let s='<div class="pips">'; for(let i=0;i<max;i++) s+=`<i class="${i<n?'on':''}"></i>`; return s+'</div>'; }
function renderSheet(){
  if(sheetMode==='room') return renderRoomSheet();
  if(sheetMode==='quests') return renderQuestSheet();
  if(sheetMode==='admin') return renderAdminSheet();
  if(sheetMode==='custom') return renderCustomSheet();
  if(sheetMode==='chat') return renderChatSheet();
  if(sheetMode==='log') return renderLogSheet();
  if(sheetMode==='ach') return renderAchSheet();
  if(sheetMode==='skills') return renderSkillSheet();
  if(sheetMode==='pass') return renderPassSheet();
  if(sheetMode==='album') return renderAlbumSheet();
  const tabs=[['staff','👥 Personel'],['me','🧍 Sen'],['hotel','🏨 Otel']];
  let h=`<h3>📋 Yönetim <button class="xbtn" data-close aria-label="Kapat">✖</button></h3><div class="tabs">${tabs.map(([k,l])=>`<button data-tab="${k}" class="${k===mgmtTab?'on':''}">${l}</button>`).join('')}</div>`;
  if(mgmtTab==='staff'){
    if(!built('staff')) h+=`<p class="note">🔒 Personel işe almak için önce lobideki <b>Personel odası</b>nı aç.</p>`;
    for(const k in STAFF){ const S=STAFF[k], s=state.staff[k], hc=staffHireCost(k), lc=staffLvlCost(k), needOk=!S.needs||built(S.needs), can=built('staff')&&needOk;
      h+=`<div class="row"><div class="ic">${S.e}</div><div class="tx">${S.name} <span style="color:var(--gold2)">${s.n}/${S.max}</span><small>${S.desc}${!needOk?` · önce ${PADMAP[S.needs]?PADMAP[S.needs].label:S.needs} gerekli`:''}</small><small>Maaş: ${fmt(staffWage(k))} ₺/gün · Seviye ${s.lvl}</small>${crewNames(k)}${pips(s.lvl,STAFF_SPEED.length)}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${hc==null?'<button class="btn" disabled>Dolu</button>':!built('staff')?'<button class="btn" disabled>🔒 Personel<br>odası gerekli</button>':!needOk?`<button class="btn" disabled>🔒 Önce<br>${PADMAP[S.needs]?PADMAP[S.needs].label:S.needs}</button>`:`<button class="btn" data-hire="${k}" ${state.money<hc?'disabled':''}>İşe al<br>${fmt(hc)} ₺</button>`}
          ${s.n>0&&lc!=null?`<button class="btn gold" data-lvl="${k}" ${state.money<lc?'disabled':''}>Hız ↑ ${fmt(lc)}</button>${(()=>{ const M=staffLvlMaxInfo(k); return M.n>1?`<button class="btn" data-lvlmax="${k}">MAX +${M.n} · ${fmt(M.c)}</button>`:''; })()}`:''}
        </div></div>`; }
    h+=staffHtml2()+staffExtraHtml()+`<p class="note">Maaşlar her sabah 07:00'de ödenir.</p>`;
  } else if(mgmtTab==='me'){
    let lastG=-1;
    for(const k of upgOrder()){ const U=UPG[k], lv=state.up[k], c=upgCost(k), max=U.costs.length;
      if(U.g!==lastG){ lastG=U.g; h+=`<div class="ugh">${UPG_GROUPS[U.g]}</div>`; }
      const pct={charm:15,haggle:5,fame:15,lead:10,calm:12}[k];
      const val=k==='cap'?` · ${U.vals[lv]} eşya`:k==='magnet'?` · ${U.vals[lv].toFixed(1)} m`:pct&&lv?` · +%${pct*lv}`:'';
      h+=`<div class="row"><div class="ic">${U.e}</div><div class="tx">${U.name}${val}<small>${U.desc}</small>${pips(lv,max)}</div>${c!=null?`<div style="display:flex;flex-direction:column;gap:6px"><button class="btn gold" data-upg="${k}" ${state.money<c?'disabled':''}>${fmt(c)} ₺</button>${(()=>{ const M=upgMaxInfo(k); return M.n>1?`<button class="btn" data-upgmax="${k}">MAX +${M.n}<br>${fmt(M.c)} ₺</button>`:''; })()}</div>`:'<button class="btn" disabled>Maks</button>'}</div>`; }
  } else {
    const nR=Object.keys(state.rooms).length, next=CITIES[(state.city+1)%CITIES.length], adsOn=state.adsUntil>state.day+state.t;
    h+=`<div class="grid2">
      <div class="stat">Yıldız<b>${'★'.repeat(stars())}</b></div><div class="stat">Ün<b>${Math.round(state.rep)}/100${repTrendHtml()}</b></div>
      <div class="stat">Odalar<b>${nR}</b></div><div class="stat">Ağırlanan misafir<b>${fmt(state.served)}</b></div>
      <div class="stat">Bugünkü gelir<b>${fmt(state.today.rooms+state.today.tips+state.today.amen+state.today.req+state.today.cafe)} ₺</b></div><div class="stat">Günlük maaşlar<b>${fmt(wagesToday())} ₺</b></div></div>
      ${starReqHtml()}
      <div class="row" style="margin-top:10px"><div class="ic">📣</div><div class="tx">Reklam kampanyası<small>Yarım gün boyunca çok daha fazla misafir gelir</small></div><button class="btn gold" data-ads ${adsOn||state.money<adsCost()?'disabled':''}>${adsOn?'Aktif':fmt(adsCost())+' ₺'}</button></div>`+flowHtml();
    const H=hotelSub;
    h=h.replace('<div class="grid2">',subTabsHtml()+(H==='gen'?'<div class="grid2">':'<div class="grid2" style="display:none">'));
    if(H!=='gen'){ const i=h.indexOf('<div class="grid2" style="display:none">'); h=h.slice(0,i); }
    if(H==='gen') h+=tierHtml()+mgrHtml()+mescitHtml()+floorsHtml();
    if(H==='eco') h+=bookingHtml()+kitchenHtml()+depthHtml()+invHtml()+luxHtml();
    else if(H==='evt') h+=eventsHtml()+partyHtml();
    else if(H==='rule') h+=opsHtml();
    else if(H==='city') h+=cityPlanHtml()+worldHtml()+shopsHtml()+specialHtml()+progressHtml(next)+legacyHtml();
  }
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet;
  sheet.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ mgmtTab=b.dataset.tab; sfx('click'); renderSheet(); });
  sheet.querySelectorAll('[data-hsub]').forEach(b=>b.onclick=()=>{ hotelSub=b.dataset.hsub; sfx('click'); renderSheet(); sheet.scrollTop=0; });
  sheet.querySelectorAll('[data-hire]').forEach(b=>b.onclick=()=>hireStaff(b.dataset.hire));
  sheet.querySelectorAll('[data-lvl]').forEach(b=>b.onclick=()=>staffLvl(b.dataset.lvl));
  sheet.querySelectorAll('[data-upg]').forEach(b=>b.onclick=()=>buyUpg(b.dataset.upg));
  sheet.querySelectorAll('[data-upgmax]').forEach(b=>b.onclick=()=>buyUpgMax(b.dataset.upgmax));
  sheet.querySelectorAll('[data-lvlmax]').forEach(b=>b.onclick=()=>staffLvlMax(b.dataset.lvlmax));
  const ads=sheet.querySelector('[data-ads]'); if(ads) ads.onclick=buyAds;
  sheet.querySelectorAll('[data-lux]').forEach(b=>b.onclick=()=>buyLux(b.dataset.lux));
  const mv=sheet.querySelector('[data-move]'); if(mv) mv.onclick=confirmMove;
  bindDepth(sheet); bindOps(sheet); bindFlow(sheet); bindInv(sheet); bindMescit(sheet); bindOps2(sheet); bindWorld(sheet);
  const spb=sheet.querySelector('[data-spbuy]'); if(spb) spb.onclick=buySpecial; const mgo=sheet.querySelector('[data-mgopen]'); if(mgo) mgo.onclick=openMgr;
  sheet.querySelectorAll('[data-fth]').forEach(b=>b.onclick=()=>{ const [f,k]=b.dataset.fth.split(':'); buyFloorTheme(+f,k); }); sheet.querySelectorAll('[data-flo]').forEach(b=>b.onclick=()=>buyLounge(+b.dataset.flo));
  const bk=sheet.querySelector('[data-break]'); if(bk) bk.onclick=buyBreakroom;
  const pty=sheet.querySelector('[data-party]'); if(pty) pty.onclick=throwParty;
  sheet.querySelectorAll('[data-evt]').forEach(b=>b.onclick=()=>b.dataset.evt==='yes'?acceptOffer():declineOffer());
  const av=sheet.querySelector('[data-adv]'); if(av) av.onclick=()=>{ sfx('click'); openAdvisor(); };
  const mp=sheet.querySelector('[data-map]'); if(mp) mp.onclick=()=>{ sfx('click'); openCityMap(); };
  sheet.querySelectorAll('[data-leg]').forEach(b=>b.onclick=()=>buyLegacy(b.dataset.leg));
}
function spend(c){ if(c==null||state.money<c) return false; state.money-=c; markSave(); return true; }
function hireStaff(k){ const c=staffHireCost(k); if(!built('staff')||!spend(c)) return; state.staff[k].n++; spawnStaff(k,true); sfx('build'); toast(`${STAFF[k].e} ${STAFF[k].name} işe başladı!`); save(); renderSheet(); }
function staffLvl(k){ const c=staffLvlCost(k); if(!spend(c)) return; state.staff[k].lvl++; qEv('upg'); sfx('star'); save(); renderSheet(); }
function maxCost(costFn,lvKey,max){ let c=0,n=0; for(let i=lvKey;i<max;i++){ const x=costFn(i); if(x==null||c+x>state.money) break; c+=x; n++; } return {c,n}; }
function upgMaxInfo(k){ return maxCost(i=>{ const c=UPG[k].costs[i]; return c==null?null:Math.round(c*cm()); },state.up[k],UPG[k].costs.length); }
function staffLvlMaxInfo(k){ return maxCost(i=>{ const c=STAFF_LVL_COST[i-1]; return c==null?null:Math.round(c*cm()); },state.staff[k].lvl,STAFF_SPEED.length); }
function buyUpgMax(k){ const {c,n}=upgMaxInfo(k); if(n<1||!spend(c)) return; state.up[k]+=n; for(let i=0;i<n;i++) qEv('upg'); sfx('star'); toast(`⬆️ ${UPG[k].name} +${n} seviye`); updateCarryUI(); save(); renderSheet(); }
function staffLvlMax(k){ const {c,n}=staffLvlMaxInfo(k); if(n<1||!spend(c)) return; state.staff[k].lvl+=n; for(let i=0;i<n;i++) qEv('upg'); sfx('star'); toast(`⬆️ ${STAFF[k].name} hızı +${n}`); save(); renderSheet(); }
function buyUpg(k){ const c=upgCost(k); if(!spend(c)) return; state.up[k]++; qEv('upg'); sfx('star'); updateCarryUI(); save(); renderSheet(); }
function buyAds(){ const c=adsCost(); if(!spend(c)) return; state.adsUntil=state.day+state.t+0.5*(1+0.5*skillLv('m2')); spawnT=0.5; sfx('build'); toast('📣 Reklam yayında! Misafirler yolda'); save(); renderSheet(); }
// ---------- ilerleme: şehirler, anahtarlar, miras ----------
function hotelProgress(){ const n=PADS.length||1, b=PADS.filter(d=>built(d.id)).length; return {b,n,p:b/n}; }
function tourOf(ix){ return Math.floor(ix/CITIES.length)+1; }
function progressHtml(next){
  const P=hotelProgress(), pc=Math.round(P.p*100);
  return `<div class="row" style="margin-top:10px"><div class="ic">${city().e||'🏙️'}</div><div class="tx">${city().name}${state.prestige?` · ${state.prestige+1}. otelin`:''}
    <small>Otel ilerlemesi: ${P.b}/${P.n} alan · %${pc}</small><div class="pbar"><i style="width:${pc}%"></i></div>
    <small>${state.done?`Tamamlandı! ${next.name}'ya taşın: 🗝️ ${moveKeys().total} anahtar kazanırsın`:`Bitirince ${next.e||''} ${next.name} açılır (gelir x${next.mult})`}</small></div>
    <div style="display:flex;flex-direction:column;gap:4px"><button class="btn" data-map>🗺️ Harita</button><button class="btn ghost" data-adv>🧠 Danışman</button><button class="btn gold" data-move ${state.done?'':'disabled'}>Taşın</button></div></div>`;
}
function moveKeys(){
  const d=state.day, speed=d<=15?3:d<=22?2:d<=30?1:0, guests=Math.min(3,Math.floor((state.served||0)/60)), st=stars()>=5?1:0;
  return {base:3,speed,guests,st,total:3+speed+guests+st};
}
function legacyCost(k){ const lv=(state.legacy||{})[k]||0; return lv>=LEGACY[k].max?null:LEGACY_COST[lv]; }
function applyLegacyStart(s){
  const L0=s.legacy||{};
  s.money+=(L0.cash||0)*Math.round(300*CITIES[s.city%CITIES.length].mult);
  s.up.speed=Math.max(s.up.speed,L0.speed||0); s.up.magnet=Math.max(s.up.magnet,L0.magnet||0); s.rep=Math.min(100,s.rep+8*(L0.rep||0));
}
function buyLegacy(k){
  const c=legacyCost(k); if(c==null||(state.keys||0)<c){ sfx('fail'); return; }
  state.keys-=c; state.legacy=state.legacy||{}; const lv=state.legacy[k]=(state.legacy[k]||0)+1;
  if(k==='cash') addMoney(Math.round(300*city().mult),player.x,player.y+1.2,player.z,player.f,true);
  if(k==='speed') state.up.speed=Math.max(state.up.speed,lv); if(k==='magnet') state.up.magnet=Math.max(state.up.magnet,lv);
  if(k==='rep') changeRep(8);
  sfx('star'); confettiAt(player.x,player.y+2,player.z,40); toast(`${LEGACY[k].e} ${LEGACY[k].name} ${lv}. seviye!`); updateCarryUI(); save(); sheet._h=null; renderSheet();
}
function legacyHtml(){
  const K=state.keys||0; let h=`<h4 style="margin:12px 0 4px">🗝️ Miras <small style="color:var(--gold2)">· ${K} anahtar</small></h4><p class="sub" style="margin:0 0 4px">Otelini bitirip taşındıkça anahtar kazanırsın. Miras kalıcıdır, bütün otellerinde geçerli.</p>`;
  for(const k in LEGACY){ const U=LEGACY[k], lv=(state.legacy||{})[k]||0, c=legacyCost(k);
    h+=`<div class="row"><div class="ic">${U.e}</div><div class="tx">${U.name}<small>${U.desc}</small>${pips(lv,U.max)}</div>${c!=null?`<button class="btn gold" data-leg="${k}" ${K<c?'disabled':''}>🗝️ ${c}</button>`:'<button class="btn" disabled>Maks</button>'}</div>`; }
  return h;
}
function openCityMap(){
  const cur=state.city, tour=tourOf(cur); let rows='';
  for(let i=0;i<CITIES.length;i++){ const C=CITIES[i], ix=(tour-1)*CITIES.length+i, hs=(state.hist||[]).filter(x=>x.city%CITIES.length===i);
    const best=hs.length?hs.reduce((a,b)=>a.days<=b.days?a:b):null, here=cur%CITIES.length===i, done=ix<cur;
    const st=here?`📍 Buradasın · %${Math.round(hotelProgress().p*100)}`:done||best?`✅ ${best?best.days+' günde · '+'★'.repeat(best.stars):'tamamlandı'}`:'🔒 Kilitli';
    rows+=`<div class="row${here?' on':''}" style="${here?'border:2px solid var(--gold2)':''}${!here&&!done&&!best?';opacity:.6':''}"><div class="ic">${C.e}</div><div class="tx">${C.name}<small>Gelir x${C.mult}${best&&hs.length>1?` · ${hs.length} kez`:''}</small></div><div style="font-weight:800;font-size:13px;text-align:right">${st}</div></div>`; }
  openModal(`<h3>🗺️ Otel zinciri${tour>1?` · ${tour}. tur`:''} <button class="xbtn" id="cmX" aria-label="Kapat">✖</button></h3><p class="sub">${(state.hist||[]).length} otel tamamlandı · 🗝️ ${state.keys||0} anahtar · kalıcı gelir +%${Math.round(state.prestige*15+5*((state.legacy||{}).income||0))}</p>${rows}${chainHtml()}${cur%CITIES.length===CITIES.length-1?'<p class="sub">Son şehirden sonra zincir İstanbul\'dan yeni bir turla, daha yüksek prestijle devam eder.</p>':''}`,m=>{ m.querySelector('#cmX').onclick=closeModal; m.querySelectorAll('[data-mgr]').forEach(b=>b.onclick=()=>hireManager(+b.dataset.mgr)); });
}
function confirmMove(){
  const next=CITIES[(state.city+1)%CITIES.length], K=moveKeys();
  const line=(t,v)=>v?`<div class="row" style="padding:4px 8px"><div class="tx">${t}</div><b>+${v} 🗝️</b></div>`:'';
  openModal(`<h3>🚚 ${next.e||''} ${next.name}'ya taşın</h3><p class="sub">Yeni şehirde sıfırdan bir otel kuracaksın: gelirler x${next.mult}, kalıcı +%15 gelir ve miras bonusların seninle gelir. Paranın %10'u (${fmt(moveCarry())} ₺) sermaye olarak taşınır.</p>
    ${line('Otel tamamlandı',K.base)}${line(`Hızlı bitirdin (${state.day}. gün)`,K.speed)}${line(`${fmt(state.served)} misafir ağırladın`,K.guests)}${line('5 yıldız',K.st)}
    <div class="row" style="padding:4px 8px;border:2px solid var(--gold2)"><div class="tx"><b>Toplam</b></div><b>🗝️ ${K.total}</b></div>
    <button class="btn wide" id="mvYes">Taşın!</button><button class="btn ghost wide" id="mvNo">Vazgeç</button>`,m=>{
    m.querySelector('#mvNo').onclick=closeModal;
    m.querySelector('#mvYes').onclick=()=>{ const ni=state.city+1, s=freshState(ni,state.prestige+1); s.sound=state.sound; s.music=state.music; s.custom=Object.assign({},state.custom); s.vol=state.vol; s.gfx=state.gfx; s.lvl=state.lvl; s.xp=state.xp; s.ach=state.ach; s.stats=state.stats; s.tut=TUT.length; s.tips=state.tips;
      s.keys=(state.keys||0)+K.total; s.money+=moveCarry(); s.album=state.album; s.legacy=Object.assign({},state.legacy); s.hist=(state.hist||[]).concat([{city:state.city,days:state.day,stars:stars(),served:state.served}]); applyLegacyStart(s);
      state=s; save(); location.reload(); };
  });
}
function renderRoomSheet(){
  const id=sheetRoom, s=state.rooms[id]; if(!s){ closeSheet(); return; }
  const R=RT(id), T=ROOM_T[s.type], ri=roomInfo(id), up=roomUpCost(id), g=R.guest;
  let h=`<h3>🛏️ Oda ${id} · ${T.name}<button class="xbtn" data-close aria-label="Kapat">✖</button></h3><p class="sub">${ri.f+1}. kat · gecelik ${fmt(roomRate(id)*incomeMult())} ₺</p>`;
  if(g){ const m=g.sat>=68?'😄':g.sat>=42?'🙂':'😠'; h+=`<div class="row"><div class="ic">${g.T.e}</div><div class="tx">${g.name}<small>${g.T.name} · ${g.nights} gece · ${g.asleep?'uyuyor 😴':g.state==='amen'?'tesiste':'odasında'}</small></div><div style="font-size:24px">${m}<small style="display:block;font-size:12px;text-align:center">%${Math.round(g.sat)}</small></div></div><button class="btn wide" data-talk style="margin:-2px 0 10px">💬 ${g.name} ile konuş</button>`; }
  else h+=`<p class="note">${s.dirty?'🧹 Temizlik bekliyor':s.broken?'🔧 Tamir bekliyor':'Boş · misafir bekliyor'}</p>`;
  if(s.upPend) h+=`<div class="row"><div class="ic">⏳</div><div class="tx">${ROOM_T[nextRoomType(id)].name} yükseltmesi ödendi<small>Misafir çıkınca otomatik yapılacak</small></div></div>`;
  else if(up!=null){ const nx=ROOM_T[ROOM_ORDER[ROOM_ORDER.indexOf(s.type)+1]], ups=roomUpMaxCost(id);
    h+=`<div class="row"><div class="ic">⬆️</div><div class="tx">${nx.name} odaya yükselt<small>Gecelik ${fmt(roomRate(id)*incomeMult())} → ${fmt(nx.rate*(1+0.3*ri.f)*incomeMult())} ₺ · daha seçkin misafirler${g?' · misafir çıkınca yapılır':''}</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn gold" data-up ${state.money<up?'disabled':''}>${g?'⏳ ':''}${fmt(up)} ₺</button>${!g&&ups>up?`<button class="btn" data-upmax ${state.money<ups?'disabled':''}>MAX ${fmt(ups)}</button>`:''}</div></div>`; }
  h+=`<button class="btn ${s.hold?'gold':'ghost'} wide" data-hold style="margin:-2px 0 10px">${s.hold?'🚧 Bakımda · misafir almıyor (aç)':'🚧 Yeni misafir alma (bakım modu)'}</button>`;
  h+=roomThemeHtml(id)+`<button class="btn wide" data-design style="margin:-2px 0 10px">🛋️ Odayı tasarla (${(s.furn||[]).length}/4 eşya · +${designSat(s)} memnuniyet)</button>`;
  for(const k in DECOR){ const D=DECOR[k], c=decorCost(k), has=s.decor[k];
    h+=`<div class="row"><div class="ic">${D.e}</div><div class="tx">${D.name}<small>Memnuniyet +${D.sat}${D.income?` · gecelik +${D.income} ₺`:''}</small></div>${has?'<button class="btn" disabled>Var ✓</button>':`<button class="btn" data-dec="${k}" ${state.money<c?'disabled':''}>${fmt(c)} ₺</button>`}</div>`; }
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet;
  const tk=sheet.querySelector('[data-talk]'); if(tk) tk.onclick=()=>openChat(R.guest);
  const ub=sheet.querySelector('[data-up]'); if(ub) ub.onclick=()=>{ orderRoomUpgrade(id); renderSheet(); };
  const um=sheet.querySelector('[data-upmax]'); if(um) um.onclick=()=>{ upgradeRoomMax(id); renderSheet(); };
  const hb=sheet.querySelector('[data-hold]'); if(hb) hb.onclick=()=>{ toggleHold(id); renderSheet(); };
  const dz=sheet.querySelector('[data-design]'); if(dz) dz.onclick=()=>{ sfx('click'); openDesigner(id); };
  sheet.querySelectorAll('[data-rth]').forEach(b=>b.onclick=()=>{ setRoomTheme(id,b.dataset.rth); renderSheet(); });
  sheet.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{ const k=b.dataset.dec, c=decorCost(k); if(s.decor[k]||!spend(c)) return; s.decor[k]=true; qEv('upg'); if(R.guest) R.guest.sat=clamp(R.guest.sat+DECOR[k].sat,0,100); buildRoomVisual(id,true); sfx('build'); save(); renderSheet(); });
}
function renderQuestSheet(){
  const Q=state.quests; if(!Q){ closeSheet(); return; }
  let h=`<h3>🎯 Görevler <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>${qTabsHtml('quests')}<p class="sub">${Q.day}. gün · her sabah yenilenir · hepsini bitirene bonus ve ün</p>`+claimAllBtn(questClaimables().length+(state.streak&&!state.streak.got?1:0),'data-qall')+streakRowHtml();
  Q.list.forEach((q,i)=>{ const D=QDEF[q.k], p=q.have/q.n, prog=q.k==='earn'?`${fmt(q.have)} / ${fmt(q.n)} ₺`:`${q.have} / ${q.n}`;
    h+=`<div class="row${q.claimed?' qdone':''}"><div class="ic">${D.e}</div><div class="tx">${questText(q)}<small>${prog}</small><div class="qbar"><i style="width:${(p*100).toFixed(0)}%"></i></div></div>
      ${q.claimed?'<button class="btn" disabled>Alındı ✓</button>':q.done?`<button class="btn gold qclaim" data-claim="${i}">Al 🎁<br>+${fmt(q.rew)} ₺</button>`:`<button class="btn ghost" disabled>🎁 ${fmt(q.rew)} ₺</button>`}</div>`; });
  h+=`<p class="note">${Q.bonus?'🎉 Bugünün bonusu alındı. Yarın yeni görevler gelecek!':'🎁 Üç görevi de bitirirsen ek para ve +3 ün kazanırsın.'}</p>`;
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet;
  bindQTabs(sheet); const qa=sheet.querySelector('[data-qall]'); if(qa) qa.onclick=()=>{ qa.disabled=true; claimAllQuests(); }; const sk=sheet.querySelector('[data-streak]'); if(sk) sk.onclick=()=>{ claimStreak(); renderSheet(); };
  sheet.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{ claimQuest(+b.dataset.claim); renderSheet(); });
}
// =====================================================================
// ADMIN PANEL
// =====================================================================
let gameSpeed=1;
const ADMIN={
  money:v=>{ state.money+=v*cm(); coinsFly(player.x,1,player.z,player.f,v*cm()); },
  moneyZero:()=>{ state.money=0; dispMoney=0; },
  stars:n=>{ state.rep=n>=5?100:(n-1)*20+10; refreshPads(); sfx('star'); },
  speed:n=>{ gameSpeed=n; },
  morning:()=>{ state.t=0.02; }, noon:()=>{ state.t=0.3; }, night:()=>{ state.t=0.8; },
  endDay:()=>{ closeSheet(); state.t=0.999; },
  weather:k=>{ state.weather=k; applyWeather(); },
  season:i=>{ let n=0; while(seasonIx()!==i&&n++<20) state.day++; applySeason(); if(state.weather==='snow'&&!isWinter()) { state.weather='sun'; applyWeather(); } if(state.quests&&state.quests.day!==state.day) newQuests(); },
  next:()=>{ const d=PADS.filter(padAvailable).sort((a,b)=>a.cost-b.cost)[0]; if(!d){ toast('Açılacak alan kalmadı'); return; } if(padLocked(d)) state.rep=Math.max(state.rep,(d.stars-1)*20+1); completePad(d); },
  floorAll:()=>{ adminBulk=true; let n=0; for(let i=0;i<120;i++){ const d=PADS.find(x=>padAvailable(x)&&x.f===player.f&&x.kind!=='floor'); if(!d) break; completePad(d); n++; } adminBulk=false; ents.forEach(unstick); toast(`🏗️ ${n} alan açıldı`); sfx('build'); },
  allOpen:()=>{ adminBulk=true; state.rep=Math.max(state.rep,61); let n=0; for(let i=0;i<200;i++){ const d=PADS.find(padAvailable); if(!d) break; completePad(d); n++; } adminBulk=false; ents.forEach(unstick); applyFloorVis(); toast(`🏗️ ${n} alan açıldı`); sfx('star'); },
  cleanAll:()=>{ for(const k in state.rooms){ cleanRoom(+k,true); fixRoom(+k,true); } },
  suiteAll:()=>{ for(const k in state.rooms){ const s=state.rooms[k]; s.type='suite'; s.decor={art:true,plant:true,bar:true}; buildRoomVisual(+k,false); } ents.forEach(unstick); sfx('build'); },
  staffMax:()=>{ if(Object.keys(STAFF).every(k=>state.staff[k].n>=STAFF[k].max&&state.staff[k].lvl>=STAFF_SPEED.length)){ toast('👥 Tüm personel zaten maksimumda','bad'); return; } for(const k in STAFF){ const s=state.staff[k]; while(s.n<STAFF[k].max){ s.n++; spawnStaff(k,true); } s.lvl=STAFF_SPEED.length; } sfx('build'); },
  upgMax:()=>{ if(Object.keys(UPG).every(k=>state.up[k]>=UPG[k].costs.length)){ toast('⬆️ Tüm yükseltmeler zaten maksimumda','bad'); return; } for(const k in UPG) state.up[k]=UPG[k].costs.length; updateCarryUI(); sfx('star'); },
  guests:()=>{ for(let i=0;i<3;i++) spawnGuest(); },
  bus:()=>{ if(bus){ toast('Otobüs zaten yolda'); return; } startBus(); },
  insp:()=>{ spawnGuest('insp'); banner('🕵️ Otel müfettişi geldi!','Onu mutlu et: bekletme, temiz ve iyi bir oda ver'); },
  vip:()=>{ spawnGuest('vip'); },
  breakdown:()=>{ const ids=roomsWhere(id=>!state.rooms[id].broken); if(!ids.length) return; const id=rand(ids); state.rooms[id].broken=true; applyRoomState(id); toast(`🔧 Oda ${id} arızalandı!`,'bad'); },
  quests:()=>{ if(!state.quests) newQuests(); state.quests.list.forEach(q=>{ if(!q.done){ q.have=q.n; q.done=true; } }); },
  newQuests:()=>{ newQuests(); },
  skipTut:()=>{ state.tut=TUT.length; if(!state.quests) newQuests(); hint('Eğitim atlandı',2); },
  heli:()=>{ if(!built('roof')){ toast('Önce çatı katını aç'); return; } startHeli(); },
  crisis:k=>{ if(state.crisis&&k!=='flu'){ toast('Zaten bir kriz var'); return; } startCrisis(k); },
  crisisEnd:()=>{ if(state.crisis) resolveCrisis(false); healAll(); },
  catMess:()=>{ if(!state.catOn) catArrive(); catKnock(); },
  clearPiles:()=>{ for(const k in state.piles) if(state.piles[k]>0) collectPile(k); for(const k in state.rooms) if(state.rooms[k].tip>0) collectTip(+k); },
};
function renderAdminSheet(){
  const b=(act,arg,label,cls,on)=>`<button class="btn ${cls||'ghost'} abtn${on?' on':''}" data-a="${act}" data-v="${arg==null?'':arg}">${label}</button>`;
  const sec=(t,inner)=>`<div class="asec"><div class="at">${t}</div><div class="agrid">${inner}</div></div>`;
  const st=stars(), h=`<h3>🛠️ Admin paneli <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>
    <p class="sub">💰 ${fmt(state.money)} ₺ · ${'★'.repeat(st)} (ün ${Math.round(state.rep)}) · ${season().e} Gün ${state.day} · 🕒 ${$('clock').textContent} · ${WEATHER[state.weather].e}</p>`+
    sec('💰 Para',b('money',1000,'+1.000','gold')+b('money',10000,'+10.000','gold')+b('money',100000,'+100.000','gold')+b('clearPiles','','Tüm parayı topla')+b('moneyZero','','Sıfırla','red'))+
    sec('⭐ Yıldız',[1,2,3,4,5].map(n=>b('stars',n,'★'.repeat(n),'',st===n)).join(''))+
    sec('⏩ Oyun hızı',[1,2,4,8].map(n=>b('speed',n,n+'x','',gameSpeed===n)).join(''))+
    sec('🕒 Zaman',b('morning','','🌅 Sabah')+b('noon','','☀️ Öğle')+b('night','','🌙 Gece')+b('endDay','','⏭️ Günü bitir'))+
    sec('🌦️ Hava',Object.keys(WEATHER).map(k=>b('weather',k,WEATHER[k].e,'',state.weather===k)).join(''))+
    sec('🍂 Mevsim',SEASONS.map((s,i)=>b('season',i,s.e+' '+s.name,'',seasonIx()===i)).join(''))+
    sec('🏗️ İnşaat',b('next','','Sıradakini aç','gold')+b('floorAll','','Bu kattakileri aç')+b('allOpen','','Tüm oteli aç','gold'))+
    sec('🛏️ Odalar',b('cleanAll','','Hepsini temizle + onar')+b('suiteAll','','Hepsi Suit + dekor'))+
    sec('👥 Personel ve sen',b('staffMax','','Tüm personel maks')+b('upgMax','','Tüm yükseltmeler maks'))+
    sec('🎲 Olaylar',b('guests','','+3 misafir')+b('vip','','🌟 Ünlü')+b('insp','','🕵️ Müfettiş')+b('bus','','🚌 Tur otobüsü')+b('heli','','🚁 Helikopter')+b('breakdown','','🔧 Arıza çıkar'))+
    sec('🚨 Kriz ve kedi',b('crisis','power','⚡ Elektrik kesintisi')+b('crisis','flood','💧 Boru patlat')+b('crisis','flu','🤧 Grip salgını')+b('crisisEnd','','✅ Krizi bitir')+b('catMess','','🐱 Kedi saksı devirsin'))+
    sec('🎯 Görevler',b('quests','','Hepsini tamamla')+b('newQuests','','Yeni görevler')+(state.tut<TUT.length?b('skipTut','','Eğitimi atla'):''))+
    `<button class="btn gold wide" data-sbexit>🏠 Ana oyuna dön</button><p class="note">Deneme modundasın: burada yaptıkların ana oyununu etkilemez.</p>`;
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h;
  sheet.querySelector('[data-close]').onclick=closeSheet;
  const sx=sheet.querySelector('[data-sbexit]'); if(sx) sx.onclick=exitSandbox;
  sheet.querySelectorAll('[data-a]').forEach(el=>el.onclick=()=>{ const a=el.dataset.a, v=el.dataset.v; sfx('click');
    ADMIN[a](v===''?undefined:isNaN(+v)?v:+v); markSave(); updateHUD(); if(sheetMode==='admin'){ sheet._h=null; renderSheet(); } });
}
function showReport(day,t,repNow){
  const inc=t.rooms+t.tips+t.amen+t.req+(t.chainInc||0), net=inc-t.wages-(t.interest||0)-(t.zam||0), dr=t.rep0==null?null:Math.round(repNow-t.rep0);
  openModal(`<h3>🌅 ${day}. gün bitti</h3><p class="sub">${season().e} ${season().name} · yarın ${WEATHER[state.weather].e}</p>
    <div class="kv"><span>🛏️ Oda gelirleri</span><b>${fmt(t.rooms)} ₺</b></div>
    <div class="kv"><span>💵 Bahşiş ve istekler</span><b>${fmt(t.tips+t.req)} ₺</b></div>
    <div class="kv"><span>🍽️ Tesisler${t.cafe?' ve kahve':''}</span><b>${fmt(t.amen+(t.cafe||0))} ₺</b></div>${t.quest?`<div class="kv"><span>🎯 Görev ödülleri</span><b>${fmt(t.quest)} ₺</b></div>`:''}
    ${t.chainInc?`<div class="kv"><span>🏨 Zincir otelleri</span><b>${fmt(t.chainInc)} ₺</b></div>`:''}<div class="kv neg"><span>👥 Maaşlar</span><b>−${fmt(t.wages)} ₺</b></div>${t.zam?`<div class="kv neg"><span>⚡ Elektrik zammı</span><b>−${fmt(t.zam)} ₺</b></div>`:''}${t.interest?`<div class="kv neg"><span>🏦 Kredi faizi</span><b>−${fmt(t.interest)} ₺</b></div>`:''}
    ${t.perf!=null?`<div class="kv"><span>⭐ Günün performansı</span><b>${t.perf}/100${t.repDrift?` · ün ${t.repDrift>0?'+':''}${t.repDrift}`:''}</b></div>`:''}
    <div class="kv tot${net<0?' neg':''}"><span>Net</span><b>${net<0?'−':''}${fmt(Math.abs(net))} ₺</b></div>
    <div class="grid2" style="margin-top:10px"><div class="stat">Misafir<b>${t.guests}</b></div><div class="stat">Mutlu / mutsuz<b>😄 ${t.happy} · 😠 ${t.unhappy}</b></div>
    <div class="stat">Bekleyip giden<b>${t.left}</b></div><div class="stat">Ün değişimi<b>${dr==null?'—':(dr>=0?'+':'')+dr}</b></div></div>
    <div id="newsBox" style="margin-top:10px"></div><h4 style="margin:10px 0 4px">💬 Misafir yorumları</h4><div id="revBox"></div>
    <button class="btn wide" id="repOk">Devam</button>`,m=>{ m.querySelector('#repOk').onclick=closeModal; fillReviews(m.querySelector('#revBox')); fillNews(m.querySelector('#newsBox'),day,t,dr); });
  setTimeout(()=>{ if(modal.querySelector('#repOk')) closeModal(); },16000);
}
function openSettings(){
  const V=state.vol||{sfx:.55,music:.45};
  openModal(`<h3>⚙️ Ayarlar <button class="xbtn" id="sClose2" aria-label="Kapat">✖</button></h3>
    <div class="row"><div class="ic">🔊</div><div class="tx">Efektler</div><div class="vol"><input type="range" min="0" max="100" value="${Math.round(V.sfx*100)}" id="vSfx" aria-label="Efekt ses seviyesi"></div></div>
    <div class="row"><div class="ic">🎵</div><div class="tx">Müzik</div><div class="vol"><input type="range" min="0" max="100" value="${Math.round(V.music*100)}" id="vMus" aria-label="Müzik ses seviyesi"></div></div>
    <div class="row" style="flex-wrap:wrap"><div class="ic">🖼️</div><div class="tx">Grafik kalitesi<small>${state.gfxAuto!==false?'Otomatik: oyun yavaşlarsa kaliteyi düşürür':'Elle seçildi'}</small></div><div style="display:flex;gap:4px;flex-wrap:wrap;width:100%;justify-content:flex-end">${[['low','Düşük'],['mid','Orta'],['high','Yüksek']].map(([k,l])=>`<button class="btn ${gfxLevel()===k?'':'ghost'}" style="padding:4px 8px;min-height:34px" data-gfx="${k}">${l}</button>`).join('')}<button class="btn ${state.gfxAuto!==false?'':'ghost'}" style="padding:4px 8px;min-height:34px" id="gAuto">Oto</button></div></div>
    ${(document.fullscreenEnabled||document.webkitFullscreenEnabled)?`<button class="btn wide" id="sFs">⛶ Tam ekran ${fsEl()?'kapat':'aç'}</button>`:''}
    ${cloudHtml()}
    <button class="btn wide" id="sHelp">📖 Nasıl oynanır</button>
    <div style="display:flex;gap:6px"><button class="btn wide" id="sGuide">📘 Rehber</button><button class="btn ghost wide" id="sLowFx">✨ Efektleri azalt: ${state.lowFx?'Açık':'Kapalı'}</button></div>
    <button class="btn wide" id="sCustom">🎨 Otelim ve karakterim</button>
    <div style="display:flex;gap:6px"><button class="btn ghost wide" id="sExp">💾 Kaydı indir</button><button class="btn ghost wide" id="sImp">📂 Kayıt yükle</button></div>
    <button class="btn gold wide" id="sAdmin">🛠️ Admin paneli</button>
    <button class="btn red wide" id="sReset">İlerlemeyi sıfırla</button>`,m=>{
    const vs=m.querySelector('#vSfx'), vm=m.querySelector('#vMus'), fb=m.querySelector('#sFs');
    bindCloud(m);
    if(fb) fb.onclick=()=>{ sfx('click'); closeModal(); toggleFullscreen(); };
    vs.oninput=()=>{ state.vol=Object.assign({},state.vol,{sfx:vs.value/100}); state.sound=vs.value>0; audioInit(); applyAudioPrefs(); };
    vm.oninput=()=>{ state.vol=Object.assign({},state.vol,{music:vm.value/100}); state.music=vm.value>0; audioInit(); applyAudioPrefs(); };
    vs.onchange=()=>{ sfx('coin'); save(); }; vm.onchange=()=>save();
    m.querySelectorAll('[data-gfx]').forEach(b=>b.onclick=()=>{ state.gfx=b.dataset.gfx; state.gfxAuto=false; save(); applyGfx(); openSettings(); if(b.dataset.gfx==='high'&&!composer) toast('Efektler yükleniyor…'); });
    m.querySelector('#gAuto').onclick=()=>{ state.gfxAuto=state.gfxAuto===false; save(); openSettings(); };
    m.querySelector('#sHelp').onclick=openHelp;
    m.querySelector('#sGuide').onclick=openGuide; m.querySelector('#sLowFx').onclick=()=>{ state.lowFx=!state.lowFx; save(); openSettings(); };
    m.querySelector('#sCustom').onclick=()=>{ closeModal(); openSheet('custom'); };
    m.querySelector('#sExp').onclick=exportSave; m.querySelector('#sImp').onclick=importSave;
    m.querySelector('#sAdmin').onclick=()=>{ closeModal(); openAdmin(); };
    m.querySelector('#sClose2').onclick=closeModal;
    m.querySelector('#sReset').onclick=()=>openModal(`<h3>Emin misin?</h3><p class="sub">Tüm otel, para ve yükseltmeler silinecek. İstersen önce kaydı indir.</p><button class="btn red wide" id="rYes">Evet, sıfırla</button><button class="btn ghost wide" id="rNo">Vazgeç</button>`,m2=>{
      m2.querySelector('#rNo').onclick=openSettings; m2.querySelector('#rYes').onclick=()=>{ try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY+'_bak'); }catch(e){} state=freshState(0,0); save(); location.reload(); }; });
  });
}
$('mgmtBtn').onclick=()=>{ sfx('click'); openSheet('mgmt'); };
$('questBtn').onclick=()=>{ sfx('click'); openSheet('quests'); };
$('setBtn').onclick=()=>{ sfx('click'); openSettings(); };
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
function toggleFullscreen(){ const d=document.documentElement;
  try{ if(fsEl()) (document.exitFullscreen||document.webkitExitFullscreen).call(document); else { const r=(d.requestFullscreen||d.webkitRequestFullscreen).call(d); if(r&&r.catch) r.catch(()=>{}); } }catch(e){} }
$('fsBtn').onclick=()=>{ sfx('click'); toggleFullscreen(); };
if(!(document.fullscreenEnabled||document.webkitFullscreenEnabled)) $('fsBtn').style.display='none';
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{ $('fsBtn').textContent=fsEl()?'🗗':'⛶'; }));
$('goal').onclick=()=>{ const g=curGoal; if(g&&g.target){ sfx('click'); peekFloor=null; player.goTo(g.target.f,g.target.x,g.target.z); } };

// =====================================================================
// INPUT
// =====================================================================
const keys={}; let curGoal=null;
window.addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT') return; if(e.key==='p'||e.key==='P'||e.key==='F2'){ e.preventDefault(); if(sheetMode==='admin') closeSheet(); else openAdmin(); return; } keys[e.key.toLowerCase()]=true; if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key==='Escape'){ closeSheet(); closeModal(); } if((e.key==='f'||e.key==='F')&&!e.repeat) toggleFullscreen(); });
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
window.addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
const joy={on:false,id:null,sx:0,sy:0,dx:0,dy:0};
const ptrs=new Map(); let pinch0=0, pinchDist0=0, pinchAng0=0, pinchYaw0=0;
const cvs=renderer.domElement, joyEl=$('joy'), knob=$('joyKnob');
cvs.addEventListener('pointerdown',e=>{
  cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});
  if(ptrs.size===2){ joyEnd(); const [a,b]=[...ptrs.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); pinchDist0=cam.dist; pinchAng0=Math.atan2(b.y-a.y,b.x-a.x); pinchYaw0=cam.yaw; }
});
cvs.addEventListener('pointermove',e=>{
  const p=ptrs.get(e.pointerId); if(!p) return; p.x=e.clientX; p.y=e.clientY;
  if(ptrs.size>=2&&fpMode){ const [a,b]=[...ptrs.values()], my=(a.y+b.y)/2; if(fpMidY!=null) fpPitch=clamp(fpPitch+(fpMidY-my)*0.006,FP_PMIN,FP_PMAX); fpMidY=my; return; }
  if(ptrs.size>=2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch0>0){ cam.dist=clamp(pinchDist0*pinch0/d,10,34); let da=Math.atan2(b.y-a.y,b.x-a.x)-pinchAng0; while(da>Math.PI) da-=2*Math.PI; while(da<-Math.PI) da+=2*Math.PI; if(!fpMode) cam.yaw=clamp(pinchYaw0-da,CAM_YAW[0],CAM_YAW[1]); } return; }
  const dx=p.x-p.sx, dy=p.y-p.sy;
  if(!joy.on&&Math.hypot(dx,dy)>12){ joy.on=true; joy.id=e.pointerId; joy.sx=p.sx; joy.sy=p.sy; joyEl.style.left=p.sx+'px'; joyEl.style.top=p.sy+'px'; joyEl.classList.add('show'); }
  if(joy.on&&joy.id===e.pointerId){ const L2=Math.hypot(dx,dy), m=Math.min(L2,52); joy.dx=L2?dx/L2*Math.min(1,L2/52):0; joy.dy=L2?dy/L2*Math.min(1,L2/52):0; knob.style.transform=`translate(${L2?dx/L2*m:0}px,${L2?dy/L2*m:0}px)`; }
});
function ptrUp(e){
  const p=ptrs.get(e.pointerId); if(!p) return; ptrs.delete(e.pointerId);
  if(joy.on&&joy.id===e.pointerId) joyEnd();
  else if(ptrs.size===0&&Math.hypot(p.x-p.sx,p.y-p.sy)<12&&performance.now()-p.t<450) onTap(p.x,p.y);
  if(ptrs.size<2) pinch0=0;
}
function joyEnd(){ joy.on=false; joy.id=null; joy.dx=joy.dy=0; joyEl.classList.remove('show'); knob.style.transform=''; }
cvs.addEventListener('pointerup',ptrUp); cvs.addEventListener('pointercancel',ptrUp);
let fpMidY=null; window.addEventListener('pointerup',()=>{ fpMidY=null; }); window.addEventListener('pointercancel',()=>{ fpMidY=null; });
cvs.addEventListener('wheel',e=>{ e.preventDefault(); if(fpMode){ fpPitch=clamp(fpPitch-e.deltaY*0.0016,FP_PMIN,FP_PMAX); return; } cam.dist=clamp(cam.dist*(1+e.deltaY*0.001),10,34); },{passive:false});
function inputVec(){
  let sx=joy.dx, sy=joy.dy;
  if(keys.w||keys.arrowup) sy-=1; if(keys.s||keys.arrowdown) sy+=1; if(keys.a||keys.arrowleft) sx-=1; if(keys.d||keys.arrowright) sx+=1;
  let m=Math.hypot(sx,sy); if(m<0.05) return {x:0,z:0,m:0}; if(m>1){ sx/=m; sy/=m; m=1; }
  const cy=Math.cos(cam.yaw), sy_=Math.sin(cam.yaw);
  const wx=sx*cy+(-sy)*(-sy_), wz=sx*(-sy_)+(-sy)*(-cy);
  const n=Math.hypot(wx,wz)||1; return {x:wx/n,z:wz/n,m};
}
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
let tapMarker=null;
function onTap(sx,sy){
  const r=cvs.getBoundingClientRect(); ndc.set(((sx-r.left)/r.width)*2-1,-((sy-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
  const gg=pickGuestAt(); if(gg){ openChat(gg); sfx('click'); return; }
  const se=pickStaffAt(); if(se){ openStaffChat(se); sfx('click'); return; }
  const groups=[]; for(const k in state.rooms){ const R=RT(+k); if(R.group&&roomInfo(+k).f===viewFloor) groups.push(R.group); }
  const hits=ray.intersectObjects(groups,true);
  if(hits.length){ let o=hits[0].object; while(o&&o.userData.roomId===undefined) o=o.parent;
    if(o){ const id=o.userData.roomId, s=state.rooms[id], R=RT(id);
      const act=s.dirty||s.broken||s.tip>0||(R.req&&player.c.items.includes(R.req.item));
      if(act){ const sp=roomReach(id); walkTo(sp.f,sp.x,sp.z); } else { sheetRoom=id; openSheet('room'); sfx('click'); }
      return; } }
  const o=ray.ray.origin, d=ray.ray.direction, py=viewFloor*FH;
  if(Math.abs(d.y)<1e-4) return; const t=(py-o.y)/d.y; if(t<0) return;
  let hx=o.x+d.x*t, hz=o.z+d.z*t, hf=viewFloor;
  if(viewFloor>0&&!inWalk(viewFloor,hx,hz)){ const t0=(0-o.y)/d.y; hx=o.x+d.x*t0; hz=o.z+d.z*t0; hf=0; }
  walkTo(hf,hx,hz);
}
function walkTo(f,x,z){
  if(!player.goTo(f,x,z)) return;
  peekFloor=null; sfx('click');
  if(!tapMarker){ tapMarker=mesh(new THREE.RingGeometry(0.22,0.32,24),new THREE.MeshBasicMaterial({color:0xffd76a,transparent:true,depthWrite:false}),0,0,0); tapMarker.rotation.x=-Math.PI/2; world.add(tapMarker); }
  tapMarker.position.set(x,f*FH+0.05,z); tapMarker.userData.life=0.6; tapMarker.visible=true;
}

// =====================================================================
// CAMERA
// =====================================================================
const cam={yaw:0.34,pitch:0.9,dist:LOWQ?22:19,tx:state.player.x,ty:0,tz:state.player.z};
function updateCamera(dt){
  if(fpMode){ updateCameraFP(dt); return; }
  let tx=player.x+camLA.x, ty=player.y, tz=player.z-0.8+camLA.z;
  if(peekFloor!=null){ ty=peekFloor*FH; tx=0; tz=-4.2; }
  if(camFocus&&camFocus.t>0){ tx=camFocus.x; ty=0; tz=camFocus.z; }
  const k=Math.min(1,dt*5); cam.tx+=(tx-cam.tx)*k; cam.ty+=(ty-cam.ty)*k; cam.tz+=(tz-cam.tz)*k;
  const cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
  let sx=0, sz=0; if(shake>0){ sx=rnd(-1,1)*shake; sz=rnd(-1,1)*shake; shake=Math.max(0,shake-dt*1.2); }
  const D=cam.dist+camZoomDyn; camera.position.set(cam.tx+Math.sin(cam.yaw)*cp*D+sx,cam.ty+sp*D,cam.tz+Math.cos(cam.yaw)*cp*D+sz);
  camera.lookAt(cam.tx,cam.ty+0.6,cam.tz);
}
function resize(){ VW=window.innerWidth; VH=window.innerHeight; renderer.setSize(VW,VH,false); camera.aspect=VW/VH; camera.fov=fpMode?fpFov():VW<VH?40:33; camera.updateProjectionMatrix(); resizeComposer(); }
window.addEventListener('resize',resize);

// =====================================================================
// GOAL ARROW
// =====================================================================
const goalArrow=new THREE.Group();
goalArrow.add(mesh(cone(0.26,0.55,16),new THREE.MeshStandardMaterial({color:0xffd76a,emissive:0xf2a51d,emissiveIntensity:.6,roughness:.4}),0,0,0));
goalArrow.children[0].rotation.x=Math.PI; world.add(goalArrow);
const offArrow=$('offArrow');
function updateGoalArrow(t){
  const g=curGoal;
  if(!g||!g.target||(g.target.f>viewFloor)){ goalArrow.visible=false; offArrow.classList.remove('show'); return; }
  const tg=g.target; goalArrow.visible=true; goalArrow.position.set(tg.x,tg.y+2.3+Math.sin(t*4)*0.18,tg.z); goalArrow.rotation.y=t*2;
  const near=d2(player.x,player.z,tg.x,tg.z)<2.2&&player.f===tg.f;
  goalArrow.visible=!near;
  const p=project(tg.x,tg.y+1,tg.z), m=46;
  const off=!p||p.x<m||p.x>VW-m||p.y<110||p.y>VH-m;
  if(off&&!near){ let px,py; const c={x:VW/2,y:VH/2};
    if(!p){ _v.set(tg.x,tg.y,tg.z).project(camera); px=c.x-(_v.x)*VW; py=c.y+(_v.y)*VH; } else { px=p.x; py=p.y; }
    const ang=Math.atan2(py-c.y,px-c.x), ex=clamp(c.x+Math.cos(ang)*VW,m,VW-m), ey=clamp(c.y+Math.sin(ang)*VH,120,VH-m);
    offArrow.style.transform=`translate(${ex-23}px,${ey-23}px) rotate(${ang}rad)`; offArrow.classList.add('show');
  } else offArrow.classList.remove('show');
}

// =====================================================================
// MAIN LOOP
// =====================================================================
let last=performance.now(), gtime=0, hudT=0, movedDist=0, lastView=-1;
function updatePlayer(dt){
  if(fpMode) return updatePlayerFP(dt);
  const p=player; p.speed=playerSpeed();
  const v=inputVec(), act=v.m>0.1&&!p.riding;
  const tvx=act?v.x*p.speed*v.m:0, tvz=act?v.z*p.speed*v.m:0, k=Math.min(1,dt*(act?9:13));
  p.vx=(p.vx||0)+(tvx-(p.vx||0))*k; p.vz=(p.vz||0)+(tvz-(p.vz||0))*k;
  if(act){ p.path=null; p.onArrive=null; p.tRot=Math.atan2(v.x,v.z); peekFloor=null; }
  if(!p.path&&!p.riding&&Math.hypot(p.vx,p.vz)>0.04){ const ox=p.x, oz=p.z; moveCollide(p,p.vx*dt,p.vz*dt); const mv=Math.hypot(p.x-ox,p.z-oz); movedDist+=mv; p.moving=mv>0.002; if(!act&&mv<0.001){ p.vx=p.vz=0; } }
  else { p.moving=false; if(p.path){ p.vx=p.vz=0; const ox=p.x, oz=p.z; p.step(dt); movedDist+=Math.hypot(p.x-ox,p.z-oz); } }
  if(state.tut===0&&movedDist>2.5) tutEvent('moved');
  state.player.x=p.x; state.player.z=p.z; state.player.f=p.f;
}
function updateWorldAnim(dt,t){
  const open=ents.some(e=>e.f===0&&Math.abs(e.x)<1.6&&Math.abs(e.z-7.5)<1.6)?0.95:0;
  doorL.position.x+=((-0.5-open)-doorL.position.x)*Math.min(1,dt*7); doorR.position.x+=((0.5+open)-doorR.position.x)*Math.min(1,dt*7);
  cars.forEach(c=>{ c.g.position.x+=c.dir*c.speed*dt; if(c.g.position.x>60) c.g.position.x=-60; if(c.g.position.x<-60) c.g.position.x=60; });
  boats.forEach(b=>{ b.g.position.x+=b.speed*dt; if(b.g.position.x>60) b.g.position.x=-60; if(b.g.position.x<-60) b.g.position.x=60; b.g.position.y=Math.sin(t+b.g.position.x)*0.05; });
  balloons.forEach(b=>{ b.g.position.x+=b.sp*0.25*dt; if(b.g.position.x>40) b.g.position.x=-40; b.g.position.y=b.y0+Math.sin(t*0.4+b.ph)*0.8; b.g.rotation.y+=dt*0.05; });
  birds.forEach(b=>{ const a=t*b.sp+b.ph; b.g.position.set(b.cx+Math.cos(a)*b.r,b.h+Math.sin(t*1.3+b.ph)*0.4,b.cz+Math.sin(a)*b.r); b.g.rotation.y=-a+(b.sp>0?0:Math.PI); const fl=Math.sin(t*9+b.ph)*0.6; b.p1.rotation.z=fl; b.p2.rotation.z=-fl; });
  if(seaTex){ seaTex.offset.x+=dt*0.01; seaTex.offset.y+=dt*0.006; }
  if(poolWater){ poolWater.material.map.offset.x+=dt*0.03; poolWater.material.map.offset.y+=dt*0.02; }
  for(const k in state.rooms){ const R=RT(+k); if(!R.parts||!R.group.visible) continue;
    if(R.parts.flies.visible) R.parts.flies.children.forEach(fl=>{ const u=fl.userData.fly; fl.position.set(Math.cos(t*u.sp+u.ph)*u.r,u.h+Math.sin(t*u.sp*1.7)*0.1,Math.sin(t*u.sp+u.ph)*u.r); });
    if(R.parts.broken.visible) R.parts.broken.children.forEach(sp=>{ if(sp.userData.spark!==undefined) sp.visible=Math.sin(t*25+sp.userData.spark*7)>0.3; }); }
  for(const id in padVis){ const ic=padVis[id].ic; ic.position.y=0.62+Math.sin(t*3)*0.08; ic.quaternion.copy(camera.quaternion); }
  if(xmasTree&&xmasTree.visible) xmasTree.children[xmasTree.children.length-1].rotation.y+=dt*2;
  restLamps.forEach(g=>g.visible=nightF>0.3);
  if(cafeBarista){ cafeWork=Math.max(0,cafeWork-dt); cafeBarista.mode=cafeWork>0?'work':'idle'; animChar(cafeBarista,dt);
    cafeSteam.forEach(p=>{ const k=(t*0.55+p.userData.ph)%1, on=cafeWork>0||k<0.5; p.position.y=1.12+k*0.6; p.scale.setScalar(0.6+k*1.6); p.material.opacity=on?(1-k)*0.45:0; }); }
  updateBus(dt*gameSpeed,t); updatePolish(dt,t); updateMega(dt,t); updateFeatures(dt,t); updateExtras(dt,t); updateFountain(t); updateEnv(dt,1-nightF,WEATHER[state.weather].light); updateClouds(t,1-nightF);
  if(restChef){ restChef.mode=restOpen()?'work':'idle'; animChar(restChef,dt); }
  if(tapMarker&&tapMarker.visible){ tapMarker.userData.life-=dt; tapMarker.material.opacity=Math.max(0,tapMarker.userData.life/0.6); tapMarker.scale.setScalar(1+(0.6-tapMarker.userData.life)); if(tapMarker.userData.life<=0) tapMarker.visible=false; }
  const rider=player&&player.riding?player:ents.find(e=>e.riding); if(rider&&cabin) cabin.position.y=rider.y;
  $('camCtl').classList.toggle('hide',fpMode);
}
// hata kalkanı: bir alt sistem hata verirse sadece o atlanır, oyun donmaz
const gameErrs={}; window.__gameErrs=gameErrs; let errToastT=0;
function guard(name,fn){ try{ fn(); }catch(e){ const k=name+': '+(e&&e.message||e); gameErrs[k]=(gameErrs[k]||0)+1;
  if(gameErrs[k]===1){ console.error('[oyun]',name,e); if(performance.now()>errToastT){ errToastT=performance.now()+60000; try{ logEvent('⚠️ Küçük bir hata atlandı ('+name+')'); }catch(_){} } } } }
function frame(now){
  requestAnimationFrame(frame);
  const rawDt=(now-last)/1000, dt=Math.min(0.05,rawDt); last=now; gtime+=dt; trackFps(rawDt);
  if(!player) return;
  for(let k=0;k<gameSpeed;k++){
    guard('oyuncu',()=>{ updatePlayer(dt); updatePlayerZones(dt); updatePads(dt); updateDesk(dt); if(chainFlash>0) chainFlash-=dt; });
    guard('misafir',()=>updateGuests(dt)); guard('personel',()=>updateStaff(dt));
    guard('hareket',()=>{ for(const e of ents.slice()) if(e!==player) e.step(dt); });
    guard('zaman',()=>{ updateSpawner(dt); updateBreakdowns(dt); updateTime(dt); });
  }
  guard('kalabalık',()=>{ separateEnts(); updateCamKeys(dt); });
  guard('kat',()=>{ viewFloor=peekFloor!=null?peekFloor:(player.riding?Math.max(player.f,player.path&&player.path[player.pi]?player.path[player.pi].f:player.f):player.f);
    if(viewFloor!==lastView){ lastView=viewFloor; applyFloorVis(); }
    if(cabin) cabin.visible=floorVisible(cabin.position.y); });
  guard('çizim',()=>{ for(const e of ents.slice()) e.sync(dt); });
  guard('efekt',()=>{ updateAnims(dt); updateFx3(dt); });
  guard('dünya',()=>updateWorldAnim(dt,gtime));
  guard('mega2',()=>updateMega2(dt*gameSpeed)); guard('derinlik',()=>updateDepth(dt*gameSpeed)); guard('derinlik2',()=>updateDepth2(dt*gameSpeed));
  guard('olaylar',()=>updateEvents3(dt*gameSpeed)); guard('tamir',()=>updateFixGame(dt)); guard('grafik2',()=>updateGfx2(dt,gtime)); guard('bulut',()=>updateCloud(dt)); guard('cila',()=>updatePolish3(dt)); guard('resepsiyon',()=>updateOps(dt*gameSpeed)); guard('canli',()=>updateLive(dt*gameSpeed,gtime)); guard('tesis',()=>updateAmenLife(dt*gameSpeed)); guard('akis',()=>updateFlow(dt*gameSpeed)); guard('gercek',()=>updateReal(dt*gameSpeed)); guard('icerik',()=>updateContent(dt*gameSpeed,gtime)); guard('mescit',()=>updateMescit(dt)); guard('perf',()=>updatePerf(dt)); guard('gfx3',()=>updateGfx3(dt,gtime)); guard('ops2',()=>updateOps2(dt*gameSpeed)); guard('world',()=>updateWorld(dt));
  guard('kamera',()=>{ updateCamera(dt); updateSky(cam.tx,cam.tz); updateWeatherFx(dt,gtime,cam.tx,cam.ty,cam.tz); updateGoalArrow(gtime); });
  guard('render',()=>renderFrame());
  guard('etiket',()=>{ renderTags(); updateMoneyHUD(dt); });
  hudT-=dt; if(hudT<=0){ hudT=0.25; guard('hud',()=>updateHUD()); if(sheetMode&&performance.now()-sheetTouch>800) guard('menü',()=>renderSheet()); }
  saveT-=dt; if(saveT<=0){ saveT=4; if(saveDirty) save(); }
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); });
window.addEventListener('pagehide',save);

// =====================================================================
// BOOT
// =====================================================================
function boot(){
  resize(); applyTheme();
  PADS=padDefs(); PADMAP={}; PADS.forEach(d=>PADMAP[d.id]=d);
  buildGround(); buildShell(); buildXmas();
  ['depo','staff','cafe','rest','pool','gym','spa','laundry','f2','f3','roof'].forEach(id=>{ if(built(id)) buildFeature(id,false); });
  Object.keys(state.rooms).forEach(k=>{ const s=state.rooms[k]; s.decor=s.decor||{}; buildRoomVisual(+k,false); });
  Object.keys(L.piles).forEach(pileChanged);
  if(!state.quests||state.quests.day!==state.day) newQuests();
  refreshPads(); applySeason(); applyWeather();
  player=new Ent(LOOKS.player()); player.isPlayer=true;
  player.place(state.player.x,state.player.z,Math.min(state.player.f,floorsBuilt()-1)); unstick(player);
  cam.tx=player.x; cam.tz=player.z-0.8; cam.ty=player.y;
  for(const k in STAFF) for(let i=0;i<state.staff[k].n;i++) spawnStaff(k,false);
  tagAdd({kind:'desk'}); tagAdd({kind:'work'}); bootExtras(); bootDepth(); bootDepth2(); bootGfx2(); bootPolish3(); streakCheck(); bootContent(); bootMescit(); bootCity(); bootWorld(); try{ mergeOutdoorStatic(); }catch(e){ console.warn(e); } bootGfx3();
  updateCarryUI(); updateHUD(); applyFloorVis();
  requestAnimationFrame(t=>{ last=t; frame(t); });
  setTimeout(()=>{ const b=$('boot'); b.style.opacity='0'; setTimeout(()=>b.remove(),500);
    if(state.tut<TUT.length) hint(TUT[state.tut].hint,5); else if(state.day===1&&state.prestige>0) banner(`🏙️ ${city().name}`,'Yeni şehirde yeni bir otel!'); },350);
}
boot();
