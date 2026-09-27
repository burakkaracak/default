
// =====================================================================
// FAZ 3 · İÇERİK: misafir albümü, 5★ sonrası kademeler (Elmas/Platin),
// haftalık "Yılın Oteli" ligi, müdür masası (günlük strateji kartları),
// kat temaları + kat salonu, şehre özel tesis ve şehre göre bahçe
// =====================================================================

// ---------- misafir albümü (şehirler arası kalıcı) ----------
const ALB_TIERS=[1,10,50,150];
function albumList(){
  const L=Object.keys(GTYPES).map(k=>({k,e:GTYPES[k].e,n:k==='million'?'Gizli milyoner':GTYPES[k].name}));
  L.find(x=>x.k==='million').e='🎩';
  L.push({k:'lucky',e:'🍀',n:'Şanslı misafir'});
  Object.keys(STORIES).forEach(s=>L.push({k:'st_'+s,e:STORIES[s].e,n:STORIES[s].name,story:true}));
  return L;
}
function albumNote(k){ if(state.sandbox||!k) return; const A=state.album||(state.album={}), a=A[k]||(A[k]={n:0,got:0}); a.n++;
  if(a.n===1&&state.tut>=TUT.length){ const it=albumList().find(x=>x.k===k); if(it) toast(`📖 Albüme yeni misafir: ${it.e} ${it.n}`); } }
function albumNoteGuest(g){ albumNote(g.type); if(g.lucky) albumNote('lucky'); if(g.story) albumNote('st_'+g.story.k); }
function albRew(t){ return [{m:60,xp:40},{m:250,xp:80},{m:900,xp:160},{m:2500,xp:300,key:1}][t]; }
function albClaimables(){ const A=state.album||{}, out=[]; albumList().forEach(it=>{ const a=A[it.k]; if(!a) return; for(let t=a.got;t<ALB_TIERS.length&&a.n>=ALB_TIERS[t];t++) out.push([it.k,t]); }); return out; }
function claimAlb(k){ const a=(state.album||{})[k]; if(!a||a.got>=ALB_TIERS.length||a.n<ALB_TIERS[a.got]) return; const r=albRew(a.got); a.got++;
  addMoney(r10(r.m*cm()),player.x,player.y+1.2,player.z,player.f,true); gainXP(r.xp); if(r.key) state.keys=(state.keys||0)+r.key; sfx('coin'); markSave(); }
function claimAllAlb(){ const L=albClaimables(); L.forEach((x,i)=>setTimeout(()=>{ claimAlb(x[0]); if(sheetMode==='album') renderSheet(); },i*200)); }
function renderAlbumSheet(){
  const A=state.album||{}, L=albumList(), seen=L.filter(x=>A[x.k]).length;
  let h=`<h3>🎯 Görevler <button class="xbtn" data-close aria-label="Kapat">✖</button></h3>${qTabsHtml('album')}<p class="sub">📖 Misafir albümü · ${seen}/${L.length} keşfedildi · her misafir tipi 1/10/50/150'de ödül verir, şehirler arası kalır</p>`+claimAllBtn(albClaimables().length,'data-aall');
  h+='<div class="albg">'; L.forEach(it=>{ const a=A[it.k], t=a?a.got:0, can=a&&t<4&&a.n>=ALB_TIERS[t], nx=a&&t<4?ALB_TIERS[t]:null;
    h+=`<div class="albc${a?'':' lock'}"><div class="ae">${a?it.e:'❓'}</div><div class="an">${a?it.n:'???'}</div><div class="at">${'★'.repeat(t)}${'☆'.repeat(4-t)}</div><small>${a?a.n+(nx?' / '+nx:' ✓'):'keşfedilmedi'}</small>${can?`<button class="btn gold" data-alb="${it.k}">Al 🎁</button>`:''}</div>`; });
  h+='</div>';
  if(sheet._h===h) return; sheet._h=h; sheet.innerHTML=h; sheet.querySelector('[data-close]').onclick=closeSheet; bindQTabs(sheet);
  sheet.querySelectorAll('[data-alb]').forEach(b=>b.onclick=()=>{ claimAlb(b.dataset.alb); renderSheet(); });
  const aa=sheet.querySelector('[data-aall]'); if(aa) aa.onclick=()=>{ aa.disabled=true; claimAllAlb(); };
}

// ---------- 5★ sonrası kademeler ----------
const TIERS=[null,{e:'💎',n:'Elmas',mult:1.1},{e:'👑',n:'Platin',mult:1.2}];
function tierNeeds(t){
  const invN=l=>Object.keys(INV).filter(k=>invLv(k)>=l).length, rt=repTarget()||0;
  return t===1?[['5★',stars()>=5],['Son 3 gün performansı ≥ 85',rt>=85],['Otel tamamlandı',!!state.done],['3 yatırım ≥ 1. seviye',invN(1)>=3]]
             :[['💎 Elmas',(state.tier||0)>=1],['Son 3 gün performansı ≥ 90',rt>=90],['5 yatırım ≥ 2. seviye',invN(2)>=5],['Yılın Oteli birinciliği',(state.leagueWins||0)>=1]];
}
function tierMult(){ const t=TIERS[state.tier||0]; return t?t.mult:1; }
function checkTier(){ const t=state.tier||0; if(t>=2||state.sandbox) return; if(tierNeeds(t+1).every(r=>r[1])){ state.tier=t+1; const T=TIERS[t+1];
  setTimeout(()=>{ banner(`${T.e} ${T.n} otel oldun!`,`Tüm gelirler +%${Math.round((T.mult-1)*100)} · yeni cephe süsü`); sfx('star'); if(!state.lowFx){ fireworksShow(); confettiAt(player.x,player.y+2,player.z,120); } applyTierDeco(); },1500); markSave(); } }
function tierHtml(){
  if(stars()<5&&!(state.tier>0)) return '';
  const t=state.tier||0; let h=`<div class="ugh">${t?TIERS[t].e+' '+TIERS[t].n+' otel':'⭐ 5 yıldızın ötesi'}</div>`;
  if(t<2){ const nx=TIERS[t+1]; h+=`<div class="row"><div class="ic">${nx.e}</div><div class="tx">${nx.n} için<small>${tierNeeds(t+1).map(([n,ok])=>`${ok?'✅':'⬜'} ${n}`).join(' · ')}</small><small>Ödül: tüm gelirler +%${Math.round((nx.mult-1)*100)}</small></div></div>`; }
  else h+=`<p class="note">👑 En üst kademedesin. Tüm gelirler +%20.</p>`;
  return h;
}
let tierDeco=null;
function applyTierDeco(){
  if(tierDeco){ floorRoot(0).remove(tierDeco); tierDeco=null; } const t=state.tier||0; if(!t) return;
  const g=new THREE.Group(), col=t===2?0xb9a3ff:0x9fe7ff, m=new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.6,metalness:.6,roughness:.2});
  const gem=mesh(new THREE.OctahedronGeometry(0.32,0),m,0,4.1,8.95); g.add(gem); g.userData.gem=gem;
  const sg=signPlane(t===2?'👑 PLATİN':'💎 ELMAS',1.3,0.3,{bg:t===2?'#5b3fa8':'#1f6f8b',fg:'#fff',font:'800 60px "Baloo 2"'}); sg.position.set(0,3.72,8.97); g.add(sg);
  floorRoot(0).add(g); tierDeco=g;
}

// ---------- haftalık "Yılın Oteli" ligi ----------
const LEAGUE_NAMES=['Grand Lale','Saray Palas','Mavi Yalı','Altın Kapı','Zeytin Konak','Yıldız Tower','Deniz Suites','Kristal Park'];
function ensureLeague(){ if(stars()<3||state.sandbox) return null; const wk=Math.floor((state.day-1)/7);
  if(!state.league||state.league.wk!==wk){ const pool=LEAGUE_NAMES.slice().sort(()=>Math.random()-.5).slice(0,4);
    state.league={wk,me:0,days:0,ai:pool.map((n,i)=>({n,s:0,lv:62+stars()*4+i*3-4+rnd(-3,3)}))}; }
  return state.league; }
function leagueDay(perf){ const L=ensureLeague(); if(!L) return; L.me+=perf==null?50:perf; L.days++; L.ai.forEach(a=>a.s+=clamp(a.lv+rnd(-12,12),20,100));
  if(L.days>=7){ const rows=leagueRows(), rank=rows.findIndex(r=>r.me)+1;
    const rew=[null,{m:3000,key:2},{m:1500,key:1},{m:600}][rank];
    if(rank===1) state.leagueWins=(state.leagueWins||0)+1;
    setTimeout(()=>{ banner(rank===1?'🏆 Haftanın Oteli sensin!':`🏅 Haftalık lig: ${rank}. oldun`,rew?`+${fmt(r10(rew.m*cm()))} ₺${rew.key?' · +'+rew.key+' 🗝️':''}`:'Gelecek hafta daha iyisi!'); if(rew){ state.money+=r10(rew.m*cm()); if(rew.key) state.keys=(state.keys||0)+rew.key; sfx('star'); } },3500);
    state.league=null; ensureLeague(); }
}
function leagueRows(){ const L=state.league; if(!L) return []; return [{n:hotelName(),s:L.me,me:true}].concat(L.ai.map(a=>({n:a.n,s:a.s}))).sort((a,b)=>b.s-a.s); }
function leagueHtml(){ const L=ensureLeague(); if(!L) return `<p class="note">🏆 Haftalık "Yılın Oteli" ligi 3★'da açılır.</p>`;
  return `<div class="ugh">🏆 Haftalık lig · ${7-L.days} gün kaldı</div>`+leagueRows().map((r,i)=>`<div class="kv${r.me?' me':''}"><span>${['🥇','🥈','🥉','4.','5.'][i]} ${escH(r.n)}${r.me?' (sen)':''}</span><b>${Math.round(r.s)}</b></div>`).join('')+`<p class="note">Puan = her günün performans puanı. 1.: 3000₺+2🗝️ · 2.: 1500₺+1🗝️ · 3.: 600₺</p>`; }

// ---------- müdür masası: günlük strateji kartları ----------
const MGR_CARDS={
  vip:  {e:'🎩',n:'VIP delegasyonu',d:'Bugün 3 ünlü gelir: çok para öderler ama kaçarlarsa ün −3',cost:0},
  flash:{e:'📣',n:'Flaş kampanya',   d:'Bugün misafir akışı +%40, oda fiyatları −%10',cost:0},
  train:{e:'🧑‍🏫',n:'Personel eğitimi',d:'3 gün boyunca personel %20 hızlı',cost:900},
  deep: {e:'✨',n:'Büyük temizlik',  d:'Tüm boş odalar bugün kusursuz: +5 memnuniyet',cost:600},
  tour: {e:'🚌',n:'Tur operatörü',   d:'Bugün ek bir tur otobüsü gelir',cost:0},
  night:{e:'🌙',n:'Gece hayatı',     d:'Bu gece gelen misafir 2 katı, gece geliri +%20',cost:300}};
function mgrOn(k){ const M=state.mgr; return !!(M&&M.k===k&&state.day>=M.day&&state.day<=M.until); }
function mgrDemand(){ return mgrOn('flash')?1.4:1; }
function mgrPrice(){ return mgrOn('flash')?0.9:1; }
function mgrStaff(){ return mgrOn('train')?1.2:1; }
function mgrNight(){ return mgrOn('night')?2:1; }
function mgrUnlocked(){ return stars()>=4||!!state.done; }
function mgrDeal(){ if(!mgrUnlocked()||state.sandbox||state.tut<TUT.length) return; const ks=Object.keys(MGR_CARDS).sort(()=>Math.random()-.5).slice(0,3); state.mgrOffer={day:state.day,ks}; setTimeout(openMgr,4200); }
function openMgr(){
  const O=state.mgrOffer; if(!O||O.day!==state.day) return;
  openModal(`<h3>🗂️ Müdür masası · ${state.day}. gün</h3><p class="sub">Bugünün stratejisini seç (günde bir kart)</p>${O.ks.map(k=>{ const C=MGR_CARDS[k], c=r10(C.cost*cm()); return `<button class="btn ${c?'':'gold'} wide" data-mg="${k}" ${state.money<c?'disabled':''} style="text-align:left;line-height:1.3">${C.e} <b>${C.n}</b>${c?` · ${fmt(c)} ₺`:''}<br><small style="font-weight:600;opacity:.85">${C.d}</small></button>`; }).join('')}<button class="btn ghost wide" data-mg="">Bugün kart yok</button>`,
    m=>m.querySelectorAll('[data-mg]').forEach(b=>b.onclick=()=>{ pickMgr(b.dataset.mg); closeModal(); }));
}
function pickMgr(k){ const O=state.mgrOffer; state.mgrOffer=null; if(!k) return; const C=MGR_CARDS[k], c=r10(C.cost*cm()); if(c&&!spend(c)) return;
  state.mgr={k,day:state.day,until:state.day+(k==='train'?2:0)}; sfx('build'); toast(`${C.e} ${C.n} başladı`);
  if(k==='vip') for(let i=0;i<3;i++) setTimeout(()=>{ if(queue.length<10){ const g=spawnGuest('vip'); g.mgrVip=true; } },1500+i*2500);
  if(k==='tour') state.busDue=true;
  if(k==='deep') for(const id in state.rooms){ const s=state.rooms[id]; if(!s.dirty&&!RT(+id).guest) s.perfect=true; }
  markSave(); }
function mgrHtml(){ if(!mgrUnlocked()) return `<p class="note">🗂️ Müdür masası 4★'da açılır: her sabah günün stratejisini seçersin.</p>`;
  const M=state.mgr, act=M&&state.day<=M.until?MGR_CARDS[M.k]:null;
  return `<div class="row"><div class="ic">🗂️</div><div class="tx">Müdür masası<small>${act?`Aktif: ${act.e} ${act.n}`:state.mgrOffer&&state.mgrOffer.day===state.day?'Bugünün kartları seni bekliyor':'Yarın sabah yeni kartlar'}</small></div>${state.mgrOffer&&state.mgrOffer.day===state.day?'<button class="btn gold" data-mgopen>Aç</button>':''}</div>`; }

// ---------- kat temaları + kat salonu ----------
const FTHEME={sea:{e:'🌊',n:'Deniz katı',c:0x2e86c1,c2:0xbfe6ff},garden:{e:'🌿',n:'Bahçe katı',c:0x2e8b57,c2:0xcff5d9},royal:{e:'👑',n:'Kraliyet katı',c:0x6a2c91,c2:0xf2d48a}};
function floorThemeCost(f){ return r10(3500*cm()*f); }
function loungeCost(f){ return r10(5000*cm()*f); }
const floorDeco={};
function buildFloorDeco(f){
  if(floorDeco[f]){ floorRoot(f).remove(floorDeco[f]); delete floorDeco[f]; }
  const F=(state.floors||{})[f]; if(!F||!floorRoot(f)) return; const g=new THREE.Group(); floorRoot(f).add(g); floorDeco[f]=g;
  if(F.theme){ const T=FTHEME[F.theme], cm1=mat(T.c,{roughness:.9}), cm2=mat(T.c2,{roughness:.6});
    CORR.forEach(z=>{ g.add(mesh(box(12.6,0.014,0.9),cm1,0,0.03,z)); for(let x=-5.5;x<=5.5;x+=2.2) g.add(mesh(box(0.5,0.016,0.5),cm2,x,0.034,z)); });
    [-6.5,6.5].forEach(x=>CORR.forEach(z=>{ if(F.theme==='garden') bigPlant(g,x,z+0.55,0.5); else { const o=mesh(sph(0.16,10,8),cm2,x,1.7,z+0.55); g.add(o); } }));
    const sg=signPlane(`${T.e} ${T.n.toUpperCase()}`,1.8,0.34,{bg:'#'+T.c.toString(16).padStart(6,'0'),fg:'#fff',font:'800 56px "Baloo 2"',fit:true}); sg.position.set(0,2.35,BACK+0.12); g.add(sg); }
  if(F.lounge){ const x=-5.6, z=CORR[0]-0.05, wood=tmat('woodDark',1,1), sm=mat(F.theme?FTHEME[F.theme].c:0x8a2f3a,{roughness:.9});
    g.add(mesh(rbox(1.3,0.35,0.55,.1),sm,x,0.2,z-0.45,true)); g.add(mesh(rbox(1.3,0.45,0.14,.06),sm,x,0.45,z-0.68,true));
    g.add(mesh(cyl(0.22,0.22,0.04,16),wood,x+1.0,0.5,z-0.4)); g.add(mesh(cyl(0.03,0.03,0.48,6),M.gold,x+1.0,0.25,z-0.4)); g.add(mesh(cyl(0.05,0.04,0.12,8),mat(0xe0574f),x+1.0,0.58,z-0.4));
    const lp=mesh(cyl(0.1,0.14,0.2,12),M.lampOn,x-0.85,1.0,z-0.55); g.add(lp); g.add(mesh(cyl(0.02,0.02,0.9,6),M.gold,x-0.85,0.45,z-0.55));
    addCols('lounge'+f,[[f,x-0.95,x+1.25,z-0.78,z-0.15]]); }
}
function floorSat(f){ const F=(state.floors||{})[f]; return F?(F.theme?4:0)+(F.lounge?3:0):0; }
function buyFloorTheme(f,k){ const c=floorThemeCost(f); const F=(state.floors||(state.floors={}))[f]||(state.floors[f]={}); if(F.theme===k||!spend(c)) return; F.theme=k; buildFloorDeco(f); sfx('build'); toast(`${FTHEME[k].e} ${f+1}. kat artık ${FTHEME[k].n}`); save(); renderSheet(); }
function buyLounge(f){ const c=loungeCost(f); const F=(state.floors||(state.floors={}))[f]||(state.floors[f]={}); if(F.lounge||!spend(c)) return; F.lounge=true; buildFloorDeco(f); sfx('build'); toast(`🛋️ ${f+1}. kat salonu açıldı`); save(); renderSheet(); }
function floorsHtml(){ const n=floorsBuilt(); if(n<2) return `<p class="note">🏢 Kat temaları 2. kat açılınca gelir.</p>`;
  let h=`<div class="ugh">🏢 Kat temaları ve kat salonu</div>`;
  for(let f=1;f<Math.min(n,3);f++){ const F=(state.floors||{})[f]||{};
    h+=`<div class="row" style="flex-wrap:wrap"><div class="ic">${F.theme?FTHEME[F.theme].e:'🏢'}</div><div class="tx">${f+1}. kat ${F.theme?'· '+FTHEME[F.theme].n:''}<small>Tema: bu kattaki misafirler +4 memnuniyet · salon: +3 ve kat barı geliri</small></div>
      <div class="agrid" style="width:100%;justify-content:flex-end">${Object.keys(FTHEME).map(k=>`<button class="btn ${F.theme===k?'':'ghost'} abtn" data-fth="${f}:${k}" ${F.theme===k||state.money<floorThemeCost(f)?'disabled':''}>${FTHEME[k].e} ${fmt(floorThemeCost(f))}</button>`).join('')}
      <button class="btn gold abtn" data-flo="${f}" ${F.lounge||state.money<loungeCost(f)?'disabled':''}>${F.lounge?'🛋️ Salon ✓':'🛋️ Salon '+fmt(loungeCost(f))}</button></div></div>`; }
  return h; }
function loungeIncome(){ let s=0; for(const k in state.rooms){ const ri=roomInfo(+k), F=(state.floors||{})[ri.f]; if(F&&F.lounge&&RT(+k).guest) s+=r10(25*cm()); } return s; }

// ---------- şehre özel tesis ----------
const CITY_SP={
  'İstanbul':{e:'⛴️',n:'Boğaz turu iskelesi',t:'Boğaz turu',prop:'boat'},
  'Antalya':{e:'🏖️',n:'Plaj kulübü',t:'Plaj servisi',prop:'umbrella'},
  'Kapadokya':{e:'🎈',n:'Balon kalkış alanı',t:'Balon turu',prop:'balloon'},
  'Bodrum':{e:'⛵',n:'Tekne turu standı',t:'Mavi tur',prop:'boat'},
  'Paris':{e:'🎨',n:'Sanat galerisi',t:'Galeri turu',prop:'easel'},
  'Dubai':{e:'🏜️',n:'Çöl safarisi',t:'Safari',prop:'jeep'}};
const SP_POS={x:14.9,z:9.75};
function spDef(){ return CITY_SP[city().name]||CITY_SP['İstanbul']; }
function spCost(){ return r10(1800*cm()); }
let spG=null, spFly=null;
function buildSpecial(){
  if(spG){ outdoor.remove(spG); spG=null; } const D=spDef(), g=new THREE.Group(); g.position.set(SP_POS.x,0,SP_POS.z); outdoor.add(g); spG=g;
  if(!(state.sp&&state.sp.built)){ return; }
  const wood=tmat('wood',1,1), acc=mat(city().accent||0x2d5d8a);
  g.add(mesh(rbox(1.6,0.9,0.7,.05),wood,0,0.45,0,true)); g.add(mesh(box(1.7,0.06,0.8),acc,0,0.93,0));
  [-0.75,0.75].forEach(x=>g.add(mesh(cyl(0.04,0.04,2.0,8),M.dark,x,1.0,-0.3)));
  const roof=mesh(box(1.9,0.08,1.1),mat(0xf4efe6),0,2.0,-0.1); roof.rotation.x=0.12; g.add(roof);
  const sg=signPlane(`${D.e} ${D.n.toUpperCase()}`,1.8,0.32,{bg:'#'+(city().accent||0x2d5d8a).toString(16).padStart(6,'0'),fg:'#fff',font:'800 52px "Baloo 2"',fit:true}); sg.position.set(0,1.6,0.37); g.add(sg);
  const P=new THREE.Group(); P.position.set(-1.35,0,0.1); g.add(P);
  if(D.prop==='boat'){ const h=mesh(rbox(1.0,0.3,0.4,.12),M.white,0,0.25,0,true); P.add(h); P.add(mesh(box(0.04,0.8,0.04),M.dark,0,0.75,0)); const s=mesh(new THREE.ConeGeometry(0.25,0.6,3),mat(0x2e86c1),0.12,0.8,0); P.add(s); }
  else if(D.prop==='umbrella'){ P.add(mesh(cyl(0.03,0.03,1.6,8),M.white,0,0.8,0)); P.add(mesh(cone(0.7,0.35,12),mat(0xe0574f),0,1.65,0,true)); P.add(mesh(rbox(0.5,0.08,1.0,.04),M.white,0.3,0.25,0.3)); }
  else if(D.prop==='balloon'){ P.add(mesh(rbox(0.4,0.35,0.4,.04),tmat('wood'),0,0.18,0,true)); const b=mesh(sph(0.55,14,12),mat(0xe0574f),0,1.25,0,true); b.scale.y=1.2; P.add(b); }
  else if(D.prop==='easel'){ P.add(mesh(box(0.05,1.2,0.05),tmat('wood'),0,0.6,0)); const cv=mesh(plane(0.6,0.45),new THREE.MeshStandardMaterial({map:tex('art1')}),0,0.95,0.04); P.add(cv); }
  else { P.add(mesh(rbox(1.0,0.45,0.6,.1),mat(0xe0a93a),0,0.4,0,true)); [-0.3,0.3].forEach(x=>[-0.3,0.3].forEach(z=>{ const w=mesh(cyl(0.15,0.15,0.1,12),M.dark,x,0.15,z); w.rotation.x=Math.PI/2; P.add(w); })); }
  addCols('special',[[0,SP_POS.x-0.85,SP_POS.x+0.85,SP_POS.z-0.4,SP_POS.z+0.4],[0,SP_POS.x-1.8,SP_POS.x-0.9,SP_POS.z-0.3,SP_POS.z+0.5]]);
}
// her 1/6 günde bir kalkış: yakındaysan rehberlik bonusu (x2) ve tüm misafirlere +3 memnuniyet
function spInterval(){ return DAY_SEC/6; }
function updateSpecial(dt){
  const S=state.sp; if(!S||!S.built||state.tut<TUT.length) return;
  const nG=roomsWhere(id=>!!RT(id).guest).length; S.acc=(S.acc||0)+dt*nG*0.012*cm()*incomeMult()/cm();
  S.t=(S.t==null?spInterval():S.t)-dt;
  if(S.t<=12&&!S.warn){ S.warn=true; toast(`${spDef().e} ${spDef().t} 12 sn sonra kalkıyor: yanında ol, rehberlik bonusu al!`); }
  if(S.t<=0){ S.t=spInterval(); S.warn=false; const near=player.f===0&&Math.hypot(player.x-SP_POS.x,player.z-SP_POS.z)<3.5, amt=Math.round(S.acc*(near?2:1)); S.acc=0;
    if(amt>0){ addMoney(amt,SP_POS.x,1.4,SP_POS.z,0,true); state.today.amen+=amt; }
    if(near){ guests.forEach(g=>{ if(g.room!=null) g.sat=clamp(g.sat+3,0,100); }); toast(`${spDef().e} Rehberlik yaptın! Kazanç x2, misafirler +3 memnuniyet`); onGameEvent('tour',1); }
    else toast(`${spDef().e} ${spDef().t} kalktı · +${fmt(amt)} ₺`);
    sfx(near?'star':'coin'); spDepart(); }
  if(spFly){ spFly.t+=dt; spFly.o.position.y+=dt*(spFly.k==='balloon'?1.1:0.6); spFly.o.position.x+=dt*0.5; if(spFly.t>7){ outdoor.remove(spFly.o); spFly=null; } }
}
function spDepart(){ if(spFly||state.lowFx) return; const k=spDef().prop, o=new THREE.Group();
  if(k==='balloon'){ const b=mesh(sph(0.8,14,12),mat(rand([0xe0574f,0xf2b632,0x6b4a8e])),0,1.6,0); b.scale.y=1.2; o.add(b); o.add(mesh(rbox(0.5,0.4,0.5,.04),tmat('wood'),0,0.2,0)); }
  else o.add(signPlane(spDef().e,0.9,0.9,{w:128,h:128,font:'100px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'}));
  o.position.set(SP_POS.x-1.3,0.5,SP_POS.z); outdoor.add(o); spFly={o,t:0,k}; }
function buySpecial(){ const c=spCost(); if(stars()<3||!spend(c)) return; state.sp={built:true,t:spInterval(),acc:0}; buildSpecial(); sfx('build'); if(!state.lowFx) confettiAt(SP_POS.x,1.5,SP_POS.z,60); banner(`${spDef().e} ${spDef().n} açıldı!`,'Misafirler tur bileti alır · kalkışta yanında ol'); save(); renderSheet(); }
function specialHtml(){ const D=spDef(), S=state.sp;
  return `<div class="ugh">${D.e} Şehre özel: ${D.n}</div><div class="row"><div class="ic">${D.e}</div><div class="tx">${D.n}<small>${S&&S.built?`Sonraki ${D.t}: ${Math.max(0,Math.ceil((S.t||0)/DAY_SEC*24))} saat · biriken ${fmt(Math.round(S.acc||0))} ₺ · kalkışta yanında ol: x2`:`Ön bahçenin sağına kurulur · misafir başına tur geliri · 3★ gerekir`}</small></div>${S&&S.built?'':`<button class="btn gold" data-spbuy ${stars()<3||state.money<spCost()?'disabled':''}>${fmt(spCost())} ₺</button>`}</div>`; }

// ---------- şehre göre bahçe ----------
let gardenG=null;
const GARDEN_SPOTS=[[-7.6,9.3],[2.9,9.3],[7.6,9.3],[11.9,9.4],[-1.4,10.4]];
function buildGarden(){
  if(gardenG){ outdoor.remove(gardenG); } const g=new THREE.Group(); outdoor.add(g); gardenG=g; const nm=city().name, cols=[];
  GARDEN_SPOTS.forEach(([x,z],i)=>{ if(i===5) return; const P=new THREE.Group(); P.position.set(x,0,z); g.add(P);
    if(nm==='Antalya'){ P.add(mesh(rbox(0.55,0.1,1.1,.04),M.white,0,0.28,0)); P.add(mesh(cyl(0.03,0.03,1.7,8),M.white,0.45,0.85,-0.2)); P.add(mesh(cone(0.75,0.35,12),mat(i%2?0x2a8a96:0xe08a3c),0.45,1.75,-0.2)); }
    else if(nm==='Kapadokya'){ const r=mesh(cone(0.38,1.3,7),mat(0xd9b48a,{flatShading:true,roughness:1}),0,0.65,0,true); P.add(r); P.add(mesh(sph(0.22,7,5),mat(0x8f5130,{flatShading:true}),0,1.35,0)); }
    else if(nm==='Bodrum'){ P.add(mesh(cyl(0.3,0.24,0.5,12),M.white,0,0.25,0,true)); P.add(mesh(sph(0.42,8,6),mat(0xd63384,{flatShading:true,roughness:1}),0,0.75,0)); P.add(mesh(box(0.62,0.05,0.62),mat(0x2a5fa8),0,0.02,0)); }
    else if(nm==='Paris'){ P.add(mesh(cyl(0.22,0.26,0.34,10),mat(0x3d4a5c),0,0.17,0,true)); P.add(mesh(cone(0.34,1.2,10),mat(0x2f6b3a,{roughness:1}),0,0.95,0,true)); }
    else if(nm==='Dubai'){ P.add(mesh(sph(0.6,10,6),mat(0xe8cf9a,{roughness:1}),0,-0.25,0)); P.add(mesh(cyl(0.12,0.1,0.45,8),mat(0xb8913a,{metalness:.6,roughness:.3}),0.35,0.22,0.1)); P.add(mesh(sph(0.07,6,4),M.lampOn,0.35,0.5,0.1)); }
    else { P.add(mesh(cyl(0.34,0.3,0.4,12),mat(0x9b3f30),0,0.2,0,true)); P.add(mesh(sph(0.36,8,6),mat(0xe0574f,{flatShading:true,roughness:1}),0,0.62,0)); for(let k=0;k<5;k++) P.add(mesh(sph(0.08,6,4),mat(0xf2d48a),rnd(-0.25,0.25),0.8,rnd(-0.25,0.25))); }
    cols.push([0,x-0.35,x+0.35,z-0.35,z+0.35]); });
  addCols('garden',cols);
}

// ---------- boot / per-frame / gün sonu ----------
function bootContent(){ buildGarden(); buildSpecial(); applyTierDeco(); for(let f=1;f<3;f++) if((state.floors||{})[f]) buildFloorDeco(f); ensureLeague(); }
function contentDayEnd(t){ leagueDay(t.perf); checkTier(); const li=loungeIncome(); if(li){ state.money+=li; t.amen+=li; t.lounge=li; } if(mgrOn('vip')&&state.today.left>0) changeRep(-3); mgrDeal(); }
function updateContent(dt,t){ updateSpecial(dt); if(tierDeco&&tierDeco.userData.gem) tierDeco.userData.gem.rotation.y=t*1.2; }
