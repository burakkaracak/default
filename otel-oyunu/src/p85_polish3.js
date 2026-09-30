
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
  ['🏢 İşletme',[['👨‍🍳','Mutfak ve oda servisi','Yemekler mutfakta pişer, hazır tepsiler restoran tezgâhında belirir. Aşçı 1,5 kat hızlı pişirir.',()=>built('rest')],
    ['🧺','Çamaşır → depo','Çamaşırhanede yıkanan her çarşaf depoya 2 havlu ekler.',()=>built('laundry')],
    ['📅','Rezervasyon ve overbooking','Her gece 2 gün sonrası için rezervasyon gelir, kapora hemen kasaya girer. Fazla rezervasyon daha çok para getirir; oda bulamayan misafir tazminat ve ün kaybettirir (Otel › Ekonomi).',()=>bookingsOpen()],
    ['😊','Personel morali ve grev','Yorgunluk, eksi bakiye ve reddedilen izin morali düşürür; mola odası ve prim yükseltir. 3★ sonrası moral çok düşerse grev olur.',()=>built('staff')],
    ['🌙','Gece vardiyası ve gece mutfağı','Kapalıysa personel gece yarı hızla çalışır; açıksa maaşlar +%25 ama mutfak gece de oda servisi pişirir (Personel).',()=>built('staff')],
    ['☀️','Sabah brifingi','Müdür kartı, izin talebi, fiyat savaşı ve grev tek kartta gelir; kapatırsan Otel › Genel\'den yeniden açılır.',()=>state.day>=3],
    ['🧬','Personel kişilikleri','İşe alırken iki aday arasından seçersin; kişilik kalıcıdır (hız, maaş, moral, yorgunluk, terfi). Personel sekmesinde Ekip listesi.',()=>built('staff')],
    ['🧠','Misafir hafızası','Sadık misafir eski odasını hatırlar: resepsiyonda odası parlar, aynı odayı verirsen sevinir.',()=>(state.loyal||[]).length>0]]],
  ['🌍 Şehir ve dünya',[['🏛️','Şehrin otel planı','Her şehrin kendi oda planı var; boş yerlerde şehre özgü köşeler küçük gelir ve memnuniyet getirir.',()=>true],
    ['📆','Takvim ve haberler','Sezon, bayram, ramazan (iftar/sahur), maç-konser-fuar günleri misafir sayısını ve tipini değiştirir. Üstteki takvim şeridi 3 gün önceden gösterir.',()=>state.day>=2],
    ['🔥','Efsane zorluk','Otel › Genel › Oyun temposu: misafir daha çok ve sabırsız, maaş +%25, arıza +%50. Şehrin %80\'ini Efsane\'de oynarsan taşınma anahtarları ×1,5.',()=>state.day>=2],
    ['♿','Erişilebilirlik','Ayarlar: Büyük yazı (arayüz %18 büyür), Yüksek kontrast, Hareketi azalt (kamera sarsıntısı, sinematik ve animasyonlar kapanır; sistem tercihi otomatik algılanır).',()=>true],
    ['🛟','Kayıt güvenliği','Her gün sonunda yedek alınır (2 gün geriye); kayıt bozulursa otomatik yedeğe düşülür. Ayarlar › Kayıt kurtarma ile yedeği elle geri yükleyebilir, Kaydı indir ile dosya yedeği alabilirsin.',()=>true],
    ['🎧','Şehir sesleri','Her şehrin kendi ambiyansı var: martı ve vapur düdüğü, dalga, rüzgâr ve balon brülörü, çan, akordeon, şehir uğultusu; 2★ sonrası şehre özgü hafif ritim müziğe eşlik eder.',()=>true],
    ['🌟','Ultra grafik','Ayarlar › Grafik kalitesi › Ultra: Yüksek\'in üstüne birinci şahısta alan derinliği (bokeh), kenar yumuşatma, film greni, lobide gün ışığı huzmeleri ve 2.0 piksel oranı. Güçlü cihazlar için; oyun 27 FPS altına düşerse otomatik Yüksek\'e iner (Oto açıkken).',()=>true],
    ['📖','Hikâye','Her şehir bir bölüm: 3★, 4★ ve 5★\'da bir perde açılır, ahlaki bir karar verirsin (para, ün, moral, anahtar ve sonraki bölümlerde hatırlanan bayraklar). Kişilikli personel kendi 3 adımlık yan hikâyesini açar. Otel › Genel › Hikâye: Harita (kararlar ve sonuçları) ve Günlük (not defteri). Hikâye şehirler arasında taşınır.',()=>true],
    ['📈','4★ sonrası zorluk','4 yıldızdan sonra otel büyüdükçe işler zorlaşır: krizler daha sık (5★\'da aynı gün ikinci kriz gelebilir), rakip 3 günlük reklam kampanyası açar (sabah brifinginden karşı kampanya), moral 2 gün üst üste 35\'in altında kalırsa bir çalışan istifa eder (zamla geri kazanılabilir). Otel › Genel\'de durum görünür.',()=>stars()>=4],
    ['◆','Loda Mobilya','Loda (İstanbul, 2000; TD Tech Design iştiraki) gerçek marka olarak oyunda: oda tasarımcısında koleksiyon parçaları, LODA Gallery showroomu, ihracat bayileri, Loda Signature Suite. Ayarlar › Loda tasarım dili.',()=>true],
    ['✨','Yüksek grafik','Ayarlar › Grafik kalitesi › Yüksek: yansımalı mermer ve havuz, gece gerçek lamba ışıkları, lens parlaması; güçlü cihazlar için.',()=>true],
    ['📸','Foto modu','Kamera düğmelerindeki 📸: otelin adı, şehir, gün ve yıldızla çerçeveli fotoğraf; indir ve paylaş.',()=>true],
    ['📉','Fiyat savaşı','Rakip indirim yaparsa karşılık ver (bugün −%10) ya da misafir kaybet.',()=>!!state.rival],
    ['🥨','Esnaf ortaklıkları','Karşı sokaktaki simitçi, taksi, hediyelik, dondurmacı: günlük gelir ve misafir bonusu (Otel › Şehir).',()=>state.day>=3],
    ['🍸','Çatı gece barı','Çatı açıksa geceleri misafirler çatı barına çıkar: ekstra gelir.',()=>built('roof')]]],
  ['🏆 İleri seviye',[['📖','Misafir albümü','Her misafir tipini topla; şehirler arası kalıcı (Görevler › Albüm).',()=>true],
    ['💎','Elmas / Platin ve lig','5★ sonrası kademeler, haftalık Yılın Oteli ligi.',()=>stars()>=5],
    ['🗂️','Müdür masası','4★ sonrası her sabah günün stratejisini seç.',()=>stars()>=4],
    ['🏆','Prestij projeleri','5★ sonrası caddenin karşısına şehir parkı, otel müzesi ve anıt yaptır; hayır vakfına sınırsız bağış (Otel › Genel).',()=>stars()>=5],
    ['🏙️','Dış görünüm','Kat çubuğundaki 🏙️ ile oteli dışarıdan, bütün katları ve çatı silüetiyle gör.',()=>floorsBuilt()>1],
    ['🏗️','Büyük yatırımlar','4★ sonrası kalıcı yatırımlar; alırken maaşlardan sonra kalan paraya dikkat et.',()=>stars()>=4],
    ['🏢','Kat temaları ve salon','Bir katın tamamına tema ver, kat salonu aç.',()=>floorsBuilt()>1],
    ['🕌','Mescit','Çatının üstündeki kat: İstanbul vakitlerinde ezan, imam ve cemaat, Cuma kalabalık.',()=>mescitOn()]]],
  ['🎨 Özelleştirme',[['🎨','Oda teması ve tasarımı','Oda menüsünden tema seç, 🛋️ ile mobilya yerleştir.',()=>nRoomsAll()>0],
    ['🎩','Karakter ve otel','Ayarlar › Otelim ve karakterim. Ödül yolundan yeni şapkalar.',()=>true],
    ['☁️','Bulut kayıt','Ayarlar\'dan başka cihazda devam et (claude.ai\'de).',()=>true]]]];
function openGuide(){
  let h=`<h3>📘 Rehber <button class="xbtn" id="gdX" aria-label="Kapat">✖</button></h3><p class="sub">Açılan sistemler renkli, henüz açılmayanlar 🔒</p>`;
  GUIDE.forEach(([sec,items])=>{ h+=`<div class="ugh">${sec}</div>`; items.forEach(([e,t,d,ok])=>{ const on=ok(); h+=`<div class="row" style="${on?'':'opacity:.5'}"><div class="ic">${on?e:'🔒'}</div><div class="tx">${t}<small>${on?d:'İlerledikçe açılır'}</small></div></div>`; }); });
  openModal(h,m=>{ m.querySelector('#gdX').onclick=closeModal; });
}

// ---------- what's new (once per version) ----------
const GAME_VER=59;
function whatsNew(){
  if(state.tut<TUT.length||(state.seenVer||0)>=GAME_VER) return; state.seenVer=GAME_VER; markSave();
  setTimeout(()=>openModal(`<h3>🆕 Neler yeni?</h3><p class="sub">Otelin büyüdü! Öne çıkanlar:</p>
    ${[['🛋️','LODA Sophia üçlü koltuk artık GERÇEK 3D model: Loda tasarım dosyasından birebir (262×99×80 cm), galeri vitrininde 1:1 ve lobiye kurulabilir (4 kumaş); kaba prosedürel parçalar tasarımcıdan kaldırıldı'],['🚶','Yaya geçidi: otel kapısından caddenin karşısına geçilebilir; LODA Gallery\'nin cam cephesi ve kapısı artık caddeye bakar, kapı önünde durunca showroom paneli açılır (Şehir sekmesinde Yürü)'],['♿','Erişilebilirlik: büyük yazı, yüksek kontrast, hareketi azalt (Ayarlar)'],['🛟','Kayıt güvenliği: 2 günlük otomatik yedek + Kayıt kurtarma ekranı'],['🎧','Şehir sesleri: her şehre özgü ambiyans ve ritim'],['🌟','Ultra grafik seviyesi: FP alan derinliği, SMAA, film greni, lobide ışık huzmeleri (Ayarlar › Grafik › Ultra)'],['📖','Hikâye modu: 6 şehir, 18 perde, ahlaki kararlar ve sonuçları · personel kişiliklerine bağlı 7 yan hikâye · Otel › Genel › Hikâye: harita + günlük'],['📈','4★ sonrası zorluk eğrisi: krizler sıklaşır (5★: çifte kriz), rakip reklam kampanyası açar → sabah brifinginden karşı kampanya, düşük moralde istifa → zamla geri kazan'],['◆','LODA geldi: oda tasarımcısında Savana, Domo, Nova, Dali ve Sophia parçaları (lake / ahşap kaplama gövde, fluting kuralı) · 3 Loda parçalı suit = LODA Signature Suite (+%25 gecelik)'],['🛋️','LODA Gallery (3★): caddenin karşısında showroom, mutlu ayrılan misafirler mobilya alır · vitrinlerle satış şansı artar'],['🧳','İhracat bayileri (4★): Fargotex ve AlmiDécor alıcıları gelir, memnun ayrılırsa kaporalı sipariş'],['◆','Ayarlar › Loda tasarım dili: Montserrat, altın ve siyah arayüz; foto çerçevesi de Loda paletinde'],['✨','Grafik 5 (Yüksek kalite): lobide gerçek zemin yansıması, havuzda gök yansıması, gece sokak lambaları ve restoranda gerçek ışık, güneşe bakınca lens parlaması'],['🧬','Personel kişilikleri: işe alırken iki aday, her birinin kalıcı bir huyu var (Çalışkan, Gece kuşu, Tutumlu, Sakar…)'],['🔥','Efsane zorluk: daha çok ve sabırsız misafir, pahalı maaş, sık arıza · şehri Efsane zorlukta bitirirsen taşınma anahtarları ×1,5'],['📸','Foto modu: kamera düğmelerindeki 📸 ile otelinin çerçeveli fotoğrafını indir'],['🏆','Spor takımı: kaptan + 2 sporcu birlikte gelir, hepsi mutlu ayrılırsa takım fotoğrafı (+1 ün)'],['🎬','Film ekibi (4★): çatıya çıkınca çekim yapar · +1 ün, ertesi gün misafir +%20'],['☀️','Sabah brifingi: günün kararları (müdür kartı, izin, fiyat savaşı, grev) artık tek kartta · sayfayı yenilesen de kaybolmaz'],['📉','Fiyat savaşı gerçekten çalışıyor: rakip indirim yapınca karşılık verebilirsin'],['🌙','Sahurda misafirler uyanıp oda servisi istiyor · gece vardiyası açıksa mutfak gece de çalışır'],['🏖️','İzindeki personel artık gerçekten izinde: işi bırakır, ertesi gün döner'],['🚚','Taşınırken ayarların ve zincir müdürlerin seninle gelir'],['🗽','Anıt ve bağışlar ün hedefine kalıcı bonus verir'],['🥯','Esnaf ortaklıkları daha kârlı (~9 günde geri döner)'],['💼','Fuar günü misafirler fiyata daha az bakıyor'],['🏆','5★ sonrası prestij projeleri: şehir parkı, otel müzesi, anıt · hayır vakfına sınırsız bağış'],['🏙️','Dış görünüm: kat çubuğundaki 🏙️ ile otelin tamamını gör'],['🌃','Gece iç mekân daha loş ve sıcak'],['🌙','Bayram artık ramazanın hemen ardından geliyor'],['🔇','Uygulamadan çıkınca sesler susuyor'],['🌙','Gece artık gerçekten kararıyor: sokak lambaları, pencereler, çatı ampulleri ve yıldızlar'],['👨‍🍳','Yeni personel: Aşçı · oda servisini 1,5 kat hızlı pişirir'],['🗓️','Üstte takvim şeridi: bayram, ramazan, maç, konser günlerini 2 gün önceden gör'],['🍸','Çatı gece barı: akşamları misafirler çatıya çıkar, gelir +%50'],['🏰','Her şehrin çatı silüeti: kubbeli kule, mansard, peribacaları, gökdelen kulesi'],['🧠','Sadık misafirin eski odası resepsiyonda pembe halkayla parlar'],['📘','Rehber yenilendi · menü bölümleri açılır-kapanır · maaş uyarıları'],['🔒','Rezervasyon ve grev artık 3★\'dan sonra açılıyor'],['🏛️','Her şehrin kendi otel planı: 30–36 oda yeri, boş yerlerde şehre özgü köşeler, girişte şehrin mimarisi'],['🍳','Mutfak: yemekler pişip tezgâha gelir · çamaşırhane havluyu depoya taşır'],['📅','Rezervasyonlar ve overbooking: kapora al, gelmeyen/yersiz kalan misafire tazminat'],['😤','Personel morali: prim, izin, gece vardiyası, grev'],['🧠','Misafir hafızası: sadık misafir aynı odasını ister, kötü deneyimi unutmaz'],['🌙','Yaşayan takvim: sezon, bayram, ramazan iftar/sahur, maç-konser-fuar haberleri'],['🏙️','Rakip otel büyür, fiyat savaşı açar · karşı sokakta esnaf ortaklıkları'],['💡','Gece sokak lambası ışıkları, yağmurda sıçramalar, karda ayak izleri, araba sesi, şehir açılış sinematiği'],['🌅','Yeni grafikler: bulutlu gökyüzü, dalgalı parlayan su ve kostik ışık, dokulu mermer-ahşap-taş, karakterlerde kenar ışığı'],['⚡','Çok daha akıcı: karakterler ve odalar birleştirildi, çizim yükü ~%70 azaldı'],['🔊','Gerçek sesler: bozuk para, inşaat, şehir ambiyansı, adım sesi, yeni arayüz sesleri'],['🕌','Mescit katı: çatının üstünde, İstanbul vakitlerinde ezan, imam ve cemaat, Cuma kalabalık + hutbe'],['📖','Misafir albümü: her misafir tipini topla, ödül al (Görevler › Albüm)'],['💎','5★ sonrası Elmas ve Platin kademeleri · haftalık Yılın Oteli ligi'],['🗂️','Müdür masası: her sabah günün stratejisini seç (4★)'],['🏢','Kat temaları ve kat salonu · şehre özel tesis (Boğaz turu, balon, safari…)'],['🚪','Dolu odanın kapısı kapalı: istekleri kapıdan teslim et'],['📺','Misafirler odada TV izliyor, uzanıyor, okuyor, çalışıyor, banyoya giriyor'],['🎯','Tek Görevler ekranı: Bugün / Bu hafta / Kalıcı sekmeleri'],['🏨','Otel menüsü alt sekmelere bölündü: Genel, Ekonomi, Etkinlik, Kural, Şehir'],['🪟','Pencereler artık üst üste binmez, sırayla gelir'],['⭐','Ün artık son 3 günün performansı: kötü gün yıldız kaybettirebilir'],['🧐','Yıldız arttıkça misafirler titizleşir (manzara, hız, bekleme)'],['🏗️','4★ sonrası büyük yatırımlar · taşınırken paranın %10\'u gelir'],['⚠️','Etkinliklerde kapora ve canlı arızalar: koş, düzelt!'],['🎤','Canlı etkinlikler: düğün, konser ve konferansı sahnede izle, yanında durup coşkuyu artır'],['🚪','Lobiden restorana, çamaşırhane/spa, havuz ve spor salonuna yan kapılar'],['🛎️','Uzun konaklamada resepsiyon onay ister · köpek ve alkol kuralı'],['⏳','Dolu odaya yükseltme sırası, bakım modu, MAX satın alma'],['🏊','Havuz, spor salonu ve spaya günübirlik ziyaretçiler'],['🔥','Günlük giriş serisi, otomatik tempo, yeni sesler ve yağmur']].map(([e,t])=>`<div class="row"><div class="ic">${e}</div><div class="tx">${t}</div></div>`).join('')}
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
  if(built('rest')&&state.day>=2&&tipOnce('t_kitchen','👨‍🍳 Oda servisi mutfakta pişer, hazır tepsiler tezgâhta belirir · Aşçı işe alırsan hızlanır',7)) return;
  if(bookingsOpen()&&tipOnce('t_book','📅 Rezervasyonlar açıldı! Kapora kasaya girer · Otel › Ekonomi › Rezervasyon takvimi',7)) return;
  if(built('staff')&&staffEnts.length>=2&&morale()<45&&tipOnce('t_morale','😟 Personel morali düşüyor: prim ver ya da mola odası aç (Personel)',7)) return;
  if(built('staff')&&staffEnts.length>=2&&isNight()&&!state.nightShift&&tipOnce('t_night','🌙 Gece personel yarı hızla çalışır · Personel › Gece vardiyası',7)) return;
  if(state.day>=3&&!Object.keys(state.shops||{}).length&&tipOnce('t_shops','🥨 Karşı sokaktaki esnafla ortak ol: günlük gelir · Otel › Şehir',7)) return;
  if(state.day>=2&&tipOnce('t_cal','📆 Üstteki takvim şeridi bayram, maç, konser günlerini önceden gösterir',7)) return;
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
