
// =====================================================================
// DEPTH 3: story guests, weather events, city festivals, emergencies
// (thief, lost child), cleaning quality, repair timing mini-game
// =====================================================================

// ---------- story chains: special guests who come back chapter by chapter ----------
const STORIES={
  writer:{e:'✍️',name:'Yazar Deniz Kaya',type:'business',need:[0,1,2],
    lines:['Yeni romanım için sakin bir yer arıyorum. Burası ilham verebilir mi?','İlk bölüm burada doğdu! Daha konforlu bir odada ikinci bölüme devam etmek istiyorum.','Romanım bitti ve adı otelinizin adı! Teşekkür ederim.'],
    ok:['Deniz Kaya ilham buldu, 2 gün sonra dönecek ✍️','Roman hızla ilerliyor, final için tekrar gelecek!','📖 Roman çok satanlar listesinde, otelin ünlendi!']},
  critic:{e:'🍷',name:'Yemek eleştirmeni Selim Ateş',type:'vip',need:[0,1,2],amen:'rest',
    lines:['Gizlice otelleri puanlıyorum ama... bunu söylemedim.','Geçen sefer fena değildi. Bu sefer restoranınızı gerçekten deneyeceğim.','Son ziyaretim: köşe yazımı sizin için yazacağım.'],
    ok:['Selim Ateş notlar aldı, yine gelecek 🍷','Restoranınız eleştirmenin listesinde!','📰 Köşe yazısı yayında: "Şehrin en iyi oteli!"']},
  couple:{e:'💍',name:'Mehmet & Ayten (50. yıl)',type:'couple',need:[0,1,2],
    lines:['50. evlilik yıl dönümümüz yaklaşıyor, bir keşif turu yapıyoruz.','Burayı çok sevdik! Torunlarımıza da anlattık.','Bu gece 50. yıl dönümümüz. Burada kutlamak istedik 💕'],
    ok:['Çift çok mutlu ayrıldı, yıl dönümü için dönecekler','Torunlar da otelinizi merak ediyor!','💕 Unutulmaz bir yıl dönümü! Aileleri sadık müşterin oldu']}};
function storyState(){ state.stories=state.stories||{}; return state.stories; }
function activeStory(){ const S=storyState(); for(const k in STORIES){ const s=S[k]; if(s&&s.ch<3) return k; } return null; }
function updateStories(dt){
  if(state.tut<TUT.length||state.sandbox) return; const S=storyState();
  if(!activeStory()){ const k=Object.keys(STORIES).find(k=>!S[k]); if(k&&state.day>=4&&nRoomsNow()>=5) S[k]={ch:0,next:state.day}; else return; }
  const k=activeStory(), s=S[k], h=hourNow(); if(state.day<s.next||h<9||h>16||guests.some(g=>g.story)||queue.length>=7) return;
  const St=STORIES[k], g=spawnGuest(St.type); g.name=St.name; g.story={k,ch:s.ch}; g.patMax=g.pat=g.patMax*1.5;
  s.next=state.day+99; banner(`${St.e} ${St.name} geldi!`,`Bölüm ${s.ch+1}/3 · “${St.lines[s.ch]}”`); sfx('req'); markSave();
}
async function storyCheckout(g,id,mood){
  const st=g.story; if(!st) return; const St=STORIES[st.k], S=storyState(), s=S[st.k], lvl=ROOM_T[state.rooms[id].type].lvl;
  const ok=g.sat>=72&&lvl>=St.need[st.ch]&&(!St.amen||(g.amenUsed||[]).includes(St.amen)||st.ch<1);
  if(!ok){ s.next=state.day+3; toast(`${St.e} ${St.name} tam memnun kalmadı (${lvl<St.need[st.ch]?'daha iyi bir oda istiyordu':'memnuniyet düşüktü'}). Yeniden gelecek.`,'bad'); markSave(); return; }
  s.ch++; s.next=state.day+rint(2,3); const reward=r10(300*cm()*s.ch*(s.ch===3?3:1));
  state.piles.desk+=reward; pileChanged('desk'); changeRep(2*s.ch); onGameEvent('story',1);
  let txt=St.ok[s.ch-1];
  const r=await aiJSON(`Bir otel işletme oyununda süregelen bir misafir hikâyesi: ${St.name}. Az önce ${s.ch}. bölüm mutlu bitti ("${St.lines[s.ch-1]}"). ${s.ch<3?'Sonraki ziyarete merak uyandıran':'Hikâyeyi güzelce bağlayan'} tek ve kısa bir Türkçe cümle yaz (en fazla 20 kelime, 1 emoji).
SADECE JSON: {"cumle":"..."}`);
  if(r&&clip(r.cumle,160)) txt=clip(r.cumle,160);
  banner(`${St.e} Hikâye: bölüm ${s.ch}/3 tamam!`,`${txt} · ${fmt(reward)} ₺ masada`); sfx('star'); confettiAt(L.desk.x,1.5,L.desk.z,s.ch===3?110:50);
  if(s.ch===3){ state.keys=(state.keys||0)+2; setTimeout(()=>toast(`${St.e} Hikâye finali: +2 🗝️ anahtar`),2500); }
  logEvent(`${St.e} ${St.name}: ${txt}`); markSave();
}

// ---------- weather & world events ----------
const WX_EV={storm:{e:'⛈️',name:'Fırtına',sub:'Çatı ve havuz kapalı, daha az misafir gelir'},heat:{e:'🥵',name:'Sıcak hava dalgası',sub:'Havuz ve spa ücretleri %60 fazla, sırada sabır azalır'},zam:{e:'⚡',name:'Elektrik zammı',sub:'Gün sonunda ekstra enerji faturası gelir'}};
function wxEv(k){ return !!state.wxEv&&state.wxEv.day===state.day&&(!k||state.wxEv.k===k); }
function stormOn(){ return wxEv('storm'); }
function eventsDayRoll(){
  state.wxEv=null;
  if(state.tut>=TUT.length&&!state.sandbox&&state.day>=5&&Math.random()<0.18){
    const opts=['storm','zam']; if(seasonIx()===1) opts.push('heat','heat');
    const k=rand(opts); state.wxEv={k,day:state.day}; if(k==='storm'){ state.weather='rain'; applyWeather(); }
    const W=WX_EV[k]; setTimeout(()=>{ banner(`${W.e} ${W.name}!`,W.sub); sfx('alarm'); },5000); }
  if(!state.emergDue&&state.tut>=TUT.length&&state.day>=4&&Math.random()<0.3) state.emergDue=rand(['thief','child']);
}
function zamBill(){ return wxEv('zam')?r10(Math.max(50,wagesToday()*0.3+roomRateSum()*0.5*incomeMult()*0.2)):0; }

// ---------- city festivals (every other festival is the city's own) ----------
const CITY_FEST={'İstanbul':{e:'🏃',name:'İstanbul Maratonu',types:['athlete','business']},'Antalya':{e:'🎬',name:'Film Festivali',types:['influencer','vip']},
  'Kapadokya':{e:'🎈',name:'Balon Festivali',types:['couple','tourist']},'Bodrum':{e:'⛵',name:'Yat Festivali',types:['vip','couple']},
  'Paris':{e:'👗',name:'Moda Haftası',types:['influencer','vip']},'Dubai':{e:'🛍️',name:'Alışveriş Festivali',types:['vip','family']}};
function cityFestOn(){ return natFestOn()&&Math.floor((state.day-1)/(SEASON_DAYS*2))%2===1&&!!CITY_FEST[city().name]; }
function festTypeW(k){ return cityFestOn()&&CITY_FEST[city().name].types.includes(k)?2.5:1; }

// ---------- emergencies: thief & lost child ----------
let emerg=null;
function startEmergency(k){
  if(emerg) return;
  if(k==='thief'){ const e=new Ent({skin:rand(SKINS),hair:0x1a1a1a,hs:'short',top:0x1a1a1a,bottom:0x2b2b2b,hat:'cap',hatC:0x1a1a1a,shades:true,bag:0x2b2b2b});
    e.place(0.3,8.9,0); e.speed=1.6; e.goTo(0,L.piles.desk.x+0.6,L.piles.desk.z+0.8); emerg={k,e,t:32,x:0,z:0,phase:'grab',stolen:0};
    banner('🦹 Lobide hırsız var!','Kasaya ulaşmadan yakala; kasayı boşaltırsa kaçarken yakala, para geri gelir'); sfx('alarm'); camShake(0.15); }
  else { const spots=[[10.2,7.9],[-12,7.9],[-4.3,9.0],[5.5,10.4]], [x,z]=rand(spots);
    const e=new Ent({skin:rand(SKINS),hair:rand(HAIRC),hs:rand(['short','bun','pony']),top:rand(TOPS),bottom:rand(BOTTOMS),scale:0.62}); e.place(x,z,0);
    emerg={k,e,t:70,carry:false}; banner('😢 Kayıp çocuk!','Çocuğu bul, resepsiyona getir'); sfx('req'); }
  emerg.tag=tagAdd({kind:'spot',get:()=>emerg&&emerg.e?{x:emerg.e.x,z:emerg.e.z,f:0}:null,iconF:()=>emerg.k==='thief'?'🦹':emerg.carry?'🧒':'😢',cls:'warn',y:emerg.k==='thief'?2.2:1.5});
}
function endEmergency(win){
  const m=emerg; if(!m) return; emerg=null; tagRemove(m.tag);
  if(m.k==='thief'){ if(win){ const b=r10(90*cm()); if(m.stolen>0){ state.piles.desk+=m.stolen; pileChanged('desk'); } addMoney(b,m.e.x,1,m.e.z,0,true); changeRep(2);
      banner('👮 Hırsız yakalandı!',`${m.stolen>0?'Çalınan '+fmt(m.stolen)+' ₺ kasaya geri kondu · ':''}+2 ün · ${fmt(b)} ₺ ödül`); sfx('star'); confettiAt(m.e.x,1.5,m.e.z,40); onGameEvent('hero',1); m.e.remove(); }
    else { const s=m.stolen; changeRep(-2); banner('🦹 Hırsız kaçtı!',`Kasadan ${fmt(s)} ₺ çalındı · −2 ün`); sfx('fail'); m.e.remove(); } }
  else { if(win){ const b=r10(60*cm()); addMoney(b,L.serve.cx,1,L.serve.cz,0,true); changeRep(1.5); banner('🤗 Çocuk ailesine kavuştu!',`+1.5 ün · ${fmt(b)} ₺ teşekkür`); sfx('star'); onGameEvent('hero',1); }
    else { changeRep(-2); toast('😢 Çocuğu başka biri buldu · −2 ün','bad'); } m.e.remove(); }
  markSave();
}
function updateEmergency(dt){
  if(!emerg){ if(state.emergDue&&!state.sandbox){ const h=hourNow(); if(h>=10&&h<18&&Math.random()<dt*0.02){ const k=state.emergDue; state.emergDue=null; startEmergency(k); } } return; }
  const m=emerg, e=m.e; m.t-=dt;
  if(m.k==='thief'){
    if(player.f===0&&d2(player.x,player.z,e.x,e.z)<0.95*0.95){ endEmergency(true); return; }
    if(m.phase==='grab'&&!e.path){   // kasaya ulaştı: parayı alır ve KAÇAR — kaçarken yakalanırsa para geri gelir
      m.phase='flee'; m.stolen=Math.round(state.piles.desk*0.6); state.piles.desk-=m.stolen; pileChanged('desk'); m.t=Math.max(m.t,24);
      e.speed=2.0; if(!e.goTo(0,-16.9,12.15,()=>{ if(emerg===m) endEmergency(false); })) endEmergency(false);
      banner('🦹 Hırsız kasayı boşalttı!',`${fmt(m.stolen)} ₺ ile kaçıyor · çıkışa varmadan yakala`); sfx('alarm'); camShake(0.1); return; }
    if(m.phase==='flee'&&(!e.path||m.t<=0)) endEmergency(false); }
  else { if(!m.carry){ if(Math.random()<dt*0.6) fxEmoji(e.x,1.3,e.z,0,'😢'); if(player.f===0&&d2(player.x,player.z,e.x,e.z)<0.9*0.9){ m.carry=true; fxEmoji(e.x,1.4,e.z,0,'🙂'); sfx('pick'); } }
    else { e.x+=(player.x-0.5-e.x)*Math.min(1,dt*6); e.z+=(player.z-0.4-e.z)*Math.min(1,dt*6); e.tRot=player.rot; e.moving=player.moving;
      if(player.f===0&&d2(player.x,player.z,L.serve.cx,L.serve.cz)<1.3*1.3){ endEmergency(true); return; } }
    if(m.t<=0) endEmergency(false); }
}
function emergencyGoal(){ const m=emerg; if(!m) return null;
  if(m.k==='thief') return {icon:'🦹',text:m.phase==='flee'?`Hırsız kaçıyor, ${fmt(m.stolen)} ₺ geri al! (${Math.ceil(m.t)} sn)`:`Hırsızı kasaya varmadan yakala!`,target:{x:m.e.x,y:0,z:m.e.z,f:0},crisis:true};
  return m.carry?{icon:'🧒',text:'Çocuğu resepsiyona getir',target:{x:L.serve.cx,y:0,z:L.serve.cz,f:0},crisis:true}:{icon:'😢',text:`Kayıp çocuğu bul (${Math.ceil(m.t)} sn)`,target:{x:m.e.x,y:0,z:m.e.z,f:0},crisis:true}; }

// ---------- cleaning quality ----------
let cleanerNow=null;
function noteCleanMove(R,p){ if(p.moving) R.cleanMoved=true; }
function cleanQuality(id,byStaff,e){
  const s=state.rooms[id], R=RT(id); s.perfect=byStaff?(e?rankOf(e)>=2:false):!R.cleanMoved; R.cleanMoved=false;
  if(s.perfect&&!byStaff){ const sp=roomSpots(id); fxEmoji(sp.stand.x,sp.stand.f*FH+1.6,sp.stand.z,sp.stand.f,'⭐'); if(!state.tips.perfect){ state.tips.perfect=true; hint('⭐ Kusursuz temizlik: temizlerken kıpırdamazsan sonraki misafir +5 memnun olur',5.5); } }
}

// ---------- repair timing mini-game ----------
let fixGame=null;
function startFixGame(id){
  if(fixGame||state.sandbox) return; const el=document.createElement('div'); el.id='fixGame';
  el.innerHTML=`<div class="fgbar"><i class="fgz"></i><b class="fgm"></b></div><button class="btn gold" id="fgHit">🔧 Şimdi! <small>(boşluk)</small></button>`;
  document.getElementById('hud').appendChild(el); const z0=rnd(0.2,0.65);
  el.querySelector('.fgz').style.left=(z0*100)+'%'; el.querySelector('.fgz').style.width='18%';
  fixGame={id,el,t:0,z0,z1:z0+0.18,done:false}; el.querySelector('#fgHit').onclick=hitFixGame;
}
function endFixGame(){ if(fixGame){ fixGame.el.remove(); fixGame=null; } }
function hitFixGame(){
  const f=fixGame; if(!f||f.done) return; f.done=true; const x=(Math.sin(f.t*3.2)+1)/2, s=state.rooms[f.id], R=RT(f.id);
  if(x>=f.z0&&x<=f.z1&&s&&s.broken){ fixRoom(f.id,false); gainXP(10); const sp=roomSpots(f.id); fxText(sp.ns.x,sp.ns.f*FH+1.4,sp.ns.z,sp.ns.f,'Kusursuz tamir!'); sfx('star'); }
  else { R.fixP=Math.max(0,R.fixP-0.25); fxEmoji(player.x,player.y+2.2,player.z,player.f,'💥'); sfx('fail'); }
  setTimeout(endFixGame,350);
}
function updateFixGame(dt){
  const f=fixGame; if(!f) return; const s=state.rooms[f.id];
  if(!s||!s.broken||roomAt(player.f,player.x,player.z)!==f.id&&roomDoorAt(player.f,player.x,player.z)!==f.id){ endFixGame(); return; }
  if(!f.done){ f.t+=dt; f.el.querySelector('.fgm').style.left=((Math.sin(f.t*3.2)+1)/2*100)+'%'; }
}
window.addEventListener('keydown',e=>{ if(e.key===' '&&fixGame){ hitFixGame(); } });

// ---------- hooks ----------
function updateEvents3(dt){ updateStories(dt); updateEmergency(dt); }
function events3DayEnd(){ eventsDayRoll(); }
