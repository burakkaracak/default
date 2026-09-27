
// =====================================================================
// POLISH 3: banner queue, notification dots, guide (codex), what's new,
// first-time tips, reduced effects, city music, hotel party (late money
// sink)
// =====================================================================

// ---------- banner queue: big announcements never overwrite each other ----------
const bannerQ=[]; let bannerBusy=false;
function banner(big,small){
  logEvent(big+(small?' · '+small:''));
  if(bannerQ.some(x=>x[0]===big)) return; bannerQ.push([big,small]); if(!bannerBusy) nextBanner();
}
function nextBanner(){
  const n=bannerQ.shift(); if(!n){ bannerBusy=false; return; } bannerBusy=true;
  const b=$('banner'); b.innerHTML=`${n[0]}${n[1]?`<small>${n[1]}</small>`:''}`; b.classList.add('show');
  setTimeout(()=>{ b.classList.remove('show'); setTimeout(nextBanner,320); },bannerQ.length?2100:2600);
}

// ---------- notification dots ----------
function passClaimable(){ const P=state.pass; if(!P) return false; const t=passTier(); for(let i=0;i<Math.min(t,PASS.length);i++) if(!P.got.includes(i)) return true; return false; }
function updateDots(){
  const lb=$('lvlDot'); if(lb) lb.classList.toggle('on',skillPts()>0&&!state.sandbox);
  const qd=$('questDot'); if(qd&&passClaimable()) qd.classList.add('on');
}

// ---------- reduced effects ----------
function lowFx(){ return !!state.lowFx; }

// ---------- guide / codex ----------
const GUIDE=[
  ['🏨 Temeller',[['🛏️','Oda aç ve misafir karşıla','Yeşil alanlarda dur, para yatır. Resepsiyonun arkasındaki mavi alanda misafir kaydedilir.',()=>true],
    ['🧹','Temizlik ve tamir','Kirli ya da arızalı odanın içine ya da kapı önüne gel. Kıpırdamadan temizlersen ⭐ kusursuz olur. Tamirde zamanlamayı tuttur (boşluk).',()=>true],
    ['🧻','İstekler ve depo','Misafir 🧻/🧺/🍽️ ister: raftan al, odaya götür. Stok biter; Yönetim › Otel › Tedarik.',()=>built('depo')]]],
  ['⭐ İlerleme',[['⭐','Yıldızlar','Ün + bina şartları (Yönetim › Otel). Her yıldız geliri ve misafir kalitesini artırır.',()=>true],
    ['🎯','Hedefler, görevler, ödül yolu','Üstteki hedef çubuğu ödüllüdür. 🎯 düğmesi: günlük + haftalık görevler ve 🎖️ ödül yolu.',()=>state.tut>=TUT.length],
    ['🧠','Yetenek ağacı','Her seviye 1 puan. Sol üstteki seviye kutusuna dokun.',()=>(state.lvl||1)>1],
    ['🗺️','Şehirler ve miras','Oteli bitir, taşın, 🗝️ anahtar kazan; eski otellere müdür ata.',()=>state.done||(state.hist||[]).length>0]]],
  ['💰 Ekonomi',[['💲','Fiyat politikası','Yüksek fiyat: az ama zengin misafir. Oda doluyken fiyat artır!',()=>state.day>=3],
    ['🏢','Rakip otel','Misafirini çalar; ünün ve fiyatınla savaş, 4★\'da satın al.',()=>!!state.rival],
    ['🏦','Kredi','Hızlı büyümek için; günlük %3 faiz.',()=>state.day>=3],
    ['🎉','Otel partisi','Geç oyunda paranı partiye yatır: o gün festival olur.',()=>stars()>=4]]],
  ['👥 Personel',[['👥','Personel ve kariyer','Personel terfi eder (Çaylak→Uzman), yorulur (😓), mola odası dinlendirir. Personele dokunup konuşabilirsin.',()=>built('staff')],
    ['💆','Spa ve çamaşırhane','Spa terapisti spa gelirini artırır; kirli çarşafları 🧦 çamaşırhaneye götür.',()=>built('spa')||built('laundry')]]],
  ['🎲 Olaylar',[['📅','Etkinlikler ve festivaller','Düğün/konferans/konser teklifleri, şehir festivalleri, fırtına ve sıcak dalga.',()=>state.day>=4],
    ['📖','Hikâye misafirleri','Özel misafirler 3 bölümde geri gelir; her seferinde daha iyi oda isterler.',()=>!!state.stories&&Object.keys(state.stories).length>0],
    ['🦹','Acil durumlar','Hırsızı kasaya varmadan yakala, kayıp çocuğu resepsiyona getir.',()=>state.day>=4],
    ['🤖','Yapay zekâ','Misafir ve personelle sohbet, yorumlar, danışman, gazete (claude.ai\'de açıkken).',()=>true]]],
  ['🎨 Özelleştirme',[['🎨','Oda teması ve tasarımı','Oda menüsünden tema seç, 🛋️ ile mobilya yerleştir.',()=>nRoomsAll()>0],
    ['🎩','Karakter ve otel','Ayarlar › Otelim ve karakterim. Ödül yolundan yeni şapkalar.',()=>true],
    ['☁️','Bulut kayıt','Ayarlar\'dan başka cihazda devam et (claude.ai\'de).',()=>true]]]];
function openGuide(){
  let h=`<h3>📘 Rehber <button class="xbtn" id="gdX" aria-label="Kapat">✖</button></h3><p class="sub">Açılan sistemler renkli, henüz açılmayanlar 🔒</p>`;
  GUIDE.forEach(([sec,items])=>{ h+=`<div class="ugh">${sec}</div>`; items.forEach(([e,t,d,ok])=>{ const on=ok(); h+=`<div class="row" style="${on?'':'opacity:.5'}"><div class="ic">${on?e:'🔒'}</div><div class="tx">${t}<small>${on?d:'İlerledikçe açılır'}</small></div></div>`; }); });
  openModal(h,m=>{ m.querySelector('#gdX').onclick=closeModal; });
}

// ---------- what's new (once per version) ----------
const GAME_VER=39;
function whatsNew(){
  if(state.tut<TUT.length||(state.seenVer||0)>=GAME_VER) return; state.seenVer=GAME_VER; markSave();
  setTimeout(()=>openModal(`<h3>🆕 Neler yeni?</h3><p class="sub">Otelin büyüdü! Öne çıkanlar:</p>
    ${[['⭐','Ün artık son 3 günün performansı: kötü gün yıldız kaybettirebilir'],['🧐','Yıldız arttıkça misafirler titizleşir (manzara, hız, bekleme)'],['🏗️','4★ sonrası büyük yatırımlar · taşınırken paranın %10\'u gelir'],['⚠️','Etkinliklerde kapora ve canlı arızalar: koş, düzelt!'],['🎤','Canlı etkinlikler: düğün, konser ve konferansı sahnede izle, yanında durup coşkuyu artır'],['🚪','Lobiden restorana, çamaşırhane/spa, havuz ve spor salonuna yan kapılar'],['🛎️','Uzun konaklamada resepsiyon onay ister · köpek ve alkol kuralı'],['⏳','Dolu odaya yükseltme sırası, bakım modu, MAX satın alma'],['🏊','Havuz, spor salonu ve spaya günübirlik ziyaretçiler'],['🔥','Günlük giriş serisi, otomatik tempo, yeni sesler ve yağmur']].map(([e,t])=>`<div class="row"><div class="ic">${e}</div><div class="tx">${t}</div></div>`).join('')}
    <button class="btn gold wide" id="wnGuide">📘 Rehberi aç</button><button class="btn ghost wide" id="wnOk">Oynamaya devam</button>`,m=>{ m.querySelector('#wnOk').onclick=closeModal; m.querySelector('#wnGuide').onclick=openGuide; }),2200);
}

// ---------- first-time tips for the newer systems ----------
let tip3T=8;
function updateTips3(dt){
  if(state.tut<TUT.length||sheetMode||modalWrap.classList.contains('show')) return; tip3T-=dt; if(tip3T>0) return; tip3T=20;
  if(skillPts()>0&&tipOnce('t_skill','🧠 Yetenek puanın var! Sol üstteki seviye kutusuna dokun',6)) return;
  if(passClaimable()&&tipOnce('t_pass','🎖️ Ödül yolunda alınacak ödülün var: 🎯 düğmesi',6)) return;
  if(state.day>=4&&queue.length>=5&&tipOnce('t_price','💲 Sıra hep dolu: Yönetim › Otel\'den fiyatı artırmayı dene',6)) return;
  if(roomsOfType('dlx')>=1&&tipOnce('t_design','🛋️ Bir odaya dokun: tema seç ve mobilya yerleştir',6)) return;
  if(built('staff')&&staffEnts.length>=2&&tipOnce('t_staffchat','👥 Personele dokunarak onlarla konuşabilir, övebilirsin',6)) return;
  if(state.day>=6&&tipOnce('t_guide','📘 Tüm sistemler için Ayarlar › Rehber',6)) return;
}

// ---------- city music (classic theme uses the city's mode) ----------
const CITY_CHORDS={
  'İstanbul':[[146.8,185,220],[155.6,196,233.1],[146.8,185,220],[130.8,164.8,196]],
  'Antalya':[[261.6,329.6,392],[293.7,370,440],[329.6,415.3,493.9],[261.6,329.6,392]],
  'Kapadokya':[[146.8,174.6,220],[130.8,164.8,196],[174.6,220,261.6],[164.8,196,246.9]],
  'Bodrum':[[196,246.9,293.7],[220,277.2,329.6],[196,246.9,293.7],[174.6,220,277.2]],
  'Paris':[[261.6,329.6,392,493.9],[220,261.6,329.6,392],[293.7,349.2,440,523.3],[196,246.9,293.7,349.2]],
  'Dubai':[[164.8,207.7,246.9],[174.6,220,261.6],[164.8,207.7,246.9],[146.8,174.6,220]]};
function applyCityMusic(){ if(themeKey()!=='classic') return; const C=CITY_CHORDS[city().name]; if(!C) return; CHORDS.length=0; C.forEach(c=>CHORDS.push(c)); }

// ---------- hotel party: repeatable late-game money sink ----------
function partyCost(){ return r10(2500*cm()*Math.pow(1.45,state.parties||0)); }
function partyOn(){ return state.partyDay===state.day; }
function throwParty(){
  if(partyOn()||stars()<4||!spend(partyCost())) return; state.parties=(state.parties||0)+1; state.partyDay=state.day; state.fwUntil=0;
  banner('🎉 Otel partisi başladı!','Bugün misafir akını, gelirler %15 fazla, gece havai fişek!'); sfx('star'); if(!lowFx()) confettiAt(player.x,player.y+2,player.z,120); changeRep(2); onGameEvent('party',1); save(); renderSheet();
}
function partyHtml(){
  if(stars()<4) return '';
  return `<div class="row"><div class="ic">🎉</div><div class="tx">Otel partisi<small>Bugünü festivale çevir: misafir x1.6, gelir +%15, +2 ün · her parti daha pahalı${partyOn()?' · <b>şu an parti var!</b>':''}</small></div><button class="btn gold" data-party ${partyOn()||state.money<partyCost()?'disabled':''}>${fmt(partyCost())} ₺</button></div>`;
}

// ---------- resepsiyon zili: bekleyen misafir varken hafifçe haber ver ----------
let bellCd=0;
function updateDeskBell(dt){
  bellCd-=dt; const g=queue[0];
  if(!g||g.state!=='queue'||g.path||deskState.server||state.tut<TUT.length) return;
  const waited=g.patMax-g.pat, low=g.pat/g.patMax<0.4;
  if(bellCd>0) return;
  if(!g.belled&&waited>=6){ g.belled=true; bellCd=8; sfx('bell'); fxEmoji(L.desk.x,1.9,L.desk.z,0,'🛎️'); }
  else if(g.belled&&!g.belled2&&low){ g.belled2=true; bellCd=8; sfx('bell'); fxEmoji(L.desk.x,1.9,L.desk.z,0,'🛎️'); }
}

// ---------- hooks ----------
function updatePolish3(dt){ updateTips3(dt); updateDeskBell(dt*gameSpeed); if((gtime*4|0)!==(updatePolish3.s|0)){ updatePolish3.s=gtime*4; updateDots(); } }
function bootPolish3(){ applyCityMusic(); whatsNew(); }
