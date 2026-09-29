// =====================================================================
// MG11-C: HİKÂYE — 6 şehir bölümü (her biri 3 perde: 3★/4★/5★'da ahlaki karar),
// personel kişiliğine bağlı yan zincirler (3 adım), zincir haritası (sonuçlar),
// günlük (state.saga.diary). state.saga şehirler arası TAŞINIR (p8 taşınma listesi).
// =====================================================================
function saga(){ if(!state.saga) state.saga={ch:{},side:{},diary:[],pend:null,lastStars:0,flags:{}}; const S=state.saga; S.ch=S.ch||{}; S.side=S.side||{}; S.diary=S.diary||[]; S.flags=S.flags||{}; return S; }
function sagaCh(i){ const S=saga(); return S.ch[i]=S.ch[i]||{beats:{},intro:false}; }
function diary(t,e){ const S=saga(); S.diary.unshift({d:state.day,c:state.city,t:clip(t,200),e:e||'📔'}); if(S.diary.length>80) S.diary.length=80; markSave(); }
// ---------- bölümler ----------
// fx: {money, rep, morale, keys, flag} — flag sonraki perdeler/bölümlerde okunur (saga().flags)
const CHAPTERS=[
  {t:'Bir Rüyanın Başlangıcı',intro:'İstanbul. Babandan kalan küçük pansiyonu devraldın; borç var, ün yok. Ama Boğaz manzarası bedava.',
   beats:[{k:'b1',st:3,txt:'Bir belediye müfettişi geldi: "İskele izniniz eksik. Bir zarf her şeyi çözer."',q:'Ne yapıyorsun?',
            a:{t:'Zarfı ver (−3.000 ₺)',fx:{money:-3000,flag:'zarf'},res:'İzin bir günde çıktı. Ama müfettiş adını unutmadı.'},
            b:{t:'Reddet, resmi yoldan başvur (−2 ün, 2 gün)',fx:{rep:-2,flag:'durust'},res:'Başvuru sürdü ama mahalle seni konuşmaya başladı: "Dürüst otelci."'}},
          {k:'b2',st:4,txt:'Eski bir çalışanın annesi kapıda: oğlu hasta, hastane masrafı için yardım istiyor.',q:'Kararın?',
            a:{t:'Masrafı üstlen (−6.000 ₺, moral +8)',fx:{money:-6000,morale:8,flag:'vefa'},res:'Ekip bunu duydu. "Bu otel aile gibi" dediler.'},
            b:{t:'Üzgünüm, bütçe yok',fx:{morale:-4},res:'Kimse bir şey demedi. Ama kimse de gülümsemedi.'}},
          {k:'b3',st:5,txt:'Bir zincir otel grubu pansiyonu satın almak istiyor: büyük para, ama adı silinecek.',q:'Son karar?',
            a:{t:'Sat, yeni şehre sermayeyle git (+40.000 ₺)',fx:{money:40000,flag:'satti'},res:'Tabela indi. Cebin dolu, kalbin biraz boş.'},
            b:{t:'Satma; ad kalsın (+2 🗝️, +5 ün)',fx:{keys:2,rep:5,flag:'adkaldi'},res:'Tabela yerinde. Hikâye seninle taşınıyor.'}}]},
  {t:'Güneşin Bedeli',intro:'Antalya. Sezon kısa, rekabet sert. Kumsalın tam karşısındasın.',
   beats:[{k:'b1',st:3,txt:'Tur operatörü teklifi: otobüs dolusu misafir, ama gecelik %40 indirimle.',q:'Kabul?',
            a:{t:'Kabul et (bugün +12.000 ₺, 3 gün −3 ün)',fx:{money:12000,rep:-3,flag:'tur'},res:'Lobide bavul dağı. Kasa doldu, yorumlar "kalabalık" dedi.'},
            b:{t:'Reddet, butik kal',fx:{rep:2,flag:'butik'},res:'Sessiz sezon; ama yorumlar "huzurlu" dedi.'}},
          {k:'b2',st:4,txt:'Havuz kimyasalı tedarikçisi ucuz ama sertifikasız ürün öneriyor.',q:'Ne yapıyorsun?',
            a:{t:'Ucuzunu al (+4.000 ₺ tasarruf)',fx:{money:4000,flag:'ucuz'},res:'Bir misafirin gözü kızardı. Şimdilik kimse şikâyet etmedi.'},
            b:{t:'Sertifikalıyı al (−4.000 ₺, moral +3)',fx:{money:-4000,morale:3,flag:'guvenli'},res:'Cankurtaran teşekkür etti. Havuz pırıl pırıl.'}},
          {k:'b3',st:5,txt:'Deniz kaplumbağası yuvası tam plaj barının önünde. Doğa derneği barı kapatmanı istiyor.',q:'Kararın?',
            a:{t:'Barı sezon boyu kapat (−8.000 ₺, +6 ün, +1 🗝️)',fx:{money:-8000,rep:6,keys:1,flag:'kaplumbaga'},res:'Yavrular denize ulaştı. Haberlere çıktın.'},
            b:{t:'Bar açık kalsın',fx:{money:3000,rep:-4},res:'Bar çalıştı. Dernek afişleri kapına astı.'}}]},
  {t:'Taşın Hafızası',intro:'Kapadokya. Peribacaları arasında, mağara odalar. Burada acele eden kaybeder.',
   beats:[{k:'b1',st:3,txt:'Kazı sırasında odanın altında eski bir fresk bulundu. Müze haber verilirse inşaat 5 gün durur.',q:'Ne yapıyorsun?',
            a:{t:'Müzeye bildir (−5.000 ₺, +5 ün, +1 🗝️)',fx:{money:-5000,rep:5,keys:1,flag:'fresk'},res:'Fresk restore edildi; otelin "fresk odası" ünlendi.'},
            b:{t:'Üstünü sıva, devam et',fx:{money:2000,flag:'siva'},res:'Kimse bilmedi. Sen bildin.'}},
          {k:'b2',st:4,txt:'Balon pilotu sabah 5\'te misafirleri almak istiyor; gece vardiyası olmadan resepsiyon boş.',q:'Kararın?',
            a:{t:'Gece vardiyasını aç, balon anlaşması yap (+ün, maaş artar)',fx:{rep:4,flag:'balon',night:true},res:'Şafakta gökyüzü balon dolu; misafirler fotoğraf paylaşıyor.'},
            b:{t:'Anlaşmayı reddet',fx:{},res:'Misafirler balonu başka otelden bindi.'}},
          {k:'b3',st:5,txt:'Köylüler, otelin su kuyusunu kuraklıkta paylaşmanı istiyor. Havuz suyu azalacak.',q:'Kararın?',
            a:{t:'Paylaş (−4 memnuniyet 3 gün, +8 ün, +1 🗝️)',fx:{rep:8,keys:1,flag:'kuyu'},res:'Köy meydanında adın anılıyor. Havuz biraz sığ.'},
            b:{t:'Kuyu bize lazım',fx:{money:0,rep:-3},res:'Havuz dolu; köy kahvesinde sessizlik.'}}]},
  {t:'Rüzgârın Yönü',intro:'Bodrum. Marina, yatlar, gece hayatı. Gürültü ve para aynı yerden gelir.',
   beats:[{k:'b1',st:3,txt:'Ünlü bir DJ otelde parti vermek istiyor: gelir büyük, uyku yok.',q:'Kabul?',
            a:{t:'Parti olsun (+15.000 ₺, 2 gün −5 memnuniyet)',fx:{money:15000,flag:'parti'},res:'Sabah 6\'da bitti. Komşu oteller şikâyet etti, kasa güldü.'},
            b:{t:'Sessizlik politikası',fx:{rep:3,flag:'sessiz'},res:'Aileler "nihayet uyuduk" yazdı.'}},
          {k:'b2',st:4,txt:'Yat sahibi bir misafir, personelinden birine kaba davrandı ve özür dilemeyi reddediyor.',q:'Ne yapıyorsun?',
            a:{t:'Misafiri otelden çıkar (−6.000 ₺ iade, moral +10)',fx:{money:-6000,morale:10,flag:'ekip'},res:'Ekip alkışladı. Yat sahibi kötü yorum yazdı; kimse okumadı.'},
            b:{t:'Personelden özür dilemesini iste',fx:{money:2000,morale:-10,flag:'musteri'},res:'Misafir kaldı. Personel o gece erken çıktı.'}},
          {k:'b3',st:5,txt:'Marina genişlemesi için sahil ağaçlarının kesilmesi oylanıyor; oyun belirleyici.',q:'Oyun?',
            a:{t:'Ağaçlar kalsın (+6 ün, +1 🗝️)',fx:{rep:6,keys:1,flag:'agac'},res:'Gölgeler kaldı. Marina biraz küçük, koy hâlâ güzel.'},
            b:{t:'Marina büyüsün (+10.000 ₺)',fx:{money:10000,rep:-2},res:'Daha çok yat, daha az gölge.'}}]},
  {t:'Işıklar Şehri',intro:'Paris. Haussmann cephesi, küçük odalar, büyük beklentiler. Burada her ayrıntı puan.',
   beats:[{k:'b1',st:3,txt:'Michelin müfettişi olduğu söylenen biri restoranda; şef "özel menü" için pahalı malzeme istiyor.',q:'Kararın?',
            a:{t:'Malzemeyi al (−7.000 ₺)',fx:{money:-7000,flag:'sef'},res:'Müfettiş değilmiş. Ama menü kaldı ve herkes sevdi.'},
            b:{t:'Standart menü yeter',fx:{morale:-3},res:'Şef bir hafta konuşmadı.'}},
          {k:'b2',st:4,txt:'Bir sanatçı lobide 2 hafta sergi açmak istiyor; karşılığında bir tablo hediye edecek.',q:'Kabul?',
            a:{t:'Sergi açılsın (+4 ün, lobi kalabalık)',fx:{rep:4,flag:'sergi'},res:'Vernissage gecesi lobi doldu. Tablo resepsiyonun arkasında.'},
            b:{t:'Lobi misafir için',fx:{},res:'Sanatçı karşı kafede sergi açtı; tablo orada.'}},
          {k:'b3',st:5,txt:'Grev günü: şehirde ulaşım durdu, personel gelemiyor. Misafirler odalarını kendileri toplamayı teklif ediyor.',q:'Kararın?',
            a:{t:'Kabul et, karşılığında ücretsiz akşam yemeği (−5.000 ₺, +7 ün, +1 🗝️)',fx:{money:-5000,rep:7,keys:1,flag:'dayanisma'},res:'O akşam lobide herkes aynı masadaydı.'},
            b:{t:'Hizmeti askıya al, iade yap (−9.000 ₺)',fx:{money:-9000,rep:-2},res:'Sessiz bir gün. Kasa ağladı.'}}]},
  {t:'Kumdan Kule',intro:'Dubai. Gökdelenler arasında son durak. Burada büyüklük her şey — ya da öyle sanılır.',
   beats:[{k:'b1',st:3,txt:'Bir influencer ücretsiz süit karşılığında 1 milyon takipçiye tanıtım vaat ediyor.',q:'Kabul?',
            a:{t:'Süiti ver (+6 ün)',fx:{rep:6,flag:'influencer'},res:'Video 2 milyon izlendi. Süit 3 gün doluydu ama ödeme yoktu.'},
            b:{t:'Herkes öder',fx:{money:4000},res:'Influencer komşu otele gitti. Sen fatura kestin.'}},
          {k:'b2',st:4,txt:'İnşaat işçileri sıcakta çalışıyor; müteahhit gölgelik ve su için ek bütçe istemiyor.',q:'Ne yapıyorsun?',
            a:{t:'Gölgelik ve suyu sen karşıla (−5.000 ₺, moral +6)',fx:{money:-5000,morale:6,flag:'isci'},res:'İşçiler otelin adını öğrendi. Cephe iki gün erken bitti.'},
            b:{t:'Müteahhitin işi',fx:{},res:'Cephe zamanında bitti. Kimse teşekkür etmedi.'}},
          {k:'b3',st:5,txt:'Son perde: Yatırımcı, altı şehirdeki otellerini tek markada birleştirmeni öneriyor. Ad senin, karar senin.',q:'Markanın adı ne olsun?',
            a:{t:'Kendi adın kalsın (+3 🗝️, +10 ün)',fx:{keys:3,rep:10,flag:'marka'},res:'Altı şehir, tek tabela. Babanın pansiyonundan başlayan hikâye burada bitmiyor.'},
            b:{t:'Yatırımcının markası (+60.000 ₺)',fx:{money:60000,flag:'yatirimci'},res:'Büyük para, başkasının adı. Hikâye yine de senindi.'}}]}];
function chapterOf(i){ return CHAPTERS[i%CHAPTERS.length]; }
function beatDone(i,k){ return !!sagaCh(i).beats[k]; }
function sagaProgress(i){ const C=chapterOf(i); return C.beats.filter(b=>beatDone(i,b.k)).length; }
function sagaStatus(){ const i=state.city; return `${sagaProgress(i)}/3 perde`; }
// ---------- perde tetikleme ----------
function sagaCheck(){ if(state.tut<TUT.length||state.sandbox) return; const S=saga(), i=state.city, C=chapterOf(i), ch=sagaCh(i);
  if(!ch.intro){ ch.intro=true; diary(`${city().e} ${C.t}: ${C.intro}`,'🏙️'); banner(`📖 Bölüm ${i+1}: ${C.t}`,C.intro); markSave(); return; }
  if(S.pend) return; const st=stars(); if(st!==S.lastStars){ if(st>S.lastStars&&S.lastStars>0) diary(`Otel ${st} yıldıza yükseldi.`,'⭐'); S.lastStars=st; }
  const b=C.beats.find(x=>!beatDone(i,x.k)&&st>=x.st); if(!b) return; S.pend={city:i,k:b.k}; markSave(); openBeat(); }
function openBeat(){ const S=saga(), P=S.pend; if(!P) return; const C=chapterOf(P.city), b=C.beats.find(x=>x.k===P.k); if(!b){ S.pend=null; return; }
  openModal(`<h3>📖 ${escH(C.t)} · perde ${C.beats.indexOf(b)+1}</h3><p class="sub">${escH(b.txt)}</p><p><b>${escH(b.q)}</b></p>
    <button class="btn gold wide" data-beat="a">${escH(b.a.t)}</button><button class="btn ghost wide" data-beat="b">${escH(b.b.t)}</button><p class="note">Kararlar günlüğe yazılır ve sonraki bölümlerde hatırlanır.</p>`,
    m=>m.querySelectorAll('[data-beat]').forEach(x=>x.onclick=()=>{ sagaChoose(x.dataset.beat); closeModal(); })); }
function sagaChoose(c){ const S=saga(), P=S.pend; if(!P) return false; const C=chapterOf(P.city), b=C.beats.find(x=>x.k===P.k); if(!b) { S.pend=null; return false; }
  const o=b[c]||b.a, fx=o.fx||{}; if(fx.money){ if(fx.money<0) state.money+=fx.money; else addMoney(fx.money,player.x,player.y+1.2,player.z,player.f,true); }
  if(fx.rep) changeRep(fx.rep); if(fx.morale) state.morale=clamp(morale()+fx.morale,0,100); if(fx.keys){ state.keys=(state.keys||0)+fx.keys; } if(fx.night) state.nightShift=true; if(fx.flag) S.flags[fx.flag]=state.city+1;
  sagaCh(P.city).beats[P.k]=c; S.pend=null; diary(`${C.t}: ${o.t} — ${o.res}`,'📖'); banner('📖 '+o.res,fx.keys?`+${fx.keys} 🗝️`:''); sfx(fx.rep&&fx.rep<0?'bad':'star'); onGameEvent('saga',1);
  if(sagaProgress(P.city)===3){ setTimeout(()=>{ toast(`📖 Bölüm ${P.city+1} tamamlandı · ${sagaEpilogue(P.city)}`); },2500); } save(); return true; }
function sagaEpilogue(i){ const F=saga().flags; if(i===0) return F.adkaldi?'Tabela yerinde kaldı.':'Pansiyon satıldı, yol açıldı.'; if(i===5) return F.marka?'Altı şehirde kendi adın.':'Büyük para, başkasının adı.';
  const good=['durust','vefa','butik','guvenli','kaplumbaga','fresk','kuyu','sessiz','ekip','agac','sef','sergi','dayanisma','isci'].filter(k=>F[k]).length; return good>=4?'Vicdanı rahat bir otelci.':good>=2?'Dengeli bir yol.':'Kasa dolu, sorular çok.'; }
// ---------- yan zincirler (personel kişiliği) ----------
// her adım: gün sonunda (rep = biten günün raporu) tek koşul; günde en fazla 1 adım
const SIDE={
  calisan:{n:'Hız Rekoru',steps:['Bir günde 10 misafir ağırla','Bir günde 15 misafir, hiç kaybetmeden','Ekip morali 70+ iken 20 misafir'],
    cond:[(t)=>t.guests>=10,(t)=>t.guests>=15&&!t.left,(t)=>t.guests>=20&&morale()>=70],rew:{money:2500,keys:1}},
  neseli:{n:'Ekip Ruhu',steps:['Moral 60+','Moral 75+','Moral 85+ ve grev yok'],cond:[()=>morale()>=60,()=>morale()>=75,()=>morale()>=85&&!strikeOn()],rew:{money:1500,morale:10}},
  gece:{n:'Gece Bekçisi',steps:['Gece vardiyasını aç','Gece vardiyasıyla 12 misafirlik bir gün','3 gün üst üste gece vardiyası'],cond:[()=>!!state.nightShift,(t)=>!!state.nightShift&&t.guests>=12,()=>!!state.nightShift&&(saga().side.gece.n3=(saga().side.gece.n3||0)+1)>=3],rew:{money:2000,keys:1}},
  dayanikli:{n:'Demir Ekip',steps:['1 kriz atlat','3 kriz atlat','6 kriz atlat'],cond:[()=>(state.stats||{}).crisis>=1,()=>(state.stats||{}).crisis>=3,()=>(state.stats||{}).crisis>=6],rew:{money:3000,keys:1}},
  tutumlu:{n:'Kuruşun Hesabı',steps:['Kasada 20.000 ₺','3 gün eksiye düşmeden','Kasada 60.000 ₺'],cond:[()=>state.money>=20000*cm(),()=>state.money>=0&&(saga().side.tutumlu.n2=(saga().side.tutumlu.n2||0)+1)>=3,()=>state.money>=60000*cm()],rew:{money:4000}},
  yetenekli:{n:'Usta Eller',steps:['3 oda yükselt','8 oda yükselt','15 oda yükselt'],cond:[()=>(state.stats||{}).upg>=3,()=>(state.stats||{}).upg>=8,()=>(state.stats||{}).upg>=15],rew:{money:2500,keys:1}},
  sakar:{n:'Sakarlıktan Ustalığa',steps:['Bir günde en fazla 2 mutsuz misafir','Hiç misafir kaybetmeden bir gün','2 gün üst üste kayıpsız'],cond:[(t)=>t.unhappy<=2&&t.guests>=6,(t)=>!t.left&&t.guests>=8,(t)=>!t.left&&t.guests>=8&&(saga().side.sakar.n3=(saga().side.sakar.n3||0)+1)>=2],rew:{money:2000,morale:6}}};
function sideActive(tr){ return staffEnts.some(e=>e.rec&&e.rec.tr===tr); }
function sideState(tr){ const S=saga(); return S.side[tr]=S.side[tr]||{step:0}; }
function sagaDayEnd(t){ if(state.sandbox||state.tut<TUT.length) return; let done=0;
  for(const tr in SIDE){ if(done) break; const s=sideState(tr); if(s.step>=3||!sideActive(tr)) continue; const D=SIDE[tr]; let ok=false; try{ ok=!!D.cond[s.step](t||{}); }catch(e){ ok=false; }
    if(!ok) continue; s.step++; done=1; const T=TRAITS[tr];
    if(s.step<3){ diary(`${T.e} ${D.n}: ${D.steps[s.step-1]} ✓`,'🧩'); setTimeout(()=>toast(`${T.e} Yan hikâye "${D.n}": ${s.step}/3`),2600); }
    else { const R=D.rew; if(R.money){ state.money+=r10(R.money*cm()); } if(R.keys) state.keys=(state.keys||0)+R.keys; if(R.morale) state.morale=clamp(morale()+R.morale,0,100);
      diary(`${T.e} ${D.n} tamamlandı: ${R.money?fmt(r10(R.money*cm()))+' ₺':''}${R.keys?' +'+R.keys+' 🗝️':''}${R.morale?' moral +'+R.morale:''}`,'🏅'); setTimeout(()=>{ banner(`${T.e} Yan hikâye tamam: ${D.n}`,`${R.money?fmt(r10(R.money*cm()))+' ₺':''}${R.keys?' · +'+R.keys+' 🗝️':''}`); sfx('star'); },2800); onGameEvent('side',1); } }
  // günlük: gün özeti (haftada bir, gürültü olmasın)
  if(t&&state.day%5===0&&t.guests) diary(`${state.day}. gün: ${t.guests} misafir, ${t.happy} mutlu${t.left?', '+t.left+' kayıp':''}. Kasa ${fmt(Math.round(state.money))} ₺.`,'🗓️'); }
// ---------- arayüz: Otel › Genel bölümü, zincir haritası, günlük ----------
function sagaHtml(){ const i=state.city, C=chapterOf(i), S=saga(), sides=Object.keys(SIDE).filter(tr=>sideActive(tr)||sideState(tr).step>0);
  return `<div class="ugh">📖 Hikâye</div><div class="row"><div class="ic">${city().e}</div><div class="tx">Bölüm ${i+1}: ${escH(C.t)}<small>${sagaProgress(i)}/3 perde · ${S.pend?'karar bekliyor':C.beats.find(b=>!beatDone(i,b.k))?'sıradaki perde '+C.beats.find(b=>!beatDone(i,b.k)).st+'★\'da':'bölüm tamam'}${sides.length?' · '+sides.length+' yan hikâye':''}</small></div>${S.pend?'<button class="btn gold" data-saga="beat">Karar</button>':''}<button class="btn ghost" data-saga="map">Harita</button><button class="btn ghost" data-saga="diary">Günlük</button></div>`; }
function sagaMapHtml(){ const S=saga(); let h='';
  CHAPTERS.forEach((C,i)=>{ const ch=S.ch[i], st=ch?sagaProgress(i):0, cur=i===state.city, lock=!ch&&i>state.city;
    h+=`<div class="row" style="flex-wrap:wrap"><div class="ic">${lock?'🔒':CITIES[i].e}</div><div class="tx">${i+1}. ${escH(C.t)} <small>${lock?'kilitli':st+'/3 perde'+(cur?' · buradasın':'')}</small></div>`;
    if(ch) C.beats.forEach((b,n)=>{ const c=ch.beats[b.k]; h+=`<div style="width:100%;font-size:12px;padding:3px 0 3px 40px;opacity:${c?1:.55}">${c?'✅':'○'} Perde ${n+1}${c?': <b>'+escH(b[c].t)+'</b> → '+escH(b[c].res):' · '+b.st+'★'}</div>`; });
    h+='</div>'; });
  const sides=Object.keys(SIDE).filter(tr=>sideActive(tr)||sideState(tr).step>0); h+=`<div class="ugh">🧩 Yan hikâyeler (personel kişilikleri)</div>`;
  if(!sides.length) h+=`<p class="note">Kişilikli personel işe al: her kişilik kendi 3 adımlık hikâyesini açar.</p>`;
  sides.forEach(tr=>{ const D=SIDE[tr], s=sideState(tr), T=TRAITS[tr]; h+=`<div class="row" style="flex-wrap:wrap"><div class="ic">${T.e}</div><div class="tx">${escH(D.n)}<small>${T.n} · ${s.step}/3${sideActive(tr)?'':' · personel yok, duraklı'}</small></div>${D.steps.map((x,n)=>`<div style="width:100%;font-size:12px;padding:2px 0 2px 40px;opacity:${n<s.step?1:.55}">${n<s.step?'✅':n===s.step?'▶':'○'} ${escH(x)}</div>`).join('')}</div>`; });
  return h; }
function openSagaMap(){ openModal(`<h3>🗺️ Hikâye haritası <button class="xbtn" id="smX" aria-label="Kapat">✖</button></h3><p class="sub">Kararların ve sonuçları · şehirler arasında taşınır</p><div style="max-height:60vh;overflow:auto">${sagaMapHtml()}</div>`,m=>{ m.querySelector('#smX').onclick=closeModal; }); }
function openDiary(){ const D=saga().diary; openModal(`<h3>📔 Günlük <button class="xbtn" id="sdX" aria-label="Kapat">✖</button></h3><p class="sub">Otelcinin not defteri · son ${D.length} kayıt</p><div class="loglist" style="max-height:60vh;overflow:auto">${D.length?D.map(e=>`<div class="logrow"><span class="lt">${CITIES[e.c%CITIES.length].e} G${e.d}</span><span>${e.e||'📔'} ${escH(e.t)}</span></div>`).join(''):'<p class="note">Henüz kayıt yok. Yıldız kazan, karar ver, hikâye yazılsın.</p>'}</div>`,m=>{ m.querySelector('#sdX').onclick=closeModal; }); }
function bindSaga(root){ root.querySelectorAll('[data-saga]').forEach(b=>b.onclick=()=>{ const a=b.dataset.saga; closeSheet&&closeSheet(); if(a==='beat') openBeat(); else if(a==='map') openSagaMap(); else openDiary(); }); }
let sagaT=0;
function updateSaga(dt){ sagaT-=dt; if(sagaT>0) return; sagaT=2.5; sagaCheck(); }
function bootSaga(){ saga(); if(saga().pend) setTimeout(openBeat,4000); }
